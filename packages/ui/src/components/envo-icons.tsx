import type { ReactNode, SVGProps } from "react";

export type EnvoIconName =
  | "achievement" | "attachment" | "back" | "baggage" | "camera" | "cancelled" | "check" | "close"
  | "completed" | "complaint" | "date" | "delete" | "drawing" | "edit" | "emergency" | "favorite"
  | "fill" | "filter" | "from" | "home" | "info" | "message" | "more" | "notification" | "parcel"
  | "passenger" | "photo" | "pickup" | "preferences" | "profile" | "promo" | "protection" | "referral"
  | "request" | "return" | "reverse" | "reward" | "route" | "safety" | "search" | "seat" | "send"
  | "support" | "ticket" | "time" | "to" | "trip" | "vehicle" | "video" | "voice" | "waiting" | "whole-car";

const iconPaths: Record<EnvoIconName, ReactNode> = {
  achievement: <path d="M8 5h8v5a4 4 0 0 1-8 0V5Zm-2 1H4v2a3 3 0 0 0 3 3m11-5h2v2a3 3 0 0 1-3 3M10 18h4m-5 3h6" />,
  attachment: <path d="m8 12 5.7-5.7a3 3 0 0 1 4.2 4.2l-7 7a4.5 4.5 0 0 1-6.4-6.4l7.1-7.1" />,
  back: <path d="m15 6-6 6 6 6" />,
  baggage: <path d="M9 7V5.8A1.8 1.8 0 0 1 10.8 4h2.4A1.8 1.8 0 0 1 15 5.8V7M6 7h12v12H6V7Zm3 4v4m6-4v4" />,
  camera: <path d="M7 8h2l1.2-2h3.6L15 8h2a3 3 0 0 1 3 3v5a3 3 0 0 1-3 3H7a3 3 0 0 1-3-3v-5a3 3 0 0 1 3-3Zm5 8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  cancelled: <path d="M7 7l10 10M17 7 7 17M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  check: <path d="m5 12 4 4L19 6" />,
  close: <path d="m7 7 10 10M17 7 7 17" />,
  completed: <path d="M7 12.5 10.5 16 18 8M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  complaint: <path d="M5 18v-4.5A7.5 7.5 0 1 1 9.5 20H6.8A1.8 1.8 0 0 1 5 18Zm7-10v4m0 3h.01" />,
  date: <path d="M7 4v3m10-3v3M5 8h14M6 6h12a1 1 0 0 1 1 1v11a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V7a1 1 0 0 1 1-1Z" />,
  delete: <path d="M8 7h8m-7 0 .6 12h4.8L15 7M10 7V5h4v2" />,
  drawing: <path d="M5 7h14v3a2 2 0 0 0 0 4v3H5v-3a2 2 0 0 0 0-4V7Zm7 2.5v5" />,
  edit: <path d="M5 19h4l9.5-9.5a2.1 2.1 0 0 0-3-3L6 16v3Zm9-11 3 3" />,
  emergency: <path d="M12 3 4 19h16L12 3Zm0 6v4m0 3h.01" />,
  favorite: <path d="M12 20s-7-4.4-7-10a3.8 3.8 0 0 1 6.8-2.4A3.8 3.8 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  fill: <path d="M5 17c4.8 0 6.2-7 14-7M15 7l4 3-4 3M7 7h4m-4 4h2" />,
  filter: <path d="M5 7h14M8 12h8m-5 5h2" />,
  from: <path d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11Zm0-8a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" />,
  home: <path d="M4 11.5 12 5l8 6.5V19a1 1 0 0 1-1 1h-5v-5h-4v5H5a1 1 0 0 1-1-1v-7.5Z" />,
  info: <path d="M12 11v6m0-9h.01M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  message: <path d="M5 18v-4.5A7.5 7.5 0 1 1 9.5 20H6.8A1.8 1.8 0 0 1 5 18Z" />,
  more: <path d="M6 12h.01M12 12h.01M18 12h.01" />,
  notification: <path d="M8 17h8M9 17a3 3 0 0 0 6 0M6 14h12l-1.6-2.2V8.8a4.4 4.4 0 0 0-8.8 0v3L6 14Z" />,
  parcel: <path d="m12 4 7 4-7 4-7-4 7-4Zm-7 4v8l7 4 7-4V8M12 12v8" />,
  passenger: <path d="M12 12a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm-6 8a6 6 0 0 1 12 0" />,
  photo: <path d="M5 6h14v12H5V6Zm3 9 3-3 2 2 2-3 2 4M8 9h.01" />,
  pickup: <path d="M5 16c4 0 4-8 8-8h6m-3-3 3 3-3 3M5 19h.01" />,
  preferences: <path d="M6 7h12M8 7v4m8-4v4M6 17h12m-7-4v4m5-4v4" />,
  profile: <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0" />,
  promo: <path d="M5 9h10l4-3v12l-4-3H5V9Zm3 6v3" />,
  protection: <path d="M12 3 5 6v5c0 4.2 2.8 7.6 7 10 4.2-2.4 7-5.8 7-10V6l-7-3Zm-3 8 2 2 4-4" />,
  referral: <path d="M8 11a3 3 0 1 0 0-6 3 3 0 0 0 0 6Zm8 4a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM3 20a5 5 0 0 1 8-4m2 4a5 5 0 0 1 8 0" />,
  request: <path d="M6 5h12v14H6V5Zm3 4h6m-6 4h4m3-9v4" />,
  return: <path d="M18 7H9a4 4 0 0 0 0 8h8M12 11l5 4-5 4" />,
  reverse: <path d="M7 7h10l-3-3m3 3-3 3M17 17H7l3 3m-3-3 3-3" />,
  reward: <path d="M7 5h10v5a5 5 0 0 1-10 0V5Zm3 13h4m-5 3h6" />,
  route: <path d="M6 6h.01M18 18h.01M6 6c8 0 12 2 12 6s-4 6-12 6" />,
  safety: <path d="M12 3 5 6v5c0 4.2 2.8 7.6 7 10 4.2-2.4 7-5.8 7-10V6l-7-3Z" />,
  search: <path d="m17 17 4 4M11 18a7 7 0 1 1 0-14 7 7 0 0 1 0 14Z" />,
  seat: <path d="M8 5h5a3 3 0 0 1 3 3v4H9a3 3 0 0 1-3-3V7a2 2 0 0 1 2-2Zm1 7v7m7-7v7M7 19h11" />,
  send: <path d="M4 12 20 5l-7 16-2-7-7-2Z" />,
  support: <path d="M5 13a7 7 0 0 1 14 0v3a3 3 0 0 1-3 3h-2m-9-6h3v5H5v-5Zm11 0h3v5h-3v-5Z" />,
  ticket: <path d="M5 7h14v3a2 2 0 0 0 0 4v3H5v-3a2 2 0 0 0 0-4V7Z" />,
  time: <path d="M12 6v6l4 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  to: <path d="M12 21s6-5.2 6-11a6 6 0 0 0-12 0c0 5.8 6 11 6 11Zm-2-11 1.5 1.5L15 8" />,
  trip: <path d="M5 16c3.5 0 4.5-8 9-8h5m-4-3 4 3-4 3M5 16h.01M19 8h.01" />,
  vehicle: <path d="M6 14h12l-1.6-3.8A2 2 0 0 0 14.6 9H9.4a2 2 0 0 0-1.8 1.2L6 14Zm1 0v4m10-4v4M8.5 18h.01m7 0h.01" />,
  video: <path d="M5 7h10v10H5V7Zm10 4 5-3v8l-5-3" />,
  voice: <path d="M12 4a2 2 0 0 1 2 2v5a2 2 0 1 1-4 0V6a2 2 0 0 1 2-2Zm-5 7a5 5 0 0 0 10 0m-5 5v4m-3 0h6" />,
  waiting: <path d="M12 6v6l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />,
  "whole-car": <path d="M5 13h14l-1.5-4A2 2 0 0 0 15.6 8H8.4a2 2 0 0 0-1.9 1.3L5 13Zm1 0v5m12-5v5M8 16h8" />,
};

export function EnvoIcon({ name, className = "", strokeWidth = 2, ...props }: SVGProps<SVGSVGElement> & { name: EnvoIconName }) {
  return (
    <svg aria-hidden="true" className={className} fill="none" height="20" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth={strokeWidth} viewBox="0 0 24 24" width="20" {...props}>
      {iconPaths[name]}
    </svg>
  );
}