"use client";

import { useMemo, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Button } from "@nodex/ui";
import { Avatar, Card, ClientHeader, ClientShell, StatusPill } from "../../client-ui";

type ConversationType = "TRIP" | "SUPPORT" | "PARCEL";
type Attachment = { name: string; kind: "image" | "video" | "file"; state: "uploading" | "ready" | "failed" };
type ChatMessage = { from: "client" | "driver" | "support"; text: string; time: string; attachment?: Attachment | null };

type Conversation = {
  id: string;
  type: ConversationType;
  title: string;
  subtitle: string;
  badge: string;
  contextTitle: string;
  contextMeta: string;
  status: string;
  messages: ChatMessage[];
  attachments: Array<Attachment["kind"]>;
};

const conversations: Record<string, Conversation> = {
  "driver-azizbek": {
    id: "driver-azizbek",
    type: "TRIP",
    title: "Azizbek Karimov",
    subtitle: "Nukus → Urgench · завтра 08:30",
    badge: "Чат поездки",
    contextTitle: "Поездка Nukus → Urgench",
    contextMeta: "Место забронировано · водитель уточняет посадку",
    status: "Активно",
    attachments: ["image", "file"],
    messages: [
      { from: "driver", text: "Доброе утро. Напишу перед прибытием к точке посадки.", time: "08:01" },
      { from: "client", text: "Спасибо. Я буду у главного входа.", time: "08:03" },
      { from: "driver", text: "Отлично. Белый Chevrolet Cobalt, номер 95 A 214 QA.", time: "08:05" },
    ],
  },
  "support-envo": {
    id: "support-envo",
    type: "SUPPORT",
    title: "Поддержка ENVO",
    subtitle: "Один чат для всех обращений",
    badge: "Поддержка",
    contextTitle: "SUP-1042 · Координация посадки",
    contextMeta: "Проблема с поездкой · в работе · ответ с контекстом поездки",
    status: "В работе",
    attachments: ["image", "video", "file"],
    messages: [
      { from: "client", text: "Водитель просит уточнить точку посадки.", time: "10:12" },
      { from: "support", text: "Мы добавили вашу заметку к заявке.", time: "10:14" },
      { from: "client", text: "Прикрепляю фото входа.", time: "10:16", attachment: { name: "pickup-point.jpg", kind: "image", state: "ready" } },
    ],
  },
  "parcel-driver": {
    id: "parcel-driver",
    type: "PARCEL",
    title: "Водитель посылки",
    subtitle: "Nukus → Khiva · посылка в пути",
    badge: "Чат по посылке",
    contextTitle: "Посылка PX-301 · документы",
    contextMeta: "Отправитель: Bekzod · получатель: Dilnoza · доставка сегодня",
    status: "В пути",
    attachments: ["image", "file"],
    messages: [
      { from: "driver", text: "Посылка принята и уже в пути.", time: "Вчера" },
      { from: "client", text: "Спасибо. Получатель будет ждать у автостанции.", time: "Вчера" },
    ],
  },
};

const legacyConversationAliases: Record<string, string> = {
  "support-demo": "support-envo",
  "support-ticket": "support-envo",
};

const supportConversation = conversations["support-envo"]!;

const attachmentNames: Record<Attachment["kind"], Attachment> = {
  image: { name: "Фото точки посадки.jpg", kind: "image", state: "ready" },
  video: { name: "Видео обращения.mp4", kind: "video", state: "uploading" },
  file: { name: "Детали поездки.pdf", kind: "file", state: "failed" },
};

function attachmentLabel(kind: Attachment["kind"]) {
  return kind === "image" ? "Фото" : kind === "video" ? "Видео" : "Файл";
}

