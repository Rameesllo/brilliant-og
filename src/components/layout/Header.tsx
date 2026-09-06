"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { 
  Bell, 
  ChevronDown, 
  LogOut, 
  User, 
  Menu,
  Sparkles
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";

export interface HeaderProps {
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
  userRole?: "ADMIN" | "EMPLOYEE";
  userName?: string;
  userEmail?: string;
  onMobileMenuToggle?: () => void;
}

interface HeaderNotification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "ALERT";
  isRead: boolean;
  link: string;
  createdAt: string;
}

function formatNotificationTime(createdAt: string) {
  const elapsedMinutes = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60000);
  if (elapsedMinutes < 1) return "Just now";
  if (elapsedMinutes < 60) return `${elapsedMinutes} min ago`;
  const elapsedHours = Math.floor(elapsedMinutes / 60);
  if (elapsedHours < 24) return `${elapsedHours} hr ago`;
  return `${Math.floor(elapsedHours / 24)} day ago`;
}

export const Header: React.FC<HeaderProps> = ({
  title,
  breadcrumbs,
  userRole = "ADMIN",
  userName = userRole === "ADMIN" ? "Ramees Llo" : "Ramees Llo",
  userEmail = userRole === "ADMIN" ? "rameesllo78@gmail.com" : "rameesllo78@gmail.com",
  onMobileMenuToggle,
}) => {
  const router = useRouter();
  const [profileOpen, setProfileOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);
  const [notifications, setNotifications] = useState<HeaderNotification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    fetch("/api/notifications?limit=5")
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data) {
          setNotifications(data.notifications || []);
          setUnreadCount(data.unreadCount || 0);
        }
      })
      .catch(() => {});
  }, []);

  const handleNotificationClick = async (notification: HeaderNotification) => {
    if (!notification.isRead) {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [notification.id] }),
      }).catch(() => {});
      setNotifications((current) => current.map((item) =>
        item.id === notification.id ? { ...item, isRead: true } : item
      ));
      setUnreadCount((count) => Math.max(0, count - 1));
    }
    setNotificationsOpen(false);
    if (notification.link) router.push(notification.link);
  };

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      await fetch("/api/auth/logout", { method: "POST" });
    } finally {
      router.push("/login");
      router.refresh();
    }
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between h-16 px-4 sm:px-6 bg-white border-b border-[#E5E7EB]">
      {/* Left section: Mobile menu toggle + Title / Breadcrumbs */}
      <div className="flex items-center gap-3 sm:gap-4 min-w-0">
        <button
          type="button"
          onClick={onMobileMenuToggle}
          className="p-2 -ml-1 text-[#64748B] hover:text-[#111827] hover:bg-[#F8FAFC] rounded-lg lg:hidden transition-colors"
          aria-label="Toggle Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          {breadcrumbs && breadcrumbs.length > 0 && (
            <nav className="flex items-center gap-1.5 text-xs text-[#94A3B8] mb-0.5">
              {breadcrumbs.map((crumb, idx) => (
                <React.Fragment key={idx}>
                  {idx > 0 && <span>/</span>}
                  {crumb.href ? (
                    <Link
                      href={crumb.href}
                      className="hover:text-[#111827] transition-colors truncate"
                    >
                      {crumb.label}
                    </Link>
                  ) : (
                    <span className="text-[#64748B] truncate">{crumb.label}</span>
                  )}
                </React.Fragment>
              ))}
            </nav>
          )}
          <h1 className="text-lg sm:text-xl font-bold text-[#111827] tracking-tight truncate">
            {title}
          </h1>
        </div>
      </div>

      {/* Right section: System Badge, Notification & User Dropdown */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Notifications */}

        {/* Notifications */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setNotificationsOpen(!notificationsOpen);
              setProfileOpen(false);
            }}
            className="relative p-2 text-[#64748B] hover:text-[#111827] hover:bg-[#F8FAFC] rounded-lg transition-colors"
            aria-label="Notifications"
          >
            <Bell className="w-5 h-5" />
            {unreadCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 bg-[#F97316] text-white text-[9px] font-bold rounded-full ring-2 ring-white flex items-center justify-center">
                {unreadCount > 99 ? "99+" : unreadCount}
              </span>
            )}
          </button>

          {/* Notifications Dropdown */}
          {notificationsOpen && (
            <div className="absolute right-0 mt-2 w-80 bg-white rounded-xl border border-[#E5E7EB] shadow-lg py-2 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-[#F1F5F9] flex items-center justify-between">
                <span className="text-xs font-semibold text-[#111827]">Notifications</span>
                <span className="text-[11px] font-medium text-[#F97316]">
                  {unreadCount ? `${unreadCount} new` : "All read"}
                </span>
              </div>
              <div className="divide-y divide-[#F1F5F9] text-xs">
                {notifications.length === 0 ? (
                  <p className="px-4 py-6 text-center text-[11px] text-[#94A3B8]">No notifications yet</p>
                ) : notifications.map((notification) => (
                  <button
                    key={notification.id}
                    type="button"
                    onClick={() => handleNotificationClick(notification)}
                    className={`w-full text-left px-4 py-2.5 hover:bg-[#F8FAFC] transition-colors ${notification.isRead ? "" : "bg-[#FFF7ED]/60"}`}
                  >
                    <p className="font-medium text-[#111827]">{notification.title}</p>
                    <p className="text-[11px] text-[#64748B] mt-0.5">{notification.message}</p>
                    <span className="text-[10px] text-[#94A3B8]">{formatNotificationTime(notification.createdAt)}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* User Profile */}
        <div className="relative">
          <button
            type="button"
            onClick={() => {
              setProfileOpen(!profileOpen);
              setNotificationsOpen(false);
            }}
            className="flex items-center gap-2.5 p-1 sm:px-2 py-1 rounded-lg hover:bg-[#F8FAFC] border border-transparent hover:border-[#E5E7EB] transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-xs font-bold text-[#EA580C]">
              <User className="w-4 h-4 sm:hidden" aria-hidden="true" />
              <span className="hidden sm:block">
                {userName.split(" ").map(n => n[0]).join("")}
              </span>
            </div>
            <div className="hidden sm:block text-left">
              <div className="flex items-center gap-1.5">
                <span className="text-xs font-semibold text-[#111827] leading-none">{userName}</span>
                <Badge variant={userRole === "ADMIN" ? "orange" : "neutral"} size="sm" dot={false}>
                  {userRole}
                </Badge>
              </div>
              <span className="text-[11px] text-[#64748B] leading-none mt-0.5 block">{userEmail}</span>
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-[#94A3B8] hidden sm:block" />
          </button>

          {/* Profile Dropdown Menu */}
          {profileOpen && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl border border-[#E5E7EB] shadow-lg py-1.5 z-50 animate-in fade-in zoom-in-95">
              <div className="px-4 py-2 border-b border-[#F1F5F9] sm:hidden">
                <p className="text-xs font-semibold text-[#111827]">{userName}</p>
                <p className="text-[11px] text-[#64748B] truncate">{userEmail}</p>
              </div>

              <div className="px-2 py-1">
                {userRole === "ADMIN" ? (
                  <Link
                    href="/admin/settings"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#475569] hover:text-[#111827] hover:bg-[#F8FAFC] rounded-lg transition-colors"
                  >
                    <Sparkles className="w-4 h-4 text-[#94A3B8]" />
                    <span>Business Settings</span>
                  </Link>
                ) : (
                  <Link
                    href="/employee/profile"
                    onClick={() => setProfileOpen(false)}
                    className="flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#475569] hover:text-[#111827] hover:bg-[#F8FAFC] rounded-lg transition-colors"
                  >
                    <User className="w-4 h-4 text-[#94A3B8]" />
                    <span>My Profile</span>
                  </Link>
                )}

                <button
                  type="button"
                  onClick={() => { setProfileOpen(false); handleLogout(); }}
                  disabled={isLoggingOut}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs font-medium text-[#DC2626] hover:bg-[#FEF2F2] rounded-lg transition-colors mt-1 disabled:opacity-60"
                >
                  <LogOut className="w-4 h-4" />
                  <span>{isLoggingOut ? "Signing out…" : "Sign Out"}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
