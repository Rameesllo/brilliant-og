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
  Loader2 
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
  assignedRole: string | null;
  status: string;
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
  const [earnings, setEarnings] = useState<EarningsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [progRes, earnRes] = await Promise.all([
        fetch("/api/programs?employeeId=me&limit=10&sortBy=eventDate&sortOrder=asc"),
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
              assignedRole: p.myRole || "Catering Specialist",
              status: p.myStatus || "CONFIRMED",
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

  const nextProgram = assignedPrograms[0];

  return (
    <EmployeeLayout
      title="Staff Operations Portal"
      breadcrumbs={[{ label: "Employee Portal" }, { label: "My Dashboard" }]}
    >
      <div className="space-y-6 sm:space-y-8">
        {/* Top Shift Status Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white border border-[#E5E7EB] rounded-2xl shadow-2xs">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="p-3 rounded-xl bg-[#FFF7ED] text-[#F97316] border border-[#FED7AA]">
              <Clock className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base font-bold text-[#111827]">Shift & Attendance</h2>
                <Badge variant={nextProgram ? "active" : "neutral"} size="sm">
                  {nextProgram ? "Upcoming Shift" : "No Active Shift"}
                </Badge>
              </div>
              <p className="text-xs text-[#64748B] mt-0.5">
                {nextProgram
                  ? `Next scheduled event: ${formatDate(nextProgram.eventDate)} at ${nextProgram.startTime} (${nextProgram.title})`
                  : "No upcoming event shifts currently on your roster."}
              </p>
            </div>
          </div>

          <Link href="/employee/attendance">
            <Button variant="primary" size="md" leftIcon={<Clock className="w-4 h-4" />}>
              View Attendance Log
            </Button>
          </Link>
        </div>

        {/* Staff KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Card hoverEffect>
            <CardContent className="p-5">
              <span className="text-xs font-medium text-[#64748B]">Assigned Programs</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#111827]">{assignedPrograms.length}</span>
                <span className="text-xs text-[#64748B]">upcoming on roster</span>
              </div>
              <p className="mt-2 text-xs text-[#16A34A]">Confirmed by management</p>
            </CardContent>
          </Card>

          <Card hoverEffect>
            <CardContent className="p-5">
              <span className="text-xs font-medium text-[#64748B]">Pending Settlement</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#111827]">
                  {formatCurrency(earnings?.pendingSettlement ?? 0)}
                </span>
                <Badge variant="pending" size="sm">In Review</Badge>
              </div>
              <p className="mt-2 text-xs text-[#64748B]">Approved shifts awaiting disbursement</p>
            </CardContent>
          </Card>

          <Card hoverEffect>
            <CardContent className="p-5">
              <span className="text-xs font-medium text-[#64748B]">Total Earnings Paid</span>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#15803D]">
                  {formatCurrency(earnings?.totalPaid ?? 0)}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#64748B]">Disbursed to date</p>
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
          <div className="overflow-x-auto">
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
