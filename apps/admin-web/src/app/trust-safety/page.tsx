"use client";

import { useEffect, useMemo, useState } from "react";
import { AdminPageHeader, AdminPanel, AdminStatusBadge } from "../admin-shell";

type View = "reviews" | "safety";
type BadgeTone = "neutral" | "success" | "warning" | "danger" | "info";

const reviews = [
  {
    id: "REV-902",
    reviewer: "Dilshod Allamuratov",
    driver: "Azizbek Karimov",
    route: "Nukus → Urgench",
    rating: "2.0",
    tags: "Late pickup, communication",
    date: "Today",
    state: "Flagged",
    body: "Pickup point changed late and the driver did not explain clearly.",
    context: "Accepted seat request · Trip today 18:30",
  },
  {
    id: "REV-899",
    reviewer: "Gulnoza Bektemirova",
    driver: "Madina Yusupova",
    route: "Nukus → Khiva",
    rating: "5.0",
    tags: "Clean car, polite",
    date: "Yesterday",
    state: "Visible",
    body: "Very clean car and good communication before pickup.",
    context: "Completed trip · 3 passengers",
  },
  {
    id: "REV-884",
    reviewer: "Murod Qodirov",
    driver: "Sherzod Rakhimov",
    route: "Tashkent → Samarkand",
    rating: "3.0",
    tags: "Route clarity",
    date: "Mon",
    state: "Needs review",
    body: "The route was fine, but the pickup instruction was confusing.",
    context: "Whole-car request · Completed",
  },
];

const safetyCases = [
  {
    id: "SAF-441",
    severity: "Urgent",
    type: "Pickup conflict",
    person: "Passenger · Dilshod Allamuratov",
    trip: "Nukus → Urgench · Boarding",
    opened: "18m ago",
    owner: "Safety desk",
    status: "Open",
    summary:
      "Passenger reported aggressive behavior near pickup while trip was still in boarding window.",
    timeline: ["Report submitted", "Support ticket linked", "Safety desk assigned"],
  },
  {
    id: "SAF-438",
    severity: "Medium",
    type: "Parcel condition",
    person: "Receiver · Bekzod Ergashev",
    trip: "Nukus → Khiva · In progress",
    opened: "1h ago",
    owner: "Azamat",
    status: "Triaged",
    summary: "Receiver asked support to verify parcel condition before destination handoff.",
    timeline: ["Parcel report received", "Driver context attached", "Awaiting destination handoff"],
  },
  {
    id: "SAF-430",
    severity: "Low",
    type: "Review report",
    person: "Driver · Madina Yusupova",
    trip: "Tashkent → Samarkand · Completed",
    opened: "Today",
    owner: "Malika",
    status: "Reviewing",
    summary: "Driver disputed a low-rating tag and requested moderation review.",
    timeline: ["Review report created", "Prior reports checked"],
  },
];

function tone(value: string): BadgeTone {
  if (value === "Urgent" || value === "Flagged" || value === "Open") return "danger";
  if (value === "Medium" || value === "Needs review" || value === "Triaged") return "warning";
  if (value === "Visible") return "success";
  return "info";
}

