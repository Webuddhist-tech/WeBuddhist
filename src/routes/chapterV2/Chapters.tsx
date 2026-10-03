import { useState, useEffect, useCallback } from "react";
import { useSearchParams } from "react-router-dom";
import ContentsChapter from "./chapter/ContentsChapter";

const Chapters = ({
  initialChapters = null,
  maxChapters = 3,
  renderChapter = null,
}: any) => {
  const [searchParams] = useSearchParams();
  const [chapters, setChapters] = useState(() => {
    const savedChapters = sessionStorage.getItem("chapters");
    if (savedChapters) {
      const parsedChapters = JSON.parse(savedChapters);
      return parsedChapters.map((chapter: any) => ({
        ...chapter,
        id:
          chapter.id ||
          `${chapter.textId}-${chapter.contentId || "no-content"}-${chapter.segmentId || "no-segment"}-${Date.now()}`,
      }));
    }

    if (initialChapters) {
      return initialChapters;
    }

    const textId = searchParams.get("text_id");
    const contentId = searchParams.get("content_id");
    const segmentId = searchParams.get("segment_id");

    if (textId) {
      return [
        {
          id: `${textId}-${contentId || "no-content"}-${segmentId || "no-segment"}-${Date.now()}`,
          textId: textId,
          contentId: contentId,
          segmentId: segmentId,
        },
      ];
    }
  });

  useEffect(() => {
    sessionStorage.setItem("chapters", JSON.stringify(chapters));
    return () => {
      sessionStorage.removeItem("chapters");
    };
  }, [chapters]);

  const addChapter = useCallback(
    (chapterInformation: any, currentChapter: any, isFromSheet = false) => {
      const maxChapters = isFromSheet ? 2 : 3;
      setChapters((prev: any) => {
        if (prev.length >= maxChapters) return prev;

        const ChapterWithUniqueId = {
          ...chapterInformation,
          id: `${chapterInformation.textId}-${chapterInformation.contentId || "no-content"}-${chapterInformation.segmentId || "no-segment"}-${Date.now()}}`,
        };

        const currentIndex = prev.findIndex(
          (chap: any) => chap.id === currentChapter?.id,
        );
        if (currentIndex === -1) {
          return [...prev, ChapterWithUniqueId];
        }
        const updatedChapters = [...prev];
        updatedChapters.splice(currentIndex + 1, 0, ChapterWithUniqueId);
        return updatedChapters;
      });
    },
    [maxChapters],
  );

  const removeChapter = useCallback((chapterToRemove: any) => {
    setChapters((prev: any) =>
      prev.filter((chap: any) => chap.id !== chapterToRemove.id),
    );
  }, []);

  const createSetVersionId = useCallback((currentChapterId: string) => {
    return (versionId: any) => {
      setChapters((prev: any) =>
        prev.map((chap: any) =>
          chap.id === currentChapterId ? { ...chap, versionId } : chap,
        ),
      );
    };
  }, []);

  const defaultRenderChapter = (chapter: any) => (
    <ContentsChapter
      textId={chapter.textId}
      contentId={chapter.contentId}
      segmentId={chapter.segmentId}
      versionId={chapter.versionId}
      addChapter={addChapter}
      removeChapter={removeChapter}
      currentChapter={chapter}
      totalChapters={chapters.length}
      setVersionId={createSetVersionId(chapter.id)}
    />
  );

  return (
    <div className="flex h-full w-full">
      {chapters.map((chapter: any, index: number) => (
        <div
          key={chapter.id}
          className="flex flex-col h-full"
          style={{ width: `${100 / chapters.length}%` }}
        >
          {renderChapter
            ? renderChapter(chapter, index, {
                versionId: chapter.versionId,
                addChapter,
                removeChapter,
                setVersionId: createSetVersionId(chapter.id),
              })
            : defaultRenderChapter(chapter)}
        </div>
      ))}
    </div>
  );
};

export default Chapters;
