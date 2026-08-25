"use client";

import { useState } from "react";
import { Card, ClientHeader, ClientShell, Icon, StatusPill } from "../client-ui";

const tags = ["On time", "Clean car", "Polite", "Safe driving"];

export default function ClientReviewsPage() {
  const [rating, setRating] = useState(5);
  const [selectedTags, setSelectedTags] = useState<string[]>(["Clean car", "Safe driving"]);
  const [submitted, setSubmitted] = useState(false);

  function toggleTag(tag: string) {
    setSubmitted(false);
    setSelectedTags((current) =>
      current.includes(tag) ? current.filter((item) => item !== tag) : [...current, tag],
    );
  }

  return (
    <ClientShell active="profile">
      <ClientHeader
        backHref="/profile"
        level="secondary"
        title="Reviews"
        subtitle="Completed trips and feedback"
      />

      <Card className="mt-4" compact>
        <div className="grid grid-cols-[1fr_auto] gap-3">
          <div>
            <p className="m-0 text-xs font-black uppercase tracking-[0.12em] text-[rgb(var(--primary))]">
              Your review activity
            </p>
            <h2 className="m-0 mt-1 text-3xl font-black">4.9</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Based on completed ride feedback.
            </p>
          </div>
          <span className="grid h-14 w-14 place-items-center rounded-full bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]">
            <Icon name="star" className="h-7 w-7" />
          </span>
        </div>
      </Card>

      <Card className="mt-3 space-y-3.5" compact>
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="m-0 text-lg font-black">Review Azizbek</h2>
            <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
              Nukus to Urgench · completed today
            </p>
          </div>
          <StatusPill tone={submitted ? "success" : "warning"}>
            {submitted ? "Submitted" : "Pending"}
          </StatusPill>
        </div>

        <div className="grid grid-cols-5 gap-2" aria-label="Overall rating">
          {[1, 2, 3, 4, 5].map((nextRating) => (
            <button
              key={nextRating}
              aria-pressed={rating === nextRating}
              className={[
                "grid min-h-11 place-items-center rounded-full text-sm font-black shadow-[var(--shadow-xs)]",
                nextRating <= rating
                  ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                  : "bg-[rgb(var(--canvas))] text-[rgb(var(--text-muted))]",
              ].join(" ")}
              type="button"
              onClick={() => {
                setRating(nextRating);
                setSubmitted(false);
              }}
            >
              {nextRating}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          {tags.map((tag) => (
            <button
              key={tag}
              aria-pressed={selectedTags.includes(tag)}
              className={[
                "min-h-10 rounded-full px-4 text-sm font-black",
                selectedTags.includes(tag)
                  ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                  : "bg-[rgb(var(--surface-tint))] text-[rgb(var(--primary))]",
              ].join(" ")}
              type="button"
              onClick={() => toggleTag(tag)}
            >
              {tag}
            </button>
          ))}
        </div>

        <label className="grid gap-1">
          <span className="text-xs font-bold text-[rgb(var(--text-muted))]">Optional comment</span>
          <textarea
            className="min-h-16 rounded-[18px] border-0 bg-[rgb(var(--canvas))] p-3 text-sm font-semibold outline-none"
            placeholder="Share a short note"
            onChange={() => setSubmitted(false)}
          />
        </label>
        <button
          className="min-h-11 rounded-full bg-[rgb(var(--primary))] px-4 text-sm font-black text-[rgb(var(--primary-foreground))]"
          type="button"
          onClick={() => setSubmitted(true)}
        >
          {submitted ? "Review submitted" : "Submit review"}
        </button>
      </Card>

      <Card className="mt-3" compact>
        <h2 className="m-0 mb-3 text-lg font-black">Review history</h2>
        <div className="grid gap-2">
          {["Clean vehicle and clear pickup", "Parcel handover was careful"].map((review) => (
            <div key={review} className="rounded-[18px] bg-[rgb(var(--canvas))] p-2.5">
              <div className="flex items-center gap-2 text-sm font-black">
                <Icon name="star" className="h-4 w-4 text-[rgb(var(--gold))]" /> 5.0
              </div>
              <p className="m-0 mt-1 text-sm font-semibold text-[rgb(var(--text-muted))]">
                {review}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </ClientShell>
  );
}
