"use client";

import React, { useState, useEffect } from "react";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { formatDate } from "@/lib/utils";
import { Calendar, Clock, MapPin, AlertCircle, Loader2 } from "lucide-react";

interface AttendanceRecord {
  id: string;
  programId: string;
  programCode: string;
  programTitle: string;
  venueName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  hoursWorked: number;
  status: string;
  verifiedBy: string;
  remarks: string;
}

export default function EmployeeAttendancePage() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/employee/attendance")
      .then((res) => {
        if (!res.ok) {
          throw new Error("Failed to load attendance records");
        }
        return res.json();
      })
      .then((data) => {
        setAttendances(data.attendances || []);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load attendance records");
        setIsLoading(false);
      });
  }, []);

  const getStatusBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case "PRESENT":
        return "present";
      case "LATE":
        return "late";
      case "HALF_DAY":
        return "partial";
      case "ABSENT":
        return "absent";
      default:
        return "neutral";
    }
  };

  const formatTime = (isoString: string | null) => {
    if (!isoString) return "—";
    try {
      const date = new Date(isoString);
      return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
    } catch {
      return "—";
    }
  };

  return (
    <EmployeeLayout
      title="Attendance & Shift Logs"
      breadcrumbs={[{ label: "Employee Portal" }, { label: "Attendance" }]}
    >
      <div className="space-y-6">
        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-center gap-3 text-sm text-[#991B1B]">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <CardTitle>Clock-in Log History</CardTitle>
            <CardDescription>Verified attendance timestamps logged for past catering shifts</CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-16 flex flex-col items-center justify-center text-[#64748B] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
                <span className="text-sm font-medium">Loading shift attendance logs...</span>
              </div>
            ) : attendances.length === 0 ? (
              <div className="py-16 text-center text-[#64748B]">
                <Calendar className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                <p className="text-base font-semibold text-[#111827]">No attendance records found</p>
                <p className="text-sm mt-1">Once supervisors log your attendance for catering events, shifts will show here.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Event Program</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Check-In</TableHead>
                    <TableHead>Check-Out</TableHead>
                    <TableHead>Total Hours</TableHead>
                    <TableHead>Verified By</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {attendances.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="font-medium text-[#111827] whitespace-nowrap">
                        {formatDate(record.date)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-[#111827]">{record.programTitle}</div>
                        <span className="font-mono text-xs text-[#F97316]">{record.programCode}</span>
                      </TableCell>
                      <TableCell className="text-xs text-[#64748B]">
                        <div className="flex items-center gap-1">
                          <MapPin className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>{record.venueName || "Event Location"}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-[#64748B]">
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>{formatTime(record.checkInTime)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-[#64748B]">
                        <div className="flex items-center gap-1 font-mono">
                          <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                          <span>{formatTime(record.checkOutTime)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="font-semibold text-[#111827]">
                        {record.hoursWorked ? `${record.hoursWorked.toFixed(1)} hrs` : "0.0 hrs"}
                      </TableCell>
                      <TableCell className="text-xs text-[#475569]">
                        {record.verifiedBy}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={getStatusBadgeVariant(record.status)} size="sm">
                          {record.status.replace("_", " ")}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>
    </EmployeeLayout>
  );
}
