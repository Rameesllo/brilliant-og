"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { Modal } from "@/components/ui/Modal";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatDate, formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Edit2,
  Calendar,
  Clock,
  MapPin,
  Users,
  DollarSign,
  UserCheck,
  UserX,
  Plus,
  Phone,
  Mail,
  Building,
  FileText,
  Clock3,
  ClipboardCheck,
} from "lucide-react";

interface StaffMember {
  id: string;
  employeeId: string;
  employeeCode: string;
  name: string;
  phone: string;
  email: string | null;
  designation: string;
  hourlyRate: number;
  dailyRate: number;
  status: "REQUESTED" | "CONFIRMED" | "REJECTED" | "CANCELLED" | "COMPLETED";
  assignedRole: string;
  requestedAt: string;
  confirmedAt: string | null;
  confirmedBy: string | null;
  notes: string;
}

interface AttendanceRosterItem {
  employeeId: string;
  employeeCode: string;
  name: string;
  phone: string;
  designation: string;
  hourlyRate: number;
  dailyRate: number;
  assignedRole: string;
  attendanceId: string | null;
  attendanceDate: string;
  status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY" | null;
  hoursWorked: number;
  checkInTime: string | null;
  checkOutTime: string | null;
  verifiedBy: string | null;
  remarks: string;
}

interface ProgramDetail {
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
  requestedStaffCount: number;
  budget: number;
  notes: string;
  createdAt: string;
  updatedAt: string;
  customer: {
    id: string;
    code: string;
    name: string;
    phone: string;
    email: string | null;
    companyName: string | null;
    address: string | null;
    city: string | null;
  };
  manager: {
    id: string;
    name: string;
    email: string;
    phone: string | null;
  } | null;
  counts: {
    attendances: number;
    invoices: number;
    expenses: number;
    employeePayments: number;
  };
  staff: StaffMember[];
}

interface ActiveEmployeeOption {
  id: string;
  code: string;
  name: string;
  phone: string;
  employeeType: {
    name: string;
  };
}

