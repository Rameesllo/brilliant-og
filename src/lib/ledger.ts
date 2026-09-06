import { prisma } from "./prisma";
import { LedgerEntryType, PaymentMethod, PaymentStatus } from "@prisma/client";

export interface EmployeeBalanceSummary {
  employeeId: string;
  totalEarned: number; // Sum of CREDIT entries
  totalPaid: number;   // Sum of DEBIT entries
  outstandingBalance: number; // totalEarned - totalPaid
}

export interface LedgerStatementItem {
  id: string;
  transactionNumber: string;
  date: Date;
  type: LedgerEntryType;
  programTitle?: string;
  description: string;
  creditAmount: number;
  debitAmount: number;
  runningBalance: number;
  paymentMethod?: PaymentMethod | null;
  status: PaymentStatus;
}

/**
 * Calculates an employee's exact current financial balance by aggregating
 * all historic CREDIT and DEBIT transactions from the ledger.
 * Does NOT rely on stale or manually edited balance fields.
 */
export async function calculateEmployeeBalance(employeeId: string): Promise<EmployeeBalanceSummary> {
  const credits = await prisma.employeePayment.aggregate({
    where: {
      employeeId,
      type: "CREDIT",
      status: { not: "CANCELLED" },
    },
    _sum: {
      amount: true,
    },
  });

  const debits = await prisma.employeePayment.aggregate({
    where: {
      employeeId,
      type: "DEBIT",
      status: { not: "CANCELLED" },
    },
    _sum: {
      amount: true,
    },
  });

  const totalEarned = Number(credits._sum.amount ?? 0);
  const totalPaid = Number(debits._sum.amount ?? 0);
  const outstandingBalance = totalEarned - totalPaid;

  return {
    employeeId,
    totalEarned,
    totalPaid,
    outstandingBalance,
  };
}

/**
 * Records a wage credit earned by an employee for working an event/program.
 * Wages are per-event (fixed), not calculated hourly.
 */
export async function recordEventWageCredit(params: {
  employeeId: string;
  programId: string;
  amount: number;
  wagePerEvent: number;
  programTitle: string;
  attendanceStatus?: string; // e.g. "PRESENT" | "HALF_DAY"
  createdBy?: string;
}) {
  const count = await prisma.employeePayment.count();
  const txNumber = `TXN-CR-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

  return await prisma.employeePayment.create({
    data: {
      transactionNumber: txNumber,
      employeeId: params.employeeId,
      programId: params.programId,
      type: "CREDIT",
      amount: params.amount,
      status: "APPROVED",
      description: `Event wages for ${params.programTitle} (₹${params.wagePerEvent}/event${params.attendanceStatus === "HALF_DAY" ? " × 0.5" : ""})`,
      createdBy: params.createdBy,
    },
  });
}

/**
 * @deprecated Use recordEventWageCredit instead. Wages are per-event, not hourly.
 */
export async function recordShiftWageCredit(params: {
  employeeId: string;
  programId: string;
  amount: number;
  hoursWorked: number;
  wagePerEvent: number;
  programTitle: string;
  createdBy?: string;
}) {
  return recordEventWageCredit({
    employeeId: params.employeeId,
    programId: params.programId,
    amount: params.amount,
    wagePerEvent: params.wagePerEvent,
    programTitle: params.programTitle,
    createdBy: params.createdBy,
  });
}

/**
 * Records a cash or digital disbursement payment made to an employee.
 */
export async function recordEmployeeDisbursement(params: {
  employeeId: string;
  amount: number;
  paymentMethod: PaymentMethod;
  referenceNo?: string;
  description?: string;
  programId?: string;
  createdBy?: string;
}) {
  const count = await prisma.employeePayment.count();
  const txNumber = `TXN-DB-${new Date().getFullYear()}-${String(count + 1).padStart(5, "0")}`;

  return await prisma.employeePayment.create({
    data: {
      transactionNumber: txNumber,
      employeeId: params.employeeId,
      programId: params.programId,
      type: "DEBIT",
      amount: params.amount,
      paymentMethod: params.paymentMethod,
      status: "PAID",
      referenceNo: params.referenceNo,
      description: params.description || `Disbursed via ${params.paymentMethod}`,
      createdBy: params.createdBy,
    },
  });
}

/**
 * Generates an itemized chronological statement with accurate running balance.
 */
export async function getEmployeeLedgerStatement(employeeId: string): Promise<LedgerStatementItem[]> {
  const entries = await prisma.employeePayment.findMany({
    where: {
      employeeId,
      status: { not: "CANCELLED" },
    },
    include: {
      program: {
        select: {
          title: true,
        },
      },
    },
    orderBy: {
      transactionDate: "asc",
    },
  });

  let running = 0;
  return entries.map((entry) => {
    const amt = Number(entry.amount);
    const isCredit = entry.type === "CREDIT";
    if (isCredit) {
      running += amt;
    } else {
      running -= amt;
    }

    return {
      id: entry.id,
      transactionNumber: entry.transactionNumber,
      date: entry.transactionDate,
      type: entry.type,
      programTitle: entry.program?.title,
      description: entry.description,
      creditAmount: isCredit ? amt : 0,
      debitAmount: !isCredit ? amt : 0,
      runningBalance: running,
      paymentMethod: entry.paymentMethod,
      status: entry.status,
    };
  });
}
