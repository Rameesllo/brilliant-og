"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate } from "@/lib/utils";
import { Calendar, Clock, MapPin, CheckCircle2, ArrowRight, RefreshCw, AlertCircle } from "lucide-react";

interface EmployeeProgramItem {
  id: string;
  code: string;
  title: string;
  type: string;
  status: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueName: string;
  venueAddress: string;
  expectedGuests: number;
  requiredStaffCount: number;
  confirmedStaffCount: number;
  totalJoinedCount: number;
  customer?: {
    name: string;
    phone: string;
  };
  myStatus: "REQUESTED" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED" | null;
  myRole: string | null;
}

export default function EmployeeProgramsPage() {
  const [programs, setPrograms] = useState<EmployeeProgramItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [joiningId, setJoiningId] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<{ text: string; type: "success" | "error" } | null>(null);

  const fetchPrograms = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    params.set("status", "UPCOMING");
    params.set("sortBy", "eventDate");
    params.set("sortOrder", "asc");
    params.set("limit", "50");

    fetch(`/api/programs?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load programs (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setPrograms(data.programs || []);
        setError(null);
      })
      .catch((err) => {
        console.error("Error loading programs for employee:", err);
        setError(err instanceof Error ? err.message : "Failed to load upcoming programs");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [search]);

  useEffect(() => {
    fetchPrograms();
  }, [fetchPrograms]);

  const handleRequestShift = async (programId: string, programTitle: string) => {
    setJoiningId(programId);
    setFeedbackMessage(null);
    try {
      const res = await fetch(`/api/programs/${programId}/join`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to submit shift request");
      }

      setFeedbackMessage({
        text: `Shift request for "${programTitle}" submitted successfully! Awaiting supervisor confirmation.`,
        type: "success",
      });

      // Update local state
      setPrograms((prev) =>
        prev.map((p) =>
          p.id === programId
            ? { ...p, myStatus: "REQUESTED", totalJoinedCount: p.totalJoinedCount + 1 }
            : p
        )
      );
    } catch (err) {
      setFeedbackMessage({
        text: err instanceof Error ? err.message : "Error requesting shift",
        type: "error",
      });
    } finally {
      setJoiningId(null);
    }
  };

  return (
    <EmployeeLayout
      title="Upcoming Catering Programs"
      breadcrumbs={[{ label: "Employee Portal" }, { label: "Open Shifts" }]}
    >
      <div className="space-y-6">
        {/* Top Control Bar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex-1 max-w-md">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search programs..."
            />
          </div>
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-3">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPrograms}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
            <Link href="/employee/my-programs" className="sm:w-auto">
              <Button
                variant="secondary"
                size="sm"
                rightIcon={<ArrowRight className="w-3.5 h-3.5" />}
                className="w-full"
              >
                <span className="sm:hidden">My Programs</span>
                <span className="hidden sm:inline">View My Joined Programs</span>
              </Button>
            </Link>
          </div>
        </div>

        {/* Feedback Alert */}
        {feedbackMessage && (
          <div
            className={`p-4 rounded-lg text-sm font-medium flex items-center gap-2 border ${
              feedbackMessage.type === "success"
                ? "bg-green-50 text-green-800 border-green-200"
                : "bg-red-50 text-red-800 border-red-200"
            }`}
          >
            {feedbackMessage.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-green-600 flex-shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
            )}
            <span>{feedbackMessage.text}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming Programs</CardTitle>
              <CardDescription className="hidden sm:block">
                Browse scheduled wedding receptions and events open for employee shift participation
              </CardDescription>
            </div>
            <span className="text-xs text-[#64748B] font-medium">
              {programs.length} program{programs.length === 1 ? "" : "s"} open
            </span>
          </CardHeader>

          {isLoading ? (
            <div className="p-12">
              <LoadingState message="Loading upcoming catering programs..." />
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
                title="No upcoming programs available"
                description="There are currently no upcoming events matching your search keywords."
                actionLabel="Clear Search"
                onAction={() => setSearch("")}
              />
            </div>
          ) : (
            <div>
              <div className="space-y-3 p-4 md:hidden">
                {programs.map((prog) => {
                  const isFull =
                    prog.requiredStaffCount > 0 &&
                    prog.confirmedStaffCount >= prog.requiredStaffCount;

                  return (
                    <div key={prog.id} className="rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-4">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <h4 className="truncate text-sm font-semibold text-[#111827]">{prog.title}</h4>
                          <p className="mt-0.5 font-mono text-[11px] text-[#94A3B8]">{prog.code}</p>
                        </div>
                        <Badge variant="orange" size="sm">{prog.type}</Badge>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 text-xs text-[#475569]">
                        <div className="flex items-center gap-2">
                          <Calendar className="h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
                          <span>{formatDate(prog.eventDate)}</span>
                          <Clock className="ml-1 h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
                          <span>{prog.startTime} - {prog.endTime}</span>
                        </div>
                        <div className="flex items-start gap-2">
                          <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[#94A3B8]" />
                          <span className="line-clamp-2">{prog.venueName}{prog.venueAddress ? `, ${prog.venueAddress}` : ""}</span>
                        </div>
                      </div>

                      <div className="mt-3 flex items-center justify-between gap-3 border-t border-[#E5E7EB] pt-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-[#94A3B8]">Status</p>
                          {prog.myStatus === "CONFIRMED" ? (
                            <Badge variant="active" size="sm">Confirmed</Badge>
                          ) : prog.myStatus === "REQUESTED" ? (
                            <Badge variant="pending" size="sm">Pending</Badge>
                          ) : prog.myStatus === "REJECTED" ? (
                            <Badge variant="danger" size="sm">Declined</Badge>
                          ) : prog.myStatus === "COMPLETED" ? (
                            <Badge variant="completed" size="sm">Completed</Badge>
                          ) : (
                            <span className="text-xs text-[#64748B]">Not requested</span>
                          )}
                        </div>
                        {prog.myStatus === "CONFIRMED" ? (
                          <Link href="/employee/my-programs">
                            <Button variant="outline" size="sm" className="h-8 text-xs">View Shift</Button>
                          </Link>
                        ) : prog.myStatus === "REQUESTED" ? (
                          <span className="text-xs font-medium text-amber-700">Requested</span>
                        ) : prog.myStatus === "REJECTED" ? (
                          <span className="text-xs text-red-600">Not eligible</span>
                        ) : isFull ? (
                          <Button variant="secondary" size="sm" disabled className="h-8 text-xs">Shift Full</Button>
                        ) : (
                          <Button
                            variant="primary"
                            size="sm"
                            className="h-8 text-xs"
                            isLoading={joiningId === prog.id}
                            onClick={() => handleRequestShift(prog.id, prog.title)}
                          >
                            Request Shift
                          </Button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="hidden overflow-x-auto md:block">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program & Code</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Date & Timing</TableHead>
                    <TableHead>Venue Location</TableHead>
                    <TableHead>Staffing Status</TableHead>
                    <TableHead>My Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.map((prog) => {
                    const isFull =
                      prog.requiredStaffCount > 0 &&
                      prog.confirmedStaffCount >= prog.requiredStaffCount;

                    return (
                      <TableRow key={prog.id} className="hover:bg-[#F9FAFB]">
                        <TableCell>
                          <div className="font-semibold text-[#111827]">{prog.title}</div>
                          <div className="font-mono text-xs text-[#94A3B8]">{prog.code}</div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="orange" size="sm">
                            {prog.type}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-[#111827]">
                            {formatDate(prog.eventDate)}
                          </div>
                          <div className="text-xs text-[#64748B] flex items-center gap-1">
                            <Clock className="w-3 h-3 text-[#94A3B8]" />
                            {prog.startTime} - {prog.endTime}
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="text-sm text-[#111827] flex items-center gap-1">
                            <MapPin className="w-3.5 h-3.5 text-[#94A3B8] flex-shrink-0" />
                            <span className="line-clamp-1">{prog.venueName}</span>
                          </div>
                          {prog.venueAddress && (
                            <div className="text-xs text-[#64748B] line-clamp-1 pl-4.5">
                              {prog.venueAddress}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span
                            className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                              isFull
                                ? "bg-gray-100 text-gray-700"
                                : prog.confirmedStaffCount > 0
                                ? "bg-amber-100 text-amber-800"
                                : "bg-blue-100 text-blue-800"
                            }`}
                          >
                            {prog.confirmedStaffCount} / {prog.requiredStaffCount || "—"} confirmed
                          </span>
                        </TableCell>
                        <TableCell>
                          {prog.myStatus === "CONFIRMED" ? (
                            <Badge variant="active" size="sm">
                              Confirmed
                            </Badge>
                          ) : prog.myStatus === "REQUESTED" ? (
                            <Badge variant="pending" size="sm">
                              Pending Admin
                            </Badge>
                          ) : prog.myStatus === "REJECTED" ? (
                            <Badge variant="danger" size="sm">
                              Declined
                            </Badge>
                          ) : prog.myStatus === "COMPLETED" ? (
                            <Badge variant="completed" size="sm">
                              Completed
                            </Badge>
                          ) : (
                            <span className="text-xs text-[#94A3B8]">Not Requested</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {prog.myStatus === "CONFIRMED" ? (
                            <Link href="/employee/my-programs">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs border-green-300 text-green-700 hover:bg-green-50"
                              >
                                View Shift
                              </Button>
                            </Link>
                          ) : prog.myStatus === "REQUESTED" ? (
                            <span className="text-xs font-medium text-amber-700 bg-amber-50 px-2.5 py-1 rounded border border-amber-200">
                              Requested
                            </span>
                          ) : prog.myStatus === "REJECTED" ? (
                            <span className="text-xs font-medium text-red-600">
                              Not eligible
                            </span>
                          ) : isFull ? (
                            <Button
                              variant="secondary"
                              size="sm"
                              disabled
                              className="h-7 text-xs opacity-60"
                            >
                              Shift Full
                            </Button>
                          ) : (
                            <Button
                              variant="primary"
                              size="sm"
                              className="h-7 text-xs"
                              isLoading={joiningId === prog.id}
                              onClick={() => handleRequestShift(prog.id, prog.title)}
                            >
                              Request Shift
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
            </div>
          )}
        </Card>
      </div>
    </EmployeeLayout>
  );
}