export default function AdminProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: programId } = use(params);

  const [program, setProgram] = useState<ProgramDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"staff" | "attendance" | "details" | "history">("staff");

  // Attendance Tab State
  const [attendanceList, setAttendanceList] = useState<AttendanceRosterItem[]>([]);
  const [isAttendanceModalOpen, setIsAttendanceModalOpen] = useState(false);
  const [selectedStaffForAtt, setSelectedStaffForAtt] = useState<AttendanceRosterItem | null>(null);
  const [attStatus, setAttStatus] = useState<string>("PRESENT");
  const [attHours, setAttHours] = useState<string>("8");
  const [attRemarks, setAttRemarks] = useState<string>("");
  const [isSavingAtt, setIsSavingAtt] = useState(false);

  // Status Change State
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Manual Assign Staff Modal
  const [isAssignModalOpen, setIsAssignModalOpen] = useState(false);
  const [availableEmployees, setAvailableEmployees] = useState<ActiveEmployeeOption[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [assignedRole, setAssignedRole] = useState("");
  const [assignNotes, setAssignNotes] = useState("");
  const [isAssigning, setIsAssigning] = useState(false);
  const [assignError, setAssignError] = useState<string | null>(null);

  // Action Dialogs
  const [actionConfirm, setActionConfirm] = useState<{
    isOpen: boolean;
    staffId: string;
    staffName: string;
    action: "CONFIRMED" | "REJECTED" | "REMOVE";
  }>({
    isOpen: false,
    staffId: "",
    staffName: "",
    action: "CONFIRMED",
  });

  const fetchProgram = useCallback(() => {
    fetch(`/api/programs/${programId}`)
      .then((res) => {
        if (!res.ok) {
          throw new Error(`Failed to load program (${res.status})`);
        }
        return res.json();
      })
      .then((data) => {
        setProgram(data.program);
        setError(null);
      })
      .catch((err) => {
        console.error("Error loading program:", err);
        setError(err instanceof Error ? err.message : "Failed to load program");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [programId]);

  useEffect(() => {
    fetchProgram();
  }, [fetchProgram]);

  const fetchAttendance = useCallback(() => {
    fetch(`/api/programs/${programId}/attendance`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load attendance");
        return res.json();
      })
      .then((data) => {
        setAttendanceList(data.staff || []);
      })
      .catch((err) => console.error("Error loading attendance:", err));
  }, [programId]);

  useEffect(() => {
    if (activeTab === "attendance") {
      fetchAttendance();
    }
  }, [activeTab, fetchAttendance]);

  const handleOpenAttendanceModal = (member: AttendanceRosterItem) => {
    setSelectedStaffForAtt(member);
    setAttStatus(member.status || "PRESENT");
    setAttHours(member.hoursWorked ? String(member.hoursWorked) : "8");
    setAttRemarks(member.remarks || "");
    setIsAttendanceModalOpen(true);
  };

  const handleSaveAttendance = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedStaffForAtt) return;
    setIsSavingAtt(true);
    try {
      const res = await fetch(`/api/programs/${programId}/attendance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedStaffForAtt.employeeId,
          status: attStatus,
          hoursWorked: parseFloat(attHours) || 0,
          remarks: attRemarks.trim() || undefined,
        }),
      });
      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Failed to record attendance");
      }
      setIsAttendanceModalOpen(false);
      fetchAttendance();
      fetchProgram();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Error saving attendance");
    } finally {
      setIsSavingAtt(false);
    }
  };

  // Load available active employees for manual assign modal
  const loadEmployeesForAssign = async () => {
    try {
      const res = await fetch("/api/employees?status=ACTIVE&limit=100");
      if (res.ok) {
        const data = await res.json();
        // Filter out employees already assigned
        const assignedIds = new Set(program?.staff.map((s) => s.employeeId) || []);
        const unassigned = (data.employees || []).filter(
          (e: ActiveEmployeeOption) => !assignedIds.has(e.id)
        );
        setAvailableEmployees(unassigned);
      }
    } catch (err) {
      console.error("Failed to load employees for assignment:", err);
    }
  };

  const handleOpenAssignModal = () => {
    setSelectedEmpId("");
    setAssignedRole("");
    setAssignNotes("");
    setAssignError(null);
    loadEmployeesForAssign();
    setIsAssignModalOpen(true);
  };

  const handleManualAssign = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmpId) {
      setAssignError("Please choose an employee to assign.");
      return;
    }

    setIsAssigning(true);
    setAssignError(null);
    try {
      const res = await fetch(`/api/programs/${programId}/employees`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          assignedRole: assignedRole.trim() || undefined,
          notes: assignNotes.trim() || undefined,
          status: "CONFIRMED",
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to assign staff member");
      }

      setIsAssignModalOpen(false);
      fetchProgram();
    } catch (err) {
      setAssignError(err instanceof Error ? err.message : "Error assigning employee");
    } finally {
      setIsAssigning(false);
    }
  };

  // Status Change handler
  const handleStatusChange = async (newStatus: string) => {
    setIsUpdatingStatus(true);
    try {
      const res = await fetch(`/api/programs/${programId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to update status");
      }
      fetchProgram();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to change program status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  // Staff action handler (Confirm, Reject, or Remove)
  const handleStaffAction = async () => {
    const { staffId, action } = actionConfirm;
    setActionConfirm((prev) => ({ ...prev, isOpen: false }));

    try {
      if (action === "REMOVE") {
        const res = await fetch(`/api/programs/${programId}/employees/${staffId}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Failed to remove staff member");
      } else {
        const res = await fetch(`/api/programs/${programId}/employees/${staffId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: action }),
        });
        if (!res.ok) throw new Error(`Failed to update staff status to ${action}`);
      }
      fetchProgram();
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to update staff member");
    }
  };

  if (isLoading) {
    return (
      <AdminLayout
        title="Loading Program..."
        breadcrumbs={[{ label: "Admin Console" }, { label: "Programs", href: "/admin/programs" }]}
      >
        <div className="p-16">
          <LoadingState message="Fetching comprehensive event and staffing data..." />
        </div>
      </AdminLayout>
    );
  }

  if (error || !program) {
    return (
      <AdminLayout
        title="Program Not Found"
        breadcrumbs={[{ label: "Admin Console" }, { label: "Programs", href: "/admin/programs" }]}
      >
        <div className="p-12 text-center">
          <p className="text-sm text-red-600 mb-4">{error || "The requested program does not exist."}</p>
          <Link href="/admin/programs">
            <Button variant="outline" size="sm">
              Back to Programs
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const staffCapacityPercentage =
    program.requiredStaffCount > 0
      ? Math.min(100, Math.round((program.confirmedStaffCount / program.requiredStaffCount) * 100))
      : 100;

  const isStaffed =
    program.requiredStaffCount > 0 && program.confirmedStaffCount >= program.requiredStaffCount;

  return (
    <AdminLayout
      title={program.title}
      breadcrumbs={[
        { label: "Admin Console" },
        { label: "Programs", href: "/admin/programs" },
        { label: program.code },
      ]}
    >
      <div className="space-y-6">
        {/* Top Header Card */}
        <Card className="border-t-4 border-t-[#C2410C]">
          <div className="p-6">
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div>
                <div className="flex items-center gap-3 flex-wrap">
                  <span className="font-mono text-xs font-semibold px-2.5 py-0.5 rounded bg-[#F3F4F6] text-[#374151]">
                    {program.code}
                  </span>
                  <Badge variant="orange" size="sm">
                    {program.type}
                  </Badge>
                  <span
                    className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                      program.status === "UPCOMING"
                        ? "bg-blue-100 text-blue-800"
                        : program.status === "IN_PROGRESS"
                        ? "bg-green-100 text-green-800"
                        : program.status === "COMPLETED"
                        ? "bg-gray-100 text-gray-800"
                        : "bg-red-100 text-red-800"
                    }`}
                  >
                    {program.status}
                  </span>
                </div>
                <h1 className="text-2xl font-bold text-[#111827] mt-2">{program.title}</h1>
                <p className="text-sm text-[#64748B] flex items-center gap-4 mt-1.5 flex-wrap">
                  <span className="flex items-center gap-1">
                    <Calendar className="w-4 h-4 text-[#94A3B8]" />
                    {formatDate(program.eventDate)}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="w-4 h-4 text-[#94A3B8]" />
                    {program.startTime} - {program.endTime}
                  </span>
                  <span className="flex items-center gap-1">
                    <MapPin className="w-4 h-4 text-[#94A3B8]" />
                    {program.venueName}
                  </span>
                </p>
              </div>

              {/* Status Selector & Actions */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-1.5 bg-[#F9FAFB] border border-[#E5E7EB] rounded-lg p-1">
                  <span className="text-xs font-semibold text-[#64748B] px-2">Status:</span>
                  {(["UPCOMING", "IN_PROGRESS", "COMPLETED", "CANCELLED"] as const).map((st) => (
                    <button
                      key={st}
                      disabled={isUpdatingStatus || program.status === st}
                      onClick={() => handleStatusChange(st)}
                      className={`px-2.5 py-1 text-xs rounded font-medium transition-all ${
                        program.status === st
                          ? "bg-[#111827] text-white shadow-sm font-semibold"
                          : "text-[#64748B] hover:text-[#111827] hover:bg-white"
                      }`}
                    >
                      {st.replace("_", " ")}
                    </button>
                  ))}
                </div>

                <Link href={`/admin/programs/${program.id}/edit`}>
                  <Button
                    variant="outline"
                    size="sm"
                    leftIcon={<Edit2 className="w-3.5 h-3.5" />}
                  >
                    Edit Program
                  </Button>
                </Link>

                <Link href="/admin/programs">
                  <Button
                    variant="secondary"
                    size="sm"
                    leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}
                  >
                    Back
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </Card>

        {/* 4 Metric KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Staffing Capacity
              </span>
              <Users className="w-4 h-4 text-[#C2410C]" />
            </div>
            <div className="mt-2 flex items-baseline justify-between">
              <span className="text-2xl font-bold text-[#111827]">
                {program.confirmedStaffCount}{" "}
                <span className="text-sm font-normal text-[#64748B]">
                  / {program.requiredStaffCount || "—"}
                </span>
              </span>
              <span
                className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                  isStaffed
                    ? "bg-green-100 text-green-800"
                    : "bg-amber-100 text-amber-800"
                }`}
              >
                {staffCapacityPercentage}%
              </span>
            </div>
            {/* Capacity Progress Bar */}
            <div className="w-full bg-[#E5E7EB] h-2 rounded-full mt-3 overflow-hidden">
              <div
                className={`h-full transition-all rounded-full ${
                  isStaffed ? "bg-green-600" : "bg-[#C2410C]"
                }`}
                style={{ width: `${staffCapacityPercentage}%` }}
              />
            </div>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Staff Requests
              </span>
              <Clock3 className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-2xl font-bold text-[#111827]">
                {program.requestedStaffCount}
              </span>
              <span className="text-xs text-[#64748B]">pending confirmation</span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-2">
              {program.staff.length} total staff in roster
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Expected Guests
              </span>
              <Users className="w-4 h-4 text-purple-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#111827]">
                {program.expectedGuests ? program.expectedGuests.toLocaleString() : "Not specified"}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-2">
              {program.venueAddress || program.venueName}
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Event Budget
              </span>
              <DollarSign className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#111827]">
                {formatCurrency(program.budget)}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-2">
              Client: {program.customer.name}
            </p>
          </Card>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-[#E5E7EB]">
          <nav className="flex space-x-8">
            <button
              onClick={() => setActiveTab("staff")}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "staff"
                  ? "border-[#C2410C] text-[#C2410C]"
                  : "border-transparent text-[#64748B] hover:text-[#111827]"
              }`}
            >
              <Users className="w-4 h-4" />
              Staff Roster & Allocations ({program.staff.length})
            </button>
            <button
              onClick={() => setActiveTab("attendance")}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "attendance"
                  ? "border-[#C2410C] text-[#C2410C]"
                  : "border-transparent text-[#64748B] hover:text-[#111827]"
              }`}
            >
              <ClipboardCheck className="w-4 h-4" />
              Attendance & Shift Wages ({program.counts.attendances})
            </button>
            <button
              onClick={() => setActiveTab("details")}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "details"
                  ? "border-[#C2410C] text-[#C2410C]"
                  : "border-transparent text-[#64748B] hover:text-[#111827]"
              }`}
            >
              <Building className="w-4 h-4" />
              Client & Venue Details
            </button>
            <button
              onClick={() => setActiveTab("history")}
              className={`pb-3 text-sm font-semibold border-b-2 flex items-center gap-2 transition-colors ${
                activeTab === "history"
                  ? "border-[#C2410C] text-[#C2410C]"
                  : "border-transparent text-[#64748B] hover:text-[#111827]"
              }`}
            >
              <FileText className="w-4 h-4" />
              Event Operations & Audit
            </button>
          </nav>
        </div>

        {/* TAB 1: STAFF ROSTER & ALLOCATION */}
        {activeTab === "staff" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Rostered Personnel ({program.staff.length})
                </h3>
                <p className="text-xs text-[#64748B]">
                  Confirm shift join requests, manually assign employees, and configure assigned roles
                </p>
              </div>

              <Button
                variant="primary"
                size="sm"
                onClick={handleOpenAssignModal}
                leftIcon={<Plus className="w-4 h-4" />}
              >
                Manually Assign Employee
              </Button>
            </div>

            <Card>
              {program.staff.length === 0 ? (
                <div className="p-12">
                  <EmptyState
                    icon={<Users className="w-6 h-6 text-[#94A3B8]" />}
                    title="No employees in roster"
                    description="No employees have joined this program yet. Use 'Manually Assign Employee' to add staff members."
                    actionLabel="Assign First Employee"
                    onAction={handleOpenAssignModal}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Assigned Role</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Requested On</TableHead>
                        <TableHead>Confirmed By</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {program.staff.map((member) => (
                        <TableRow key={member.id}>
                          <TableCell>
                            <div className="font-semibold text-[#111827]">{member.name}</div>
                            <div className="text-xs text-[#64748B] flex items-center gap-2">
                              <span className="font-mono text-[#94A3B8]">{member.employeeCode}</span>
                              <span>•</span>
                              <span>{member.phone}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="orange" size="sm">
                              {member.designation}
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <span className="font-medium text-sm text-[#111827]">
                              {member.assignedRole || member.designation}
                            </span>
                          </TableCell>
                          <TableCell>
                            <span
                              className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${
                                member.status === "CONFIRMED"
                                  ? "bg-green-100 text-green-800"
                                  : member.status === "REQUESTED"
                                  ? "bg-blue-100 text-blue-800 font-bold"
                                  : member.status === "COMPLETED"
                                  ? "bg-gray-100 text-gray-800"
                                  : member.status === "REJECTED"
                                  ? "bg-red-100 text-red-800"
                                  : "bg-amber-100 text-amber-800"
                              }`}
                            >
                              {member.status}
                            </span>
                          </TableCell>
                          <TableCell className="text-xs text-[#64748B]">
                            {formatDate(member.requestedAt)}
                          </TableCell>
                          <TableCell className="text-xs text-[#64748B]">
                            {member.confirmedBy ? (
                              <span className="text-[#111827] font-medium">
                                {member.confirmedBy}
                              </span>
                            ) : (
                              "—"
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {member.status === "REQUESTED" && (
                                <>
                                  <Button
                                    variant="primary"
                                    size="sm"
                                    className="h-7 px-2.5 text-xs bg-green-600 hover:bg-green-700"
                                    leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                                    onClick={() =>
                                      setActionConfirm({
                                        isOpen: true,
                                        staffId: member.id,
                                        staffName: member.name,
                                        action: "CONFIRMED",
                                      })
                                    }
                                  >
                                    Confirm
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-red-600 hover:bg-red-50 hover:border-red-300"
                                    leftIcon={<UserX className="w-3.5 h-3.5" />}
                                    onClick={() =>
                                      setActionConfirm({
                                        isOpen: true,
                                        staffId: member.id,
                                        staffName: member.name,
                                        action: "REJECTED",
                                      })
                                    }
                                  >
                                    Reject
                                  </Button>
                                </>
                              )}

                              {member.status === "CONFIRMED" && (
                                <Button
                                  variant="secondary"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-red-600 hover:bg-red-50"
                                  onClick={() =>
                                    setActionConfirm({
                                      isOpen: true,
                                      staffId: member.id,
                                      staffName: member.name,
                                      action: "REMOVE",
                                    })
                                  }
                                >
                                  Remove
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* ATTENDANCE & SHIFT WAGES TAB */}
        {activeTab === "attendance" && (
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-[#111827]">
                  Shift Attendance & Verified Wage Accrual
                </h3>
                <p className="text-xs text-[#64748B]">
                  Mark clock-in verification for rostered staff. Present or Half-Day shifts automatically calculate earnings into the financial ledger.
                </p>
              </div>
            </div>

            <Card>
              {attendanceList.length === 0 ? (
                <div className="p-12">
                  <EmptyState
                    icon={<ClipboardCheck className="w-6 h-6 text-[#94A3B8]" />}
                    title="No confirmed staff members to record"
                    description="Attendance can only be logged for staff members whose shift requests have been officially confirmed."
                    actionLabel="Go to Staff Roster"
                    onAction={() => setActiveTab("staff")}
                  />
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee & Role</TableHead>
                        <TableHead>Wage Rate</TableHead>
                        <TableHead>Attendance Status</TableHead>
                        <TableHead>Hours Worked</TableHead>
                        <TableHead>Earned Shift Wage</TableHead>
                        <TableHead>Verified By</TableHead>
                        <TableHead>Remarks</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {attendanceList.map((member) => {
                        let wage = 0;
                        if (member.status === "PRESENT" || member.status === "LATE") {
                          wage = member.hourlyRate > 0 ? member.hourlyRate * (member.hoursWorked || 8) : member.dailyRate;
                        } else if (member.status === "HALF_DAY") {
                          wage = member.hourlyRate > 0 ? member.hourlyRate * (member.hoursWorked || 4) : member.dailyRate / 2;
                        }

                        return (
                          <TableRow key={member.employeeId}>
                            <TableCell>
                              <div className="font-semibold text-[#111827]">{member.name}</div>
                              <div className="text-xs text-[#64748B] flex items-center gap-1.5">
                                <span className="font-mono text-[#94A3B8]">{member.employeeCode}</span>
                                <span>•</span>
                                <Badge variant="orange" size="sm">
                                  {member.assignedRole || member.designation}
                                </Badge>
                              </div>
                            </TableCell>
                            <TableCell className="text-xs text-[#475569]">
                              {member.hourlyRate > 0
                                ? `${formatCurrency(member.hourlyRate)}/hr`
                                : `${formatCurrency(member.dailyRate)}/day`}
                            </TableCell>
                            <TableCell>
                              {member.status === "PRESENT" ? (
                                <Badge variant="present" size="sm">
                                  Present
                                </Badge>
                              ) : member.status === "HALF_DAY" ? (
                                <Badge variant="warning" size="sm">
                                  Half Day
                                </Badge>
                              ) : member.status === "LATE" ? (
                                <Badge variant="late" size="sm">
                                  Late
                                </Badge>
                              ) : member.status === "ABSENT" ? (
                                <Badge variant="absent" size="sm">
                                  Absent
                                </Badge>
                              ) : (
                                <Badge variant="neutral" size="sm">
                                  Unmarked
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-sm font-semibold text-[#111827]">
                              {member.status ? `${member.hoursWorked} hrs` : "—"}
                            </TableCell>
                            <TableCell className="text-sm font-bold text-emerald-700">
                              {member.status && member.status !== "ABSENT"
                                ? formatCurrency(wage)
                                : "—"}
                            </TableCell>
                            <TableCell className="text-xs text-[#64748B]">
                              {member.verifiedBy || "—"}
                            </TableCell>
                            <TableCell className="text-xs text-[#64748B] max-w-xs truncate">
                              {member.remarks || "—"}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-7 text-xs"
                                onClick={() => handleOpenAttendanceModal(member)}
                              >
                                {member.status ? "Update" : "Mark Attendance"}
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}
            </Card>
          </div>
        )}

        {/* TAB 2: CLIENT & VENUE DETAILS */}
        {activeTab === "details" && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Details */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <Building className="w-5 h-5 text-[#C2410C]" />
                  <CardTitle>Customer Information</CardTitle>
                </div>
                <CardDescription>Primary client hosting this catering event</CardDescription>
              </CardHeader>
              <div className="p-6 pt-0 space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-[#F3F4F6]">
                  <span className="text-[#64748B]">Client Name</span>
                  <span className="font-semibold text-[#111827]">{program.customer.name}</span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#F3F4F6]">
                  <span className="text-[#64748B]">Customer Code</span>
                  <span className="font-mono text-xs text-[#111827]">{program.customer.code}</span>
                </div>
                {program.customer.companyName && (
                  <div className="flex justify-between py-2 border-b border-[#F3F4F6]">
                    <span className="text-[#64748B]">Company</span>
                    <span className="font-medium text-[#111827]">{program.customer.companyName}</span>
                  </div>
                )}
                <div className="flex justify-between py-2 border-b border-[#F3F4F6]">
                  <span className="text-[#64748B]">Phone</span>
                  <span className="font-medium text-[#111827] flex items-center gap-1">
                    <Phone className="w-3.5 h-3.5 text-[#94A3B8]" />
                    {program.customer.phone}
                  </span>
                </div>
                {program.customer.email && (
                  <div className="flex justify-between py-2 border-b border-[#F3F4F6]">
                    <span className="text-[#64748B]">Email</span>
                    <span className="font-medium text-[#111827] flex items-center gap-1">
                      <Mail className="w-3.5 h-3.5 text-[#94A3B8]" />
                      {program.customer.email}
                    </span>
                  </div>
                )}
                {program.customer.city && (
                  <div className="flex justify-between py-2">
                    <span className="text-[#64748B]">City</span>
                    <span className="font-medium text-[#111827]">{program.customer.city}</span>
                  </div>
                )}
              </div>
            </Card>

            {/* Venue & Logistics */}
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MapPin className="w-5 h-5 text-[#C2410C]" />
                  <CardTitle>Venue & Logistics</CardTitle>
                </div>
                <CardDescription>Location coordinates and service timing</CardDescription>
              </CardHeader>
              <div className="p-6 pt-0 space-y-3 text-sm">
                <div className="flex justify-between py-2 border-b border-[#F3F4F6]">
                  <span className="text-[#64748B]">Venue Name</span>
                  <span className="font-semibold text-[#111827]">{program.venueName}</span>
                </div>
                <div className="py-2 border-b border-[#F3F4F6]">
                  <span className="text-[#64748B] block mb-1">Venue Address</span>
                  <span className="font-medium text-[#111827] block">
                    {program.venueAddress || "No specific address provided"}
                  </span>
                </div>
                <div className="flex justify-between py-2 border-b border-[#F3F4F6]">
                  <span className="text-[#64748B]">Service Window</span>
                  <span className="font-semibold text-[#111827]">
                    {program.startTime} to {program.endTime}
                  </span>
                </div>
                {program.notes && (
                  <div className="py-2">
                    <span className="text-[#64748B] block mb-1">Special Notes</span>
                    <p className="text-xs bg-[#FFF7ED] text-[#9A3412] p-3 rounded-lg border border-[#FFEDD5]">
                      {program.notes}
                    </p>
                  </div>
                )}
              </div>
            </Card>
          </div>
        )}

        {/* TAB 3: OPERATIONS & AUDIT */}
        {activeTab === "history" && (
          <Card className="p-6">
            <h3 className="text-base font-bold text-[#111827] mb-4">
              Event Operational Milestones
            </h3>
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                <span className="text-[#64748B]">Created On</span>
                <span className="font-medium text-[#111827]">{formatDate(program.createdAt)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                <span className="text-[#64748B]">Last Updated</span>
                <span className="font-medium text-[#111827]">{formatDate(program.updatedAt)}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                <span className="text-[#64748B]">Attendance Records Logged</span>
                <span className="font-semibold text-[#111827]">{program.counts.attendances}</span>
              </div>
              <div className="flex items-center justify-between py-2 border-b border-[#F3F4F6]">
                <span className="text-[#64748B]">Invoices Linked</span>
                <span className="font-semibold text-[#111827]">{program.counts.invoices}</span>
              </div>
              <div className="flex items-center justify-between py-2">
                <span className="text-[#64748B]">Wage Disbursements / Payments</span>
                <span className="font-semibold text-[#111827]">{program.counts.employeePayments}</span>
              </div>
            </div>
          </Card>
        )}
      </div>

      {/* Manual Assign Staff Modal */}
      <Modal
        isOpen={isAssignModalOpen}
        onClose={() => setIsAssignModalOpen(false)}
        title="Manually Assign Staff Member"
        description={`Allocate an active employee to ${program.title} as a confirmed staff member.`}
        maxWidth="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAssignModalOpen(false)}
              disabled={isAssigning}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleManualAssign}
              isLoading={isAssigning}
            >
              Assign & Confirm Staff
            </Button>
          </>
        }
      >
        <form onSubmit={handleManualAssign} className="space-y-4">
          {assignError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {assignError}
            </div>
          )}

          <Select
            label="Select Active Employee"
            isRequired
            value={selectedEmpId}
            onChange={(e) => {
              setSelectedEmpId(e.target.value);
              const emp = availableEmployees.find((ae) => ae.id === e.target.value);
              if (emp) setAssignedRole(emp.employeeType.name);
            }}
            options={[
              { value: "", label: "-- Choose an employee --" },
              ...availableEmployees.map((ae) => ({
                value: ae.id,
                label: `${ae.name} (${ae.code}) • ${ae.employeeType.name}`,
              })),
            ]}
          />

          <Input
            label="Assigned Role / Station"
            placeholder="e.g. Lead Chef, Service Captain, Buffet 1"
            value={assignedRole}
            onChange={(e) => setAssignedRole(e.target.value)}
          />

          <Input
            label="Assignment Note"
            placeholder="e.g. Assigned by admin for VIP section"
            value={assignNotes}
            onChange={(e) => setAssignNotes(e.target.value)}
          />
        </form>
      </Modal>

      {/* Mark / Edit Attendance Modal */}
      <Modal
        isOpen={isAttendanceModalOpen}
        onClose={() => setIsAttendanceModalOpen(false)}
        title={`Mark Shift Attendance: ${selectedStaffForAtt?.name || ""}`}
        description={`Record clock-in verification and hours worked for ${program.title}. Wages are automatically credited upon marking Present.`}
        maxWidth="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsAttendanceModalOpen(false)}
              disabled={isSavingAtt}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveAttendance}
              isLoading={isSavingAtt}
            >
              Save Attendance Record
            </Button>
          </>
        }
      >
        <form onSubmit={handleSaveAttendance} className="space-y-4">
          <Select
            label="Attendance Status"
            isRequired
            value={attStatus}
            onChange={(e) => setAttStatus(e.target.value)}
            options={[
              { value: "PRESENT", label: "Present (Full Shift)" },
              { value: "HALF_DAY", label: "Half Day (Partial Shift)" },
              { value: "LATE", label: "Late Arrival (Verified)" },
              { value: "ABSENT", label: "Absent (No Show / Cancelled Shift)" },
            ]}
          />

          <Input
            label="Hours Worked"
            type="number"
            placeholder="8"
            value={attHours}
            onChange={(e) => setAttHours(e.target.value)}
          />

          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">
              Remarks / Station Notes
            </label>
            <textarea
              rows={2}
              className="w-full text-sm rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 focus:border-[#C2410C]"
              placeholder="e.g. Completed dinner buffet shift on schedule"
              value={attRemarks}
              onChange={(e) => setAttRemarks(e.target.value)}
            />
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog for Confirm/Reject/Remove */}
      <ConfirmDialog
        isOpen={actionConfirm.isOpen}
        onClose={() => setActionConfirm((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={handleStaffAction}
        title={
          actionConfirm.action === "CONFIRMED"
            ? "Confirm Staff Member Participation?"
            : actionConfirm.action === "REJECTED"
            ? "Reject Staff Member Request?"
            : "Remove Staff Member from Roster?"
        }
        message={
          actionConfirm.action === "CONFIRMED"
            ? `Are you sure you want to officially confirm ${actionConfirm.staffName} for this event?`
            : actionConfirm.action === "REJECTED"
            ? `Are you sure you want to reject the shift request from ${actionConfirm.staffName}?`
            : `Are you sure you want to remove ${actionConfirm.staffName} from this program's staff roster?`
        }
        confirmText={
          actionConfirm.action === "CONFIRMED"
            ? "Confirm Staff"
            : actionConfirm.action === "REJECTED"
            ? "Reject Request"
            : "Remove from Program"
        }
        variant={actionConfirm.action === "CONFIRMED" ? "primary" : "danger"}
      />
    </AdminLayout>
  );
}
