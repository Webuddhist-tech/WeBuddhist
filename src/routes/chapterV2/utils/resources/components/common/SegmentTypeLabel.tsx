import { useTranslate } from "@tolgee/react";

/**
 * A related segment's structural role - a verse, a title, front matter.
 *
 * The panel's lists mix roles freely: a text's title and its verses sit in the
 * same group, and without this they read as one undifferentiated run. An
 * unknown type falls back to its own name with the underscores taken out rather
 * than showing a raw translation key.
 */
const SegmentTypeLabel = ({ type }: { type?: string | null }) => {
  const { t } = useTranslate();
  if (!type) return null;

  return (
    <p className="overalltext text-xs uppercase tracking-wide text-gray-500">
      {t(`segment.type.${type}`, type.replace(/_/g, " "))}
    </p>
  );
};

export default SegmentTypeLabel;
