import { NextResponse } from "next/server";
import {
  getDashboardKPIs,
  getUpcomingPrograms,
  getPendingEmployeePayments,
  getCustomerOutstanding,
  getLowStockProducts,
  getMonthlyRevenue,
  getRecentInvoices,
  getAlerts,
  getRecentActivity,
} from "@/lib/dashboard";
import {
  mockKPIData,
  mockUpcomingPrograms,
  mockPendingEmployeePayments,
  mockCustomerOutstanding,
  mockLowStockProducts,
} from "@/lib/mockData";

import { requireAdmin, AuthError } from "@/lib/auth";

export async function GET() {
  try {
    await requireAdmin();

    const [kpis, upcomingPrograms, pendingPayments, customerOutstanding, lowStockProducts, monthlyRevenue, alerts, recentInvoices, recentActivity] =
      await Promise.all([
        getDashboardKPIs(),
        getUpcomingPrograms(),
        getPendingEmployeePayments(),
        getCustomerOutstanding(),
        getLowStockProducts(),
        getMonthlyRevenue(),
        getAlerts(),
        getRecentInvoices(),
        getRecentActivity(),
      ]);

    return NextResponse.json({
      kpis,
      upcomingPrograms,
      pendingPayments,
      customerOutstanding,
      lowStockProducts,
      monthlyRevenue,
      alerts,
      recentInvoices,
      recentActivity,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.status }
      );
    }

    console.error("Error fetching dashboard data:", error);
    return NextResponse.json({
      kpis: mockKPIData,
      upcomingPrograms: mockUpcomingPrograms,
      pendingPayments: mockPendingEmployeePayments,
      customerOutstanding: mockCustomerOutstanding,
      lowStockProducts: mockLowStockProducts,
      monthlyRevenue: 0,
      alerts: [],
      recentInvoices: [],
      recentActivity: [],
    });
  }
}
