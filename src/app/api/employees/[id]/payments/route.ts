import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/employees/[id]/payments
 * Retrieves financial payments, ledger entries, and summary totals for an employee.
 * Credit = employee earnings
 * Debit = employee payouts
 * Outstanding = Credit - Debit
 * Protected by IDOR: Admin/Manager can view any; Employee can only view self.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id: requestedId } = await params;

    // IDOR Check
    if (session.role === "EMPLOYEE") {
      const isSelf = session.employeeId === requestedId || session.id === requestedId;
      if (!isSelf) {
        return NextResponse.json(
          { error: "Access denied: You cannot view another employee's financial records" },
          { status: 403 }
        );
      }
    }

    // Resolve employee
    const employee = await prisma.employee.findFirst({
      where: { OR: [{ id: requestedId }, { userId: requestedId }] },
      select: { id: true, name: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Fetch all payment/ledger records for employee in chronological order for running balance
    const payments = await prisma.employeePayment.findMany({
      where: { employeeId: employee.id },
      include: {
        program: {
          select: {
            id: true,
            code: true,
            title: true,
            eventDate: true,
          },
        },
      },
      orderBy: { transactionDate: "asc" },
    });

    let totalEarned = 0;
    let totalPaid = 0;
    let pendingPayoutsCount = 0;
    let pendingPayoutsAmount = 0;

    let runningBalance = 0;
    const ledgerEntries = [];

    for (const p of payments) {
      const amt = Number(p.amount);
      const isCredit = p.type === "CREDIT";
      const isDebit = p.type === "DEBIT";

      if (isCredit) {
        totalEarned += amt;
        runningBalance += amt;
      } else if (isDebit) {
        totalPaid += amt;
        runningBalance -= amt;
      }

      if (p.status === "PENDING") {
        pendingPayoutsCount++;
        pendingPayoutsAmount += amt;
      }

      ledgerEntries.push({
        id: p.id,
        date: p.transactionDate.toISOString().split("T")[0],
        transactionNumber: p.transactionNumber,
        referenceNo: p.referenceNo || p.transactionNumber,
        description: p.description,
        type: p.type,
        programTitle: p.program?.title || "Direct Account",
        programCode: p.program?.code || "",
        credit: isCredit ? amt : 0,
        debit: isDebit ? amt : 0,
        balance: runningBalance,
        paymentMethod: p.paymentMethod || null,
        status: p.status,
      });
    }

    const outstanding = totalEarned - totalPaid;

    // Payment history in reverse chronological order (latest first)
    const paymentHistory = [...ledgerEntries].reverse();

    return NextResponse.json({
      summary: {
        totalEarned,
        totalPaid,
        outstanding,
        pendingPayoutsCount,
        pendingPayoutsAmount,
      },
      payments: paymentHistory,
      ledger: ledgerEntries, // chronological ledger
    });
  } catch (error) {
    console.error("Error fetching employee payments and ledger:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred retrieving financial ledger" },
      { status: 500 }
    );
  }
}
