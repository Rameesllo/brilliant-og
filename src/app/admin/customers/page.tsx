"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { formatCurrency } from "@/lib/utils";
import { Plus, Users, DollarSign, Clock, AlertCircle, Loader2, ArrowUpRight, CheckCircle2, Trash2 } from "lucide-react";

interface CustomerRecord {
  id: string;
  code: string;
  name: string;
  companyName: string;
  phone: string;
  email: string;
  address: string;
  city: string;
  notes: string;
  isActive: boolean;
  programsCount: number;
  invoicesCount: number;
  paymentsCount: number;
  totalBilled: number;
  paidAmount: number;
  outstanding: number;
  ledgerStatus: "PAID" | "PENDING" | "OVERDUE";
  createdAt: string;
}

interface CustomerMetrics {
  totalCustomers: number;
  totalBilled: number;
  totalPaid: number;
  totalOutstanding: number;
}

export default function AdminCustomersPage() {
  const [customers, setCustomers] = useState<CustomerRecord[]>([]);
  const [metrics, setMetrics] = useState<CustomerMetrics>({
    totalCustomers: 0,
    totalBilled: 0,
    totalPaid: 0,
    totalOutstanding: 0,
  });
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCustomers = useCallback((page: number, q: string, status: string) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "15",
      status,
    });
    if (q) params.set("search", q);

    fetch(`/api/customers?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load customer directory");
        return res.json();
      })
      .then((data) => {
        setCustomers(data.customers || []);
        if (data.metrics) setMetrics(data.metrics);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.total || 0);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "An unexpected error occurred");
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchCustomers(currentPage, search, statusFilter);
  }, [fetchCustomers, currentPage, search, statusFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleStatusFilter = (val: string) => {
    setStatusFilter(val);
    setCurrentPage(1);
  };

  const handleDelete = async (customer: CustomerRecord) => {
    if (!window.confirm(`Delete ${customer.name}? Customers with related records cannot be deleted.`)) return;
    const response = await fetch(`/api/customers/${customer.id}`, { method: "DELETE" });
    const data = await response.json();
    if (!response.ok) {
      setError(data.error || "Unable to delete customer");
      return;
    }
    fetchCustomers(currentPage, search, statusFilter);
  };

  const getLedgerBadgeVariant = (status: "PAID" | "PENDING" | "OVERDUE"): BadgeVariant => {
    switch (status) {
      case "OVERDUE":
        return "danger";
      case "PENDING":
        return "warning";
      case "PAID":
      default:
        return "paid";
    }
  };

  return (
    <AdminLayout
      title="Customer Accounts & Ledger"
      breadcrumbs={[{ label: "Admin Console" }, { label: "Customers" }]}
    >
      <div className="space-y-6">
        {/* KPI Metrics */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Total Clients</span>
                <Users className="w-4 h-4 text-[#F97316]" />
              </div>
              <div className="text-2xl font-bold text-[#111827] mt-2">
                {metrics.totalCustomers}
              </div>
              <p className="text-xs text-[#64748B] mt-1">Active catering accounts</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Total Invoiced</span>
                <DollarSign className="w-4 h-4 text-[#6366F1]" />
              </div>
              <div className="text-2xl font-bold text-[#111827] mt-2">
                {formatCurrency(metrics.totalBilled)}
              </div>
              <p className="text-xs text-[#64748B] mt-1">Gross event receivables</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Collected Revenue</span>
                <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              </div>
              <div className="text-2xl font-bold text-[#15803D] mt-2">
                {formatCurrency(metrics.totalPaid)}
              </div>
              <p className="text-xs text-[#16A34A] mt-1">Cleared customer receipts</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Outstanding Receivables</span>
                <Clock className="w-4 h-4 text-[#DC2626]" />
              </div>
              <div className="text-2xl font-bold text-[#DC2626] mt-2">
                {formatCurrency(metrics.totalOutstanding)}
              </div>
              <p className="text-xs text-[#64748B] mt-1">Awaiting settlement</p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-center gap-3 text-sm text-[#991B1B]">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-1 items-center gap-3">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search customers by name, company, phone, city..."
            />
            <div className="flex items-center bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0] text-xs">
              <button
                type="button"
                onClick={() => handleStatusFilter("ALL")}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === "ALL"
                    ? "bg-white text-[#111827] shadow-sm"
                    : "text-[#64748B] hover:text-[#111827]"
                }`}
              >
                All
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilter("ACTIVE")}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === "ACTIVE"
                    ? "bg-white text-[#111827] shadow-sm"
                    : "text-[#64748B] hover:text-[#111827]"
                }`}
              >
                Active
              </button>
              <button
                type="button"
                onClick={() => handleStatusFilter("INACTIVE")}
                className={`px-3 py-1 rounded-md font-medium transition-colors ${
                  statusFilter === "INACTIVE"
                    ? "bg-white text-[#111827] shadow-sm"
                    : "text-[#64748B] hover:text-[#111827]"
                }`}
              >
                Inactive
              </button>
            </div>
          </div>
          <Link href="/admin/customers/add">
            <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
              Add Customer
            </Button>
          </Link>
        </div>

        {/* Customer Directory Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Customer Directory</CardTitle>
                <CardDescription>
                  Event clients, wedding parties, corporate partners, and outstanding balances
                </CardDescription>
              </div>
              <span className="text-xs text-[#64748B] font-medium">
                {totalCount} Total Customers
              </span>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-[#64748B] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
                <span className="text-sm font-medium">Loading customer directory...</span>
              </div>
            ) : customers.length === 0 ? (
              <div className="py-20 text-center text-[#64748B]">
                <Users className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                <p className="text-base font-semibold text-[#111827]">No customers found</p>
                <p className="text-sm mt-1">
                  {search ? "No records match your search criteria." : "Get started by adding your first catering client."}
                </p>
                {!search && (
                  <Link href="/admin/customers/add" className="inline-block mt-4">
                    <Button variant="primary" size="sm" leftIcon={<Plus className="w-4 h-4" />}>
                      Create Customer
                    </Button>
                  </Link>
                )}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer / Company</TableHead>
                    <TableHead>Contact Phone</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead className="text-center">Events</TableHead>
                    <TableHead className="text-right">Total Invoiced</TableHead>
                    <TableHead className="text-right">Paid Amount</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customers.map((cust) => (
                    <TableRow key={cust.id}>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <div>
                            <Link
                              href={`/admin/customers/${cust.id}`}
                              className="font-semibold text-[#111827] hover:text-[#F97316] transition-colors flex items-center gap-1"
                            >
                              <span>{cust.name}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                            </Link>
                            <div className="flex items-center gap-2 text-xs text-[#64748B] mt-0.5">
                              <span className="font-mono text-[#F97316] font-medium">{cust.code}</span>
                              {cust.companyName && (
                                <>
                                  <span>•</span>
                                  <span>{cust.companyName}</span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-xs text-[#334155]">
                        <div>{cust.phone}</div>
                        {cust.email && <div className="text-[#94A3B8]">{cust.email}</div>}
                      </TableCell>
                      <TableCell className="text-xs text-[#64748B]">
                        {cust.city || "—"}
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-[#F1F5F9] text-[#475569]">
                          {cust.programsCount}
                        </span>
                      </TableCell>
                      <TableCell className="text-right font-medium text-[#111827]">
                        {formatCurrency(cust.totalBilled)}
                      </TableCell>
                      <TableCell className="text-right text-xs text-[#15803D] font-medium">
                        {formatCurrency(cust.paidAmount)}
                      </TableCell>
                      <TableCell className="text-right font-bold text-[#DC2626]">
                        {formatCurrency(cust.outstanding)}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={getLedgerBadgeVariant(cust.ledgerStatus)}
                          size="sm"
                        >
                          {cust.ledgerStatus}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Link href={`/admin/customers/${cust.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs">
                              Ledger
                            </Button>
                          </Link>
                          <Link href={`/admin/customers/${cust.id}/edit`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[#64748B]">
                              Edit
                            </Button>
                          </Link>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-[#DC2626]"
                            onClick={() => handleDelete(cust)}
                            title="Delete customer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            onPageChange={setCurrentPage}
          />
        </Card>
      </div>
    </AdminLayout>
  );
}
