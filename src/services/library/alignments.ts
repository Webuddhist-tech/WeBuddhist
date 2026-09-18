import {
  fetchAlignmentPairs,
  fetchTextById,
  fetchTextEditions,
} from "./api.ts";
import type { LibraryText } from "./types.ts";

export type AlignmentPair = {
  source_segment_id: string;
  target_segment_id: string;
};

const PAGE_SIZE = 500;

/**
 * Alignment pairs between two editions, cached for the session.
 *
 * The library has no way to ask for the alignments of just the segments on
 * screen, so every page of the reader would otherwise re-download the whole
 * pair list for the same two editions. The list is stable, so cache it.
 */
const pairCache = new Map<string, Promise<AlignmentPair[]>>();

const fetchAllPairs = async (
  sourceEditionId: string,
  targetEditionId: string,
): Promise<AlignmentPair[]> => {
  const all: AlignmentPair[] = [];
  let offset = 0;

  for (;;) {
    const page = await fetchAlignmentPairs(
      sourceEditionId,
      targetEditionId,
      PAGE_SIZE,
      offset,
    );
    // Two editions are not always aligned directly - two translations of the
    // same root text are typically each aligned only to that shared root - so a
    // missing alignment is an ordinary outcome, not an error.
    if (!page) return all;

    const items = page.items ?? [];
    items.forEach((item) => {
      all.push({
        source_segment_id: item.source_segment.id,
        target_segment_id: item.target_segment.id,
      });
    });

    if (!page.has_more || items.length === 0) return all;
    offset += items.length;
  }
};

export const getAlignmentPairs = (
  sourceEditionId: string,
  targetEditionId: string,
): Promise<AlignmentPair[]> => {
  const key = `${sourceEditionId}->${targetEditionId}`;
  const cached = pairCache.get(key);
  if (cached) return cached;

  const pending = fetchAllPairs(sourceEditionId, targetEditionId).catch(
    (error) => {
      pairCache.delete(key);
      throw error;
    },
  );
  pairCache.set(key, pending);
  return pending;
};

const groupBy = (
  pairs: AlignmentPair[],
  keyOf: (pair: AlignmentPair) => string,
  valueOf: (pair: AlignmentPair) => string,
): Map<string, string[]> => {
  const grouped = new Map<string, string[]>();
  pairs.forEach((pair) => {
    const key = keyOf(pair);
    const existing = grouped.get(key);
    if (existing) existing.push(valueOf(pair));
    else grouped.set(key, [valueOf(pair)]);
  });
  return grouped;
};

const pick = (
  segmentIds: string[],
  grouped: Map<string, string[]>,
): Map<string, string[]> => {
  const result = new Map<string, string[]>();
  segmentIds.forEach((segmentId) => {
    const found = grouped.get(segmentId);
    if (found) result.set(segmentId, found);
  });
  return result;
};

/** How far up a family to walk before giving up on finding a shared ancestor. */
const MAX_FAMILY_DEPTH = 8;

/**
 * A text and its ancestors, nearest first, following `translation_of` to the
 * top of the family.
 *
 * A translation of a translation is an ordinary shape here - the Sanskrit
 * Bodhisattvacaryavatara is translated into Tibetan and the Tibetan into
 * English - so one step up is not enough. Comparing only immediate parents left
 * a text and its own grandparent looking unrelated.
 */
const ancestorTextIds = async (
  textId: string,
  known: LibraryText,
): Promise<string[]> => {
  const chain = [textId];
  let parentId = known.translation_of ?? null;
  for (let step = 0; step < MAX_FAMILY_DEPTH && parentId; step += 1) {
    if (chain.includes(parentId)) break;
    chain.push(parentId);
    const parent = await fetchTextById(parentId).catch(() => null);
    parentId = parent?.translation_of ?? null;
  }
  return chain;
};

/**
 * The editions to hop through for `textIds`, whose ends are already known.
 *
 * Only the texts in between need looking up, and each contributes its first
 * critical edition. A text with none breaks the chain, and null says so.
 */
const editionPath = async (
  textIds: string[],
  firstEditionId: string,
  lastEditionId: string,
): Promise<string[] | null> => {
  if (textIds.length <= 1) return [lastEditionId];
  const middle = await Promise.all(
    textIds.slice(1, -1).map(async (textId) => {
      const editions = await fetchTextEditions(textId).catch(() => null);
      return editions?.[0]?.id ?? null;
    }),
  );
  if (middle.some((id) => id === null)) return null;
  return [firstEditionId, ...(middle as string[]), lastEditionId];
};

/** Alignments from `from` to `to`, whichever direction they are stored in. */
const alignmentsBetween = async (
  from: string,
  to: string,
): Promise<Map<string, string[]>> => {
  if (from === to) return new Map();
  const forward = await getAlignmentPairs(from, to);
  if (forward.length > 0) {
    return groupBy(
      forward,
      (pair) => pair.source_segment_id,
      (pair) => pair.target_segment_id,
    );
  }
  const reverse = await getAlignmentPairs(to, from);
  return groupBy(
    reverse,
    (pair) => pair.target_segment_id,
    (pair) => pair.source_segment_id,
  );
};

