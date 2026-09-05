"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { formatCurrency } from "@/lib/utils";
import {
  DollarSign,
  Calendar,
  Users,
  Package,
  UserCheck,
  AlertTriangle,
  TrendingUp,
  Download,
  RefreshCw,
  ArrowUpRight,
} from "lucide-react";

interface ReportData {
  dateRange: { startDate: string; endDate: string };
  revenue: {
    totalInvoiced: number;
    totalCollected: number;
    totalOutstanding: number;
    overdueAmount: number;
    collectionRate: number;
    invoicesCount: number;
    paymentsByMethod: Record<string, number>;
  };
  programs: {
    total: number;
    totalRevenue: number;
    statusBreakdown: Record<string, number>;
    typeBreakdown: Record<string, number>;
  };
  employees: {
    totalActive: number;
    totalShifts: number;
    presentCount: number;
    absentCount: number;
    attendanceRate: number;
    totalShiftHours: number;
    totalPayrollPaid: number;
    totalPayrollPending: number;
  };
  customers: {
    totalActive: number;
    topCustomers: Array<{
      id: string;
      name: string;
      companyName: string;
      totalBilled: number;
      totalPaid: number;
      outstanding: number;
      invoiceCount: number;
    }>;
  };
  inventory: {
    totalProducts: number;
    totalInventoryValue: number;
    lowStockCount: number;
    outOfStockCount: number;
    lowStockProducts: Array<{
      id: string;
      code: string;
      name: string;
      category: string;
      unit: string;
      currentStock: number;
      minStockAlert: number;
      shortfall: number;
    }>;
  };
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconColor,
  iconBg,
}: {
  label: string;
  value: string;
  sub: string;
  icon: React.ElementType;
  iconColor: string;
  iconBg: string;
}) {
  return (
    <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs">
      <div className="flex items-center justify-between">
        <span className="text-xs font-medium text-[#64748B]">{label}</span>
        <div className={`w-8 h-8 rounded-lg border flex items-center justify-center ${iconBg}`}>
          <Icon className={`w-4 h-4 ${iconColor}`} />
        </div>
      </div>
      <div className="mt-3 text-2xl font-bold text-[#111827]">{value}</div>
      <p className="mt-1 text-xs text-[#64748B]">{sub}</p>
    </div>
  );
}

