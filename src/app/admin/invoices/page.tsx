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
import { Select } from "@/components/ui/Select";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  Plus,
  DollarSign,
  AlertCircle,
  CheckCircle2,
  Clock,
  FileText,
} from "lucide-react";
import { type BadgeVariant } from "@/components/ui/Badge";
import { CreateInvoiceModal } from "@/components/modals/CreateInvoiceModal";

interface InvoiceRow {
  id: string;
  invoiceNumber: string;
  customerId: string;
  customerName: string;
  customerCompany: string;
  programTitle: string;
  issueDate: string;
  dueDate: string;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
  itemsCount: number;
}

interface Metrics {
  totalInvoiced: number;
  totalPaid: number;
  totalOutstanding: number;
  overdueCount: number;
  totalInvoicesCount: number;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Statuses" },
  { value: "UNPAID", label: "Unpaid" },
  { value: "PARTIAL", label: "Partial" },
  { value: "PAID", label: "Paid" },
  { value: "OVERDUE", label: "Overdue" },
  { value: "CANCELLED", label: "Cancelled" },
];

function statusBadgeVariant(status: string): BadgeVariant {
  switch (status) {
    case "PAID": return "paid";
    case "OVERDUE": return "danger";
    case "PARTIAL": return "pending";
    case "CANCELLED": return "inactive";
    default: return "neutral";
  }
}

