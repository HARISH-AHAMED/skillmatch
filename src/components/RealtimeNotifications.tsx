"use client";

import React, { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import { Bell, X, MessageSquare, Briefcase, Star, CheckCircle2, AlertCircle } from "lucide-react";
import { markAsRead, getNotificationRedirectUrl } from "@/actions/notificationActions";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: Date | string;
}

interface ToastItem {
  id: string;
  title: string;
  message: string;
  createdAt: Date | string;
}

export function RealtimeNotifications() {
  const { data: session } = useSession();
  const router = useRouter();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const seenIdsRef = useRef<Set<string>>(new Set());
  const isFirstLoadRef = useRef<boolean>(true);

  useEffect(() => {
    if (!session?.user) {
      // Clear states if logged out
      setToasts([]);
      seenIdsRef.current.clear();
      isFirstLoadRef.current = true;
      return;
    }

    const checkNewNotifications = async () => {
      try {
        const res = await fetch("/api/notifications");
        if (!res.ok) return;

        const data: NotificationItem[] = await res.json();
        const unreadList = data.filter((n) => !n.read);

        // If it's the very first fetch on page load, populate the seen list without showing toasts
        if (isFirstLoadRef.current) {
          unreadList.forEach((n) => seenIdsRef.current.add(n.id));
          isFirstLoadRef.current = false;
          return;
        }

        // Find any unread notification that we haven't seen yet
        const newUnread = unreadList.filter((n) => !seenIdsRef.current.has(n.id));

        if (newUnread.length > 0) {
          const newToasts: ToastItem[] = [];

          newUnread.forEach((n) => {
            seenIdsRef.current.add(n.id);
            newToasts.push({
              id: n.id,
              title: n.title,
              message: n.message,
              createdAt: n.createdAt,
            });
          });

          // Add to current active toasts stack
          setToasts((prev) => [...prev, ...newToasts]);

          // Set timer to auto-dismiss each new toast after 6 seconds
          newToasts.forEach((toast) => {
            setTimeout(() => {
              setToasts((prev) => prev.filter((t) => t.id !== toast.id));
            }, 6000);
          });
        }
      } catch (error) {
        console.error("Failed to check real-time notifications:", error);
      }
    };

    // Initial check
    checkNewNotifications();

    // Poll every 5 seconds for fast real-time responsiveness
    const interval = setInterval(checkNewNotifications, 5000);
    return () => clearInterval(interval);
  }, [session]);

  const handleToastDismiss = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const handleToastClick = async (id: string) => {
    // Dismiss toast locally first
    handleToastDismiss(id);

    try {
      // Get redirect URL FIRST before doing anything else
      const url = await getNotificationRedirectUrl(id);

      // Mark as read in the background (fire-and-forget, don't await)
      markAsRead(id).catch((e) =>
        console.error("Failed to mark notification as read:", e)
      );

      // Navigate immediately
      if (url.includes("/workspace/")) {
        window.open(url, "_blank");
      } else {
        router.push(url);
      }
    } catch (error) {
      console.error("Failed to navigate from toast click:", error);
    }
  };

  // Helper to determine toast icon based on title content
  const getToastIcon = (title: string) => {
    const t = title.toLowerCase();
    if (t.includes("message") || t.includes("chat") || t.includes("💬")) {
      return <MessageSquare className="h-5 w-5 text-sky-500" />;
    }
    if (t.includes("hired") || t.includes("project") || t.includes("gig") || t.includes("💼")) {
      return <Briefcase className="h-5 w-5 text-indigo-500" />;
    }
    if (t.includes("review") || t.includes("rating") || t.includes("⭐")) {
      return <Star className="h-5 w-5 fill-amber-400 text-amber-400" />;
    }
    if (t.includes("completed") || t.includes("milestone") || t.includes("✓") || t.includes("read")) {
      return <CheckCircle2 className="h-5 w-5 text-emerald-500" />;
    }
    return <AlertCircle className="h-5 w-5 text-rose-500" />;
  };

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-6 right-6 z-55 flex flex-col gap-3.5 max-w-sm w-[calc(100vw-3rem)] pointer-events-none">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          onClick={() => handleToastClick(toast.id)}
          className={cn(
            "pointer-events-auto p-4 bg-white/95 backdrop-blur-md border border-slate-200/90 shadow-2xl rounded-2xl flex gap-3.5 items-start cursor-pointer transition-all duration-300 transform translate-y-0 scale-100 hover:scale-102 hover:border-sky-300 hover:shadow-sky-200/30",
            "animate-in slide-in-from-bottom-5 slide-in-from-right-5 duration-300"
          )}
        >
          {/* Icon indicator */}
          <div className="p-2 bg-slate-50 border border-slate-100 rounded-xl shrink-0">
            {getToastIcon(toast.title)}
          </div>

          {/* Details */}
          <div className="flex-grow min-w-0 pr-4">
            <h4 className="text-xs font-black text-[#002d59] tracking-tight truncate">
              {toast.title}
            </h4>
            <p className="text-[11px] text-slate-650 mt-0.5 leading-relaxed font-medium line-clamp-2">
              {toast.message}
            </p>
            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mt-1.5 block">
              Just Now
            </span>
          </div>

          {/* Dismiss button */}
          <button
            onClick={(e) => {
              e.stopPropagation(); // Avoid triggering card redirect click
              handleToastDismiss(toast.id);
            }}
            className="absolute top-3.5 right-3.5 p-1 text-slate-400 hover:text-slate-700 bg-slate-50 hover:bg-slate-100 rounded-lg transition-colors cursor-pointer"
            title="Dismiss notification"
          >
            <X className="h-3 w-3" />
          </button>
        </div>
      ))}
    </div>
  );
}
