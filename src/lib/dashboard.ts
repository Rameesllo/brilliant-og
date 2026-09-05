/**
 * Dashboard data-fetching module.
 *
 * All functions use graceful error handling — if the database is not yet
 * configured (e.g. DIRECT_URL pending or migration not run), they return
 * sensible zero-value defaults so the dashboard still renders cleanly.
 */

import { prisma } from "@/lib/prisma";
import type {
  DashboardKPIData,
  ProgramSummary,
  EmployeePaymentSummary,
  CustomerOutstandingSummary,
  LowStockProductSummary,
  ProgramType,
  ProgramStatus,
  Alert,
  ActivityLogEntry,
} from "@/types";

/** Today date range */
function todayRange() {
  const start = new Date();
  start.setHours(0, 0, 0, 0);
  const end = new Date();
  end.setHours(23, 59, 59, 999);
  return { start, end };
}

/** Date 7 days from now */
function sevenDaysFromNow() {
  const d = new Date();
  d.setDate(d.getDate() + 7);
  d.setHours(23, 59, 59, 999);
  return d;
}

/** Safely run a DB query — returns fallback if DB is unavailable */
async function safeQuery<T>(query: () => Promise<T>, fallback: T): Promise<T> {
  try {
    return await query();
  } catch {
    return fallback;
  }
}

// ---------------------------------------------------------------------------
// KPI aggregates
// ---------------------------------------------------------------------------