export default function AdminInvoicesPage() {
  const router = useRouter();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  const [invoices, setInvoices] = useState<InvoiceRow[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalInvoiced: 0,
    totalPaid: 0,
    totalOutstanding: 0,
    overdueCount: 0,
    totalInvoicesCount: 0,
  });
  const [pagination, setPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [toast, setToast] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 4000);
  };

  const fetchInvoices = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: "20",
        status,
        ...(search ? { search } : {}),
      });
      const res = await fetch(`/api/invoices?${params}`);
      if (!res.ok) throw new Error("Failed to fetch");
      const data = await res.json();
      setInvoices(data.invoices || []);
      setMetrics(data.metrics || {});
      setPagination(data.pagination || { page: 1, totalPages: 1, total: 0 });
    } catch {
      console.warn("Failed to load invoices");
    } finally {
      setIsLoading(false);
    }
  }, [currentPage, status, search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setCurrentPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, status]);

  useEffect(() => {
    fetchInvoices();
  }, [fetchInvoices]);

  const kpiCards = [
    {
      label: "Total Invoiced",
      value: formatCurrency(metrics.totalInvoiced),
      sub: `${metrics.totalInvoicesCount} invoices issued`,
      icon: FileText,
      color: "text-[#6366F1]",
      bg: "bg-[#EEF2FF] border-[#C7D2FE]",
    },
    {
      label: "Total Collected",
      value: formatCurrency(metrics.totalPaid),
      sub: "Payments received",
      icon: CheckCircle2,
      color: "text-[#16A34A]",
      bg: "bg-[#F0FDF4] border-[#BBF7D0]",
    },
    {
      label: "Outstanding",
      value: formatCurrency(metrics.totalOutstanding),
      sub: "Awaiting collection",
      icon: DollarSign,
      color: "text-[#F59E0B]",
      bg: "bg-[#FFFBEB] border-[#FDE68A]",
    },
    {
      label: "Overdue",
      value: String(metrics.overdueCount),
      sub: "Past due date",
      icon: AlertCircle,
      color: "text-[#DC2626]",
      bg: "bg-[#FEF2F2] border-[#FECACA]",
    },
  ];

  return (
    <AdminLayout
      title="Invoices & Billing"
      breadcrumbs={[{ label: "Admin Console" }, { label: "Invoices" }]}
    >
      <div className="space-y-6">
        {/* Toast */}
        {toast && (
          <div className="flex items-center gap-2 p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs font-medium text-[#15803D] animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>{toast}</span>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {kpiCards.map((card) => (
            <div
              key={card.label}
              className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">{card.label}</span>
                <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${card.bg}`}>
                  <card.icon className={`w-4 h-4 ${card.color}`} />
                </div>
              </div>
              <div className="mt-3 text-2xl font-bold text-[#111827]">{card.value}</div>
              <p className="mt-1 text-xs text-[#64748B]">{card.sub}</p>
            </div>
          ))}
        </div>

        {/* Filters & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex flex-col sm:flex-row gap-3 flex-1">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Search invoice #, client or event..."
              className="flex-1"
            />
            <Select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={STATUS_OPTIONS}
              className="w-full sm:w-44"
            />
          </div>
          <Link href="/admin/invoices/create">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
            >
              Create Invoice
            </Button>
          </Link>
        </div>

        {/* Table */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Invoice Ledger</CardTitle>
              <CardDescription>
                Tax invoices, receivables tracking, and payment receipts
              </CardDescription>
            </div>
            <span className="text-xs text-[#64748B] font-medium">
              {isLoading ? "Loading..." : `${pagination.total} invoices`}
            </span>
          </CardHeader>

          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice #</TableHead>
                  <TableHead>Client & Event</TableHead>
                  <TableHead>Issue / Due</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead className="text-right">Paid</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                  <TableHead className="text-center">Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 8 }).map((_, j) => (
                        <TableCell key={j}>
                          <div className="h-4 bg-[#F1F5F9] rounded animate-pulse w-20" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : invoices.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8}>
                      <div className="text-center py-12">
                        <FileText className="w-10 h-10 text-[#CBD5E1] mx-auto mb-3" />
                        <p className="text-sm font-medium text-[#475569]">No invoices found</p>
                        <p className="text-xs text-[#94A3B8] mt-1">
                          {search || status !== "ALL" ? "Try adjusting your filters" : "Create your first invoice to get started"}
                        </p>
                      </div>
                    </TableCell>
                  </TableRow>
                ) : (
                  invoices.map((inv) => (
                    <TableRow
                      key={inv.id}
                      className="cursor-pointer hover:bg-[#F8FAFC] transition-colors"
                      onClick={() => router.push(`/admin/invoices/${inv.id}`)}
                    >
                      <TableCell>
                        <div className="font-mono font-semibold text-xs text-[#111827]">
                          {inv.invoiceNumber}
                        </div>
                        <div className="text-[11px] text-[#94A3B8] mt-0.5">
                          {inv.itemsCount} item{inv.itemsCount !== 1 ? "s" : ""}
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="font-semibold text-[#111827]">{inv.customerName}</div>
                        {inv.customerCompany && (
                          <div className="text-[11px] text-[#94A3B8]">{inv.customerCompany}</div>
                        )}
                        {inv.programTitle && (
                          <div className="text-xs text-[#64748B] truncate max-w-[200px] mt-0.5">
                            {inv.programTitle}
                          </div>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="text-xs text-[#111827]">{formatDate(inv.issueDate)}</div>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Clock className="w-3 h-3 text-[#94A3B8]" />
                          <span className="text-[11px] text-[#94A3B8]">{formatDate(inv.dueDate)}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-right font-medium text-[#111827]">
                        {formatCurrency(inv.grandTotal)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#15803D] font-medium">
                        {formatCurrency(inv.paidAmount)}
                      </TableCell>
                      <TableCell className={`text-right font-bold ${inv.outstandingAmount > 0 ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                        {formatCurrency(inv.outstandingAmount)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={statusBadgeVariant(inv.status)}
                          size="sm"
                        >
                          {inv.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                        <Link href={`/admin/invoices/${inv.id}`}>
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                            View
                          </Button>
                        </Link>
                      </TableCell>
                    </TableRow>
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

      <CreateInvoiceModal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        onSuccess={() => {
          showToast("Invoice created successfully");
          fetchInvoices();
        }}
      />
    </AdminLayout>
  );
}
