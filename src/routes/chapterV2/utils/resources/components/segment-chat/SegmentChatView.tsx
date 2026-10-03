import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type FormEvent,
  type ReactNode,
} from "react";
import ReactMarkdown from "react-markdown";
import remarkBreaks from "remark-breaks";
import { GoLinkExternal } from "react-icons/go";
import { IoChevronDown, IoChevronForward } from "react-icons/io5";
import { LuSparkles } from "react-icons/lu";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import ResourceHeader from "../common/ResourceHeader.tsx";
import { useChatTranslate } from "./useChatTranslate.ts";
import { ChatInput } from "../../../../../chat/components/molecules/ChatInput/ChatInput.tsx";
import { getLanguageClass } from "../../../../../../utils/helperFunctions.tsx";
import {
  streamSegmentChat,
  type SegmentChatError,
  type SegmentChatHistoryMessage,
  type SegmentChatSource,
} from "@/services/worker/segmentChat";

type MessageStatus = "gathering" | "streaming" | "done" | "stopped" | "error";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: MessageStatus;
  sources?: SegmentChatSource[];
  citedRefs?: number[];
  error?: string;
};

type SegmentChatViewProps = {
  segmentId: string;
  addChapter: (chapter: unknown, currentChapter: unknown) => void;
  currentChapter: unknown;
  handleNavigate: () => void;
  onClose: () => void;
};

// Earlier turns sent with a follow-up question, so it can refer back to them.
const MAX_HISTORY_MESSAGES = 10;
const CITATION_RE = /\[(\d+)\]/g;

const SUGGESTED_QUESTIONS = [
  "segment_chat.suggestion.meaning",
  "segment_chat.suggestion.commentaries",
  "segment_chat.suggestion.terms",
];

let messageCounter = 0;
const nextId = () => `segment-chat-${Date.now()}-${++messageCounter}`;

/** Citation numbers in the order they first appear, limited to known sources. */
export const refsInText = (text: string, validRefs: Set<number>): number[] => {
  const refs: number[] = [];
  for (const match of text.matchAll(CITATION_RE)) {
    const ref = Number(match[1]);
    if (validRefs.has(ref) && !refs.includes(ref)) refs.push(ref);
  }
  return refs;
};

/** Turns `[n]` into a `#cite-n` link so the Markdown renderer can draw it as a citation. */
export const linkCitations = (text: string, validRefs: Set<number>): string =>
  text.replace(CITATION_RE, (match, ref) =>
    validRefs.has(Number(ref)) ? `[${ref}](#cite-${ref})` : match,
  );

export const buildHistory = (
  messages: ChatMessage[],
): SegmentChatHistoryMessage[] => {
  const history: SegmentChatHistoryMessage[] = [];
  messages.forEach((message, index) => {
    const question = messages[index - 1];
    if (
      message.role === "assistant" &&
      message.status === "done" &&
      message.content &&
      question?.role === "user"
    ) {
      history.push({ role: "user", content: question.content });
      history.push({ role: "assistant", content: message.content });
    }
  });
  return history.slice(-MAX_HISTORY_MESSAGES);
};

type OpenSource = (source: SegmentChatSource) => void;

const SourceDetails = ({
  source,
  onOpen,
}: {
  source: SegmentChatSource;
  onOpen: OpenSource;
}) => {
  const t = useChatTranslate();
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5 shrink-0 rounded bg-gray-100 px-1.5 text-xs font-semibold text-gray-700">
        {source.ref}
      </span>
      <div className="min-w-0 flex-1 space-y-1">
        <p
          className={`text-sm font-medium text-gray-800 ${getLanguageClass(source.language)}`}
        >
          {source.title || t("connection_panel.untitled_text")}
        </p>
        <p className="text-xs text-gray-500">
          {t(`segment_chat.source_type.${source.type}`)}
          {source.language ? ` · ${source.language}` : ""}
        </p>
        {source.snippet && (
          <p
            className={`line-clamp-3 text-sm text-gray-700 ${getLanguageClass(source.language)}`}
          >
            {source.snippet}
          </p>
        )}
        <button
          type="button"
          className="flex items-center gap-1.5 text-sm text-gray-600 transition hover:text-red-700 cursor-pointer"
          onClick={() => onOpen(source)}
        >
          <GoLinkExternal />
          <span>{t("text.translation.open_text")}</span>
        </button>
      </div>
    </div>
  );
};

