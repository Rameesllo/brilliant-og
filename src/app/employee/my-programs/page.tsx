"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { formatDate } from "@/lib/utils";
import { Clock, Briefcase, Plus, RefreshCw, FileText } from "lucide-react";

interface MyProgramItem {
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
  notes: string;
  customer?: {
    name: string;
    phone: string;
  };
  myStatus: "REQUESTED" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  myRole: string | null;
}

export default function EmployeeMyProgramsPage() {
  const router = useRouter();
  const [programs, setPrograms] = useState<MyProgramItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Selected Program for Briefing Notes Modal
  const [selectedBriefing, setSelectedBriefing] = useState<MyProgramItem | null>(null);

  const fetchMyPrograms = useCallback(() => {
    fetch("/api/programs?employeeId=me&limit=100&sortBy=eventDate&sortOrder=asc")
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load my programs (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setPrograms(data.programs || []);
        setError(null);
      })
      .catch((err) => {
        console.error("Error loading employee's programs:", err);
        setError(err instanceof Error ? err.message : "Failed to load assigned programs");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchMyPrograms();
  }, [fetchMyPrograms]);

  const getStatusBadge = (myStatus: MyProgramItem["myStatus"]) => {
    switch (myStatus) {
      case "CONFIRMED":
        return <Badge variant="active" size="sm">Confirmed</Badge>;
      case "REQUESTED":
        return <Badge variant="pending" size="sm">Awaiting Admin</Badge>;
      case "COMPLETED":
        return <Badge variant="completed" size="sm">Completed</Badge>;
      case "REJECTED":
        return <Badge variant="danger" size="sm">Rejected</Badge>;
      case "CANCELLED":
        return <Badge variant="cancelled" size="sm">Cancelled</Badge>;
      default:
        return <Badge variant="neutral" size="sm">{myStatus}</Badge>;
    }
  };

  const confirmedProgramsCount = programs.filter((p) => p.myStatus === "CONFIRMED").length;
  const requestedProgramsCount = programs.filter((p) => p.myStatus === "REQUESTED").length;

  return (
    <EmployeeLayout
      title="My Assigned Programs"
      breadcrumbs={[{ label: "Employee Portal" }, { label: "My Programs" }]}
    >
      <div className="space-y-6">
        {/* Top Control Bar & Stats */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="text-sm text-[#64748B]">
              <strong className="text-[#111827]">{confirmedProgramsCount}</strong> confirmed shift{confirmedProgramsCount === 1 ? "" : "s"}
            </span>
            {requestedProgramsCount > 0 && (
              <span className="text-xs bg-amber-50 text-amber-800 font-semibold px-2 py-0.5 rounded-full border border-amber-200">
                {requestedProgramsCount} pending confirmation
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchMyPrograms}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
            >
              Refresh
            </Button>
            <Link href="/employee/programs">
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Browse More Events
              </Button>
            </Link>
          </div>
        </div>

        <Card>
          <CardHeader>
            <div>
              <CardTitle>Confirmed Shift Allocations & Requests</CardTitle>
              <CardDescription>
                Programs where you have officially requested a shift or are confirmed on the roster
              </CardDescription>
            </div>
          </CardHeader>

          {isLoading ? (
            <div className="p-12">
              <LoadingState message="Loading your shift allocations from database..." />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchMyPrograms}>
                Try Again
              </Button>
            </div>
          ) : programs.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={<Briefcase className="w-6 h-6 text-[#94A3B8]" />}
                title="No programs joined yet"
                description="You have not requested or been assigned to any catering event shifts yet."
                actionLabel="Explore Open Shifts"
                onAction={() => {
                  router.push("/employee/programs");
                }}
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Program Code & Title</TableHead>
                    <TableHead>Event Date</TableHead>
                    <TableHead>Shift Timing</TableHead>
                    <TableHead>Venue Location</TableHead>
                    <TableHead>Assigned Role</TableHead>
                    <TableHead className="text-center">Shift Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {programs.map((prog) => (
                    <TableRow key={prog.id} className="hover:bg-[#F9FAFB]">
                      <TableCell>
                        <div className="font-semibold text-[#111827]">{prog.title}</div>
                        <div className="text-xs font-mono text-[#94A3B8]">{prog.code}</div>
                      </TableCell>
                      <TableCell className="font-medium text-[#111827]">
                        {formatDate(prog.eventDate)}
                      </TableCell>
                      <TableCell className="text-xs text-[#64748B]">
                        <div className="flex items-center gap-1 font-medium text-[#111827]">
                          <Clock className="w-3.5 h-3.5 text-[#94A3B8]" />
                          {prog.startTime} - {prog.endTime}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm text-[#111827] line-clamp-1">{prog.venueName}</div>
                        {prog.venueAddress && (
                          <div className="text-xs text-[#64748B] line-clamp-1">
                            {prog.venueAddress}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="orange" size="sm">
                          {prog.myRole || "Operations Staff"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">
                        {getStatusBadge(prog.myStatus)}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 text-xs flex items-center gap-1 ml-auto"
                          onClick={() => setSelectedBriefing(prog)}
                        >
                          <FileText className="w-3.5 h-3.5 text-[#64748B]" />
                          Briefing
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>

      {/* Shift Briefing Modal */}
      {selectedBriefing && (
        <Modal
          isOpen={Boolean(selectedBriefing)}
          onClose={() => setSelectedBriefing(null)}
          title={`Shift Briefing: ${selectedBriefing.title}`}
          description={`Official operational briefing notes for ${selectedBriefing.code}`}
          maxWidth="md"
          footer={
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setSelectedBriefing(null)}
            >
              Close
            </Button>
          }
        >
          <div className="space-y-4 text-sm">
            <div className="p-3 bg-[#F9FAFB] rounded-lg border border-[#E5E7EB] space-y-2">
              <div className="flex justify-between">
                <span className="text-[#64748B]">Event Date:</span>
                <span className="font-semibold text-[#111827]">
                  {formatDate(selectedBriefing.eventDate)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Shift Timing:</span>
                <span className="font-semibold text-[#111827]">
                  {selectedBriefing.startTime} to {selectedBriefing.endTime}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Assigned Role:</span>
                <span className="font-semibold text-[#C2410C]">
                  {selectedBriefing.myRole || "Operations Staff"}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-[#64748B]">Your Roster Status:</span>
                <span>{getStatusBadge(selectedBriefing.myStatus)}</span>
              </div>
            </div>

            <div>
              <span className="font-semibold text-[#111827] block mb-1">Venue Location:</span>
              <p className="text-xs text-[#374151] bg-[#F3F4F6] p-2.5 rounded">
                <strong>{selectedBriefing.venueName}</strong>
                {selectedBriefing.venueAddress && <><br />{selectedBriefing.venueAddress}</>}
              </p>
            </div>

            <div>
              <span className="font-semibold text-[#111827] block mb-1">
                Event Instructions & Notes:
              </span>
              <p className="text-xs text-[#374151] bg-[#FFF7ED] p-3 rounded border border-[#FFEDD5]">
                {selectedBriefing.notes ||
                  "Please report 15 minutes prior to shift start in standard company uniform. Check in with the event manager upon arrival."}
              </p>
            </div>
          </div>
        </Modal>
      )}
    </EmployeeLayout>
  );
}
