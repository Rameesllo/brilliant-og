"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Edit2,
  UserCheck,
  UserX,
  Calendar,
  DollarSign,
  Clock,
  Briefcase,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  FileText,
  CreditCard,
  CheckCircle2,
} from "lucide-react";

interface EmployeeDetail {
  id: string;
  code: string;
  name: string;
  email: string;
  phone: string;
  department: string;
  designation: string;
  wagePerEvent: number;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
  emergencyContact: string;
  address: string;
  joinDate: string;
  hasAccount: boolean;
}

interface FinancialSummary {
  totalEarned: number;
  totalPaid: number;
  outstanding: number;
  pendingPayoutsCount: number;
  pendingPayoutsAmount: number;
}

interface ProgramHistoryItem {
  id: string;
  programId: string;
  programCode: string;
  title: string;
  customerName: string;
  eventDate: string;
  time: string;
  venueName: string;
  assignedRole: string;
  assignmentStatus: string;
  attendanceStatus: string | null;
  hoursWorked: number | null;
  earned: number;
  paid: number;
  outstanding: number;
  paymentStatus: "PAID" | "PENDING" | "PARTIAL" | "UNPAID";
}

interface AttendanceItem {
  id: string;
  programId: string;
  programCode: string;
  programTitle: string;
  venueName: string;
  date: string;
  checkInTime: string | null;
  checkOutTime: string | null;
  hoursWorked: number;
  status: "PRESENT" | "ABSENT" | "LATE" | "HALF_DAY";
  remarks: string;
  verifiedBy: string;
}

interface LedgerEntry {
  id: string;
  date: string;
  transactionNumber: string;
  referenceNo: string;
  description: string;
  type: "CREDIT" | "DEBIT";
  programTitle: string;
  programCode: string;
  credit: number;
  debit: number;
  balance: number;
  paymentMethod: string | null;
  status: string;
}

