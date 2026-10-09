import { useState } from "react";
import { IoMdCheckmark } from "react-icons/io";
import { IoCopy } from "react-icons/io5";
import { BsFacebook, BsTwitter } from "react-icons/bs";
import { useTranslate } from "@tolgee/react";
import { useQuery } from "react-query";
import axiosInstance from "../../../../../../config/axios-config.ts";
import ResourceHeader from "../common/ResourceHeader.tsx";
import { Button } from "@/components/ui/button.tsx";
import { siteName } from "@/utils/constants.ts";

type ShareViewProps = {
  setIsShareView: (view: string) => void;
  segmentId: string;
  textId?: string;
  handleNavigate: () => void;
};

export const fetchShortUrl = async (url: string, segmentId: string) => {
  const { data } = await axiosInstance.post("/api/v1/share", {
    segment_id: segmentId,
    language: "bo",
    url,
  });
  return data;
};
const getURLwithUpdatedSegmentId = (segmentId: string) => {
  const urlObj = new URL(window.location.href);
  urlObj.searchParams.set("segment_id", segmentId);
  return urlObj.toString();
};

/** The chromeless reader for this text, opened at the chosen segment. */
const getReaderUrl = (textId: string, segmentId: string) => {
  const url = new URL(
    `/reader/${encodeURIComponent(textId)}`,
    window.location.origin,
  );
  if (segmentId) url.searchParams.set("segment_id", segmentId);
  return url.toString();
};

const getEmbedCode = (readerUrl: string, title: string) =>
  `<iframe src="${readerUrl}" title="${title}" width="100%" height="600" style="border:0" loading="lazy"></iframe>`;

const CopyField = ({
  value,
  copyLabel,
  copiedLabel,
}: {
  value: string;
  copyLabel: string;
  copiedLabel: string;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    if (!value) return;

    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  return (
    <div className="mb-3 flex items-center gap-3 rounded bg-gray-100 px-4 py-3">
      <p className="flex-1 truncate text-sm text-gray-600">{value}</p>
      <Button
        variant="ghost"
        className="text-gray-600"
        onClick={handleCopy}
        aria-label={copied ? copiedLabel : copyLabel}
      >
        {copied ? <IoMdCheckmark size={16} /> : <IoCopy size={16} />}
      </Button>
    </div>
  );
};

const ShareView = ({
  setIsShareView,
  segmentId,
  textId,
  handleNavigate,
}: ShareViewProps) => {
  const [copied, setCopied] = useState(false);
  const { t } = useTranslate();
  const url = getURLwithUpdatedSegmentId(segmentId);

  const { data: shorturldata, isLoading } = useQuery(
    ["toc", url, segmentId],
    () => fetchShortUrl(url, segmentId),
    {
      refetchOnWindowFocus: false,
    },
  );
  const shareLink = shorturldata?.shortUrl ?? url;
  const readerUrl = textId ? getReaderUrl(textId, segmentId) : "";

  const handleCopyLink = () => {
    if (!shareLink) return;

    navigator.clipboard.writeText(shareLink);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 3000);
  };

  return (
    <div>
      <ResourceHeader
        title={t("common.share")}
        onBack={handleNavigate}
        onClose={() => setIsShareView("main")}
      />
      <div className="space-y-4 px-3 py-6 text-left">
        <p className="mb-3 border-b border-gray-100 pb-2 text-sm font-medium text-gray-500">
          {t("text.share_link")}
        </p>
        <div className="mb-3 flex items-center gap-3 rounded bg-gray-100 px-4 py-3">
          <p className="flex-1 truncate text-sm text-gray-600">
            {isLoading ? t("common.loading") : shareLink}
          </p>
          <Button
            variant="ghost"
            className="text-gray-600"
            onClick={handleCopyLink}
            aria-label={copied ? "Copied link" : "Copy share link"}
          >
            {copied ? <IoMdCheckmark size={16} /> : <IoCopy size={16} />}
          </Button>
        </div>
        {textId && (
          <>
            <p className="mb-3 border-b border-gray-100 pb-2 text-sm font-medium text-gray-500">
              {t("text.embed")}
            </p>
            <CopyField
              value={readerUrl}
              copyLabel="Copy reader link"
              copiedLabel="Copied reader link"
            />
            <CopyField
              value={getEmbedCode(readerUrl, siteName)}
              copyLabel="Copy embed code"
              copiedLabel="Copied embed code"
            />
          </>
        )}
        <p className="text-sm font-medium text-gray-500">
          {t("text.more_options")}
        </p>
        <div className="space-y-2">
          <a
            href={`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            aria-label="Share on Facebook"
          >
            <BsFacebook className="text-lg text-gray-600" />
            {t("common.share_on_fb")}
          </a>
          <a
            href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(shareLink)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-3 rounded px-4 py-3 text-sm text-gray-700 transition-colors hover:bg-gray-100"
            aria-label="Share on X"
          >
            <BsTwitter className="text-lg text-gray-600" />
            {t("common.share_on_x")}
          </a>
        </div>
      </div>
    </div>
  );
};

export default ShareView;