/** A citation number in the answer. Its source shows on hover, and on click
 * or tap for touch screens; clicking elsewhere closes it. */
const CitationButton = ({
  source,
  onOpen,
}: {
  source: SegmentChatSource;
  onOpen: OpenSource;
}) => {
  const t = useChatTranslate();
  const [open, setOpen] = useState(false);
  return (
    <Tooltip open={open} onOpenChange={setOpen} delayDuration={150}>
      <TooltipTrigger asChild>
        <button
          type="button"
          aria-label={t("segment_chat.citation", {
            ref: source.ref,
          })}
          aria-expanded={open}
          className="mx-0.5 inline-flex -translate-y-1 cursor-pointer items-center rounded bg-gray-100 px-1 text-[10px] font-semibold leading-4 text-gray-700 hover:bg-red-50 hover:text-red-700"
          onClick={(event) => {
            // Radix closes a tooltip on trigger click; toggle it instead.
            event.preventDefault();
            setOpen((current) => !current);
          }}
        >
          {source.ref}
        </button>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        sideOffset={4}
        className="w-72 max-w-[85vw] bg-white p-3 text-left text-gray-800 shadow-md"
      >
        <SourceDetails
          source={source}
          onOpen={(selected) => {
            setOpen(false);
            onOpen(selected);
          }}
        />
      </TooltipContent>
    </Tooltip>
  );
};

const SourceList = ({
  sources,
  onOpen,
}: {
  sources: SegmentChatSource[];
  onOpen: OpenSource;
}) => (
  <ul className="space-y-2">
    {sources.map((source) => (
      <li
        key={source.ref}
        className="rounded-md border border-[#e7e5e4] bg-white p-3"
      >
        <SourceDetails source={source} onOpen={onOpen} />
      </li>
    ))}
  </ul>
);

/** Sources under an answer, collapsed until the reader expands them. */
const AnswerSources = ({
  cited,
  others,
  onOpen,
}: {
  cited: SegmentChatSource[];
  others: SegmentChatSource[];
  onOpen: OpenSource;
}) => {
  const t = useChatTranslate();
  const [expanded, setExpanded] = useState(false);
  if (cited.length === 0 && others.length === 0) return null;

  const label =
    cited.length > 0
      ? t("segment_chat.sources_count", {
          count: cited.length,
        })
      : t("segment_chat.sources_read", {
          count: others.length,
        });

  return (
    <div className="text-sm">
      <button
        type="button"
        aria-expanded={expanded}
        className="flex cursor-pointer items-center gap-1 text-gray-500 hover:text-gray-800"
        onClick={() => setExpanded((current) => !current)}
      >
        {expanded ? <IoChevronDown /> : <IoChevronForward />}
        {label}
      </button>
      {expanded && (
        <div className="mt-2 space-y-2">
          {cited.length > 0 ? (
            <>
              <SourceList sources={cited} onOpen={onOpen} />
              {others.length > 0 && (
                <details>
                  <summary className="cursor-pointer text-gray-500 hover:text-gray-700">
                    {t("segment_chat.other_sources", { count: others.length })}
                  </summary>
                  <div className="mt-2">
                    <SourceList sources={others} onOpen={onOpen} />
                  </div>
                </details>
              )}
            </>
          ) : (
            <SourceList sources={others} onOpen={onOpen} />
          )}
        </div>
      )}
    </div>
  );
};

const MARKDOWN_PLUGINS = [remarkBreaks];

/** The answer text, with `[n]` citations drawn as source popovers. The link
 * renderer is memoized: a new one on every streamed chunk would remount each
 * citation and close any popover the reader has open. */
