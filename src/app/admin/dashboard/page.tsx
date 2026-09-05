"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { 
  Calendar, 
  Users, 
  DollarSign, 
  Clock, 
  Plus, 
  UserPlus, 
  FilePlus, 
  PackagePlus, 
  ArrowUpRight, 
  AlertCircle,
  CheckCircle2,
  ChevronRight,
  MapPin
} from "lucide-react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { formatCurrency, formatDate } from "@/lib/utils";
import { 
  type DashboardKPIData, 
  type ProgramSummary, 
  type EmployeePaymentSummary, 
  type CustomerOutstandingSummary, 
  type LowStockProductSummary 
} from "@/types";

// Modals
import { CreateProgramModal } from "@/components/modals/CreateProgramModal";
import { AddEmployeeModal } from "@/components/modals/AddEmployeeModal";
import { CreateInvoiceModal } from "@/components/modals/CreateInvoiceModal";
import { AddProductModal } from "@/components/modals/AddProductModal";

const initialKPIs: DashboardKPIData = {
  todaysProgramsCount: 0,
  upcomingProgramsCount: 0,
  employeesWorkingToday: 0,
  totalScheduledEmployeesToday: 0,
  pendingPaymentsAmount: 0,
  pendingEmployeePayoutsCount: 0,
  customerOutstandingTotal: 0,
};

