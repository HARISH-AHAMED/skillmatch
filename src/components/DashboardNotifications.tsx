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
    if (!notif.read) {
      await handleRead(notif.id);
    }
    try {
      const url = await getNotificationRedirectUrl(notif.id);
      router.push(url);
    } catch (error) {
      console.error("Failed to redirect for notification:", error);
    }
  };

  return (
    <Card className="p-6 bg-white border border-[#E3E5EA] rounded-lg space-y-4 text-left">
      <div className="flex items-center justify-between border-b border-[#E3E5EA] pb-3">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-[#F8F9FB] text-[#1A1D29] border border-[#C7CBD6]">
            <Bell className="h-4.5 w-4.5 text-[#1A1D29]" />
          </div>
          <h3 className="font-semibold text-[#1A1D29] text-sm tracking-tight">
            Recent Notifications
          </h3>
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleReadAll}
            className="flex items-center gap-1 text-[11px] text-[#2159C9] hover:underline font-medium transition-colors cursor-pointer"
          >
            <CheckCheck className="h-3.5 w-3.5" />
            Mark all read
          </button>
        )}
      </div>

      <div className="space-y-3 max-h-96 overflow-y-auto pr-1">
        {notifications.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-center space-y-2">
            <div className="p-3 rounded-lg bg-[#F8F9FB] text-[#5B6272]">
              <Inbox className="h-6 w-6" />
            </div>
            <p className="text-xs text-[#5B6272] font-normal">All caught up! No notifications.</p>
          </div>
        ) : (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => handleNotificationClick(notif)}
              className={cn(
                "p-3.5 rounded-lg border transition-all flex justify-between gap-3 items-start cursor-pointer hover:border-[#1A1D29]",
                notif.read
                  ? "bg-[#F8F9FB] border-[#E3E5EA] text-[#5B6272]"
                  : "bg-white border-[#E3E5EA] text-[#1A1D29] font-medium"
              )}
            >
              <div className="flex-1 space-y-0.5 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-xs font-semibold text-[#1A1D29] tracking-tight">{notif.title}</p>
                  {!notif.read && (
                    <span className="h-1.5 w-1.5 rounded-full bg-[#152C55] shrink-0" />
                  )}
                </div>
                <p className="text-[11px] text-[#5B6272] leading-relaxed font-normal break-words">
                  {notif.message}
                </p>
                <p className="text-[11px] text-[#5B6272] font-medium uppercase tracking-wider mt-1.5">
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
                  className="p-1 rounded-full bg-[#F8F9FB] border border-[#E3E5EA] text-[#1A1D29] hover:bg-[#F0F3F9] transition-colors cursor-pointer shrink-0"
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
