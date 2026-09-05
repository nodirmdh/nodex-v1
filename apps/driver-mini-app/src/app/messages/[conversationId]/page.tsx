"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useMemo, useState } from "react";
import { DriverCard, DriverHeader, DriverPill, DriverShell } from "../../driver-ui";

type ConversationKind = "trip" | "support" | "parcel";
type AttachmentKind = "image" | "video" | "file";
type AttachmentState = "ready" | "uploading" | "failed";
type Attachment = { kind: AttachmentKind; name: string; state: AttachmentState };
type ChatMessage = { from: "driver" | "other"; text: string; time: string; attachment?: Attachment | null };
type Conversation = {
  id: string;
  kind: ConversationKind;
  title: string;
  subtitle: string;
  label: string;
  status: string;
  statusTone: "success" | "warning" | "info" | "accent";
  contextTitle: string;
  context: string[];
  relatedHref: string;
  relatedLabel: string;
  placeholder: string;
  messages: ChatMessage[];
  attachments: Attachment[];
};

const conversations: Record<string, Conversation> = {
  "trip-passenger": {
    id: "trip-passenger",
    kind: "trip",
    title: "Azizbek Karimov",
    subtitle: "Nukus → Urgench · Переднее пассажирское",
    label: "Поездка",
    status: "Подтверждено",
    statusTone: "success",
    contextTitle: "Чат с пассажиром",
    context: ["Завтра · 08:30", "Место подтверждено", "Переднее пассажирское"],
    relatedHref: "/trip-demo",
    relatedLabel: "Открыть поездку",
    placeholder: "Напишите пассажиру",
    messages: [
      { from: "other", text: "Здравствуйте, буду у главного входа.", time: "08:02" },
      { from: "driver", text: "Хорошо, подъеду к главному входу.", time: "08:03" },
      { from: "other", text: "У меня одна маленькая сумка.", time: "08:04" },
    ],
    attachments: [
      { kind: "image", name: "Фото точки посадки.jpg", state: "ready" },
      { kind: "file", name: "Список пассажиров.pdf", state: "ready" },
    ],
  },
  support: {
    id: "support",
    kind: "support",
    title: "Поддержка ENVO",
    subtitle: "Проверка документов · В работе",
    label: "Поддержка",
    status: "В работе",
    statusTone: "warning",
    contextTitle: "Единое обращение поддержки",
    context: ["Тема: проверка документов", "Контекст: активная поездка", "Ответит оператор ENVO"],
    relatedHref: "/support",
    relatedLabel: "Темы поддержки",
    placeholder: "Напишите в поддержку",
    messages: [
      { from: "other", text: "Мы проверяем документы автомобиля и добавили заметку к обращению.", time: "14:20" },
      { from: "driver", text: "Готов отправить фото техпаспорта.", time: "14:22" },
    ],
    attachments: [
      { kind: "image", name: "Фото техпаспорта.jpg", state: "ready" },
      { kind: "video", name: "Видео осмотра.mp4", state: "uploading" },
      { kind: "file", name: "Документы автомобиля.pdf", state: "failed" },
    ],
  },
  "parcel-sender": {
    id: "parcel-sender",
    kind: "parcel",
    title: "Gulnora Ergasheva",
    subtitle: "Посылка · Nukus → Urgench",
    label: "Посылка",
    status: "Принята",
    statusTone: "accent",
    contextTitle: "Чат по посылке",
    context: ["Маленькая · документы", "Забрать: вокзал Nukus", "Передать: автостанция Urgench"],
    relatedHref: "/parcels",
    relatedLabel: "Открыть посылку",
    placeholder: "Напишите отправителю",
    messages: [
      { from: "other", text: "Посылка в синем пакете, внутри документы.", time: "12:10" },
      { from: "driver", text: "Принял, напишу после получения.", time: "12:12" },
    ],
    attachments: [
      { kind: "image", name: "Фото посылки.jpg", state: "ready" },
      { kind: "file", name: "Описание посылки.pdf", state: "ready" },
    ],
  },
};

const fallbackConversation = conversations["trip-passenger"] as Conversation;