/**
 * Carry each of `segmentIds` along `editionIds`, hop by hop, to the segment(s)
 * it reaches in the last edition.
 *
 * One segment can align to several, and each of those to several again, so the
 * mapping stays multi-valued the whole way rather than picking a representative
 * and losing the rest.
 */
const composeAlongChain = async (
  segmentIds: string[],
  editionIds: string[],
): Promise<Map<string, string[]>> => {
  let current = new Map(segmentIds.map((id) => [id, [id]]));
  for (let hop = 0; hop < editionIds.length - 1 && current.size > 0; hop += 1) {
    const aligned = await alignmentsBetween(editionIds[hop], editionIds[hop + 1]);
    const next = new Map<string, string[]>();
    current.forEach((ids, startId) => {
      const mapped = [...new Set(ids.flatMap((id) => aligned.get(id) ?? []))];
      if (mapped.length > 0) next.set(startId, mapped);
    });
    current = next;
  }
  return current;
};

/**
 * Compose an alignment through the nearest text both sides descend from.
 *
 * Two translations of the same root are usually each aligned only to that root,
 * never to each other, so their segments have to be joined through it. The
 * shared ancestor is not always one step away: reading an English translation
 * of the Tibetan Bodhisattvacaryavatara and picking the Sanskrit it was
 * translated from means walking up two levels on one side and none on the
 * other, then hopping English to Tibetan to Sanskrit.
 */
const resolveViaPivot = async (args: {
  segmentIds: string[];
  editionId: string;
  editionTextId: string;
  editionText: LibraryText;
  versionEditionId: string;
  versionTextId: string;
  versionText: LibraryText;
}): Promise<Map<string, string[]>> => {
  const [editionAncestry, versionAncestry] = await Promise.all([
    ancestorTextIds(args.editionTextId, args.editionText),
    ancestorTextIds(args.versionTextId, args.versionText),
  ]);

  // Walking out from the edition means the first hit is the closest shared
  // ancestor, which keeps both chains as short as the family allows.
  const pivotTextId = editionAncestry.find((id) =>
    versionAncestry.includes(id),
  );
  if (!pivotTextId) return new Map();

  let pivotEditionId: string | null;
  if (pivotTextId === args.editionTextId) pivotEditionId = args.editionId;
  else if (pivotTextId === args.versionTextId) {
    pivotEditionId = args.versionEditionId;
  } else {
    const editions = await fetchTextEditions(pivotTextId).catch(() => null);
    pivotEditionId = editions?.[0]?.id ?? null;
  }
  if (!pivotEditionId) return new Map();

  const upTexts = editionAncestry.slice(
    0,
    editionAncestry.indexOf(pivotTextId) + 1,
  );
  const downTexts = versionAncestry
    .slice(0, versionAncestry.indexOf(pivotTextId) + 1)
    .reverse();

  const [upChain, downChain] = await Promise.all([
    editionPath(upTexts, args.editionId, pivotEditionId),
    editionPath(downTexts, pivotEditionId, args.versionEditionId),
  ]);
  if (!upChain || !downChain) return new Map();

  const toPivot = await composeAlongChain(args.segmentIds, upChain);
  if (toPivot.size === 0) return new Map();

  const pivotIds = [...new Set([...toPivot.values()].flat())];
  const fromPivot = await composeAlongChain(pivotIds, downChain);

  const result = new Map<string, string[]>();
  toPivot.forEach((pivots, segmentId) => {
    const targets = [
      ...new Set(pivots.flatMap((id) => fromPivot.get(id) ?? [])),
    ];
    if (targets.length > 0) result.set(segmentId, targets);
  });
  return result;
};

/**
 * Map each of `segmentIds` (segments of `editionId`) to the segment id(s) that
 * hold its translation in `versionEditionId`, cheapest path first:
 *   1. a direct alignment from edition to version
 *   2. the same alignment stored the other way round
 *   3. composing through the nearest text both descend from
 */
export const resolveTranslationSegmentIds = async (args: {
  segmentIds: string[];
  editionId: string;
  editionTextId: string;
  editionText: LibraryText;
  versionEditionId: string;
  versionTextId: string;
  versionText: LibraryText;
}): Promise<Map<string, string[]>> => {
  const direct = await getAlignmentPairs(args.editionId, args.versionEditionId);
  if (direct.length > 0) {
    const result = pick(
      args.segmentIds,
      groupBy(
        direct,
        (pair) => pair.source_segment_id,
        (pair) => pair.target_segment_id,
      ),
    );
    if (result.size > 0) return result;
  }

  const reverse = await getAlignmentPairs(
    args.versionEditionId,
    args.editionId,
  );
  if (reverse.length > 0) {
    const result = pick(
      args.segmentIds,
      groupBy(
        reverse,
        (pair) => pair.target_segment_id,
        (pair) => pair.source_segment_id,
      ),
    );
    if (result.size > 0) return result;
  }

  return resolveViaPivot({
    segmentIds: args.segmentIds,
    editionId: args.editionId,
    editionTextId: args.editionTextId,
    editionText: args.editionText,
    versionEditionId: args.versionEditionId,
    versionTextId: args.versionTextId,
    versionText: args.versionText,
  });
};

/** Exposed for tests: drop the session-level alignment cache. */
export const clearAlignmentCache = () => pairCache.clear();