function BreakdownBar({
  items,
  label,
}: {
  items: Array<{ key: string; value: number; color: string }>;
  label: string;
}) {
  const total = items.reduce((s, i) => s + i.value, 0);
  if (total === 0) return null;
  return (
    <div>
      <p className="text-xs font-semibold text-[#64748B] mb-2">{label}</p>
      <div className="flex h-3 rounded-full overflow-hidden">
        {items.map((item) => (
          <div
            key={item.key}
            style={{ width: `${(item.value / total) * 100}%`, backgroundColor: item.color }}
            title={`${item.key}: ${item.value}`}
          />
        ))}
      </div>
      <div className="mt-2 flex flex-wrap gap-3">
        {items.map((item) => (
          <div key={item.key} className="flex items-center gap-1.5">
            <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: item.color }} />
            <span className="text-[11px] text-[#64748B]">{item.key}</span>
            <span className="text-[11px] font-semibold text-[#111827]">{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "#16A34A",
  COMPLETED: "#0284C7",
  CANCELLED: "#DC2626",
  DRAFT: "#94A3B8",
  IN_PROGRESS: "#F97316",
  PENDING: "#F59E0B",
};
const TYPE_COLORS = ["#6366F1", "#F97316", "#0284C7", "#16A34A", "#F59E0B", "#EC4899"];

export default function AdminReportsPage() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [startDate, setStartDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split("T")[0];
  });
  const [endDate, setEndDate] = useState(new Date().toISOString().split("T")[0]);

  const fetchReport = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({ startDate, endDate });
      const res = await fetch(`/api/reports?${params}`);
      if (!res.ok) throw new Error("Failed to load reports");
      setData(await res.json());
    } catch {
      console.warn("Failed to load report data");
    } finally {
      setIsLoading(false);
    }
  }, [startDate, endDate]);

  useEffect(() => {
    fetchReport();
  }, [fetchReport]);

  const handleExportCSV = () => {
    if (!data) return;
    const rows = [
      ["Metric", "Value"],
      ["Total Invoiced", data.revenue.totalInvoiced],
      ["Total Collected", data.revenue.totalCollected],
      ["Outstanding", data.revenue.totalOutstanding],
      ["Collection Rate (%)", data.revenue.collectionRate],
      ["Programs (period)", data.programs.total],
      ["Attendance Rate (%)", data.employees.attendanceRate],
      ["Total Shift Hours", data.employees.totalShiftHours],
      ["Total Payroll Paid", data.employees.totalPayrollPaid],
      ["Inventory Value", data.inventory.totalInventoryValue],
      ["Low Stock Items", data.inventory.lowStockCount],
    ];
    const csv = rows.map((r) => r.join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `catering_report_${startDate}_to_${endDate}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const Skeleton = () => (
    <div className="h-20 bg-[#F1F5F9] rounded-xl animate-pulse" />
  );

  const typeBreakdownItems = data
    ? Object.entries(data.programs.typeBreakdown).map(([key, val], i) => ({
        key,
        value: val,
        color: TYPE_COLORS[i % TYPE_COLORS.length],
      }))
    : [];

  const statusBreakdownItems = data
    ? Object.entries(data.programs.statusBreakdown).map(([key, val]) => ({
        key,
        value: val,
        color: STATUS_COLORS[key] || "#94A3B8",
      }))
    : [];

  return (
    <AdminLayout
      title="Financial & Operational Reports"
      breadcrumbs={[{ label: "Admin Console" }, { label: "Reports" }]}
    >
      <div className="space-y-6">
        {/* Filters bar */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 p-4 bg-white border border-[#E5E7EB] rounded-xl shadow-2xs">
          <div>
            <h2 className="text-sm font-semibold text-[#111827]">Operational Intelligence</h2>
            <p className="text-xs text-[#64748B] mt-0.5">
              Real-time analytics from live database records
            </p>
          </div>
          <div className="flex flex-wrap items-end gap-3">
            <Input
              label="From"
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-36"
            />
            <Input
              label="To"
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-36"
            />
            <Button
              variant="primary"
              size="sm"
              leftIcon={<RefreshCw className="w-4 h-4" />}
              onClick={fetchReport}
              isLoading={isLoading}
            >
              Apply
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<Download className="w-4 h-4 text-[#64748B]" />}
              onClick={handleExportCSV}
              disabled={!data}
            >
              Export CSV
            </Button>
          </div>
        </div>

        {/* ── REVENUE ── */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3 flex items-center gap-2">
            <DollarSign className="w-3.5 h-3.5" />
            Revenue & Billing
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Total Invoiced"
                  value={formatCurrency(data?.revenue.totalInvoiced || 0)}
                  sub={`${data?.revenue.invoicesCount || 0} invoices in period`}
                  icon={DollarSign}
                  iconColor="text-[#6366F1]"
                  iconBg="bg-[#EEF2FF] border-[#C7D2FE]"
                />
                <StatCard
                  label="Amount Collected"
                  value={formatCurrency(data?.revenue.totalCollected || 0)}
                  sub="Payments received"
                  icon={TrendingUp}
                  iconColor="text-[#16A34A]"
                  iconBg="bg-[#F0FDF4] border-[#BBF7D0]"
                />
                <StatCard
                  label="Outstanding Balance"
                  value={formatCurrency(data?.revenue.totalOutstanding || 0)}
                  sub={`Overdue: ${formatCurrency(data?.revenue.overdueAmount || 0)}`}
                  icon={AlertTriangle}
                  iconColor="text-[#F59E0B]"
                  iconBg="bg-[#FFFBEB] border-[#FDE68A]"
                />
                <StatCard
                  label="Collection Rate"
                  value={`${data?.revenue.collectionRate || 0}%`}
                  sub="Invoiced vs collected"
                  icon={UserCheck}
                  iconColor="text-[#0284C7]"
                  iconBg="bg-[#F0F9FF] border-[#BAE6FD]"
                />
              </>
            )}
          </div>
          {!isLoading && data && Object.keys(data.revenue.paymentsByMethod).length > 0 && (
            <Card className="mt-4">
              <CardHeader>
                <CardTitle className="text-sm">Payments by Method</CardTitle>
                <Link href="/admin/invoices">
                  <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                    View Invoices
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-5">
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {Object.entries(data.revenue.paymentsByMethod).map(([method, amount]) => (
                    <div key={method} className="text-center p-3 bg-[#F8FAFC] rounded-lg border border-[#E5E7EB]">
                      <div className="text-xs font-medium text-[#64748B]">{method}</div>
                      <div className="mt-1 text-sm font-bold text-[#111827]">{formatCurrency(amount)}</div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* ── PROGRAMS ── */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3 flex items-center gap-2">
            <Calendar className="w-3.5 h-3.5" />
            Programs & Events
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Events in Period"
                  value={String(data?.programs.total || 0)}
                  sub="Across all statuses"
                  icon={Calendar}
                  iconColor="text-[#F97316]"
                  iconBg="bg-[#FFF7ED] border-[#FFEDD5]"
                />
                <StatCard
                  label="Event Revenue"
                  value={formatCurrency(data?.programs.totalRevenue || 0)}
                  sub="Total invoiced for events"
                  icon={DollarSign}
                  iconColor="text-[#6366F1]"
                  iconBg="bg-[#EEF2FF] border-[#C7D2FE]"
                />
                <div className="bg-white border border-[#E5E7EB] rounded-xl p-5 shadow-2xs space-y-3">
                  {data && (
                    <>
                      <BreakdownBar items={statusBreakdownItems} label="By Status" />
                      <BreakdownBar items={typeBreakdownItems} label="By Type" />
                    </>
                  )}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── EMPLOYEES ── */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3 flex items-center gap-2">
            <Users className="w-3.5 h-3.5" />
            Staff & Payroll
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Active Employees"
                  value={String(data?.employees.totalActive || 0)}
                  sub="Currently on roster"
                  icon={Users}
                  iconColor="text-[#0284C7]"
                  iconBg="bg-[#F0F9FF] border-[#BAE6FD]"
                />
                <StatCard
                  label="Attendance Rate"
                  value={`${data?.employees.attendanceRate || 0}%`}
                  sub={`${data?.employees.presentCount || 0} present / ${data?.employees.totalShifts || 0} shifts`}
                  icon={UserCheck}
                  iconColor="text-[#16A34A]"
                  iconBg="bg-[#F0FDF4] border-[#BBF7D0]"
                />
                <StatCard
                  label="Total Shift Hours"
                  value={`${data?.employees.totalShiftHours || 0} hrs`}
                  sub="Labour hours logged"
                  icon={Calendar}
                  iconColor="text-[#F97316]"
                  iconBg="bg-[#FFF7ED] border-[#FFEDD5]"
                />
                <StatCard
                  label="Payroll Disbursed"
                  value={formatCurrency(data?.employees.totalPayrollPaid || 0)}
                  sub={`Pending: ${formatCurrency(data?.employees.totalPayrollPending || 0)}`}
                  icon={DollarSign}
                  iconColor="text-[#F59E0B]"
                  iconBg="bg-[#FFFBEB] border-[#FDE68A]"
                />
              </>
            )}
          </div>
        </div>

        {/* ── CUSTOMERS ── */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3 flex items-center gap-2">
            <UserCheck className="w-3.5 h-3.5" />
            Top Customers by Revenue
          </h3>
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Customer Receivables Ranking</CardTitle>
                <CardDescription>
                  Customers sorted by total billing in the selected period
                </CardDescription>
              </div>
              <Link href="/admin/customers">
                <Button variant="ghost" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                  All Customers
                </Button>
              </Link>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-5 space-y-3">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <div key={i} className="h-8 bg-[#F1F5F9] rounded animate-pulse" />
                  ))}
                </div>
              ) : !data || data.customers.topCustomers.length === 0 ? (
                <p className="text-xs text-[#94A3B8] text-center py-10">
                  No billing records in this period
                </p>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                      <tr>
                        <th className="text-left p-3 font-semibold text-[#64748B]">#</th>
                        <th className="text-left p-3 font-semibold text-[#64748B]">Customer</th>
                        <th className="text-center p-3 font-semibold text-[#64748B]">Invoices</th>
                        <th className="text-right p-3 font-semibold text-[#64748B]">Total Billed</th>
                        <th className="text-right p-3 font-semibold text-[#64748B]">Paid</th>
                        <th className="text-right p-3 font-semibold text-[#64748B]">Outstanding</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.customers.topCustomers.map((cust, idx) => (
                        <tr key={cust.id} className="border-b border-[#F1F5F9] hover:bg-[#FAFAFA]">
                          <td className="p-3 font-bold text-[#94A3B8]">#{idx + 1}</td>
                          <td className="p-3">
                            <div className="font-semibold text-[#111827]">{cust.name}</div>
                            {cust.companyName && (
                              <div className="text-[11px] text-[#94A3B8]">{cust.companyName}</div>
                            )}
                          </td>
                          <td className="p-3 text-center text-[#475569]">{cust.invoiceCount}</td>
                          <td className="p-3 text-right font-medium text-[#111827]">
                            {formatCurrency(cust.totalBilled)}
                          </td>
                          <td className="p-3 text-right text-[#15803D] font-medium">
                            {formatCurrency(cust.totalPaid)}
                          </td>
                          <td className={`p-3 text-right font-bold ${cust.outstanding > 0 ? "text-[#DC2626]" : "text-[#16A34A]"}`}>
                            {formatCurrency(cust.outstanding)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* ── INVENTORY ── */}
        <div>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-[#94A3B8] mb-3 flex items-center gap-2">
            <Package className="w-3.5 h-3.5" />
            Inventory Health
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-4">
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} />)
            ) : (
              <>
                <StatCard
                  label="Total Products"
                  value={String(data?.inventory.totalProducts || 0)}
                  sub="Active catalog items"
                  icon={Package}
                  iconColor="text-[#6366F1]"
                  iconBg="bg-[#EEF2FF] border-[#C7D2FE]"
                />
                <StatCard
                  label="Inventory Value"
                  value={formatCurrency(data?.inventory.totalInventoryValue || 0)}
                  sub="At cost price"
                  icon={DollarSign}
                  iconColor="text-[#16A34A]"
                  iconBg="bg-[#F0FDF4] border-[#BBF7D0]"
                />
                <StatCard
                  label="Low Stock Items"
                  value={String(data?.inventory.lowStockCount || 0)}
                  sub="Below minimum threshold"
                  icon={AlertTriangle}
                  iconColor="text-[#F59E0B]"
                  iconBg="bg-[#FFFBEB] border-[#FDE68A]"
                />
                <StatCard
                  label="Out of Stock"
                  value={String(data?.inventory.outOfStockCount || 0)}
                  sub="Zero remaining units"
                  icon={AlertTriangle}
                  iconColor="text-[#DC2626]"
                  iconBg="bg-[#FEF2F2] border-[#FECACA]"
                />
              </>
            )}
          </div>

          {!isLoading && data && data.inventory.lowStockProducts.length > 0 && (
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Low Stock Alert</CardTitle>
                  <CardDescription>Items at or below minimum required stock level</CardDescription>
                </div>
                <Link href="/admin/products">
                  <Button variant="outline" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                    Inventory
                  </Button>
                </Link>
              </CardHeader>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                      <tr>
                        <th className="text-left p-3 font-semibold text-[#64748B]">Product</th>
                        <th className="text-left p-3 font-semibold text-[#64748B]">Category</th>
                        <th className="text-center p-3 font-semibold text-[#64748B]">Current</th>
                        <th className="text-center p-3 font-semibold text-[#64748B]">Min Required</th>
                        <th className="text-center p-3 font-semibold text-[#64748B]">Shortfall</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.inventory.lowStockProducts.map((prod) => (
                        <tr key={prod.id} className="border-b border-[#F1F5F9]">
                          <td className="p-3">
                            <div className="font-medium text-[#111827]">{prod.name}</div>
                            <div className="text-[11px] font-mono text-[#94A3B8]">{prod.code}</div>
                          </td>
                          <td className="p-3 text-[#475569]">{prod.category}</td>
                          <td className="p-3 text-center font-bold text-[#DC2626]">
                            {prod.currentStock} {prod.unit}
                          </td>
                          <td className="p-3 text-center text-[#64748B]">
                            {prod.minStockAlert} {prod.unit}
                          </td>
                          <td className="p-3 text-center">
                            <Badge variant="danger" size="sm">
                              -{prod.shortfall} {prod.unit}
                            </Badge>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </AdminLayout>
  );
}