export default function TrustSafetyPage() {
  const [view, setView] = useState<View>("reviews");
  const [selectedReviewId, setSelectedReviewId] = useState(reviews[0]!.id);
  const [selectedCaseId, setSelectedCaseId] = useState(safetyCases[0]!.id);
  const selectedReview = useMemo(
    () => reviews.find((review) => review.id === selectedReviewId) ?? reviews[0]!,
    [selectedReviewId],
  );
  const selectedCase = useMemo(
    () => safetyCases.find((item) => item.id === selectedCaseId) ?? safetyCases[0]!,
    [selectedCaseId],
  );

  useEffect(() => {
    if (new URLSearchParams(window.location.search).get("view") === "safety") {
      setView("safety");
    }
  }, []);

  return (
    <main className="p-5">
      <AdminPageHeader
        title={view === "reviews" ? "Reviews" : "Safety"}
        subtitle={
          view === "reviews"
            ? "Moderate quality signals and recurring driver/passenger feedback without punitive automation."
            : "Triage urgent safety reports with linked trip, support, and identity context."
        }
        actions={
          <div className="flex gap-2">
            <button
              className={[
                "rounded-[10px] px-3 py-2 text-sm font-black",
                view === "reviews"
                  ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                  : "border border-[rgb(var(--border))] bg-[rgb(var(--surface))]",
              ].join(" ")}
              onClick={() => setView("reviews")}
              type="button"
            >
              Reviews
            </button>
            <button
              className={[
                "rounded-[10px] px-3 py-2 text-sm font-black",
                view === "safety"
                  ? "bg-[rgb(var(--primary))] text-[rgb(var(--primary-foreground))]"
                  : "border border-[rgb(var(--border))] bg-[rgb(var(--surface))]",
              ].join(" ")}
              onClick={() => setView("safety")}
              type="button"
            >
              Safety
            </button>
          </div>
        }
      />

      {view === "reviews" ? (
        <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_470px]">
          <AdminPanel className="overflow-hidden" label="Review moderation queue">
            <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 sm:grid-cols-5">
              {[
                ["Total reviews", "1,284"],
                ["Avg rating", "4.72"],
                ["Flagged", "14"],
                ["Low trend", "+3%"],
                ["Top tag", "Pickup"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[104px] rounded-[12px] bg-[rgb(var(--surface-muted))] p-3"
                >
                  <div className="text-lg font-black">{value}</div>
                  <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</div>
                </div>
              ))}
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Reviewer</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Driver</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Route</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Rating</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">State</th>
                </tr>
              </thead>
              <tbody>
                {reviews.map((review) => (
                  <tr
                    key={review.id}
                    className={[
                      "cursor-pointer border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-muted))]",
                      selectedReview.id === review.id ? "bg-[rgb(var(--info-soft))]" : "",
                    ].join(" ")}
                    onClick={() => setSelectedReviewId(review.id)}
                  >
                    <td className="px-4 py-3">
                      <strong>{review.reviewer}</strong>
                      <span className="block text-xs text-[rgb(var(--text-muted))]">
                        {review.date}
                      </span>
                    </td>
                    <td className="px-4 py-3">{review.driver}</td>
                    <td className="px-4 py-3">{review.route}</td>
                    <td className="px-4 py-3 font-black">{review.rating}</td>
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={tone(review.state)}>{review.state}</AdminStatusBadge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminPanel>
          <AdminPanel className="overflow-hidden" label="Review detail">
            <div className="border-b border-[rgb(var(--border))] p-4">
              <h2 className="m-0 text-xl font-black">{selectedReview.id}</h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                {selectedReview.context}
              </p>
            </div>
            <div className="space-y-4 p-4">
              <section className="rounded-[12px] border border-[rgb(var(--border))] p-3">
                <h3 className="m-0 mb-2 text-sm font-black">Full review</h3>
                <p className="m-0 text-sm text-[rgb(var(--text-muted))]">{selectedReview.body}</p>
              </section>
              <section className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[rgb(var(--text-muted))]">Driver</span>
                  <strong>{selectedReview.driver}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgb(var(--text-muted))]">Passenger</span>
                  <strong>{selectedReview.reviewer}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgb(var(--text-muted))]">Tags</span>
                  <strong>{selectedReview.tags}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgb(var(--text-muted))]">Prior reports</span>
                  <strong>1 related signal</strong>
                </div>
              </section>
              <div className="grid grid-cols-2 gap-2">
                {["Hide review", "Report abuse", "Escalate", "Add note"].map((action) => (
                  <button
                    key={action}
                    className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </AdminPanel>
        </div>
      ) : (
        <div className="grid gap-4 min-[1380px]:grid-cols-[minmax(0,1fr)_470px]">
          <AdminPanel className="overflow-hidden" label="Safety case queue">
            <div className="grid gap-3 border-b border-[rgb(var(--border))] p-4 sm:grid-cols-4">
              {[
                ["Open safety cases", "9"],
                ["Urgent", "1"],
                ["Active-trip cases", "2"],
                ["Resolved today", "6"],
              ].map(([label, value]) => (
                <div
                  key={label}
                  className="min-w-[120px] rounded-[12px] bg-[rgb(var(--surface-muted))] p-3"
                >
                  <div className="text-lg font-black">{value}</div>
                  <div className="text-xs font-semibold text-[rgb(var(--text-muted))]">{label}</div>
                </div>
              ))}
            </div>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="text-left text-[11px] font-black uppercase tracking-[0.08em] text-[rgb(var(--text-muted))]">
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Severity</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Case</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Linked trip</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Owner</th>
                  <th className="border-b border-[rgb(var(--border))] px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {safetyCases.map((item) => (
                  <tr
                    key={item.id}
                    className={[
                      "cursor-pointer border-b border-[rgb(var(--border))] hover:bg-[rgb(var(--surface-muted))]",
                      selectedCase.id === item.id ? "bg-[rgb(var(--info-soft))]" : "",
                    ].join(" ")}
                    onClick={() => setSelectedCaseId(item.id)}
                  >
                    <td className="px-4 py-3">
                      <AdminStatusBadge tone={tone(item.severity)}>
                        {item.severity}
                      </AdminStatusBadge>
                    </td>
                    <td className="px-4 py-3">
                      <strong>{item.id}</strong>
                      <span className="block text-xs text-[rgb(var(--text-muted))]">
                        {item.type} · {item.opened}
                      </span>
                    </td>
                    <td className="px-4 py-3">{item.trip}</td>
                    <td className="px-4 py-3">{item.owner}</td>
                    <td className="px-4 py-3">{item.status}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </AdminPanel>
          <AdminPanel className="overflow-hidden" label="Safety case detail">
            <div className="border-b border-[rgb(var(--border))] p-4">
              <h2 className="m-0 text-xl font-black">{selectedCase.id}</h2>
              <p className="m-0 text-sm font-semibold text-[rgb(var(--text-muted))]">
                {selectedCase.person}
              </p>
            </div>
            <div className="space-y-4 p-4">
              <section className="rounded-[12px] border border-[rgb(var(--border))] p-3">
                <h3 className="m-0 mb-2 text-sm font-black">Incident summary</h3>
                <p className="m-0 text-sm text-[rgb(var(--text-muted))]">{selectedCase.summary}</p>
              </section>
              <section className="grid gap-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-[rgb(var(--text-muted))]">Trip context</span>
                  <strong className="text-right">{selectedCase.trip}</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgb(var(--text-muted))]">Support ticket</span>
                  <strong>Linked</strong>
                </div>
                <div className="flex justify-between">
                  <span className="text-[rgb(var(--text-muted))]">Report metadata</span>
                  <strong>Telegram + in-app</strong>
                </div>
              </section>
              <section>
                <h3 className="m-0 mb-2 text-sm font-black">Timeline</h3>
                <div className="grid gap-2">
                  {selectedCase.timeline.map((item, index) => (
                    <div key={item} className="grid grid-cols-[42px_1fr] gap-3 text-sm">
                      <span className="font-black text-[rgb(var(--text-muted))]">0{index + 1}</span>
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </section>
              <div className="grid grid-cols-2 gap-2">
                {["Assign", "Add note", "Contact support flow", "Resolve"].map((action) => (
                  <button
                    key={action}
                    className="rounded-[10px] border border-[rgb(var(--border))] bg-[rgb(var(--surface))] px-3 py-2 text-sm font-black"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          </AdminPanel>
        </div>
      )}
    </main>
  );
}
