"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { formatDate, formatCurrency } from "@/lib/utils";
import { 
  Clock, 
  MapPin, 
  Loader2,
} from "lucide-react";

interface EmployeeProgramAssignment {
  id: string;
  code: string;
  title: string;
  eventDate: string;
  startTime: string;
  endTime: string;
  venueName: string;
  venueAddress: string;
  expectedGuests: number;
  requiredStaffCount: number;
  assignedRole: string | null;
  status: string;
  myStatus: string | null;
}

interface EarningsSummary {
  totalEarned: number;
  totalPaid: number;
  outstanding: number;
  pendingSettlement: number;
  wagePerEvent: number;
}

export default function EmployeeDashboardPage() {
  const [assignedPrograms, setAssignedPrograms] = useState<EmployeeProgramAssignment[]>([]);
  const [upcomingPrograms, setUpcomingPrograms] = useState<EmployeeProgramAssignment[]>([]);
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [progRes, upcomingRes, earnRes] = await Promise.all([
        fetch("/api/programs?employeeId=me&limit=10&sortBy=eventDate&sortOrder=asc"),
        fetch("/api/programs?status=UPCOMING&limit=5&sortBy=eventDate&sortOrder=asc"),
        fetch("/api/employee/earnings"),
      ]);

      if (progRes.ok) {
        const pData = await progRes.json();
        if (pData.programs) {
          setAssignedPrograms(
            pData.programs.map((p: {
              id: string;
              code: string;
              title: string;
              eventDate: string;
              startTime: string;
              endTime: string;
              venueName: string;
              venueAddress: string;
              expectedGuests?: number;
              requiredStaffCount?: number;
              myRole?: string | null;
              myStatus?: string | null;
            }) => ({
              id: p.id,
              code: p.code,
              title: p.title,
              eventDate: p.eventDate,
              startTime: p.startTime,
              endTime: p.endTime,
              venueName: p.venueName,
              venueAddress: p.venueAddress,
              expectedGuests: p.expectedGuests || 0,
              requiredStaffCount: p.requiredStaffCount || 0,
              assignedRole: p.myRole || "Catering Specialist",
              status: p.myStatus || "CONFIRMED",
            }))
          );
        }
      }

      if (upcomingRes.ok) {
        const upcomingData = await upcomingRes.json();
        if (upcomingData.programs) {
          setUpcomingPrograms(
            upcomingData.programs.map((p: {
              id: string;
              code: string;
              title: string;
              eventDate: string;
              startTime: string;
              endTime: string;
              venueName: string;
              venueAddress: string;
              expectedGuests?: number;
              requiredStaffCount?: number;
              myRole?: string | null;
              myStatus?: string | null;
            }) => ({
              id: p.id,
              code: p.code,
              title: p.title,
              eventDate: p.eventDate,
              startTime: p.startTime,
              endTime: p.endTime,
              venueName: p.venueName,
              venueAddress: p.venueAddress,
              expectedGuests: p.expectedGuests || 0,
              requiredStaffCount: p.requiredStaffCount || 0,
              assignedRole: p.myRole || null,
              status: p.myStatus || "UPCOMING",
              myStatus: p.myStatus || null,
            }))
          );
        }
      }

      if (earnRes.ok) {
        const eData = await earnRes.json();
        if (eData.summary) {
          setEarnings(eData.summary);
        }
      }
    } catch (err) {
      console.warn("Failed to load employee dashboard data:", err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadDashboardData();
  }, [loadDashboardData]);

  const [activeProgramIndex, setActiveProgramIndex] = useState(0);

  useEffect(() => {
    if (activeProgramIndex >= upcomingPrograms.length) {
      setActiveProgramIndex(0);
    }
  }, [activeProgramIndex, upcomingPrograms.length]);

  useEffect(() => {
    if (upcomingPrograms.length < 2) return;
    const intervalId = window.setInterval(() => {
      setActiveProgramIndex((current) => (current + 1) % upcomingPrograms.length);
    }, 3000);
    return () => window.clearInterval(intervalId);
  }, [upcomingPrograms.length]);

  const nextProgram = upcomingPrograms[0];
  const getProgramStatusVariant = (status: string) => {
    if (status === "CONFIRMED") return "active" as const;
    if (status === "REQUESTED") return "orange" as const;
    return "danger" as const;
  };

  return (
    <EmployeeLayout
      title="Staff Operations Portal"
      breadcrumbs={[{ label: "Employee Portal" }, { label: "My Dashboard" }]}
    >
      <div className="space-y-4 sm:space-y-8">
        {/* Upcoming programs carousel */}
        <section className="overflow-hidden rounded-2xl border border-[#FED7AA] bg-[#FFF7ED] p-3 sm:p-5">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-[0.14em] text-[#C2410C] sm:text-xs">Upcoming</p>
              <h2 className="text-base font-bold text-[#111827] sm:text-lg">Your next programs</h2>
            </div>
          </div>

          {isLoading ? (
            <div className="flex h-32 items-center justify-center"><Loader2 className="h-5 w-5 animate-spin text-[#F97316]" /></div>
          ) : upcomingPrograms.length === 0 ? (
            <p className="rounded-xl border border-dashed border-[#FED7AA] bg-white/70 px-3 py-6 text-center text-xs text-[#9A3412]">No upcoming programs assigned.</p>
          ) : (
            <div className="overflow-hidden">
              <div
                className="flex transition-transform duration-500 ease-out"
                style={{ transform: `translateX(-${activeProgramIndex * 100}%)` }}
              >
                {upcomingPrograms.map((program) => (
                  <div key={program.id} className="min-w-full">
                    <div className="rounded-xl border border-[#FED7AA] bg-white p-3 shadow-sm transition-shadow hover:shadow-md sm:p-4">
                      <div className="flex items-start justify-between gap-3">
                        <Link href={`/employee/programs/${program.id}`} className="min-w-0">
                          <p className="truncate text-base font-bold text-[#111827] sm:text-lg">{program.title}</p>
                          <p className="mt-0.5 font-mono text-[10px] text-[#94A3B8]">{program.code}</p>
                        </Link>
                        <Badge variant={getProgramStatusVariant(program.status)} size="sm" className="shrink-0 text-[10px]">{program.status}</Badge>
                      </div>
                      <Link href={`/employee/programs/${program.id}`} className="mt-3 grid grid-cols-2 gap-2 text-[11px] text-[#475569] sm:grid-cols-4 sm:text-xs">
                        <span>{formatDate(program.eventDate)} · {program.startTime}</span>
                        <span className="truncate">{program.venueName}</span>
                        <span>{program.expectedGuests} guests</span>
                        <span>{program.requiredStaffCount} staff needed</span>
                      </Link>
                      <div className="mt-3 flex justify-end border-t border-[#FFEDD5] pt-3">
                        <Link href={`/employee/programs/${program.id}`}>
                          <Button variant="primary" size="sm" className="h-8 text-xs">
                            {program.myStatus === "CONFIRMED" ? "View Shift" : program.myStatus === "REQUESTED" ? "Requested" : "Request Shift"}
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {upcomingPrograms.length > 1 && (
            <div className="mt-3 flex justify-center gap-1.5" aria-label="Program slides">
              {upcomingPrograms.map((program, index) => (
                <button
                  key={program.id}
                  type="button"
                  aria-label={`Show ${program.title}`}
                  onClick={() => setActiveProgramIndex(index)}
                  className={`h-1.5 rounded-full transition-all ${index === activeProgramIndex ? "w-5 bg-[#F97316]" : "w-1.5 bg-[#FDBA74]"}`}
                />
              ))}
            </div>
          )}
        </section>

        {/* Top Shift Status Banner */}
        <div className="mx-auto flex w-full max-w-4xl flex-col gap-3 rounded-2xl border border-[#E5E7EB] bg-white p-3 shadow-2xs sm:flex-row sm:items-center sm:justify-between sm:gap-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-2.5 sm:gap-3.5">
            <div className="shrink-0 rounded-xl border border-[#FED7AA] bg-[#FFF7ED] p-2 text-[#F97316] sm:p-3">
              <Clock className="h-5 w-5 sm:h-6 sm:w-6" />
            </div>
            <div className="min-w-0">
              <div className="flex min-w-0 items-center gap-2">
                <h2 className="truncate text-sm font-bold text-[#111827] sm:text-base">Shift & Attendance</h2>
                <Badge variant={nextProgram ? "active" : "neutral"} size="sm" className="shrink-0 text-[10px] sm:text-xs">
                  {nextProgram ? "Upcoming" : "No Shift"}
                </Badge>
              </div>
              <p className="mt-0.5 truncate text-[11px] text-[#64748B] sm:text-xs">
                {nextProgram
                  ? `${formatDate(nextProgram.eventDate)} at ${nextProgram.startTime} · ${nextProgram.title}`
                  : "No upcoming shifts on your roster."}
              </p>
            </div>
          </div>

          <Link href="/employee/attendance">
            <Button variant="primary" size="sm" className="w-full sm:w-auto" leftIcon={<Clock className="h-4 w-4" />}>
              View Log
            </Button>
          </Link>
        </div>

        {/* Staff KPIs */}
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          <Card hoverEffect>
            <CardContent className="min-w-0 p-3 sm:p-5">
              <span className="block truncate text-[10px] font-medium text-[#64748B] sm:text-xs">Assigned</span>
              <div className="mt-1 flex items-baseline gap-1 sm:mt-2 sm:gap-2">
                <span className="text-xl font-bold text-[#111827] sm:text-2xl">{assignedPrograms.length}</span>
                <span className="hidden text-xs text-[#64748B] sm:inline">upcoming</span>
              </div>
              <p className="mt-1 truncate text-[10px] text-[#16A34A] sm:mt-2 sm:text-xs">Confirmed</p>
            </CardContent>
          </Card>

          <Card hoverEffect>
            <CardContent className="min-w-0 p-3 sm:p-5">
              <span className="block truncate text-[10px] font-medium text-[#64748B] sm:text-xs">Pending</span>
              <div className="mt-1 flex min-w-0 items-baseline gap-1 sm:mt-2 sm:gap-2">
                <span className="truncate text-lg font-bold text-[#111827] sm:text-2xl">
                  {formatCurrency(earnings?.pendingSettlement ?? 0)}
                </span>
                <Badge variant="pending" size="sm" className="hidden shrink-0 text-[10px] sm:inline-flex">Review</Badge>
              </div>
              <p className="mt-1 truncate text-[10px] text-[#64748B] sm:mt-2 sm:text-xs">Awaiting payout</p>
            </CardContent>
          </Card>

          <Card hoverEffect>
            <CardContent className="min-w-0 p-3 sm:p-5">
              <span className="block truncate text-[10px] font-medium text-[#64748B] sm:text-xs">Total Paid</span>
              <div className="mt-1 flex min-w-0 items-baseline gap-2 sm:mt-2">
                <span className="truncate text-lg font-bold text-[#15803D] sm:text-2xl">
                  {formatCurrency(earnings?.totalPaid ?? 0)}
                </span>
              </div>
              <p className="mt-1 truncate text-[10px] text-[#64748B] sm:mt-2 sm:text-xs">Disbursed</p>
            </CardContent>
          </Card>
        </div>

        {/* Assigned Programs Table */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>My Upcoming Event Assignments</CardTitle>
              <CardDescription>Catering shifts and programs you are assigned to lead or serve</CardDescription>
            </div>
            <Link href="/employee/my-programs">
              <Button variant="outline" size="sm">View Full Roster</Button>
            </Link>
          </CardHeader>
          <div className="md:hidden">
            {isLoading ? (
              <div className="flex justify-center py-8"><Loader2 className="h-5 w-5 animate-spin text-[#F97316]" /></div>
            ) : assignedPrograms.length === 0 ? (
              <p className="px-4 py-8 text-center text-xs text-[#94A3B8]">No upcoming assignments.</p>
            ) : (
              <div className="space-y-2 p-3">
                {assignedPrograms.map((item) => (
                  <Link key={item.id} href={`/employee/programs/${item.id}`} className="block rounded-xl border border-[#E5E7EB] bg-[#F8FAFC] p-3 active:bg-[#FFF7ED]">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-semibold text-[#111827]">{item.title}</p>
                        <p className="mt-0.5 font-mono text-[10px] text-[#94A3B8]">{item.code}</p>
                      </div>
                      <Badge variant="active" size="sm" className="shrink-0 text-[10px]">{item.status}</Badge>
                    </div>
                    <div className="mt-2 grid grid-cols-2 gap-2 text-[11px] text-[#64748B]">
                      <span>{formatDate(item.eventDate)} · {item.startTime}</span>
                      <span className="truncate text-right">{item.assignedRole}</span>
                    </div>
                    <div className="mt-1 flex items-center gap-1 text-[11px] text-[#64748B]">
                      <MapPin className="h-3 w-3 shrink-0 text-[#94A3B8]" />
                      <span className="truncate">{item.venueName}</span>
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>
          <div className="hidden overflow-x-auto md:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Event & Code</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Venue Location</TableHead>
                  <TableHead>Assigned Role</TableHead>
                  <TableHead>Attendance Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8">
                      <Loader2 className="w-5 h-5 text-[#F97316] animate-spin mx-auto" />
                    </TableCell>
                  </TableRow>
                ) : assignedPrograms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="text-center py-8 text-xs text-[#94A3B8]">
                      You have no upcoming event assignments. Browse available shifts in &quot;Browse Programs&quot;.
                    </TableCell>
                  </TableRow>
                ) : (
                  assignedPrograms.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="font-semibold text-[#111827]">{item.title}</div>
                        <div className="font-mono text-xs text-[#94A3B8]">{item.code}</div>
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-[#111827]">{formatDate(item.eventDate)}</div>
                        <div className="text-xs text-[#64748B]">{item.startTime} - {item.endTime}</div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-1.5 text-xs text-[#334155] max-w-xs truncate">
                          <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                          <span>{item.venueName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant="orange" size="sm">{item.assignedRole}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="active" size="sm">{item.status}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Link href="/employee/my-programs">
                          <Button variant="ghost" size="sm" className="h-7 text-xs">
                            View Shift
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </EmployeeLayout>
  );
}
