"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Input } from "@/components/ui/Input";
import { Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  DollarSign,
  ArrowDownLeft,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  RefreshCw,
  Filter,
} from "lucide-react";

interface PaymentRecord {
  id: string;
  transactionNumber: string;
  referenceNo: string;
  type: "CREDIT" | "DEBIT";
  amount: number;
  paymentMethod: "CASH" | "BANK_TRANSFER" | "UPI" | "CHEQUE" | "CREDIT_CARD" | "OTHER" | null;
  status: "PENDING" | "APPROVED" | "PAID" | "CANCELLED";
  date: string;
  description: string;
  employee: {
    id: string;
    name: string;
    code: string;
    phone: string;
    designation: string;
  };
  program: {
    id: string;
    title: string;
    code: string;
    eventDate: string;
  } | null;
}

interface PaymentSummary {
  totalEarned: number;
  totalDisbursed: number;
  totalOutstanding: number;
  pendingPayoutsCount: number;
}

interface ActiveEmployeeOption {
  id: string;
  code: string;
  name: string;
  employeeType: { name: string };
}

export default function AdminPaymentsPage() {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [summary, setSummary] = useState<PaymentSummary>({
    totalEarned: 0,
    totalDisbursed: 0,
    totalOutstanding: 0,
    pendingPayoutsCount: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [search, setSearch] = useState("");
  const [filterType, setFilterType] = useState<string>("ALL");
  const [filterMethod, setFilterMethod] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Record Payout Modal State
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [employees, setEmployees] = useState<ActiveEmployeeOption[]>([]);
  const [selectedEmpId, setSelectedEmpId] = useState("");
  const [payoutAmount, setPayoutAmount] = useState("");
  const [payoutMethod, setPayoutMethod] = useState("BANK_TRANSFER");
  const [payoutRef, setPayoutRef] = useState("");
  const [payoutDate, setPayoutDate] = useState(new Date().toISOString().split("T")[0]);
  const [payoutDesc, setPayoutDesc] = useState("");
  const [isSubmittingPayout, setIsSubmittingPayout] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);

  const fetchPayments = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (filterType !== "ALL") params.set("type", filterType);
    if (filterMethod !== "ALL") params.set("paymentMethod", filterMethod);
    if (filterStatus !== "ALL") params.set("status", filterStatus);
    params.set("page", currentPage.toString());
    params.set("limit", "15");

    fetch(`/api/payments?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load payments");
        return res.json();
      })
      .then((data) => {
        setPayments(data.payments || []);
        if (data.summary) setSummary(data.summary);
        setTotalPages(data.pagination?.totalPages || 1);
        setTotalItems(data.pagination?.total || 0);
        setError(null);
      })
      .catch((err) => {
        console.error("Error loading payments:", err);
        setError(err instanceof Error ? err.message : "Failed to load payment records");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [search, filterType, filterMethod, filterStatus, currentPage]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const handleOpenRecordModal = () => {
    setSelectedEmpId("");
    setPayoutAmount("");
    setPayoutMethod("BANK_TRANSFER");
    setPayoutRef("");
    setPayoutDesc("");
    setPayoutDate(new Date().toISOString().split("T")[0]);
    setModalError(null);

    // Fetch active employees
    fetch("/api/employees?status=ACTIVE&limit=100")
      .then((res) => res.json())
      .then((data) => {
        if (data.employees) setEmployees(data.employees);
      })
      .catch((err) => console.error("Error loading employees for payout:", err));

    setIsRecordModalOpen(true);
  };

  const handleRecordPayout = async (e: React.FormEvent) => {
    e.preventDefault();
    setModalError(null);

    if (!selectedEmpId) {
      setModalError("Please select an employee.");
      return;
    }

    const numAmt = parseFloat(payoutAmount);
    if (isNaN(numAmt) || numAmt <= 0) {
      setModalError("Please enter a valid disbursement amount greater than 0.");
      return;
    }

    setIsSubmittingPayout(true);
    try {
      const res = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          employeeId: selectedEmpId,
          amount: numAmt,
          paymentMethod: payoutMethod,
          paymentDate: payoutDate,
          referenceNo: payoutRef.trim() || undefined,
          description: payoutDesc.trim() || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to record payout");
      }

      setIsRecordModalOpen(false);
      setSuccessToast("Wage disbursement recorded successfully in the financial ledger!");
      setTimeout(() => setSuccessToast(null), 4000);
      fetchPayments();
    } catch (err) {
      setModalError(err instanceof Error ? err.message : "Error processing payment");
    } finally {
      setIsSubmittingPayout(false);
    }
  };

  return (
    <AdminLayout
      title="Payments & Financial Ledger"
      breadcrumbs={[{ label: "Admin Console" }, { label: "Payments" }]}
    >
      <div className="space-y-6">
        {/* Success Toast */}
        {successToast && (
          <div className="flex items-center gap-2 p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs font-medium text-[#15803D]">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>{successToast}</span>
          </div>
        )}

        {/* 4 KPI Summary Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Total Wages Earned
              </span>
              <ArrowUpRight className="w-4 h-4 text-emerald-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#111827]">
                {formatCurrency(summary.totalEarned)}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Accrued from verified shift attendance
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Total Disbursed
              </span>
              <ArrowDownLeft className="w-4 h-4 text-blue-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#111827]">
                {formatCurrency(summary.totalDisbursed)}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Paid via Cash, Bank Transfer, or UPI
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Outstanding Balance
              </span>
              <DollarSign className="w-4 h-4 text-[#C2410C]" />
            </div>
            <div className="mt-2">
              <span
                className={`text-2xl font-bold ${
                  summary.totalOutstanding > 0 ? "text-[#C2410C]" : "text-emerald-700"
                }`}
              >
                {formatCurrency(summary.totalOutstanding)}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Net company liability to personnel
            </p>
          </Card>

          <Card className="p-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#64748B] uppercase tracking-wider">
                Pending Settlements
              </span>
              <Clock className="w-4 h-4 text-amber-600" />
            </div>
            <div className="mt-2">
              <span className="text-2xl font-bold text-[#111827]">
                {summary.pendingPayoutsCount}
              </span>
            </div>
            <p className="text-xs text-[#94A3B8] mt-1">
              Awaiting disbursal confirmation
            </p>
          </Card>
        </div>

        {/* Top Control Bar */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div className="flex flex-wrap items-center gap-3 flex-1">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
              }}
              placeholder="Search transaction, reference, staff or program..."
            />

            {/* Type Filter */}
            <div className="flex items-center gap-1.5 text-xs bg-white border border-[#E5E7EB] rounded-lg p-1">
              <span className="text-[#94A3B8] px-2 flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Type:
              </span>
              {[
                { label: "All", value: "ALL" },
                { label: "Disbursals (Paid)", value: "DEBIT" },
                { label: "Shift Accruals (Earned)", value: "CREDIT" },
              ].map((t) => (
                <button
                  key={t.value}
                  onClick={() => {
                    setFilterType(t.value);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    filterType === t.value
                      ? "bg-[#FFF7ED] text-[#C2410C] font-semibold"
                      : "text-[#64748B] hover:text-[#111827]"
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Status Filter */}
            <div className="flex items-center gap-1 text-xs bg-white border border-[#E5E7EB] rounded-lg p-1">
              {["ALL", "PAID", "APPROVED", "PENDING"].map((st) => (
                <button
                  key={st}
                  onClick={() => {
                    setFilterStatus(st);
                    setCurrentPage(1);
                  }}
                  className={`px-2.5 py-1 rounded font-medium transition-colors ${
                    filterStatus === st
                      ? "bg-[#111827] text-white"
                      : "text-[#64748B] hover:text-[#111827]"
                  }`}
                >
                  {st === "ALL" ? "All Status" : st}
                </button>
              ))}
            </div>

            {/* Method Filter */}
            <select
              value={filterMethod}
              onChange={(e) => {
                setFilterMethod(e.target.value);
                setCurrentPage(1);
              }}
              className="px-2.5 py-1.5 bg-white border border-[#E5E7EB] rounded-lg text-xs text-[#334155] font-medium focus:outline-none focus:border-[#F97316]"
            >
              <option value="ALL">All Methods</option>
              <option value="BANK_TRANSFER">Bank Transfer</option>
              <option value="CASH">Cash</option>
              <option value="UPI">UPI</option>
              <option value="CHEQUE">Cheque</option>
              <option value="CREDIT_CARD">Credit Card</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchPayments}
              leftIcon={<RefreshCw className="w-3.5 h-3.5" />}
              title="Refresh ledger"
            >
              Refresh
            </Button>
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={handleOpenRecordModal}
            >
              Record Wage Payout
            </Button>
          </div>
        </div>

        {/* Payments Ledger Table Card */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Organization Financial Ledger</CardTitle>
              <CardDescription>
                Accrued wage earnings and outbound payment disbursements
              </CardDescription>
            </div>
            <span className="text-xs text-[#64748B] font-medium">
              {totalItems} transaction{totalItems === 1 ? "" : "s"} logged
            </span>
          </CardHeader>

          {isLoading ? (
            <div className="p-12">
              <LoadingState message="Loading payment transactions and ledger..." />
            </div>
          ) : error ? (
            <div className="p-8 text-center">
              <p className="text-sm text-red-600 mb-3">{error}</p>
              <Button variant="outline" size="sm" onClick={fetchPayments}>
                Try Again
              </Button>
            </div>
          ) : payments.length === 0 ? (
            <div className="p-12">
              <EmptyState
                icon={<DollarSign className="w-6 h-6 text-[#94A3B8]" />}
                title="No payment records match your filters"
                description="Try clearing search keywords or switching filter selections."
                actionLabel="Reset Search"
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
                      <TableHead>Txn # & Date</TableHead>
                      <TableHead>Employee</TableHead>
                      <TableHead>Event Program</TableHead>
                      <TableHead>Ledger Type</TableHead>
                      <TableHead>Payment Method</TableHead>
                      <TableHead>Reference / Note</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {payments.map((p) => (
                      <TableRow key={p.id} className="hover:bg-[#F9FAFB]">
                        <TableCell>
                          <div className="font-mono text-xs font-semibold text-[#111827]">
                            {p.transactionNumber}
                          </div>
                          <div className="text-xs text-[#64748B]">{formatDate(p.date)}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-semibold text-[#111827]">{p.employee.name}</div>
                          <div className="text-xs text-[#64748B] flex items-center gap-1.5">
                            <span className="font-mono text-[#94A3B8]">{p.employee.code}</span>
                            <span>•</span>
                            <span>{p.employee.designation}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          {p.program ? (
                            <div>
                              <div className="text-sm font-medium text-[#111827] line-clamp-1">
                                {p.program.title}
                              </div>
                              <div className="text-xs font-mono text-[#94A3B8]">
                                {p.program.code}
                              </div>
                            </div>
                          ) : (
                            <span className="text-xs text-[#94A3B8]">Direct / General</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {p.type === "CREDIT" ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-50 text-green-700 border border-green-200">
                              <ArrowUpRight className="w-3 h-3" />
                              Earned (Credit)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                              <ArrowDownLeft className="w-3 h-3" />
                              Disbursal (Debit)
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-xs font-medium text-[#374151]">
                          {p.paymentMethod ? p.paymentMethod.replace("_", " ") : "—"}
                        </TableCell>
                        <TableCell className="text-xs text-[#64748B] max-w-xs truncate">
                          {p.description || p.referenceNo || "—"}
                        </TableCell>
                        <TableCell
                          className={`text-right font-bold ${
                            p.type === "CREDIT" ? "text-emerald-700" : "text-[#111827]"
                          }`}
                        >
                          {p.type === "CREDIT" ? "+" : "-"}
                          {formatCurrency(p.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          {p.status === "PAID" ? (
                            <Badge variant="paid" size="sm">
                              Paid
                            </Badge>
                          ) : p.status === "APPROVED" ? (
                            <Badge variant="active" size="sm">
                              Approved
                            </Badge>
                          ) : p.status === "PENDING" ? (
                            <Badge variant="pending" size="sm">
                              Pending
                            </Badge>
                          ) : (
                            <Badge variant="cancelled" size="sm">
                              Cancelled
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/employees/${p.employee.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 text-xs">
                              View Ledger
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {totalPages > 1 && (
                <Pagination
                  currentPage={currentPage}
                  totalPages={totalPages}
                  totalItems={totalItems}
                  pageSize={15}
                  onPageChange={setCurrentPage}
                />
              )}
            </>
          )}
        </Card>
      </div>

      {/* Record Wage Payout Modal */}
      <Modal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        title="Record Wage Payout / Disbursal"
        description="Log an official cash or electronic wage disbursal to an employee."
        maxWidth="md"
        footer={
          <>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setIsRecordModalOpen(false)}
              disabled={isSubmittingPayout}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={handleRecordPayout}
              isLoading={isSubmittingPayout}
            >
              Record Disbursal
            </Button>
          </>
        }
      >
        <form onSubmit={handleRecordPayout} className="space-y-4">
          {modalError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
              {modalError}
            </div>
          )}

          <Select
            label="Select Employee"
            isRequired
            value={selectedEmpId}
            onChange={(e) => setSelectedEmpId(e.target.value)}
            options={[
              { value: "", label: "-- Choose an employee --" },
              ...employees.map((e) => ({
                value: e.id,
                label: `${e.name} (${e.code}) • ${e.employeeType.name}`,
              })),
            ]}
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Disbursement Amount ($)"
              isRequired
              type="number"
              placeholder="e.g. 350.00"
              value={payoutAmount}
              onChange={(e) => setPayoutAmount(e.target.value)}
            />
            <Select
              label="Payment Method"
              isRequired
              value={payoutMethod}
              onChange={(e) => setPayoutMethod(e.target.value)}
              options={[
                { value: "BANK_TRANSFER", label: "Bank Transfer / NEFT" },
                { value: "CASH", label: "Cash Disbursal" },
                { value: "UPI", label: "UPI / Mobile Payment" },
                { value: "CHEQUE", label: "Cheque" },
                { value: "OTHER", label: "Other" },
              ]}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Disbursement Date"
              type="date"
              value={payoutDate}
              onChange={(e) => setPayoutDate(e.target.value)}
            />
            <Input
              label="Reference / UTR / Slip #"
              placeholder="e.g. UTR-994827104"
              value={payoutRef}
              onChange={(e) => setPayoutRef(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-[#374151] mb-1.5">
              Payment Description / Notes
            </label>
            <textarea
              rows={2}
              className="w-full text-sm rounded-lg border border-[#D1D5DB] px-3.5 py-2 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 focus:border-[#C2410C]"
              placeholder="e.g. Shift settlement for Weekend Wedding Program"
              value={payoutDesc}
              onChange={(e) => setPayoutDesc(e.target.value)}
            />
          </div>
        </form>
      </Modal>
    </AdminLayout>
  );
}
