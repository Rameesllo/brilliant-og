"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Pagination } from "@/components/ui/Pagination";
import { formatDate } from "@/lib/utils";
import {
  Bell,
  CheckCheck,
  Trash2,
  Info,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  ExternalLink,
} from "lucide-react";
import Link from "next/link";

interface Notification {
  id: string;
  title: string;
  message: string;
  type: "INFO" | "WARNING" | "SUCCESS" | "ALERT";
  isRead: boolean;
  link: string;
  createdAt: string;
  userName: string;
}

function typeIcon(type: string) {
  switch (type) {
    case "SUCCESS": return <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />;
    case "WARNING": return <AlertTriangle className="w-4 h-4 text-[#F59E0B]" />;
    case "ERROR": return <XCircle className="w-4 h-4 text-[#DC2626]" />;
    default: return <Info className="w-4 h-4 text-[#0284C7]" />;
  }
}

function typeBg(type: string) {
  switch (type) {
    case "SUCCESS": return "bg-[#F0FDF4] border-[#BBF7D0]";
    case "WARNING": return "bg-[#FFFBEB] border-[#FDE68A]";
    case "ERROR": return "bg-[#FEF2F2] border-[#FECACA]";
    default: return "bg-[#F0F9FF] border-[#BAE6FD]";
  }
}

export default function AdminNotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "30",
        ...(unreadOnly ? { unreadOnly: "true" } : {}),
      });
      const res = await fetch(`/api/notifications?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setNotifications(data.notifications || []);
      setUnreadCount(data.unreadCount || 0);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch {
      console.warn("Failed to load notifications");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, unreadOnly]);

  useEffect(() => {
    fetchNotifications();
  }, [fetchNotifications]);

  const markAllRead = async () => {
    await fetch("/api/notifications", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}) });
    fetchNotifications();
  };

  const markRead = async (id: string) => {
    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ids: [id] }),
    });
    fetchNotifications();
  };

  const clearRead = async () => {
    if (!confirm("Clear all read notifications? This cannot be undone.")) return;
    await fetch("/api/notifications", { method: "DELETE" });
    fetchNotifications();
  };

  return (
    <AdminLayout
      title="Notification Center"
      breadcrumbs={[{ label: "Admin Console" }, { label: "Notifications" }]}
    >
      <div className="space-y-6">
        {/* Header bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-[#E5E7EB] rounded-xl shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Bell className="w-5 h-5 text-[#6366F1]" />
              {unreadCount > 0 && (
                <span className="absolute -top-1.5 -right-1.5 w-4 h-4 bg-[#DC2626] text-white text-[10px] font-bold rounded-full flex items-center justify-center">
                  {unreadCount > 9 ? "9+" : unreadCount}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">
                {unreadCount > 0 ? `${unreadCount} Unread Notifications` : "All Caught Up"}
              </h2>
              <p className="text-xs text-[#64748B]">{pagination.total} total notifications</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => { setUnreadOnly(!unreadOnly); setCurrentPage(1); }}
              className={`text-xs px-3 py-1.5 rounded-lg border font-medium transition-colors ${
                unreadOnly
                  ? "bg-[#6366F1] text-white border-[#6366F1]"
                  : "bg-white text-[#64748B] border-[#E5E7EB] hover:bg-[#F8FAFC]"
              }`}
            >
              Unread Only
            </button>
            {unreadCount > 0 && (
              <Button
                variant="secondary"
                size="sm"
                leftIcon={<CheckCheck className="w-4 h-4 text-[#64748B]" />}
                onClick={markAllRead}
              >
                Mark All Read
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              leftIcon={<Trash2 className="w-4 h-4 text-[#DC2626]" />}
              className="text-[#DC2626] hover:bg-[#FEF2F2]"
              onClick={clearRead}
            >
              Clear Read
            </Button>
          </div>
        </div>

        {/* Notifications list */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>System Notifications</CardTitle>
              <CardDescription>Operational alerts, confirmations, and system events</CardDescription>
            </div>
          </CardHeader>
          <div className="divide-y divide-[#F1F5F9]">
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-start gap-4 p-4">
                  <div className="w-8 h-8 bg-[#F1F5F9] rounded-lg animate-pulse shrink-0" />
                  <div className="flex-1 space-y-2">
                    <div className="h-3 bg-[#F1F5F9] rounded animate-pulse w-1/3" />
                    <div className="h-3 bg-[#F1F5F9] rounded animate-pulse w-2/3" />
                  </div>
                </div>
              ))
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-16 gap-3">
                <Bell className="w-10 h-10 text-[#CBD5E1]" />
                <p className="text-sm font-medium text-[#475569]">
                  {unreadOnly ? "No unread notifications" : "No notifications yet"}
                </p>
                <p className="text-xs text-[#94A3B8]">
                  Notifications will appear here as actions are performed
                </p>
              </div>
            ) : (
              notifications.map((notif) => (
                <div
                  key={notif.id}
                  className={`flex items-start gap-4 p-4 transition-colors ${
                    !notif.isRead ? "bg-[#FAFBFF]" : "hover:bg-[#FAFAFA]"
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg border flex items-center justify-center shrink-0 ${typeBg(notif.type)}`}>
                    {typeIcon(notif.type)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-[#111827]">{notif.title}</span>
                          {!notif.isRead && (
                            <span className="w-2 h-2 bg-[#6366F1] rounded-full shrink-0" />
                          )}
                        </div>
                        <p className="text-xs text-[#475569] mt-0.5 leading-relaxed">{notif.message}</p>
                        <div className="flex items-center gap-3 mt-1">
                          <span className="text-[11px] text-[#94A3B8]">{formatDate(notif.createdAt)}</span>
                          <Badge
                            variant={notif.type === "SUCCESS" ? "paid" : notif.type === "WARNING" ? "pending" : notif.type === "ALERT" ? "danger" : "neutral"}
                            size="sm"
                          >
                            {notif.type}
                          </Badge>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 shrink-0">
                        {notif.link && (
                          <Link href={notif.link}>
                            <Button variant="ghost" size="sm" className="h-7 px-2">
                              <ExternalLink className="w-3.5 h-3.5 text-[#64748B]" />
                            </Button>
                          </Link>
                        )}
                        {!notif.isRead && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2"
                            onClick={() => markRead(notif.id)}
                            title="Mark as read"
                          >
                            <CheckCheck className="w-3.5 h-3.5 text-[#64748B]" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
          <Pagination
            currentPage={pagination.page}
            totalPages={pagination.totalPages}
            totalItems={pagination.total}
            onPageChange={setCurrentPage}
          />
        </Card>
      </div>
    </AdminLayout>
  );
}
