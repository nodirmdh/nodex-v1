"use client";

import { useState } from "react";
import { Card, ClientHeader, ClientShell, StatusPill } from "../../client-ui";

const languages = [
  { code: "ru", title: "Русский", subtitle: "Основной язык интерфейса" },
  { code: "uz", title: "O'zbekcha", subtitle: "Скоро будет доступно" },
  { code: "kaa", title: "Qaraqalpaqsha", subtitle: "Скоро будет доступно" },
];

export default function LanguagePage() {
  const [selected, setSelected] = useState("ru");

  return (
    <ClientShell active="profile">
      <ClientHeader
        backHref="/profile"
        level="secondary"
        title="Язык"
        subtitle="Русский выбран по умолчанию"
      />

      <Card className="mt-4 grid gap-2" compact>
        {languages.map((language) => (
          <button
            key={language.code}
            className="flex min-h-14 items-center justify-between gap-3 rounded-[20px] bg-[rgb(var(--canvas))] px-3 text-left"
            type="button"
            onClick={() => setSelected(language.code)}
          >
            <span>
              <span className="block text-sm font-black">{language.title}</span>
              <span className="block text-xs font-semibold text-[rgb(var(--text-muted))]">
                {language.subtitle}
              </span>
            </span>
            {selected === language.code ? (
              <StatusPill tone="success">Выбрано</StatusPill>
            ) : (
              <StatusPill>Скоро</StatusPill>
            )}
          </button>
        ))}
      </Card>
    </ClientShell>
  );
}