export default function EmployeeDetailPage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params.id as string;

  const [activeTab, setActiveTab] = useState<"programs" | "attendance" | "payments" | "ledger">("programs");
  const [employee, setEmployee] = useState<EmployeeDetail | null>(null);
  const [financials, setFinancials] = useState<FinancialSummary | null>(null);
  const [programs, setPrograms] = useState<ProgramHistoryItem[]>([]);
  const [attendance, setAttendance] = useState<AttendanceItem[]>([]);
  const [payments, setPayments] = useState<LedgerEntry[]>([]);
  const [ledger, setLedger] = useState<LedgerEntry[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState("");
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  const fetchEmployeeData = useCallback(() => {
    Promise.all([
      fetch(`/api/employees/${employeeId}`),
      fetch(`/api/employees/${employeeId}/programs`),
      fetch(`/api/employees/${employeeId}/attendance`),
      fetch(`/api/employees/${employeeId}/payments`),
    ])
      .then(async ([empRes, progRes, attRes, payRes]) => {
        if (!empRes.ok) {
          throw new Error("Employee record not found");
        }

        const empData = await empRes.json();
        const progData = await progRes.json();
        const attData = await attRes.json();
        const payData = await payRes.json();

        setEmployee(empData.employee);
        setPrograms(progData.programs || []);
        setAttendance(attData.attendances || []);
        setFinancials(payData.summary || null);
        setPayments(payData.payments || []);
        setLedger(payData.ledger || []);
        setErrorMessage("");
      })
      .catch((err: unknown) => {
        setErrorMessage((err as Error).message || "Failed to load employee details.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [employeeId]);

  useEffect(() => {
    if (employeeId) {
      fetchEmployeeData();
    }
  }, [employeeId, fetchEmployeeData]);

  const handleToggleStatus = async () => {
    if (!employee) return;
    setIsUpdatingStatus(true);

    const targetStatus = employee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      const res = await fetch(`/api/employees/${employee.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update status");
      }

      setIsStatusDialogOpen(false);
      setIsLoading(true);
      await fetchEmployeeData();
    } catch (err: unknown) {
      alert((err as Error).message || "Error updating employee status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout
        title="Employee Profile"
        breadcrumbs={[
          { label: "Admin Console", href: "/admin/dashboard" },
          { label: "Employees", href: "/admin/employees" },
          { label: "Loading..." },
        ]}
      >
        <div className="max-w-6xl mx-auto space-y-6">
          <LoadingState message="Loading employee profile, programs, and financial history..." />
        </div>
      </AdminLayout>
    );
  }

  if (errorMessage || !employee) {
    return (
      <AdminLayout
        title="Employee Profile"
        breadcrumbs={[
          { label: "Admin Console", href: "/admin/dashboard" },
          { label: "Employees", href: "/admin/employees" },
          { label: "Error" },
        ]}
      >
        <div className="max-w-4xl mx-auto py-12">
          <EmptyState
            icon={<AlertCircle className="w-8 h-8 text-[#DC2626]" />}
            title="Employee Not Found"
            description={errorMessage || "The requested employee record could not be loaded or does not exist."}
            actionLabel="Return to Staff Directory"
            onAction={() => router.push("/admin/employees")}
          />
        </div>
      </AdminLayout>
    );
  }

  const isDeactivated = employee.status === "INACTIVE" || employee.status === "TERMINATED";

  return (
    <AdminLayout
      title={`${employee.name} (${employee.code})`}
      breadcrumbs={[
        { label: "Admin Console", href: "/admin/dashboard" },
        { label: "Employees", href: "/admin/employees" },
        { label: employee.name },
      ]}
    >
      <div className="space-y-6">
        {/* Navigation & Header Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <Link
            href="/admin/employees"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#111827] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Employees Directory
          </Link>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5" />}
              onClick={() => router.push(`/admin/employees/${employee.id}/edit`)}
            >
              Edit Profile
            </Button>
            {isDeactivated ? (
              <Button
                variant="primary"
                size="sm"
                leftIcon={<UserCheck className="w-3.5 h-3.5" />}
                onClick={() => setIsStatusDialogOpen(true)}
              >
                Reactivate Employee
              </Button>
            ) : (
              <Button
                variant="danger"
                size="sm"
                leftIcon={<UserX className="w-3.5 h-3.5" />}
                onClick={() => setIsStatusDialogOpen(true)}
              >
                Deactivate Employee
              </Button>
            )}
          </div>
        </div>

        {/* Top Profile Card */}
        <Card>
          <div className="p-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
              {/* Left Avatar & Identity */}
              <div className="flex items-start gap-4">
                <div className="w-16 h-16 rounded-2xl bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center text-[#EA580C] font-bold text-2xl shadow-sm shrink-0">
                  {employee.name.charAt(0).toUpperCase()}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <h2 className="text-xl font-bold text-[#111827] tracking-tight">{employee.name}</h2>
                    <span className="font-mono text-xs px-2 py-0.5 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] font-medium">
                      {employee.code}
                    </span>
                    <Badge
                      variant={
                        employee.status === "ACTIVE"
                          ? "active"
                          : employee.status === "ON_LEAVE"
                          ? "warning"
                          : "inactive"
                      }
                      size="sm"
                    >
                      {employee.status}
                    </Badge>
                  </div>
                  <p className="text-xs font-medium text-[#64748B]">
                    {employee.designation} • {employee.department}
                  </p>
                  <p className="text-[11px] text-[#94A3B8] flex items-center gap-1.5 pt-0.5">
                    <Calendar className="w-3.5 h-3.5" />
                    Joined on {formatDate(employee.joinDate)}
                  </p>
                </div>
              </div>

              {/* Right Contact & Rates Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-3 bg-[#F8FAFC] p-4 rounded-xl border border-[#E2E8F0] text-xs">
                <div className="flex items-center gap-2 text-[#475569]">
                  <Phone className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  <span className="font-medium text-[#111827]">{employee.phone}</span>
                </div>
                <div className="flex items-center gap-2 text-[#475569]">
                  <Mail className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  <span>{employee.email || "No email on record"}</span>
                </div>
                <div className="flex items-center gap-2 text-[#475569]">
                  <DollarSign className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  <span>
                    Rate Per Work: <strong className="text-[#111827]">{formatCurrency(employee.wagePerEvent)}</strong>
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[#475569]">
                  <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                  <span className="truncate max-w-[200px]" title={employee.address}>
                    {employee.address || "Address not provided"}
                  </span>
                </div>
                {employee.emergencyContact && (
                  <div className="col-span-1 sm:col-span-2 text-[11px] text-[#64748B] pt-1 border-t border-[#E2E8F0]">
                    Emergency Contact: <span className="font-medium text-[#111827]">{employee.emergencyContact}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Financial KPI Summary Cards */}
        {financials && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="p-4 border-l-4 border-l-[#10B981]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Total Earned</p>
                  <p className="text-xl font-bold text-[#111827] mt-1">{formatCurrency(financials.totalEarned)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#ECFDF5] text-[#10B981] flex items-center justify-center">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-[#64748B] mt-2">Historical shift & program credits</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-[#3B82F6]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Total Paid</p>
                  <p className="text-xl font-bold text-[#111827] mt-1">{formatCurrency(financials.totalPaid)}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#EFF6FF] text-[#3B82F6] flex items-center justify-center">
                  <CreditCard className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-[#64748B] mt-2">Disbursed cash, bank, or UPI payouts</p>
            </Card>

            <Card className={`p-4 border-l-4 ${financials.outstanding > 0 ? "border-l-[#F97316]" : "border-l-[#10B981]"}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Outstanding Balance</p>
                  <p className={`text-xl font-bold mt-1 ${financials.outstanding > 0 ? "text-[#C2410C]" : "text-[#10B981]"}`}>
                    {formatCurrency(financials.outstanding)}
                  </p>
                </div>
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${financials.outstanding > 0 ? "bg-[#FFF7ED] text-[#F97316]" : "bg-[#ECFDF5] text-[#10B981]"}`}>
                  <DollarSign className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-[#64748B] mt-2">Net credit minus debit balance</p>
            </Card>

            <Card className="p-4 border-l-4 border-l-[#8B5CF6]">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-semibold text-[#64748B] uppercase tracking-wider">Pending Payouts</p>
                  <p className="text-xl font-bold text-[#111827] mt-1">{financials.pendingPayoutsCount}</p>
                </div>
                <div className="w-10 h-10 rounded-xl bg-[#F5F3FF] text-[#8B5CF6] flex items-center justify-center">
                  <Clock className="w-5 h-5" />
                </div>
              </div>
              <p className="text-[11px] text-[#64748B] mt-2">
                Amounting to {formatCurrency(financials.pendingPayoutsAmount)}
              </p>
            </Card>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-[#E5E7EB] flex items-center gap-4">
          <button
            type="button"
            onClick={() => setActiveTab("programs")}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "programs"
                ? "border-[#F97316] text-[#F97316]"
                : "border-transparent text-[#64748B] hover:text-[#111827]"
            }`}
          >
            <Briefcase className="w-4 h-4" />
            Program History ({programs.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("attendance")}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "attendance"
                ? "border-[#F97316] text-[#F97316]"
                : "border-transparent text-[#64748B] hover:text-[#111827]"
            }`}
          >
            <Clock className="w-4 h-4" />
            Attendance ({attendance.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("payments")}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "payments"
                ? "border-[#F97316] text-[#F97316]"
                : "border-transparent text-[#64748B] hover:text-[#111827]"
            }`}
          >
            <CreditCard className="w-4 h-4" />
            Payment History ({payments.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("ledger")}
            className={`pb-3 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all ${
              activeTab === "ledger"
                ? "border-[#F97316] text-[#F97316]"
                : "border-transparent text-[#64748B] hover:text-[#111827]"
            }`}
          >
            <FileText className="w-4 h-4" />
            Financial Ledger ({ledger.length})
          </button>
        </div>

        {/* Tab 1: Program History */}
        {activeTab === "programs" && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Program Assignments & History</CardTitle>
                <CardDescription>
                  All past, ongoing, and scheduled event assignments for {employee.name}.
                </CardDescription>
              </div>
            </CardHeader>

            {programs.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Program History"
                  description="This employee has not yet been assigned to any catering programs or events."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Program & Event</TableHead>
                      <TableHead>Customer</TableHead>
                      <TableHead>Date & Time</TableHead>
                      <TableHead>Assigned Role</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Attendance</TableHead>
                      <TableHead className="text-right">Earned</TableHead>
                      <TableHead className="text-right">Paid</TableHead>
                      <TableHead className="text-right">Outstanding</TableHead>
                      <TableHead className="text-center">Payment Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {programs.map((prog) => (
                      <TableRow key={prog.id}>
                        <TableCell>
                          <div className="font-semibold text-[#111827]">{prog.title}</div>
                          <span className="font-mono text-[10px] text-[#64748B]">{prog.programCode}</span>
                        </TableCell>
                        <TableCell className="text-xs text-[#475569]">{prog.customerName}</TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-[#111827]">{formatDate(prog.eventDate)}</div>
                          <div className="text-[11px] text-[#64748B]">{prog.time}</div>
                        </TableCell>
                        <TableCell className="text-xs text-[#111827] font-medium">{prog.assignedRole}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              prog.assignmentStatus === "CONFIRMED" || prog.assignmentStatus === "COMPLETED"
                                ? "active"
                                : "warning"
                            }
                            size="sm"
                          >
                            {prog.assignmentStatus}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {prog.attendanceStatus ? (
                            <span className="text-xs font-medium text-[#10B981]">
                              {prog.attendanceStatus} {prog.hoursWorked ? `(${prog.hoursWorked}h)` : ""}
                            </span>
                          ) : (
                            <span className="text-xs text-[#94A3B8]">Not Recorded</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right font-medium text-xs text-[#111827]">
                          {formatCurrency(prog.earned)}
                        </TableCell>
                        <TableCell className="text-right font-medium text-xs text-[#10B981]">
                          {formatCurrency(prog.paid)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-xs text-[#C2410C]">
                          {formatCurrency(prog.outstanding)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge
                            variant={
                              prog.paymentStatus === "PAID"
                                ? "active"
                                : prog.paymentStatus === "PARTIAL"
                                ? "warning"
                                : "inactive"
                            }
                            size="sm"
                          >
                            {prog.paymentStatus}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        )}

        {/* Tab 2: Attendance History */}
        {activeTab === "attendance" && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Attendance Log</CardTitle>
                <CardDescription>
                  Verified shifts, clock-in/out records, and total hours worked.
                </CardDescription>
              </div>
            </CardHeader>

            {attendance.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Attendance Records"
                  description="No check-in or shift attendance logs are currently on file for this staff member."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Event Date</TableHead>
                      <TableHead>Program</TableHead>
                      <TableHead>Venue</TableHead>
                      <TableHead>Check-In / Out</TableHead>
                      <TableHead>Hours Worked</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendance.map((att) => (
                      <TableRow key={att.id}>
                        <TableCell className="text-xs font-semibold text-[#111827]">
                          {formatDate(att.date)}
                        </TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-[#111827]">{att.programTitle}</div>
                          <span className="font-mono text-[10px] text-[#64748B]">{att.programCode}</span>
                        </TableCell>
                        <TableCell className="text-xs text-[#475569]">{att.venueName}</TableCell>
                        <TableCell className="text-xs text-[#475569]">
                          {att.checkInTime ? new Date(att.checkInTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                          {" - "}
                          {att.checkOutTime ? new Date(att.checkOutTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : "—"}
                        </TableCell>
                        <TableCell className="text-xs font-bold text-[#111827]">
                          {att.hoursWorked.toFixed(1)} hrs
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              att.status === "PRESENT"
                                ? "active"
                                : att.status === "LATE" || att.status === "HALF_DAY"
                                ? "warning"
                                : "danger"
                            }
                            size="sm"
                          >
                            {att.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-[#64748B]">
                          {att.remarks || "—"}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        )}

        {/* Tab 3: Payment History */}
        {activeTab === "payments" && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Payouts & Payments History</CardTitle>
                <CardDescription>
                  Detailed log of salary credits and cash/bank disbursements.
                </CardDescription>
              </div>
            </CardHeader>

            {payments.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="No Payment History"
                  description="No financial payments or earnings have been posted to this employee's account."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Transaction #</TableHead>
                      <TableHead>Date</TableHead>
                      <TableHead>Description / Event</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Method</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead>Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id}>
                        <TableCell className="font-mono text-xs text-[#475569]">
                          {p.transactionNumber}
                        </TableCell>
                        <TableCell className="text-xs text-[#111827]">{formatDate(p.date)}</TableCell>
                        <TableCell>
                          <div className="text-xs font-medium text-[#111827]">{p.description}</div>
                          <span className="text-[11px] text-[#64748B]">{p.programTitle}</span>
                        </TableCell>
                        <TableCell>
                          <Badge variant={p.type === "CREDIT" ? "active" : "neutral"} size="sm">
                            {p.type === "CREDIT" ? "Credit (Earned)" : "Debit (Paid)"}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs text-[#475569]">
                          {p.paymentMethod || "Direct"}
                        </TableCell>
                        <TableCell className={`text-right font-bold text-xs ${p.type === "CREDIT" ? "text-[#10B981]" : "text-[#3B82F6]"}`}>
                          {p.type === "CREDIT" ? `+${formatCurrency(p.credit)}` : `-${formatCurrency(p.debit)}`}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={p.status === "PAID" ? "active" : p.status === "PENDING" ? "warning" : "inactive"}
                            size="sm"
                          >
                            {p.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        )}

        {/* Tab 4: Financial Ledger */}
        {activeTab === "ledger" && (
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Employee Account Ledger</CardTitle>
                <CardDescription>
                  Chronological financial transactions with running credit, debit, and net balance.
                </CardDescription>
              </div>
            </CardHeader>

            {ledger.length === 0 ? (
              <div className="p-8">
                <EmptyState
                  title="Ledger Empty"
                  description="No ledger transactions have been recorded for this staff member."
                />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Reference</TableHead>
                      <TableHead>Transaction Details</TableHead>
                      <TableHead className="text-right">Credit (Earned)</TableHead>
                      <TableHead className="text-right">Debit (Paid)</TableHead>
                      <TableHead className="text-right">Net Balance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {ledger.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="text-xs text-[#111827]">{formatDate(entry.date)}</TableCell>
                        <TableCell className="font-mono text-xs text-[#475569]">{entry.referenceNo}</TableCell>
                        <TableCell>
                          <div className="text-xs font-semibold text-[#111827]">{entry.description}</div>
                          <span className="text-[11px] text-[#64748B]">{entry.programTitle}</span>
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-[#10B981]">
                          {entry.credit > 0 ? `+${formatCurrency(entry.credit)}` : "—"}
                        </TableCell>
                        <TableCell className="text-right text-xs font-medium text-[#3B82F6]">
                          {entry.debit > 0 ? `-${formatCurrency(entry.debit)}` : "—"}
                        </TableCell>
                        <TableCell className={`text-right text-xs font-bold ${entry.balance > 0 ? "text-[#C2410C]" : "text-[#10B981]"}`}>
                          {formatCurrency(entry.balance)}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Confirmation Dialog for Activation / Deactivation */}
      <ConfirmDialog
        isOpen={isStatusDialogOpen}
        onClose={() => setIsStatusDialogOpen(false)}
        onConfirm={handleToggleStatus}
        isLoading={isUpdatingStatus}
        title={isDeactivated ? "Reactivate Employee" : "Deactivate Employee"}
        message={
          isDeactivated
            ? `Are you sure you want to reactivate ${employee.name}? The employee will once again be eligible for new program shifts and staff assignments.`
            : `Are you sure you want to deactivate ${employee.name}? Historical programs, attendance logs, and financial ledger records will be strictly preserved.`
        }
        confirmText={isDeactivated ? "Reactivate" : "Deactivate"}
        variant={isDeactivated ? "primary" : "danger"}
      />
    </AdminLayout>
  );
}
