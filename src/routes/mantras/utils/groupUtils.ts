import type {
  AccumulatorMetadataDTO,
  GroupMetadataDTO,
  PublicAccumulatorDTO,
} from "../types.ts";
import type { PlanLanguageCode } from "../../planviewer/utils/seriesUtils.ts";
import { normalizeMetadata, normalizeLang } from "./metadataUtils.ts";

export function getGroupTitleForLanguage(
  metadata: GroupMetadataDTO[] | GroupMetadataDTO | null | undefined,
  language: PlanLanguageCode,
  fallback = "Untitled practice space",
): string {
  const rows = normalizeMetadata(metadata);
  if (!rows.length) return fallback;

  const preferred = rows.find(
    (row) => normalizeLang(String(row.language)) === language,
  );
  if (preferred?.title?.trim()) return preferred.title.trim();

  const english = rows.find(
    (row) => normalizeLang(String(row.language)) === "EN",
  );
  if (english?.title?.trim()) return english.title.trim();

  return rows[0]?.title?.trim() || fallback;
}

export function getGroupDescriptionForLanguage(
  metadata: GroupMetadataDTO[] | GroupMetadataDTO | null | undefined,
  language: PlanLanguageCode,
): string {
  const rows = normalizeMetadata(metadata);
  const preferred = rows.find(
    (row) => normalizeLang(String(row.language)) === language,
  );
  if (preferred?.description?.trim()) return preferred.description.trim();

  const english = rows.find(
    (row) => normalizeLang(String(row.language)) === "EN",
  );
  return english?.description?.trim() || rows[0]?.description?.trim() || "";
}

export function getPresetDisplayTitle(
  preset: PublicAccumulatorDTO,
  language: PlanLanguageCode,
): string {
  if (preset.mantra?.title?.trim()) return preset.mantra.title.trim();

  const rows = normalizeMetadata(
    preset.metadata as AccumulatorMetadataDTO[] | null,
  );
  const preferred = rows.find(
    (row) => normalizeLang(String(row.language)) === language,
  );
  if (preferred?.name?.trim()) return preferred.name.trim();

  const english = rows.find(
    (row) => normalizeLang(String(row.language)) === "EN",
  );
  if (english?.name?.trim()) return english.name.trim();

  return rows[0]?.name?.trim() || preset.mantra?.mantra?.trim() || "Mantra";
}

export function getPresetDisplayDescription(
  preset: PublicAccumulatorDTO,
  language: PlanLanguageCode,
): string {
  const rows = normalizeMetadata(
    preset.metadata as AccumulatorMetadataDTO[] | null,
  );
  const preferred = rows.find(
    (row) => normalizeLang(String(row.language)) === language,
  );
  if (preferred?.description?.trim()) return preferred.description.trim();

  const english = rows.find(
    (row) => normalizeLang(String(row.language)) === "EN",
  );
  return english?.description?.trim() || rows[0]?.description?.trim() || "";
}

export function getMemberInitials(fullname: string): string {
  const parts = fullname.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
  return `${parts[0].charAt(0)}${parts.at(-1)?.charAt(0) ?? ""}`.toUpperCase();
}
