/**
 * Where a top-level library collection opens from outside the library page.
 *
 * One with no children of its own opens its works directly; one with
 * sub-collections opens the library, where they can be browsed.
 */
export const collectionPath = (collection: {
  id: string;
  has_child?: boolean;
}): string =>
  collection.has_child ? "/collections" : `/works/${collection.id}`;