export async function getDashboardKPIs(): Promise<DashboardKPIData> {
  const { start, end } = todayRange();
  const upcoming7 = sevenDaysFromNow();

  const [
    todaysProgramsCount,
    upcomingProgramsCount,
    employeeScheduledToday,
    pendingPayoutsCount,
    pendingPaymentsAgg,
    customerOutstandingAgg,
  ] = await Promise.all([
    safeQuery(
      () =>
        prisma.program.count({
          where: {
            eventDate: { gte: start, lte: end },
            status: { notIn: ["CANCELLED"] },
          },
        }),
      0
    ),
    safeQuery(
      () =>
        prisma.program.count({
          where: {
            eventDate: { gt: end, lte: upcoming7 },
            status: { notIn: ["CANCELLED", "COMPLETED"] },
          },
        }),
      0
    ),
    safeQuery(
      () =>
        prisma.programEmployee.count({
          where: {
            status: "CONFIRMED",
            program: { eventDate: { gte: start, lte: end } },
          },
        }),
      0
    ),
    safeQuery(
      () =>
        prisma.employeePayment.count({
          where: { type: "CREDIT", status: "PENDING" },
        }),
      0
    ),
    safeQuery(
      () =>
        prisma.employeePayment.aggregate({
          where: { type: "CREDIT", status: "PENDING" },
          _sum: { amount: true },
        }),
      { _sum: { amount: null } }
    ),
    safeQuery(
      () =>
        prisma.invoice.aggregate({
          where: { outstandingAmount: { gt: 0 } },
          _sum: { outstandingAmount: true },
        }),
      { _sum: { outstandingAmount: null } }
    ),
  ]);

  return {
    todaysProgramsCount,
    upcomingProgramsCount,
    employeesWorkingToday: employeeScheduledToday,
    totalScheduledEmployeesToday: employeeScheduledToday,
    pendingPaymentsAmount: Number(pendingPaymentsAgg._sum.amount ?? 0),
    pendingEmployeePayoutsCount: pendingPayoutsCount,
    customerOutstandingTotal: Number(customerOutstandingAgg._sum.outstandingAmount ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Upcoming programs (next 7 days)
// ---------------------------------------------------------------------------

export async function getUpcomingPrograms(): Promise<ProgramSummary[]> {
  const { end } = todayRange();
  const upcoming7 = sevenDaysFromNow();
  const now = new Date();

  return safeQuery(async () => {
    const programs = await prisma.program.findMany({
      where: {
        eventDate: { gte: now, lte: upcoming7 },
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
      include: {
        customer: { select: { name: true, phone: true } },
        programEmployees: { select: { id: true, status: true } },
      },
      orderBy: { eventDate: "asc" },
      take: 8,
    });

    // suppress unused variable
    void end;

    return programs.map((p) => {
      const joined = p.programEmployees.filter((pe) =>
        ["REQUESTED", "CONFIRMED", "COMPLETED"].includes(pe.status)
      ).length;

      return {
        id: p.id,
        code: p.code,
        title: p.title,
        customerName: p.customer.name,
        customerPhone: p.customer.phone ?? "",
        type: p.type as ProgramType,
        date: p.eventDate.toISOString().split("T")[0],
        time: `${p.startTime} - ${p.endTime}`,
        location: p.venueName,
        employeesJoined: joined,
        employeesRequired: p.requiredStaffCount,
        status: p.status as ProgramStatus,
        budget: Number(p.budget ?? 0),
      };
    });
  }, []);
}

// ---------------------------------------------------------------------------
// Pending employee wage credits (not yet paid out)
// ---------------------------------------------------------------------------

export async function getPendingEmployeePayments(): Promise<EmployeePaymentSummary[]> {
  return safeQuery(async () => {
    const payments = await prisma.employeePayment.findMany({
      where: { type: "CREDIT", status: "PENDING" },
      include: {
        employee: {
          select: {
            name: true,
            employeeType: { select: { name: true } },
          },
        },
        program: { select: { title: true, eventDate: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 6,
    });

    return payments.map((p) => ({
      id: p.id,
      payoutNumber: p.transactionNumber,
      employeeName: p.employee.name,
      employeeDesignation: p.employee.employeeType?.name ?? "Staff",
      programTitle: p.program?.title ?? "—",
      eventDate: p.program?.eventDate?.toISOString().split("T")[0] ?? "",
      hoursWorked: 0,  // not stored directly on payment; computed from attendance
      rate: 0,
      amount: Number(p.amount),
      status: p.status as "PENDING" | "APPROVED" | "PAID" | "CANCELLED",
    }));
  }, []);
}

// ---------------------------------------------------------------------------
// Customer outstanding balances
// ---------------------------------------------------------------------------

export async function getCustomerOutstanding(): Promise<CustomerOutstandingSummary[]> {
  return safeQuery(async () => {
    const customers = await prisma.customer.findMany({
      where: {
        invoices: { some: { outstandingAmount: { gt: 0 } } },
      },
      include: {
        invoices: {
          select: {
            grandTotal: true,
            paidAmount: true,
            outstandingAmount: true,
            issueDate: true,
            status: true,
          },
          orderBy: { issueDate: "desc" },
        },
      },
      orderBy: { name: "asc" },
      take: 6,
    });

    return customers.map((c) => {
      const totalBilled = c.invoices.reduce((s, i) => s + Number(i.grandTotal), 0);
      const paidAmount = c.invoices.reduce((s, i) => s + Number(i.paidAmount), 0);
      const outstanding = c.invoices.reduce((s, i) => s + Number(i.outstandingAmount), 0);
      const lastInvoice = c.invoices[0];
      const hasOverdue = c.invoices.some((i) => i.status === "OVERDUE");

      return {
        id: c.id,
        customerName: c.name,
        phone: c.phone ?? "",
        companyName: c.companyName ?? undefined,
        totalBilled,
        paidAmount,
        outstanding,
        lastInvoiceDate: lastInvoice?.issueDate?.toISOString().split("T")[0] ?? "",
        status: hasOverdue ? "OVERDUE" : outstanding > 0 ? "CURRENT" : "SETTLED",
      } satisfies CustomerOutstandingSummary;
    });
  }, []);
}

// ---------------------------------------------------------------------------
// Low-stock products (stockQuantity <= minStockAlert)
// ---------------------------------------------------------------------------

export async function getLowStockProducts(): Promise<LowStockProductSummary[]> {
  return safeQuery(async () => {
    // Fetch all active products and filter in JS since Prisma doesn't support
    // column-to-column comparisons in a where clause directly.
    const products = await prisma.product.findMany({
      where: { isActive: true },
      include: {
        category: { select: { name: true, type: true } },
      },
      orderBy: { stockQuantity: "asc" },
    });

    const lowStock = products.filter((p) => p.stockQuantity <= p.minStockAlert);

    return lowStock.slice(0, 8).map((p) => ({
      id: p.id,
      code: p.code,
      name: p.name,
      category: p.category?.name ?? "Uncategorized",
      type: (p.type) as LowStockProductSummary["type"],
      currentStock: p.stockQuantity,
      minStockAlert: p.minStockAlert,
      unit: p.unit,
    }));
  }, []);
}

// ---------------------------------------------------------------------------
// Recent invoices
// ---------------------------------------------------------------------------

export interface RecentInvoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  invoiceDate: string;
  grandTotal: number;
  paidAmount: number;
  outstandingAmount: number;
  status: string;
}

export async function getRecentInvoices(): Promise<RecentInvoice[]> {
  return safeQuery(async () => {
    const invoices = await prisma.invoice.findMany({
      include: {
        customer: { select: { name: true } },
      },
      orderBy: { issueDate: "desc" },
      take: 5,
    });

    return invoices.map((i) => ({
      id: i.id,
      invoiceNumber: i.invoiceNumber,
      customerName: i.customer.name,
      invoiceDate: i.issueDate.toISOString().split("T")[0],
      grandTotal: Number(i.grandTotal),
      paidAmount: Number(i.paidAmount),
      outstandingAmount: Number(i.outstandingAmount),
      status: i.status,
    }));
  }, []);
}

// ---------------------------------------------------------------------------
// Monthly revenue (current calendar month)
// ---------------------------------------------------------------------------

export async function getMonthlyRevenue(): Promise<number> {
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
  const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);

  const result = await safeQuery(
    () =>
      prisma.customerPayment.aggregate({
        where: { paymentDate: { gte: monthStart, lte: monthEnd } },
        _sum: { amount: true },
      }),
    { _sum: { amount: null } }
  );

  return Number(result._sum.amount ?? 0);
}

// ---------------------------------------------------------------------------
// System alerts
// ---------------------------------------------------------------------------

export async function getAlerts(): Promise<Alert[]> {
  return safeQuery(async () => {
    const alerts: Alert[] = [];
    const upcoming7 = sevenDaysFromNow();
    const now = new Date();

    // 1. Low stock products
    const lowStock = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, stockQuantity: true, minStockAlert: true },
    });
    const lowStockCount = lowStock.filter((p) => p.stockQuantity <= p.minStockAlert).length;
    if (lowStockCount > 0) {
      alerts.push({
        id: "alert-low-stock",
        type: "LOW_STOCK",
        title: "Low Stock Inventory Alert",
        description: `${lowStockCount} product(s) are at or below minimum threshold.`,
        link: "/admin/products",
        severity: "warning",
      });
    }

    // 2. Pending employee payouts
    const pendingPayouts = await prisma.employeePayment.count({
      where: { type: "CREDIT", status: "PENDING" },
    });
    if (pendingPayouts > 0) {
      alerts.push({
        id: "alert-pending-payouts",
        type: "PENDING_PAYMENT",
        title: "Pending Employee Payouts",
        description: `${pendingPayouts} staff payout(s) are awaiting admin processing.`,
        link: "/admin/employees",
        severity: "critical",
      });
    }

    // 3. Overdue customer invoices
    const overdueInvoices = await prisma.invoice.count({
      where: { status: "OVERDUE" },
    });
    if (overdueInvoices > 0) {
      alerts.push({
        id: "alert-overdue-customers",
        type: "OVERDUE_CUSTOMER",
        title: "Overdue Customer Invoices",
        description: `${overdueInvoices} invoice(s) are overdue for payment.`,
        link: "/admin/invoices",
        severity: "critical",
      });
    }

    // 4. Under-staffed programs in next 7 days
    const upcomingPrograms = await prisma.program.findMany({
      where: {
        eventDate: { gte: now, lte: upcoming7 },
        status: { notIn: ["CANCELLED", "COMPLETED"] },
      },
      include: {
        programEmployees: {
          where: { status: { in: ["REQUESTED", "CONFIRMED"] } },
          select: { id: true },
        },
      },
    });
    const understaffed = upcomingPrograms.filter(
      (p) => p.programEmployees.length < p.requiredStaffCount
    );
    if (understaffed.length > 0) {
      alerts.push({
        id: "alert-understaffed",
        type: "UNDERSTAFFED_PROGRAM",
        title: "Under-staffed Programs",
        description: `${understaffed.length} upcoming event(s) have fewer staff than required.`,
        link: "/admin/programs",
        severity: "warning",
      });
    }

    // 5. Pending invoices with outstanding amounts
    const pendingInvoices = await prisma.invoice.count({
      where: { status: "UNPAID", outstandingAmount: { gt: 0 } },
    });
    if (pendingInvoices > 0) {
      alerts.push({
        id: "alert-pending-invoices",
        type: "PENDING_INVOICE",
        title: "Unpaid Invoices",
        description: `${pendingInvoices} invoice(s) have pending balances.`,
        link: "/admin/invoices",
        severity: "info",
      });
    }

    return alerts;
  }, []);
}

// ---------------------------------------------------------------------------
// Recent Activity Log
// ---------------------------------------------------------------------------

export async function getRecentActivity(): Promise<ActivityLogEntry[]> {
  return safeQuery(async () => {
    const logs = await prisma.activityLog.findMany({
      take: 5,
      orderBy: { createdAt: "desc" },
      include: {
        user: { select: { name: true } },
      },
    });

    return logs.map((log) => ({
      id: log.id,
      action: log.action,
      userName: log.user?.name ?? "System",
      entityType: log.entityType,
      entityId: log.entityId ?? undefined,
      createdAt: log.createdAt.toISOString(),
    }));
  }, []);
}
