"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, CheckCircle2, Clock, MessageSquare, RefreshCw, Star, Vote } from "lucide-react";

import { cn } from "@/lib/utils";

export type NotificationType =
  | "FEEDBACK_RECEIVED"
  | "VOTE_OPENED"
  | "PROPOSAL_DECISION"
  | "CHALLENGE_DEADLINE"
  | "SEASON_ADVANCED"
  | "SPOTLIGHT_PUBLISHED";

export type Notification = {
  id: string;
  type: NotificationType;
  title: string;
  body: string;
  href: string;
  createdAt: Date;
  read: boolean;
};

type NotificationCenterProps = {
  initialNotifications: Notification[];
};

const typeConfig: Record<
  NotificationType,
  { icon: React.ComponentType<{ className?: string }>; color: string }
> = {
  FEEDBACK_RECEIVED:  { icon: MessageSquare, color: "text-accent" },
  VOTE_OPENED:        { icon: Vote,          color: "text-info" },
  PROPOSAL_DECISION:  { icon: CheckCircle2,  color: "text-success" },
  CHALLENGE_DEADLINE: { icon: Clock,         color: "text-warn" },
  SEASON_ADVANCED:    { icon: RefreshCw,     color: "text-[#0f766e]" },
  SPOTLIGHT_PUBLISHED:{ icon: Star,          color: "text-[#b45309]" }
};

function relativeTime(date: Date): string {
  const now = Date.now();
  const diff = now - new Date(date).getTime();
  const mins = Math.floor(diff / 60_000);
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return days === 1 ? "Yesterday" : `${days}d ago`;
}

export function NotificationCenter({ initialNotifications }: NotificationCenterProps) {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);

  const unreadCount = notifications.filter((n) => !n.read).length;

  function markRead(id: string) {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
  }

  function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  }

  return (
    <div className="relative">
      {/* Bell button */}
      <button
        type="button"
        aria-label="Notifications"
        onClick={() => setOpen((v) => !v)}
        className="relative flex h-8 w-8 items-center justify-center rounded-lg border border-line bg-mist text-ink/65 transition hover:border-accent hover:text-ink"
      >
        <Bell className="h-4 w-4" />
        {unreadCount > 0 && (
          <span className="absolute -right-1 -top-1 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-danger px-1 font-mono text-[10px] font-semibold text-white leading-none">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <>
          {/* Overlay */}
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />

          {/* Dropdown */}
          <div className="absolute right-0 top-10 z-50 min-w-[340px] max-h-[480px] overflow-y-auto rounded-2xl border border-line bg-white shadow-card">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-line px-4 py-3">
              <p className="font-display text-sm font-semibold text-ink">Notifications</p>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  className="text-[12px] font-medium text-accent transition hover:text-accent-vivid"
                >
                  Mark all read
                </button>
              )}
            </div>

            {/* List */}
            {notifications.length === 0 ? (
              <div className="px-4 py-8 text-center text-sm text-ink/50">
                No notifications yet.
              </div>
            ) : (
              <ul>
                {notifications.map((n) => {
                  const { icon: Icon, color } = typeConfig[n.type];
                  return (
                    <li key={n.id}>
                      <Link
                        href={n.href}
                        onClick={() => { markRead(n.id); setOpen(false); }}
                        className={cn(
                          "flex gap-3 border-b border-line/60 px-4 py-3.5 transition-colors hover:bg-mist",
                          !n.read && "bg-accent-soft/30"
                        )}
                      >
                        <div className={cn("mt-0.5 flex-shrink-0", color)}>
                          <Icon className="h-4 w-4" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-[13px] font-semibold leading-snug text-ink">{n.title}</p>
                            {!n.read && (
                              <span className="mt-1 h-2 w-2 flex-shrink-0 rounded-full bg-accent" />
                            )}
                          </div>
                          <p className="mt-0.5 text-[12px] leading-5 text-ink/60 line-clamp-2">{n.body}</p>
                          <p className="mt-1 font-mono text-[10px] text-ink/40">{relativeTime(n.createdAt)}</p>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}

            {/* Footer */}
            <div className="border-t border-line px-4 py-3">
              <Link
                href="/"
                onClick={() => setOpen(false)}
                className="text-[13px] font-medium text-accent transition hover:text-accent-vivid"
              >
                View all activity →
              </Link>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