export default function AdminDashboardPage() {
  // Modal states for Quick Actions
  const [createProgramOpen, setCreateProgramOpen] = useState(false);
  const [addEmployeeOpen, setAddEmployeeOpen] = useState(false);
  const [createInvoiceOpen, setCreateInvoiceOpen] = useState(false);
  const [addProductOpen, setAddProductOpen] = useState(false);

  // Live database state
  const [kpis, setKpis] = useState<DashboardKPIData>(initialKPIs);
  const [upcomingPrograms, setUpcomingPrograms] = useState<ProgramSummary[]>([]);
  const [pendingPayments, setPendingPayments] = useState<EmployeePaymentSummary[]>([]);
  const [customerOutstanding, setCustomerOutstanding] = useState<CustomerOutstandingSummary[]>([]);
  const [lowStockProducts, setLowStockProducts] = useState<LowStockProductSummary[]>([]);

  const fetchDashboardData = useCallback(() => {
    fetch("/api/dashboard")
      .then((res) => {
        if (!res.ok) return null;
        return res.json();
      })
      .then((data) => {
        if (data) {
          if (data.kpis) setKpis(data.kpis);
          if (data.upcomingPrograms) setUpcomingPrograms(data.upcomingPrograms);
          if (data.pendingPayments) setPendingPayments(data.pendingPayments);
          if (data.customerOutstanding) setCustomerOutstanding(data.customerOutstanding);
          if (data.lowStockProducts) setLowStockProducts(data.lowStockProducts);
        }
      })
      .catch((err) => {
        console.warn("Failed to fetch dashboard data:", err);
      });
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Success toast/banner feedback
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  const showNotification = (msg: string) => {
    setActionSuccess(msg);
    fetchDashboardData();
    setTimeout(() => setActionSuccess(null), 4000);
  };

  return (
    <AdminLayout
      title="Operations Dashboard"
      breadcrumbs={[{ label: "Admin Console" }, { label: "Dashboard" }]}
    >
      <div className="space-y-6 sm:space-y-8">
        {/* Banner notification if quick action completed */}
        {actionSuccess && (
          <div className="flex items-center justify-between p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs font-medium text-[#15803D] animate-in fade-in">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
              <span>{actionSuccess}</span>
            </div>
            <button
              onClick={() => setActionSuccess(null)}
              className="text-[#16A34A] hover:underline"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* 1. QUICK ACTIONS BAR */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 bg-white border border-[#E5E7EB] rounded-xl shadow-2xs">
          <div>
            <h2 className="text-sm font-semibold text-[#111827]">Quick Actions</h2>
            <p className="text-xs text-[#64748B]">Immediate catering and event management workflows</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant="primary"
              size="sm"
              leftIcon={<Plus className="w-4 h-4" />}
              onClick={() => setCreateProgramOpen(true)}
            >
              Create Program
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<UserPlus className="w-4 h-4 text-[#64748B]" />}
              onClick={() => setAddEmployeeOpen(true)}
            >
              Add Employee
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<FilePlus className="w-4 h-4 text-[#64748B]" />}
              onClick={() => setCreateInvoiceOpen(true)}
            >
              Create Invoice
            </Button>
            <Button
              variant="secondary"
              size="sm"
              leftIcon={<PackagePlus className="w-4 h-4 text-[#64748B]" />}
              onClick={() => setAddProductOpen(true)}
            >
              Add Product
            </Button>
          </div>
        </div>

        {/* 2. KPI CARDS */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: Today's Programs */}
          <Card hoverEffect>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Today&apos;s Programs</span>
                <div className="w-8 h-8 rounded-lg bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center text-[#F97316]">
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#111827]">
                  {kpis.todaysProgramsCount}
                </span>
                <Badge variant="orange" size="sm">Active Today</Badge>
              </div>
              <p className="mt-2 text-xs text-[#64748B]">
                {kpis.todaysProgramsCount > 0 ? `${kpis.todaysProgramsCount} events running today` : "No programs scheduled today"}
              </p>
            </CardContent>
          </Card>

          {/* Card 2: Upcoming Programs */}
          <Card hoverEffect>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Upcoming Programs</span>
                <div className="w-8 h-8 rounded-lg bg-[#F8FAFC] border border-[#E2E8F0] flex items-center justify-center text-[#475569]">
                  <Clock className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#111827]">
                  {kpis.upcomingProgramsCount}
                </span>
                <span className="text-xs text-[#64748B]">next 7 days</span>
              </div>
              <p className="mt-2 text-xs text-[#64748B]">
                Weddings, Galas & Corporate Dinners
              </p>
            </CardContent>
          </Card>

          {/* Card 3: Employees Working Today */}
          <Card hoverEffect>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Employees Working Today</span>
                <div className="w-8 h-8 rounded-lg bg-[#F0FDF4] border border-[#BBF7D0] flex items-center justify-center text-[#16A34A]">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#111827]">
                  {kpis.employeesWorkingToday}
                </span>
                <span className="text-xs text-[#64748B]">/ {kpis.totalScheduledEmployeesToday || kpis.employeesWorkingToday} scheduled</span>
              </div>
              <div className="mt-2 w-full bg-[#F1F5F9] rounded-full h-1.5 overflow-hidden">
                <div 
                  className="bg-[#16A34A] h-1.5 rounded-full" 
                  style={{ width: `${kpis.totalScheduledEmployeesToday > 0 ? (kpis.employeesWorkingToday / kpis.totalScheduledEmployeesToday) * 100 : 100}%` }}
                />
              </div>
            </CardContent>
          </Card>

          {/* Card 4: Pending Payments */}
          <Card hoverEffect>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Pending Payments</span>
                <div className="w-8 h-8 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-center text-[#F59E0B]">
                  <DollarSign className="w-4 h-4" />
                </div>
              </div>
              <div className="mt-3 flex items-baseline gap-2">
                <span className="text-2xl font-bold text-[#111827]">
                  {formatCurrency(kpis.pendingPaymentsAmount)}
                </span>
              </div>
              <p className="mt-2 text-xs text-[#64748B]">
                {kpis.pendingEmployeePayoutsCount} staff payouts awaiting approval
              </p>
            </CardContent>
          </Card>
        </div>

        {/* 3. UPCOMING PROGRAMS SECTION */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Upcoming Programs</CardTitle>
              <CardDescription>
                Confirmed wedding and event programs scheduled with staff capacity metrics
              </CardDescription>
            </div>
            <Link href="/admin/programs">
              <Button variant="outline" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                View All Programs
              </Button>
            </Link>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Program & ID</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Date & Time</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Staff Capacity</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {upcomingPrograms.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-xs text-[#94A3B8]">
                      No upcoming event programs scheduled in the next 7 days.
                    </TableCell>
                  </TableRow>
                ) : (
                  upcomingPrograms.map((prog) => {
                    const staffPct = Math.round((prog.employeesJoined / prog.employeesRequired) * 100);
                    return (
                      <TableRow key={prog.id}>
                        <TableCell>
                          <div className="font-semibold text-[#111827]">{prog.title}</div>
                          <div className="text-xs text-[#64748B] flex items-center gap-1.5 mt-0.5">
                            <span className="font-mono text-[11px] bg-[#F8FAFC] px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                              {prog.code}
                            </span>
                            <span>•</span>
                            <span className="capitalize">{prog.type.toLowerCase()}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-[#111827]">{prog.customerName}</div>
                          <div className="text-xs text-[#64748B]">{prog.customerPhone}</div>
                        </TableCell>
                        <TableCell>
                          <div className="font-medium text-[#111827]">{formatDate(prog.date)}</div>
                          <div className="text-xs text-[#64748B]">{prog.time}</div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5 text-xs text-[#334155] max-w-xs truncate">
                            <MapPin className="w-3.5 h-3.5 text-[#94A3B8] shrink-0" />
                            <span className="truncate">{prog.location}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <div className="w-20 bg-[#F1F5F9] rounded-full h-2 overflow-hidden">
                              <div
                                className={`h-2 rounded-full ${
                                  staffPct >= 100
                                    ? "bg-[#16A34A]"
                                    : staffPct >= 75
                                    ? "bg-[#F97316]"
                                    : "bg-[#F59E0B]"
                                }`}
                                style={{ width: `${Math.min(100, staffPct)}%` }}
                              />
                            </div>
                            <span className="text-xs font-semibold text-[#111827]">
                              {prog.employeesJoined}/{prog.employeesRequired}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="orange" size="sm">
                            {prog.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Link href={`/admin/programs?id=${prog.id}`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2.5 text-xs">
                              Manage
                            </Button>
                          </Link>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>

        {/* 4. TWO-COLUMN SPLIT: PENDING EMPLOYEE PAYMENTS & CUSTOMER OUTSTANDING */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Column A: Pending Employee Payments */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Pending Employee Payments</CardTitle>
                <CardDescription>
                  Event shifts logged requiring verification and payout approval
                </CardDescription>
              </div>
              <Link href="/admin/payments">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                  All Payments
                </Button>
              </Link>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Program / Event</TableHead>
                    <TableHead className="text-right">Amount</TableHead>
                    <TableHead className="text-center">Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pendingPayments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-xs text-[#94A3B8]">
                        No pending wage payments awaiting approval.
                      </TableCell>
                    </TableRow>
                  ) : (
                    pendingPayments.map((payout) => (
                      <TableRow key={payout.id}>
                        <TableCell>
                          <div className="font-semibold text-[#111827]">{payout.employeeName}</div>
                          <div className="text-xs text-[#64748B]">{payout.employeeDesignation}</div>
                        </TableCell>
                        <TableCell>
                          <div className="text-xs text-[#334155] font-medium truncate max-w-[160px]">
                            {payout.programTitle}
                          </div>
                          <div className="text-[11px] text-[#94A3B8]">
                            {payout.hoursWorked} hrs @ ${payout.rate}/hr
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold text-[#111827]">
                          {formatCurrency(payout.amount)}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="pending" size="sm">
                            {payout.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2 text-xs text-[#C2410C] hover:bg-[#FFF7ED] hover:border-[#FED7AA]"
                            onClick={() => showNotification(`Approved payment of ${formatCurrency(payout.amount)} for ${payout.employeeName}`)}
                          >
                            Approve
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <CardFooter>
              <span>{pendingPayments.length} pending payroll disbursements</span>
              <span className="font-semibold text-[#111827]">
                Total: {formatCurrency(kpis.pendingPaymentsAmount)}
              </span>
            </CardFooter>
          </Card>

          {/* Column B: Customer Outstanding */}
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Customer Outstanding</CardTitle>
                <CardDescription>
                  Unpaid balances, deposits, and invoice collection statuses
                </CardDescription>
              </div>
              <Link href="/admin/customers">
                <Button variant="ghost" size="sm" rightIcon={<ChevronRight className="w-4 h-4" />}>
                  All Customers
                </Button>
              </Link>
            </CardHeader>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Customer</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead className="text-right">Paid</TableHead>
                    <TableHead className="text-right">Outstanding</TableHead>
                    <TableHead className="text-right">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {customerOutstanding.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center py-6 text-xs text-[#94A3B8]">
                        No active customer receivables.
                      </TableCell>
                    </TableRow>
                  ) : (
                    customerOutstanding.map((cust) => (
                      <TableRow key={cust.id}>
                        <TableCell>
                          <div className="font-semibold text-[#111827]">{cust.customerName}</div>
                          <div className="text-xs text-[#64748B]">{cust.companyName || cust.phone}</div>
                        </TableCell>
                        <TableCell className="text-right text-xs text-[#64748B]">
                          {formatCurrency(cust.totalBilled)}
                        </TableCell>
                        <TableCell className="text-right text-xs text-[#15803D] font-medium">
                          {formatCurrency(cust.paidAmount)}
                        </TableCell>
                        <TableCell className="text-right font-bold text-[#DC2626]">
                          {formatCurrency(cust.outstanding)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Badge
                            variant={cust.status === "OVERDUE" ? "danger" : "pending"}
                            size="sm"
                          >
                            {cust.status}
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
            <CardFooter>
              <span>Total Active Receivables</span>
              <span className="font-bold text-[#DC2626]">
                {formatCurrency(kpis.customerOutstandingTotal)}
              </span>
            </CardFooter>
          </Card>
        </div>

        {/* 5. LOW STOCK INVENTORY ALERTS */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-[#FEF2F2] text-[#DC2626]">
                <AlertCircle className="w-4 h-4" />
              </div>
              <div>
                <CardTitle>Low Stock Alerts</CardTitle>
                <CardDescription>
                  Catering ingredients and rental equipment below minimum required threshold
                </CardDescription>
              </div>
            </div>
            <Link href="/admin/products">
              <Button variant="outline" size="sm" rightIcon={<ArrowUpRight className="w-3.5 h-3.5" />}>
                Inventory Catalog
              </Button>
            </Link>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product Code & Name</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-center">Current Stock</TableHead>
                  <TableHead className="text-center">Minimum Required</TableHead>
                  <TableHead className="text-center">Deficit Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {lowStockProducts.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-6 text-xs text-[#16A34A] font-medium">
                      All inventory stock levels are healthy and within required thresholds.
                    </TableCell>
                  </TableRow>
                ) : (
                  lowStockProducts.map((prod) => {
                    const stockDeficit = prod.minStockAlert - prod.currentStock;
                    return (
                      <TableRow key={prod.id}>
                        <TableCell>
                          <div className="font-semibold text-[#111827]">{prod.name}</div>
                          <div className="text-xs font-mono text-[#94A3B8]">{prod.code}</div>
                        </TableCell>
                        <TableCell className="text-xs text-[#475569]">{prod.category}</TableCell>
                        <TableCell>
                          <span className="text-xs text-[#64748B]">
                            {prod.type === "RENTAL_EQUIPMENT" ? "Rental Asset" : "Catering Food"}
                          </span>
                        </TableCell>
                        <TableCell className="text-center font-bold text-[#DC2626]">
                          {prod.currentStock} {prod.unit}
                        </TableCell>
                        <TableCell className="text-center text-xs text-[#64748B]">
                          {prod.minStockAlert} {prod.unit}
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant="danger" size="sm">
                            -{stockDeficit} {prod.unit} short
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="h-7 px-2.5 text-xs"
                            onClick={() => showNotification(`Purchase order draft created for ${prod.name}`)}
                          >
                            Restock
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>

      {/* Quick Action Modals */}
      <CreateProgramModal
        isOpen={createProgramOpen}
        onClose={() => setCreateProgramOpen(false)}
        onSuccess={() => showNotification("Event program scheduled successfully!")}
      />
      <AddEmployeeModal
        isOpen={addEmployeeOpen}
        onClose={() => setAddEmployeeOpen(false)}
        onSuccess={() => showNotification("New employee added to the team roster!")}
      />
      <CreateInvoiceModal
        isOpen={createInvoiceOpen}
        onClose={() => setCreateInvoiceOpen(false)}
        onSuccess={() => showNotification("Invoice generated and ready to dispatch!")}
      />
      <AddProductModal
        isOpen={addProductOpen}
        onClose={() => setAddProductOpen(false)}
        onSuccess={() => showNotification("Product item registered into inventory!")}
      />
    </AdminLayout>
  );
}