const AnswerMarkdown = ({
  content,
  sources,
  onOpen,
}: {
  content: string;
  sources: SegmentChatSource[];
  onOpen: OpenSource;
}) => {
  const validRefs = useMemo(
    () => new Set(sources.map((source) => source.ref)),
    [sources],
  );
  const components = useMemo(
    () => ({
      a: ({ href, children }: { href?: string; children?: ReactNode }) => {
        const ref = href?.startsWith("#cite-") ? Number(href.slice(6)) : null;
        const source =
          ref === null ? undefined : sources.find((item) => item.ref === ref);
        if (!source) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {children}
            </a>
          );
        }
        return <CitationButton source={source} onOpen={onOpen} />;
      },
    }),
    [sources, onOpen],
  );
  return (
    <ReactMarkdown remarkPlugins={MARKDOWN_PLUGINS} components={components}>
      {linkCitations(content, validRefs)}
    </ReactMarkdown>
  );
};

const SegmentChatView = ({
  segmentId,
  addChapter,
  currentChapter,
  handleNavigate,
  onClose,
}: SegmentChatViewProps) => {
  const t = useChatTranslate();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const formRef = useRef<HTMLFormElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Each segment has its own conversation: selecting another segment starts afresh.
  useEffect(() => {
    abortRef.current?.abort();
    setMessages([]);
    setIsLoading(false);
    return () => abortRef.current?.abort();
  }, [segmentId]);

  useEffect(() => {
    const container = scrollRef.current;
    if (container) container.scrollTop = container.scrollHeight;
  }, [messages]);

  const updateMessage = (
    id: string,
    update: (message: ChatMessage) => ChatMessage,
  ) =>
    setMessages((current) =>
      current.map((message) => (message.id === id ? update(message) : message)),
    );

  const errorText = (error: SegmentChatError) => {
    switch (error.status) {
      case 404:
        return t("segment_chat.error.not_found");
      case 429:
        return t("segment_chat.error.rate_limited");
      case 503:
        return t("segment_chat.error.unavailable");
      default:
        return t("segment_chat.error.generic");
    }
  };

  const ask = async (question: string) => {
    const trimmed = question.trim();
    if (!trimmed || isLoading) return;

    const history = buildHistory(messages);
    const assistantId = nextId();
    setMessages((current) => [
      ...current,
      { id: nextId(), role: "user", content: trimmed },
      { id: assistantId, role: "assistant", content: "", status: "gathering" },
    ]);
    setInput("");
    setIsLoading(true);

    const controller = new AbortController();
    abortRef.current = controller;

    await streamSegmentChat(
      { segmentId, question: trimmed, history, signal: controller.signal },
      {
        onSources: ({ sources }) =>
          updateMessage(assistantId, (m) => ({
            ...m,
            sources,
            status: "streaming",
          })),
        onDelta: (text) =>
          updateMessage(assistantId, (m) => ({
            ...m,
            content: m.content + text,
            status: "streaming",
          })),
        onDone: ({ cited_refs }) =>
          updateMessage(assistantId, (m) => ({
            ...m,
            citedRefs: cited_refs,
            status: "done",
          })),
        onError: (error) =>
          updateMessage(assistantId, (m) => ({
            ...m,
            status: "error",
            error: errorText(error),
          })),
      },
    );

    if (abortRef.current === controller) {
      abortRef.current = null;
      setIsLoading(false);
    }
  };

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    ask(input);
  };

  const handleStop = () => {
    abortRef.current?.abort();
    abortRef.current = null;
    setIsLoading(false);
    setMessages((current) =>
      current.map((message) =>
        message.status === "gathering" || message.status === "streaming"
          ? { ...message, status: "stopped" }
          : message,
      ),
    );
  };

  const handleNewChat = () => {
    handleStop();
    setMessages([]);
  };

  const handleOpenSource = useCallback(
    (source: SegmentChatSource) =>
      addChapter(
        { textId: source.text_id, segmentId: source.segment_id },
        currentChapter,
      ),
    [addChapter, currentChapter],
  );

  const renderAnswer = (message: ChatMessage) => {
    const sources = message.sources ?? [];
    const validRefs = new Set(sources.map((source) => source.ref));
    const citedRefs =
      message.status === "done" && message.citedRefs
        ? message.citedRefs
        : refsInText(message.content, validRefs);
    const citedSources = citedRefs
      .map((ref) => sources.find((source) => source.ref === ref))
      .filter((source): source is SegmentChatSource => Boolean(source));
    const otherSources = sources.filter(
      (source) => !citedRefs.includes(source.ref),
    );

    return (
      <div className="space-y-3">
        {message.status === "gathering" && (
          <p className="animate-pulse text-sm text-gray-500">
            {t("segment_chat.gathering_sources")}
          </p>
        )}
        {message.status === "streaming" && !message.content && (
          <p className="animate-pulse text-sm text-gray-500">
            {t("segment_chat.writing", {
              count: sources.length,
            })}
          </p>
        )}
        {message.content && (
          <div className="text-sm leading-relaxed text-gray-900 [&_h1]:font-semibold [&_h2]:font-semibold [&_h3]:font-semibold [&_li]:my-1 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 [&_strong]:font-semibold [&_ul]:list-disc [&_ul]:pl-5">
            <AnswerMarkdown
              content={message.content}
              sources={sources}
              onOpen={handleOpenSource}
            />
          </div>
        )}
        {message.status === "stopped" && (
          <p className="text-xs text-gray-500">{t("segment_chat.stopped")}</p>
        )}
        {message.status === "error" && (
          <p className="text-sm text-red-700">{message.error}</p>
        )}

        {message.status !== "gathering" && message.status !== "streaming" && (
          <AnswerSources
            cited={citedSources}
            others={otherSources}
            onOpen={handleOpenSource}
          />
        )}
      </div>
    );
  };

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <ResourceHeader
        title={t("segment_chat.title")}
        onBack={handleNavigate}
        onClose={onClose}
      />
      <div ref={scrollRef} className="flex-1 overflow-y-auto p-4 text-left">
        {messages.length === 0 ? (
          <div className="space-y-4">
            <div className="flex items-start gap-2 text-sm text-gray-600">
              <LuSparkles className="mt-0.5 shrink-0 text-lg text-gray-500" />
              <p>{t("segment_chat.intro")}</p>
            </div>
            <div className="flex flex-col gap-2">
              {SUGGESTED_QUESTIONS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className="cursor-pointer rounded-md border border-[#e7e5e4] bg-white px-3 py-2 text-left text-sm text-gray-700 transition hover:bg-gray-50"
                  onClick={() => ask(t(key))}
                >
                  {t(key)}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-5">
            {messages.map((message) =>
              message.role === "user" ? (
                <div key={message.id} className="flex justify-end">
                  <p className="max-w-[85%] whitespace-pre-wrap rounded-2xl bg-gray-100 px-3 py-2 text-sm text-gray-900">
                    {message.content}
                  </p>
                </div>
              ) : (
                <div key={message.id}>{renderAnswer(message)}</div>
              ),
            )}
          </div>
        )}
      </div>
      <div className="border-t border-[#e7e5e4] bg-white pt-3 pb-2">
        {messages.length > 0 && (
          <div className="flex justify-end px-4 pb-1">
            <button
              type="button"
              className="cursor-pointer text-xs text-gray-500 hover:text-gray-800"
              onClick={handleNewChat}
            >
              {t("segment_chat.new_chat")}
            </button>
          </div>
        )}
        <ChatInput
          input={input}
          setInput={setInput}
          isLoading={isLoading}
          handleSubmit={handleSubmit}
          handleStop={handleStop}
          formRef={formRef}
          placeholder={t("segment_chat.placeholder")}
        />
        <p className="px-4 pt-1 text-center text-[11px] text-gray-400">
          {t("segment_chat.disclaimer")}
        </p>
      </div>
    </div>
  );
};

export default SegmentChatView;
