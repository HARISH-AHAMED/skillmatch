"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { markAsRead, markAllAsRead, getNotificationRedirectUrl } from "@/actions/notificationActions";
import { cn } from "@/lib/utils";
import { formatTimestamp } from "@/lib/dates";
import { useRouter } from "next/navigation";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date | string;
}

interface NotificationCenterProps {
  initialNotifications?: NotificationItem[];
  align?: "left" | "right";
}

export function NotificationCenter({ initialNotifications = [], align = "right" }: NotificationCenterProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (res.ok) {
          const data = await res.json();
          setNotifications(data);
        }
      } catch (error) {
        console.error("Failed to load notifications client-side:", error);
      }
    };

    fetchNotifications();

    // Poll for notifications in the background every 25 seconds
    const interval = setInterval(fetchNotifications, 25000);
    return () => clearInterval(interval);
  }, []);

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
    // Mark as read immediately if unread
    if (!notif.read) {
      await handleRead(notif.id);
    }
    
    // Close popover
    setIsOpen(false);
    
    // Fetch redirect URL and navigate
    try {
      const url = await getNotificationRedirectUrl(notif.id);
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
    <div className="relative">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="relative p-2 text-[#5B6272] hover:text-[#1A1D29] rounded-full hover:bg-[#F8F9FB] transition-colors focus:outline-none cursor-pointer text-xs font-medium"
        aria-label="Notifications"
        suppressHydrationWarning={true}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#C22B2B] text-[11px] font-bold text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          {/*
            #12 — the panel sat at z-40 while the Navbar is `sticky top-0 z-50`,
            so on mobile it rendered *underneath* the header. Both layers now sit
            above the header and still below Modal (z-[400]).

            On mobile it is bounded top and bottom (`top-16 bottom-4`) instead of
            growing downward from a fixed top, so it can never overflow the
            viewport, and `dvh` accounts for mobile browser chrome. It clears the
            header rather than covering it.
          */}
          <div className="fixed inset-0 z-[55]" onClick={() => setIsOpen(false)} />
          <div className={cn(
            "fixed inset-x-4 top-16 bottom-4 flex flex-col",
            "md:absolute md:inset-x-auto md:bottom-auto md:top-auto md:mt-2.5 md:w-96 md:max-w-none",
            "bg-white border border-[#E3E5EA] shadow-lg rounded-lg p-4 z-[60] animate-in fade-in slide-in-from-top-3 duration-150",
            align === "left" ? "md:left-0 md:right-auto" : "md:right-0 md:left-auto"
          )}>
            <div className="flex items-center justify-between border-b border-[#E3E5EA] pb-2.5 mb-3">
              <h3 className="font-medium text-[#1A1D29] text-sm">Notifications</h3>
              {unreadCount > 0 && (
                <button
                  onClick={handleReadAll}
                  className="flex items-center gap-1 text-xs text-[#2159C9] hover:text-[#2159C9] font-medium transition-colors cursor-pointer"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all read
                </button>
              )}
            </div>

            <div className="min-h-0 flex-1 overflow-y-auto space-y-2 pr-1 md:max-h-96 md:flex-none">
              {notifications.length === 0 ? (
                <p className="text-xs text-[#5B6272] text-center py-6">No notifications yet.</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      // #3 — unread is carried by a left accent rail and a solid
                      // white card; read items lose the rail but keep full-strength
                      // text. The previous `opacity-80` on grey-on-grey was the
                      // low-contrast state, not a legibility-safe one.
                      "p-3 rounded-lg border transition-all flex justify-between gap-2.5 items-start cursor-pointer hover:border-[#C7CBD6] hover:bg-[#F8F9FB]",
                      notif.read
                        ? "bg-[#F8F9FB] border-[#E3E5EA]"
                        : "bg-white border-[#C7D9F7] border-l-[3px] border-l-[#2159C9]"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start gap-1.5 flex-wrap">
                        <p
                          className={cn(
                            "text-xs tracking-tight text-[#1A1D29]",
                            notif.read ? "font-medium" : "font-bold"
                          )}
                        >
                          {notif.title}
                        </p>
                        {!notif.read && (
                          <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-[#C22B2B]" />
                        )}
                      </div>
                      <p className="text-xs text-[#5B6272] mt-1 leading-relaxed font-normal break-words">
                        {notif.message}
                      </p>
                      <p className="mt-1.5 text-[11px] font-medium text-[#5B6272]">
                        {formatTimestamp(notif.createdAt)}
                      </p>
                    </div>
                    {!notif.read && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation(); // Prevent card redirect click
                          handleRead(notif.id);
                        }}
                        className="p-1 rounded-full bg-[#F8F9FB] text-[#1A1D29] border border-[#E3E5EA] hover:bg-[#F0F3F9] cursor-pointer shrink-0 transition-colors"
                        title="Mark as read"
                      >
                        <Check className="h-3 w-3" />
                      </button>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}

