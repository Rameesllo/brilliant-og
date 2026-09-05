"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Pagination } from "@/components/ui/Pagination";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { Shield, RefreshCw } from "lucide-react";

interface LogEntry {
  id: string;
  userId: string;
  userName: string;
  userEmail: string;
  userRole: string;
  action: string;
  entityType: string;
  entityId: string;
  details: Record<string, unknown> | null;
  ipAddress: string;
  createdAt: string;
}

function ActionBadge({ action }: { action: string }) {
  const lower = action.toLowerCase();
  if (lower.includes("delete") || lower.includes("rejected") || lower.includes("cancelled"))
    return <Badge variant="danger" size="sm">{action}</Badge>;
  if (lower.includes("created") || lower.includes("confirmed") || lower.includes("approved") || lower.includes("paid"))
    return <Badge variant="paid" size="sm">{action}</Badge>;
  if (lower.includes("updated") || lower.includes("changed") || lower.includes("assigned"))
    return <Badge variant="pending" size="sm">{action}</Badge>;
  return <Badge variant="neutral" size="sm">{action}</Badge>;
}

export default function AdminActivityPage() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [entityTypes, setEntityTypes] = useState<string[]>([]);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [currentPage, setCurrentPage] = useState(1);
  const [search, setSearch] = useState("");
  const [entityType, setEntityType] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);

  const fetchLogs = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "50",
        ...(search ? { search } : {}),
        ...(entityType ? { entityType } : {}),
        ...(startDate ? { startDate } : {}),
        ...(endDate ? { endDate } : {}),
      });
      const res = await fetch(`/api/activity-logs?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setLogs(data.logs || []);
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
      if (data.entityTypes?.length > 0) {
        setEntityTypes(data.entityTypes);
      }
    } catch {
      console.warn("Failed to load activity logs");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, search, entityType, startDate, endDate]);

  useEffect(() => {
    const timer = setTimeout(() => setCurrentPage(1), 300);
    return () => clearTimeout(timer);
  }, [search, entityType, startDate, endDate]);

  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  const entityTypeOptions = [
    { value: "", label: "All Entity Types" },
    ...entityTypes.map((t) => ({ value: t, label: t })),
  ];

  const exportCSV = () => {
    const rows = [
      ["Timestamp", "User", "Role", "Action", "Entity Type", "Entity ID", "Details"],
      ...logs.map((log) => [
        log.createdAt,
        log.userName,
        log.userRole,
        log.action,
        log.entityType,
        log.entityId,
        log.details ? JSON.stringify(log.details) : "",
      ]),
    ];
    const csv = rows.map((r) => r.map((v) => `"${String(v).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `activity_log_${new Date().toISOString().split("T")[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <AdminLayout
      title="Activity Log"
      breadcrumbs={[{ label: "Admin Console" }, { label: "Activity Log" }]}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-[#E5E7EB] rounded-xl shadow-2xs">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-[#EEF2FF] border border-[#C7D2FE] rounded-xl flex items-center justify-center">
              <Shield className="w-4 h-4 text-[#6366F1]" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-[#111827]">Immutable Audit Trail</h2>
              <p className="text-xs text-[#64748B]">
                {pagination.total.toLocaleString()} events recorded
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4 text-[#64748B]" />}
              onClick={fetchLogs}
              isLoading={isLoading}
            >
              Refresh
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={exportCSV}
              disabled={logs.length === 0}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search actions, entities, users..."
            className="flex-1 min-w-48"
          />
          <Select
            value={entityType}
            onChange={(e) => setEntityType(e.target.value)}
            options={entityTypeOptions}
            className="w-44"
          />
          <Input
            label=""
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            placeholder="From date"
            className="w-36"
          />
          <Input
            label=""
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            placeholder="To date"
            className="w-36"
          />
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>System Activity Log</CardTitle>
              <CardDescription>
                All administrative actions are recorded here and cannot be deleted or modified
              </CardDescription>
            </div>
            <span className="text-xs text-[#64748B] font-medium">
              {isLoading ? "Loading..." : `${pagination.total} events`}
            </span>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Timestamp</TableHead>
                  <TableHead>User</TableHead>
                  <TableHead>Action</TableHead>
                  <TableHead>Entity</TableHead>
                  <TableHead>Details</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-[#F1F5F9] rounded animate-pulse w-24" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : logs.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5}>
                      <div className="text-center py-12">
                        <Shield className="w-10 h-10 text-[#CBD5E1] mx-auto mb-3" />
                        <p className="text-sm font-medium text-[#475569]">No activity logs found</p>
                        <p className="text-xs text-[#94A3B8] mt-1">Try adjusting your filters</p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  logs.map((log) => (
                    <React.Fragment key={log.id}>
                      <TableRow
                        className="cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                        onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                      >
                        <TableCell>
                          <div className="text-xs text-[#111827] font-medium">
                            {new Date(log.createdAt).toLocaleDateString()}
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-[#111827] text-xs">{log.userName}</div>
                          <div className="text-[11px] text-[#94A3B8]">{log.userRole}</div>
                        </TableCell>
                        <TableCell>
                          <ActionBadge action={log.action} />
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-[#334155]">{log.entityType}</div>
                          {log.entityId && (
                            <div className="text-[11px] font-mono text-[#94A3B8] truncate max-w-[120px]">
                              {log.entityId}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {log.details && (
                            <span className="text-xs text-[#6366F1] hover:underline">
                              {expanded === log.id ? "Hide details ▲" : "View details ▼"}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                      {expanded === log.id && log.details && (
                        <TableRow>
                          <TableCell colSpan={5} className="bg-[#F8FAFC]">
                            <div className="p-3 rounded-lg bg-white border border-[#E5E7EB] text-xs font-mono text-[#334155] whitespace-pre-wrap break-words max-h-48 overflow-y-auto">
                              {JSON.stringify(log.details, null, 2)}
                            </div>
                          </TableCell>
                        </TableRow>
                      )}
                    </React.Fragment>
                  ))
                )}
              </TableBody>
            </Table>
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
