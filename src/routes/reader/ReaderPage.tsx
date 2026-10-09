import { useMemo } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import Chapters from "@/routes/chapterV2/Chapters.tsx";
import {
  parseReaderOptions,
  ReaderFeaturesProvider,
} from "@/context/ReaderFeaturesContext.tsx";

/**
 * The text reader for the text named in the address, with no header, sidebar
 * or footer around it. It is the same reader as /chapter, so side-by-side
 * panels, the resources panel and the view menu all work.
 *
 * Optional query: content_id, segment_id (open at a segment), version_id
 * (open with that translation), and the embed controls read by
 * parseReaderOptions: hide=<feature ids>, layout=, titles=.
 */
const ReaderPage = () => {
  const { textId } = useParams<{ textId: string }>();
  const [searchParams] = useSearchParams();
  const contentId = searchParams.get("content_id");
  const segmentId = searchParams.get("segment_id");
  const versionId = searchParams.get("version_id");
  const options = useMemo(
    () => parseReaderOptions(searchParams),
    [searchParams],
  );

  const initialChapters = useMemo(
    () => [
      {
        id: `${textId}-${contentId || "no-content"}-${segmentId || "no-segment"}-${Date.now()}`,
        textId,
        contentId,
        segmentId,
        versionId,
      },
    ],
    [textId, contentId, segmentId, versionId],
  );

  return (
    <ReaderFeaturesProvider options={options}>
      <div className="h-dvh w-full bg-background">
        {/* Keyed so a different text in the address starts a fresh reader. */}
        <Chapters
          key={textId}
          initialChapters={initialChapters}
          persistChapters={false}
        />
      </div>
    </ReaderFeaturesProvider>
  );
};

export default ReaderPage;
