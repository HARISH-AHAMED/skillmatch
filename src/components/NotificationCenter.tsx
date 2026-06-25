"use client";

import React, { useState, useEffect } from "react";
import { Bell, Check, CheckCheck } from "lucide-react";
import { markAsRead, markAllAsRead, getNotificationRedirectUrl } from "@/actions/notificationActions";
import { cn } from "@/lib/utils";
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
        className="relative p-2 text-slate-500 hover:text-[#002d59] rounded-xl hover:bg-slate-100/80 transition-colors focus:outline-none cursor-pointer text-xs font-bold"
        aria-label="Notifications"
        suppressHydrationWarning={true}
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white ring-2 ring-white">
            {unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setIsOpen(false)} />
          <div className={cn(
            "fixed inset-x-4 top-16 md:absolute md:top-auto md:mt-2.5 md:w-96 md:max-w-none bg-white border border-slate-200/80 shadow-2xl rounded-2xl p-4 z-40 animate-in fade-in slide-in-from-top-3 duration-200",
            align === "left" ? "md:left-0 md:right-auto" : "md:right-0 md:left-auto"
          )}>
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5 mb-3">
              <h3 className="font-bold text-[#002d59] text-sm">Notifications</h3>
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

            <div className="max-h-[calc(100vh-12rem)] md:max-h-96 overflow-y-auto space-y-2.5 pr-1">
              {notifications.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-6">No notifications yet.</p>
              ) : (
                notifications.map((notif) => (
                  <div
                    key={notif.id}
                    onClick={() => handleNotificationClick(notif)}
                    className={cn(
                      "p-3 rounded-xl border transition-all flex justify-between gap-2.5 items-start cursor-pointer hover:border-sky-300 hover:shadow-md hover:bg-slate-50/20",
                      notif.read
                        ? "bg-slate-50/50 border-slate-100/80 text-slate-500 opacity-80"
                        : "bg-white border-slate-200/60 shadow-sm text-slate-800 ring-1 ring-sky-100/30"
                    )}
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <p className="text-xs font-black text-[#002d59] tracking-tight">{notif.title}</p>
                        {!notif.read && (
                          <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                        )}
                      </div>
                      <p className="text-[11px] text-slate-600 mt-1 leading-relaxed font-medium break-words">
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
                          e.stopPropagation(); // Prevent card redirect click
                          handleRead(notif.id);
                        }}
                        className="p-1 rounded bg-sky-50 text-[#002d59] hover:bg-sky-100 cursor-pointer shrink-0 transition-colors"
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
