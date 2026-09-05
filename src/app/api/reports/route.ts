import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

/**
 * GET /api/reports
 * Returns comprehensive operational analytics from the live database.
 * Query params: startDate, endDate (ISO date strings)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const startDateStr = searchParams.get("startDate");
    const endDateStr = searchParams.get("endDate");

    // Default: last 30 days
    const endDate = endDateStr ? new Date(endDateStr) : new Date();
    endDate.setHours(23, 59, 59, 999);

    const startDate = startDateStr
      ? new Date(startDateStr)
      : new Date(endDate.getTime() - 30 * 24 * 60 * 60 * 1000);
    startDate.setHours(0, 0, 0, 0);

    const dateFilter = { gte: startDate, lte: endDate };

    // ─── REVENUE ANALYTICS ────────────────────────────────────────────────────
    const [invoices, payments] = await Promise.all([
      prisma.invoice.findMany({
        where: { issueDate: dateFilter },
        select: {
          grandTotal: true,
          paidAmount: true,
          outstandingAmount: true,
          status: true,
          issueDate: true,
          dueDate: true,
        },
      }),
      prisma.customerPayment.findMany({
        where: { paymentDate: dateFilter },
        select: { amount: true, paymentDate: true, paymentMethod: true },
      }),
    ]);

    const now = new Date();
    let totalInvoiced = 0;
    let totalCollected = 0;
    let totalOutstanding = 0;
    let overdueAmount = 0;

    for (const inv of invoices) {
      totalInvoiced += Number(inv.grandTotal);
      totalCollected += Number(inv.paidAmount);
      totalOutstanding += Number(inv.outstandingAmount);
      if (Number(inv.outstandingAmount) > 0 && inv.dueDate < now) {
        overdueAmount += Number(inv.outstandingAmount);
      }
    }

    const collectionRate =
      totalInvoiced > 0 ? Math.round((totalCollected / totalInvoiced) * 100) : 0;

    // Payments by method
    const paymentsByMethod: Record<string, number> = {};
    for (const pmt of payments) {
      const method = pmt.paymentMethod || "OTHER";
      paymentsByMethod[method] = (paymentsByMethod[method] || 0) + Number(pmt.amount);
    }

    // ─── PROGRAM ANALYTICS ────────────────────────────────────────────────────
    // Fetch programs with their invoices for revenue calculation
    const programs = await prisma.program.findMany({
      where: { eventDate: dateFilter },
      include: {
        invoices: {
          select: { grandTotal: true, paidAmount: true },
        },
      },
    });

    const programStatusCounts: Record<string, number> = {};
    const programTypeCounts: Record<string, number> = {};
    let programTotalRevenue = 0;

    for (const prog of programs) {
      programStatusCounts[prog.status] = (programStatusCounts[prog.status] || 0) + 1;
      programTypeCounts[prog.type] = (programTypeCounts[prog.type] || 0) + 1;
      for (const inv of prog.invoices) {
        programTotalRevenue += Number(inv.grandTotal);
      }
    }

    // ─── EMPLOYEE ANALYTICS ───────────────────────────────────────────────────
    const [attendanceRecords, employeePayments] = await Promise.all([
      prisma.programAttendance.findMany({
        where: { date: dateFilter },
        select: {
          date: true,
          hoursWorked: true,
          status: true,
        },
      }),
      prisma.employeePayment.findMany({
        where: { createdAt: dateFilter },
        select: { amount: true, status: true, type: true },
      }),
    ]);

    let totalShiftHours = 0;
    let totalAttendanceCount = 0;
    let presentCount = 0;
    let absentCount = 0;

    for (const att of attendanceRecords) {
      totalAttendanceCount++;
      if (att.status === "PRESENT" || att.status === "LATE") {
        presentCount++;
        totalShiftHours += Number(att.hoursWorked || 0);
      } else if (att.status === "ABSENT") {
        absentCount++;
      }
    }

    const attendanceRate =
      totalAttendanceCount > 0
        ? Math.round((presentCount / totalAttendanceCount) * 100)
        : 0;

    // EmployeePayment uses CREDIT/DEBIT ledger model
    let totalPayrollPaid = 0;
    let totalPayrollPending = 0;
    for (const ep of employeePayments) {
      if (ep.type === "DEBIT" && ep.status === "PAID") {
        totalPayrollPaid += Number(ep.amount);
      } else if (ep.type === "DEBIT" && ep.status === "PENDING") {
        totalPayrollPending += Number(ep.amount);
      }
    }

    // Count active employees (status = ACTIVE)
    const totalEmployees = await prisma.employee.count({
      where: { status: "ACTIVE" },
    });

    // ─── CUSTOMER ANALYTICS ───────────────────────────────────────────────────
    const customers = await prisma.customer.findMany({
      where: { isActive: true },
      include: {
        invoices: {
          where: { issueDate: dateFilter },
          select: { grandTotal: true, paidAmount: true, outstandingAmount: true },
        },
      },
    });

    const topCustomers = customers
      .map((c) => {
        let billed = 0;
        let paid = 0;
        let outstanding = 0;
        for (const inv of c.invoices) {
          billed += Number(inv.grandTotal);
          paid += Number(inv.paidAmount);
          outstanding += Number(inv.outstandingAmount);
        }
        return {
          id: c.id,
          name: c.name,
          companyName: c.companyName || "",
          totalBilled: billed,
          totalPaid: paid,
          outstanding,
          invoiceCount: c.invoices.length,
        };
      })
      .filter((c) => c.totalBilled > 0)
      .sort((a, b) => b.totalBilled - a.totalBilled)
      .slice(0, 10);

    const totalCustomers = await prisma.customer.count({ where: { isActive: true } });

    // ─── INVENTORY ANALYTICS ──────────────────────────────────────────────────
    // Product uses stockQuantity (not currentStock)
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        id: true,
        code: true,
        name: true,
        categoryId: true,
        type: true,
        unit: true,
        stockQuantity: true,
        minStockAlert: true,
        costPrice: true,
        isActive: true,
      },
    });

    let totalInventoryValue = 0;
    let lowStockCount = 0;
    let outOfStockCount = 0;
    const lowStockProducts = [];

    for (const prod of products) {
      const stock = prod.stockQuantity; // Int field
      const minAlert = prod.minStockAlert; // Int field
      const cost = Number(prod.costPrice);

      totalInventoryValue += stock * cost;

      if (stock === 0) {
        outOfStockCount++;
      }
      if (stock <= minAlert) {
        lowStockCount++;
        lowStockProducts.push({
          id: prod.id,
          code: prod.code,
          name: prod.name,
          category: prod.categoryId, // No join — use categoryId as reference
          type: prod.type,
          unit: prod.unit,
          currentStock: stock,
          minStockAlert: minAlert,
          shortfall: Math.max(0, minAlert - stock),
        });
      }
    }

    const totalProducts = products.length;

    return NextResponse.json({
      dateRange: {
        startDate: startDate.toISOString().split("T")[0],
        endDate: endDate.toISOString().split("T")[0],
      },
      revenue: {
        totalInvoiced,
        totalCollected,
        totalOutstanding,
        overdueAmount,
        collectionRate,
        invoicesCount: invoices.length,
        paymentsByMethod,
      },
      programs: {
        total: programs.length,
        totalRevenue: programTotalRevenue,
        statusBreakdown: programStatusCounts,
        typeBreakdown: programTypeCounts,
      },
      employees: {
        totalActive: totalEmployees,
        totalShifts: totalAttendanceCount,
        presentCount,
        absentCount,
        attendanceRate,
        totalShiftHours: Math.round(totalShiftHours * 10) / 10,
        totalPayrollPaid,
        totalPayrollPending,
      },
      customers: {
        totalActive: totalCustomers,
        topCustomers,
      },
      inventory: {
        totalProducts,
        totalInventoryValue: Math.round(totalInventoryValue * 100) / 100,
        lowStockCount,
        outOfStockCount,
        lowStockProducts: lowStockProducts.slice(0, 20),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error generating reports:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while generating reports" },
      { status: 500 }
    );
  }
}
