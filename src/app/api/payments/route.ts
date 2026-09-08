import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { LedgerEntryType, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { notifyEmployeePaymentPaid, notifySafely } from "@/lib/notifications";

/**
 * GET /api/payments
 * Admin/Manager only: Retrieves employee payroll, wage disbursements, and earnings ledger records.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const employeeId = searchParams.get("employeeId")?.trim() || "";
    const programId = searchParams.get("programId")?.trim() || "";
    const typeParam = searchParams.get("type")?.trim() || "";
    const methodParam = searchParams.get("paymentMethod")?.trim() || "";
    const statusParam = searchParams.get("status")?.trim() || "";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "15", 10)));
    const skip = (page - 1) * limit;

    const where: Prisma.EmployeePaymentWhereInput = {};

    if (employeeId) where.employeeId = employeeId;
    if (programId) where.programId = programId;

    if (typeParam && Object.values(LedgerEntryType).includes(typeParam as LedgerEntryType)) {
      where.type = typeParam as LedgerEntryType;
    }

    if (methodParam && Object.values(PaymentMethod).includes(methodParam as PaymentMethod)) {
      where.paymentMethod = methodParam as PaymentMethod;
    }

    if (statusParam && Object.values(PaymentStatus).includes(statusParam as PaymentStatus)) {
      where.status = statusParam as PaymentStatus;
    }

    if (search) {
      where.OR = [
        { transactionNumber: { contains: search, mode: "insensitive" } },
        { referenceNo: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { employee: { name: { contains: search, mode: "insensitive" } } },
        { employee: { code: { contains: search, mode: "insensitive" } } },
        { program: { title: { contains: search, mode: "insensitive" } } },
        { program: { code: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [payments, total, kpiCredits, kpiDebits, pendingCount] = await Promise.all([
      prisma.employeePayment.findMany({
        where,
        include: {
          employee: {
            select: {
              id: true,
              name: true,
              code: true,
              phone: true,
              employeeType: { select: { name: true } },
            },
          },
          program: {
            select: {
              id: true,
              title: true,
              code: true,
              eventDate: true,
            },
          },
        },
        orderBy: { transactionDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.employeePayment.count({ where }),
      prisma.employeePayment.aggregate({
        where: { type: "CREDIT" },
        _sum: { amount: true },
      }),
      prisma.employeePayment.aggregate({
        where: { type: "DEBIT" },
        _sum: { amount: true },
      }),
      prisma.employeePayment.count({
        where: { status: "PENDING" },
      }),
    ]);

    const totalEarned = Number(kpiCredits._sum.amount ?? 0);
    const totalDisbursed = Number(kpiDebits._sum.amount ?? 0);
    const totalOutstanding = totalEarned - totalDisbursed;

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        transactionNumber: p.transactionNumber,
        referenceNo: p.referenceNo || p.transactionNumber,
        type: p.type,
        amount: Number(p.amount),
        paymentMethod: p.paymentMethod || null,
        status: p.status,
        date: p.transactionDate.toISOString().split("T")[0],
        description: p.description,
        employee: {
          id: p.employee.id,
          name: p.employee.name,
          code: p.employee.code,
          phone: p.employee.phone,
          designation: p.employee.employeeType.name,
        },
        program: p.program
          ? {
              id: p.program.id,
              title: p.program.title,
              code: p.program.code,
              eventDate: p.program.eventDate.toISOString().split("T")[0],
            }
          : null,
      })),
      summary: {
        totalEarned,
        totalDisbursed,
        totalOutstanding,
        pendingPayoutsCount: pendingCount,
      },
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching payments:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred retrieving payments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/payments
 * Admin/Manager only: Records an employee wage payout / disbursal (DEBIT entry).
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const {
      employeeId,
      programId,
      amount,
      paymentMethod,
      paymentDate,
      referenceNo,
      description,
      status,
    } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "Employee is required" }, { status: 400 });
    }

    const numAmount = parseFloat(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Disbursement amount must be greater than 0" }, { status: 400 });
    }

    // Verify employee
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { employeeType: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee record not found" }, { status: 404 });
    }

    if (employee.status !== "ACTIVE" && employee.status !== "ON_LEAVE") {
      return NextResponse.json(
        { error: `Cannot process payment to ${employee.status} employee` },
        { status: 400 }
      );
    }

    // If programId provided, verify program
    let programTitle = "";
    if (programId) {
      const prog = await prisma.program.findUnique({ where: { id: programId } });
      if (!prog) return NextResponse.json({ error: "Program not found" }, { status: 404 });
      programTitle = prog.title;
    }

    // Validate payment method
    const validMethod: PaymentMethod =
      paymentMethod && Object.values(PaymentMethod).includes(paymentMethod as PaymentMethod)
        ? (paymentMethod as PaymentMethod)
        : "CASH";

    const validStatus: PaymentStatus =
      status && Object.values(PaymentStatus).includes(status as PaymentStatus)
        ? (status as PaymentStatus)
        : "PAID";

    // Generate transaction number
    const count = await prisma.employeePayment.count();
    const year = new Date().getFullYear();
    const transactionNumber = `TXN-EMP-${year}-${String(count + 1).padStart(4, "0")}`;

    const defaultDesc = programTitle
      ? `Wage payout for ${programTitle}`
      : `Staff wage disbursal to ${employee.name}`;

    const payment = await prisma.employeePayment.create({
      data: {
        transactionNumber,
        employeeId: employee.id,
        programId: programId || null,
        type: "DEBIT", // Disbursal reduces company liability to employee
        amount: numAmount,
        paymentMethod: validMethod,
        status: validStatus,
        transactionDate: paymentDate ? new Date(paymentDate) : new Date(),
        referenceNo: referenceNo?.trim() || null,
        description: description?.trim() || defaultDesc,
        createdBy: session.id,
      },
    });

    // Log Activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action: "PAYMENT_RECORDED",
          entityType: "EmployeePayment",
          entityId: payment.id,
          details: {
            transactionNumber: payment.transactionNumber,
            employeeName: employee.name,
            amount: numAmount,
            method: validMethod,
            type: "DEBIT",
          },
        },
      });
    } catch (logErr) {
      console.error("Failed to log activity:", logErr);
    }

    const employeeUserId = employee.userId;
    if (payment.status === "PAID" && employeeUserId) {
      await notifySafely(() => notifyEmployeePaymentPaid({
        employeeUserId,
        amount: numAmount,
        paymentId: payment.id,
      }));
    }

    return NextResponse.json(
      {
        ok: true,
        message: "Payment disbursement recorded successfully",
        payment: {
          id: payment.id,
          transactionNumber: payment.transactionNumber,
          amount: Number(payment.amount),
          status: payment.status,
          paymentMethod: payment.paymentMethod,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error creating employee payment:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred recording payment" },
      { status: 500 }
    );
  }
}
