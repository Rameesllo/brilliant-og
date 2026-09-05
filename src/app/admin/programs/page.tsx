"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatCurrency } from "@/lib/utils";
import { Plus, Filter, Calendar, Users, Eye, RefreshCw } from "lucide-react";
import { CreateProgramModal } from "@/components/modals/CreateProgramModal";

interface ProgramItem {
  id: string;
  code: string;
  title: string;
  type: string;
  status: "UPCOMING" | "IN_PROGRESS" | "COMPLETED" | "CANCELLED";
  eventDate: string;
  startTime: string;
  endTime: string;
  venueName: string;
  venueAddress: string;
  expectedGuests: number;
  requiredStaffCount: number;
  confirmedStaffCount: number;
  totalJoinedCount: number;
  budget: number;
  notes: string;
  customer: {
    id: string;
    name: string;
    phone: string;
  };
}

export default function AdminProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<ProgramItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState("ALL");
  const [filterStatus, setFilterStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const fetchPrograms = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (filterType !== "ALL") params.set("type", filterType);
    if (filterStatus !== "ALL") params.set("status", filterStatus);
    params.set("page", currentPage.toString());
    params.set("limit", "10");
    params.set("sortBy", "eventDate");
    params.set("sortOrder", "asc");

    fetch(`/api/programs?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load programs (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setPrograms(data.programs || []);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalCount(data.pagination?.total || 0);
        setError(null);
      })
      .catch((err) => {
        console.error("Error loading programs:", err);
        setError(err instanceof Error ? err.message : "Failed to load programs");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [search, filterType, filterStatus, currentPage]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const getStatusBadge = (status: ProgramItem["status"]) => {
    switch (status) {
      case "UPCOMING":
        return <Badge variant="orange" size="sm">Upcoming</Badge>;
      case "IN_PROGRESS":
        return <Badge variant="active" size="sm">In Progress</Badge>;
      case "COMPLETED":
        return <Badge variant="completed" size="sm">Completed</Badge>;
      case "CANCELLED":
        return <Badge variant="cancelled" size="sm">Cancelled</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{status}</Badge>;
    }
  };

  return (
    <AdminLayout
      title="Event & Wedding Programs"
      breadcrumbs={[{ label: "Admin Console" }, { label: "Programs" }]}
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search programs, client or code..."
            />

            {/* Type Filter */}
            <div className="flex items-center gap-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg p-1 overflow-x-auto">
              <span className="text-[#94A3B8] px-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Type:
              </span>
              {["ALL", "WEDDING", "CORPORATE", "BIRTHDAY", "RECEPTION"].map((type) => (
                <button
                  key={type}
                  onClick={() => {
                    setFilterType(type);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
                    filterType === type
                      ? "bg-[#FFF7ED] text-[#C2410C] font-semibold"
                      : "text-[#64748B] hover:text-[#111827]"
                  }`}
                >
                  {type === "ALL" ? "All Types" : type.charAt(0) + type.slice(1).toLowerCase()}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 text-xs bg-white border border-[#E5E7EB] rounded-lg p-1 overflow-x-auto">
              {["ALL", "UPCOMING", "IN_PROGRESS", "COMPLETED"].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setFilterStatus(st);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded font-medium transition-colors whitespace-nowrap ${
                    filterStatus === st
                      ? "bg-[#111827] text-white"
                      : "text-[#64748B] hover:text-[#111827]"
                  }`}
                >
                  {st === "ALL" ? "All Status" : st.replace("_", " ")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPrograms}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              title="Refresh programs"
            >
              Refresh
            </Button>
            <Link href="/admin/programs/create">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Create Program
              </Button>
            </Link>
          </div>
        </div>

        {/* Programs Table Card */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>All Scheduled Programs</CardTitle>
              <CardDescription>
                Comprehensive management of catering events, staffing allocations, and program schedules
              </CardDescription>
            </div>
            <span className="text-xs text-[#64748B] font-medium">
              {totalCount} program{totalCount === 1 ? "" : "s"} found
            </span>
          </CardHeader>

          {isLoading ? (
            <div className="p-12">
              <LoadingState message="Loading catering events and programs from database..." />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchPrograms}>
                Try Again
              </Button>
            </div>
          ) : programs.length === 0 ? (
            <div className="p-8">
              <EmptyState
                icon={<Calendar className="w-6 h-6 text-[#94A3B8]" />}
                title="No programs match your search"
                description="Try clearing search keywords or changing the selected filters."
                actionLabel="Reset Filters"
                onAction={() => {
                  setSearch("");
                  setFilterType("ALL");
                  setFilterStatus("ALL");
                }}
              />
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code & Title</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date & Timing</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Staffing Status</TableHead>
                      <TableHead>Est. Budget</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((prog) => {
                      const isStaffed =
                        prog.requiredStaffCount > 0 &&
                        prog.confirmedStaffCount >= prog.requiredStaffCount;

                      return (
                        <TableRow
                          key={prog.id}
                          className="hover:bg-[#F9FAFB] cursor-pointer"
                          onClick={() => router.push(`/admin/programs/${prog.id}`)}
                        >
                          <TableCell>
                            <div className="font-semibold text-[#111827] hover:text-[#C2410C]">
                              {prog.title}
                            </div>
                            <div className="text-xs font-mono text-[#94A3B8]">{prog.code}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="orange" size="sm">
                              {prog.type}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-[#111827]">{prog.customer?.name || "N/A"}</div>
                            <div className="text-xs text-[#64748B]">{prog.customer?.phone || "—"}</div>
                          </TableCell>
                          <TableCell>
                            <div className="font-medium text-[#111827]">{formatDate(prog.eventDate)}</div>
                            <div className="text-xs text-[#64748B]">
                              {prog.startTime} - {prog.endTime}
                            </div>
                          </TableCell>
                          <TableCell>
                            <div className="text-sm text-[#111827] line-clamp-1">{prog.venueName}</div>
                            {prog.expectedGuests > 0 && (
                              <div className="text-xs text-[#64748B] flex items-center gap-1">
                                <Users className="w-3 h-3" /> {prog.expectedGuests} guests
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              <span
                                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                                  isStaffed
                                    ? "bg-green-100 text-green-800"
                                    : prog.confirmedStaffCount > 0
                                    ? "bg-amber-100 text-amber-800"
                                    : "bg-red-100 text-red-800"
                                }`}
                              >
                                {prog.confirmedStaffCount} / {prog.requiredStaffCount || "—"} confirmed
                              </span>
                              {prog.totalJoinedCount > prog.confirmedStaffCount && (
                                <span className="text-xs text-[#94A3B8]" title="Pending requests">
                                  (+{prog.totalJoinedCount - prog.confirmedStaffCount} req)
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="font-semibold text-[#111827]">
                            {formatCurrency(prog.budget)}
                          </TableCell>
                          <TableCell>{getStatusBadge(prog.status)}</TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <div className="flex items-center justify-end gap-1.5">
                              <Link href={`/admin/programs/${prog.id}`}>
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 px-2.5 text-xs flex items-center gap-1"
                                >
                                  <Eye className="w-3.5 h-3.5" /> Manage
                                </Button>
                              </Link>
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalCount}
                  pageSize={10}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </Card>
      </div>

      <CreateProgramModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={fetchPrograms}
      />
    </AdminLayout>
  );
}
