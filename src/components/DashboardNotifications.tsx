"use client";

import React, { useState } from "react";
import { Bell, Check, CheckCheck, Inbox } from "lucide-react";
import { markAsRead, markAllAsRead, getNotificationRedirectUrl } from "@/actions/notificationActions";
import { cn } from "@/lib/utils";
import { Card } from "@/components/ui/Card";
import { useRouter } from "next/navigation";

export interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date | string;
}

interface DashboardNotificationsProps {
  initialNotifications: NotificationItem[];
}

export function DashboardNotifications({ initialNotifications }: DashboardNotificationsProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [prevInitialNotifications, setPrevInitialNotifications] = useState<NotificationItem[]>(initialNotifications);

  if (initialNotifications !== prevInitialNotifications) {
    setNotifications(initialNotifications);
    setPrevInitialNotifications(initialNotifications);
  }

  const unreadCount = notifications.filter((n) => !n.read).length;

  const handleRead = async (id: string) => {
    // Optimistic UI update
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, read: true } : n))
    );
    try {
      await markAsRead(id);
    } catch (error) {
      console.error("Failed to mark notification as read:", error);
    }
  };

  const handleReadAll = async () => {
    // Optimistic UI update
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try {
      await markAllAsRead();
    } catch (error) {
      console.error("Failed to mark all as read:", error);
    }
  };

  const handleNotificationClick = async (notif: NotificationItem) => {
    try {
      // Get redirect URL FIRST before marking as read
      const url = await getNotificationRedirectUrl(notif.id);

      // Mark as read in background (fire-and-forget, don't block navigation)
      if (!notif.read) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === notif.id ? { ...n, read: true } : n))
        );
        markAsRead(notif.id).catch((e) =>
          console.error("Failed to mark notification as read:", e)
        );
      }

      // Navigate
      if (url.includes("/workspace/")) {
        window.open(url, "_blank");
      } else {
        router.push(url);
      }
    } catch (error) {
      console.error("Failed to redirect for notification:", error);
    }
  };

  return (
    <Card className="p-6 bg-white border border-slate-200/60 shadow-md rounded-2xl space-y-4">
      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-sky-50 text-[#002d59]">
            <Bell className="h-4.5 w-4.5 text-[#3ac0ff]" />
          </div>
          <h3 className="font-black text-[#002d59] text-sm tracking-tight">
            Recent Notifications
          </h3>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleReadAll}
            className="flex items-center gap-1 text-[11px] text-[#3ac0ff] hover:text-[#002d59] font-bold transition-colors cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <div className="p-3 rounded-full bg-slate-50 text-slate-400">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="text-xs text-slate-500 font-medium">All caught up! No notifications.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={cn(
                "p-3.5 rounded-xl border transition-all flex justify-between gap-3 items-start cursor-pointer hover:border-sky-300 hover:shadow-md hover:bg-slate-50/10",
                notif.read
                  ? "bg-slate-50/50 border-slate-100 text-slate-500 opacity-80"
                  : "bg-white border-slate-200/60 shadow-sm text-slate-800 ring-1 ring-sky-100/30"
              )}
            >
              <div className="flex-1 space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-black text-[#002d59] tracking-tight">{notif.title}</p>
                  {!notif.read && (
                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed font-medium break-words">
                  {notif.message}
                </p>
                <p className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5">
                  {new Date(notif.createdAt).toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                  })}
                </p>
              </div>
              {!notif.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRead(notif.id);
                  }}
                  title="Mark as read"
                  className="p-1 rounded-lg bg-sky-50 text-[#002d59] hover:bg-sky-100 transition-colors cursor-pointer shrink-0"
                >
                  <Check className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