export default function ClientChatPage() {
  const params = useParams<{ conversationId: string }>();
  const searchParams = useSearchParams();
  const conversationId = legacyConversationAliases[params.conversationId] ?? params.conversationId;
  const conversation = conversations[conversationId] ?? supportConversation;
  const [draft, setDraft] = useState(searchParams.get("topic") ? `Нужна помощь: ${searchParams.get("topic")}` : "");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [sentMessages, setSentMessages] = useState<ChatMessage[]>([]);
  const visibleMessages = useMemo(() => [...conversation.messages, ...sentMessages], [conversation.messages, sentMessages]);

  function sendMessage() {
    const text = draft.trim();
    if (!text && !attachment) return;
    const sentAttachment = attachment
      ? { ...attachment, state: attachment.state === "uploading" ? "ready" : attachment.state }
      : null;
    setSentMessages((current) => [
      ...current,
      { from: "client", text: text || "Отправлено вложение", time: "Сейчас", attachment: sentAttachment },
    ]);
    setDraft("");
    setAttachment(null);
  }

  return (
    <ClientShell active="messages">
      <ClientHeader
        action={<StatusPill tone={conversation.type === "SUPPORT" ? "accent" : "success"}>{conversation.badge}</StatusPill>}
        backHref="/messages"
        level="secondary"
        subtitle={conversation.subtitle}
        title={conversation.title}
      />

      <Card className="mt-4" compact>
        <div className="flex items-center gap-3">
          <Avatar name={conversation.title} />
          <div className="min-w-0 flex-1">
            <h2 className="m-0 truncate text-base font-black">{conversation.contextTitle}</h2>
            <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">{conversation.contextMeta}</p>
          </div>
          <StatusPill tone="info">{conversation.status}</StatusPill>
        </div>
      </Card>

      <section aria-label="Сообщения чата" className="mt-3 grid gap-2.5">
        {visibleMessages.map((message, index) => {
          const own = message.from === "client";
          return (
            <div key={`${message.time}-${message.text}-${index}`} className={own ? "flex justify-end" : ""}>
              <div className={["max-w-[84%] rounded-[22px] px-4 py-2.5 shadow-[var(--shadow-xs)]", own ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]" : "bg-[rgb(var(--surface))] text-[rgb(var(--foreground))]"].join(" ")}>
                <p className="m-0 text-sm font-semibold">{message.text}</p>
                {message.attachment ? <AttachmentPreview attachment={message.attachment} compact /> : null}
                <p className="m-0 mt-1 text-right text-[11px] font-bold opacity-70">{message.time}</p>
              </div>
            </div>
          );
        })}
      </section>

      <form className="sticky bottom-20 mt-4 rounded-[24px] bg-[rgb(var(--surface)/0.98)] p-3 shadow-[var(--shadow-floating)] backdrop-blur-xl" onSubmit={(event) => { event.preventDefault(); sendMessage(); }}>
        {attachment ? <AttachmentPreview attachment={attachment} onRemove={() => setAttachment(null)} /> : null}
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {conversation.attachments.map((kind) => (
            <button key={kind} className="min-h-9 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-xs font-black text-[rgb(var(--primary))]" type="button" onClick={() => setAttachment(attachmentNames[kind])}>
              {attachmentLabel(kind)}
            </button>
          ))}
        </div>
        <label className="sr-only" htmlFor="chat-message">Сообщение</label>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            className="h-11 min-w-0 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-4 text-sm font-semibold outline-none"
            id="chat-message"
            placeholder="Напишите сообщение"
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
          />
          <Button type="submit">{attachment?.state === "uploading" ? "Загрузка" : "Отправить"}</Button>
        </div>
      </form>
    </ClientShell>
  );
}

function AttachmentPreview({ attachment, compact = false, onRemove }: { attachment: Attachment; compact?: boolean; onRemove?: () => void }) {
  const stateText = attachment.state === "ready" ? "Готово" : attachment.state === "uploading" ? "Загружается" : "Demo: ошибка загрузки";
  const badge = attachment.kind === "image" ? "Изображение" : attachment.kind === "video" ? "Видео" : "Файл";
  return (
    <div className={["mt-2 rounded-[14px] bg-[rgb(var(--canvas))] p-3 text-xs text-[rgb(var(--foreground))]", compact ? "max-w-full" : "mb-2"].join(" ")}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-black text-[rgb(var(--primary))]">{badge}</span>
        <span className={attachment.state === "failed" ? "font-black text-[rgb(var(--destructive))]" : "text-[rgb(var(--text-muted))]"}>{stateText}</span>
      </div>
      <div className="mt-1 truncate font-semibold">{attachment.name}</div>
      {attachment.kind === "image" ? <div className="mt-2 h-16 rounded-[12px] bg-[linear-gradient(135deg,rgb(var(--surface-tint)),rgb(var(--surface)))]" aria-label="Превью изображения" /> : null}
      {onRemove ? <button className="mt-2 border-0 bg-transparent p-0 text-xs font-black text-[rgb(var(--primary))]" type="button" onClick={onRemove}>Убрать перед отправкой</button> : null}
    </div>
  );
}