export default function DriverChatPage() {
  const params = useParams<{ conversationId?: string }>();
  const conversation: Conversation = conversations[params.conversationId ?? ""] ?? fallbackConversation;
  const [text, setText] = useState("");
  const [attachment, setAttachment] = useState<Attachment | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>(conversation.messages);

  const attachmentActions = useMemo(() => conversation.attachments, [conversation]);

  function sendMessage() {
    const trimmed = text.trim();
    if (!trimmed && !attachment) return;
    setMessages((current) => [
      ...current,
      {
        from: "driver",
        text: trimmed || "Отправлено вложение",
        time: "сейчас",
        attachment: attachment
          ? { ...attachment, state: attachment.state === "uploading" ? "ready" : attachment.state }
          : null,
      },
    ]);
    setText("");
    setAttachment(null);
  }

  return (
    <DriverShell active="messages">
      <DriverHeader
        title={conversation.title}
        subtitle={conversation.subtitle}
        status={<DriverPill tone={conversation.statusTone}>{conversation.status}</DriverPill>}
      />

      <DriverCard className="mt-4 space-y-3" label={conversation.label}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h1 className="m-0 text-lg font-black">{conversation.contextTitle}</h1>
            <div className="mt-2 grid gap-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
              {conversation.context.map((item) => (
                <span key={item}>{item}</span>
              ))}
            </div>
          </div>
          <Link
            className="shrink-0 text-sm font-black text-[rgb(var(--primary))] no-underline"
            href={conversation.relatedHref}
          >
            {conversation.relatedLabel}
          </Link>
        </div>
      </DriverCard>

      <section aria-label="Сообщения чата" className="mt-3 space-y-2">
        {messages.map((message, index) => (
          <div
            key={`${message.time}-${index}`}
            className={[
              "max-w-[86%] rounded-[20px] px-3 py-2 shadow-[var(--shadow-xs)]",
              message.from === "driver"
                ? "ml-auto bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                : "bg-[rgb(var(--surface))]",
            ].join(" ")}
          >
            <p className="m-0 text-sm font-semibold leading-6">{message.text}</p>
            {message.attachment ? <AttachmentPreview attachment={message.attachment} compact /> : null}
            <div
              className={[
                "mt-1 text-[10px] font-bold",
                message.from === "driver" ? "opacity-75" : "text-[rgb(var(--text-muted))]",
              ].join(" ")}
            >
              {message.time}
            </div>
          </div>
        ))}
      </section>

      <section className="sticky bottom-20 mt-4 rounded-[22px] bg-[rgb(var(--surface)/0.97)] p-3 shadow-[var(--shadow-floating)] backdrop-blur-xl" aria-label="Ответить">
        {attachment ? <AttachmentPreview attachment={attachment} onRemove={() => setAttachment(null)} /> : null}
        <div className="mb-2 flex gap-2 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {attachmentActions.map((item) => (
            <button
              key={`${item.kind}-${item.name}`}
              className="min-h-9 shrink-0 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-3 text-xs font-black text-[rgb(var(--primary))]"
              type="button"
              onClick={() => setAttachment(item)}
            >
              {item.kind === "image" ? "Фото" : item.kind === "video" ? "Видео" : "Файл"}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-2">
          <input
            aria-label="Сообщение"
            className="min-h-11 min-w-0 rounded-full border border-[rgb(var(--border))] bg-[rgb(var(--canvas))] px-4 text-sm font-semibold"
            placeholder={conversation.placeholder}
            value={text}
            onChange={(event) => setText(event.target.value)}
          />
          <button
            className="min-h-11 rounded-full border-0 bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))] disabled:opacity-50"
            type="button"
            disabled={!text.trim() && !attachment}
            onClick={sendMessage}
          >
            Отправить
          </button>
        </div>
      </section>
    </DriverShell>
  );
}

function AttachmentPreview({ attachment, compact = false, onRemove }: { attachment: Attachment; compact?: boolean; onRemove?: () => void }) {
  const stateText = attachment.state === "ready" ? "Готово к отправке" : attachment.state === "uploading" ? "Загружается" : "Demo: ошибка загрузки";
  const kindText = attachment.kind === "image" ? "Фото" : attachment.kind === "video" ? "Видео" : "Файл";
  return (
    <div className={["mt-2 rounded-[14px] bg-[rgb(var(--canvas))] p-3 text-xs", compact ? "max-w-full" : "mb-2"].join(" ")}>
      <div className="flex items-center justify-between gap-2">
        <span className="font-black text-[rgb(var(--primary))]">{kindText}</span>
        <span className={attachment.state === "failed" ? "font-black text-[rgb(var(--destructive))]" : "text-[rgb(var(--text-muted))]"}>{stateText}</span>
      </div>
      <div className="mt-1 truncate font-semibold">{attachment.name}</div>
      {attachment.kind === "image" ? <div className="mt-2 h-14 rounded-[12px] bg-[linear-gradient(135deg,rgb(var(--surface-tint)),rgb(var(--surface)))]" aria-label="Предпросмотр фото" /> : null}
      {onRemove ? <button className="mt-2 border-0 bg-transparent p-0 text-xs font-black text-[rgb(var(--primary))]" type="button" onClick={onRemove}>Убрать перед отправкой</button> : null}
    </div>
  );
}
