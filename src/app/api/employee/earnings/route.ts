import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * GET /api/employee/earnings
 * Authenticated Employee: Retrieves their own financial earnings summary, wage rates, and payout history.
 * IDOR Protected: Strictly restricted to session.employeeId.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (session.role !== "EMPLOYEE" || !session.employeeId) {
      return NextResponse.json(
        { error: "Only authenticated employees can access earnings statements" },
        { status: 403 }
      );
    }

    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      include: { employeeType: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
    }

    // Fetch payments & ledger entries
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
      orderBy: { transactionDate: "desc" },
    });

    let totalEarned = 0;
    let totalPaid = 0;
    let pendingSettlement = 0;

    const payoutSlips: Array<{
      id: string;
      transactionNumber: string;
      referenceNo: string;
      programTitle: string;
      programCode: string;
      type: string;
      amount: number;
      paymentMethod: string | null;
      status: string;
      date: string;
      description: string;
    }> = [];

    for (const p of payments) {
      const amt = Number(p.amount);
      if (p.type === "CREDIT") {
        totalEarned += amt;
      } else if (p.type === "DEBIT") {
        totalPaid += amt;
        payoutSlips.push({
          id: p.id,
          transactionNumber: p.transactionNumber,
          referenceNo: p.referenceNo || p.transactionNumber,
          programTitle: p.program?.title || "Payroll Disbursal",
          programCode: p.program?.code || "DIRECT",
          type: p.type,
          amount: amt,
          paymentMethod: p.paymentMethod || "BANK_TRANSFER",
          status: p.status,
          date: p.transactionDate.toISOString().split("T")[0],
          description: p.description,
        });
      }

      if (p.status === "PENDING") {
        pendingSettlement += amt;
      }
    }

    const outstanding = totalEarned - totalPaid;

    return NextResponse.json({
      summary: {
        totalEarned,
        totalPaid,
        outstanding,
        pendingSettlement,
        wagePerEvent: Number(employee.wagePerEvent),
        designation: employee.employeeType.name,
      },
      payouts: payoutSlips,
    });
  } catch (error) {
    console.error("Error fetching employee earnings:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred retrieving earnings" },
      { status: 500 }
    );
  }
}
