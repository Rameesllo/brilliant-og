import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { PaymentMethod } from "@prisma/client";
import { createNotification, notifySafely } from "@/lib/notifications";

/**
 * GET /api/customers/[id]/payments
 * Returns payments / receipts recorded for a customer.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const payments = await prisma.customerPayment.findMany({
      where: { customerId: id },
      include: {
        invoice: {
          select: {
            id: true,
            invoiceNumber: true,
            grandTotal: true,
            status: true,
          },
        },
      },
      orderBy: { paymentDate: "desc" },
    });

    return NextResponse.json({
      payments: payments.map((p) => ({
        id: p.id,
        receiptNumber: p.receiptNumber,
        amount: Number(p.amount),
        paymentDate: p.paymentDate.toISOString().split("T")[0],
        paymentMethod: p.paymentMethod,
        referenceNo: p.referenceNo || "",
        notes: p.notes || "",
        invoice: p.invoice
          ? {
              id: p.invoice.id,
              invoiceNumber: p.invoice.invoiceNumber,
              grandTotal: Number(p.invoice.grandTotal),
              status: p.invoice.status,
            }
          : null,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching customer payments:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred fetching customer payments" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers/[id]/payments
 * Records a customer payment receipt and updates invoice outstanding balance if linked.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id: customerId } = await params;
    const body = await request.json();
    const auditUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true },
    });
    const auditUserId = auditUser?.id ?? null;

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const { amount, paymentMethod, referenceNo, invoiceId, notes, paymentDate } = body;

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) {
      return NextResponse.json({ error: "Valid positive payment amount is required" }, { status: 400 });
    }

    const validMethod = Object.values(PaymentMethod).includes(paymentMethod)
      ? (paymentMethod as PaymentMethod)
      : PaymentMethod.BANK_TRANSFER;

    // Auto-generate receipt number: RCP-2026-0001
    const lastPayment = await prisma.customerPayment.findFirst({
      orderBy: { createdAt: "desc" },
      select: { receiptNumber: true },
    });

    const currentYear = new Date().getFullYear();
    let nextSeq = 1;
    if (lastPayment?.receiptNumber) {
      const match = lastPayment.receiptNumber.match(/RCP-\d+-(\d+)/i);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }
    const receiptNumber = `RCP-${currentYear}-${String(nextSeq).padStart(4, "0")}`;

    const txnDate = paymentDate ? new Date(paymentDate) : new Date();

    const result = await prisma.$transaction(async (tx) => {
      const payment = await tx.customerPayment.create({
        data: {
          receiptNumber,
          customerId,
          invoiceId: invoiceId || null,
          amount: numAmount,
          paymentDate: txnDate,
          paymentMethod: validMethod,
          referenceNo: referenceNo?.trim() || null,
          notes: notes?.trim() || null,
          createdBy: session.id,
        },
      });

      // If linked to an invoice, update invoice balances
      if (invoiceId) {
        const invoice = await tx.invoice.findUnique({ where: { id: invoiceId } });
        if (invoice) {
          const newPaid = Number(invoice.paidAmount) + numAmount;
          const newOutstanding = Math.max(0, Number(invoice.grandTotal) - newPaid);
          const newStatus = newOutstanding <= 0 ? "PAID" : "PARTIAL";

          await tx.invoice.update({
            where: { id: invoiceId },
            data: {
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              status: newStatus,
            },
          });
        }
      }

      // Log activity
      await tx.activityLog.create({
        data: {
          userId: auditUserId,
          action: "PAYMENT_RECORDED",
          entityType: "CUSTOMER_PAYMENT",
          entityId: payment.id,
          details: {
            message: `Recorded receipt ${receiptNumber} of $${numAmount.toFixed(2)} from ${customer.name}`,
            receiptNumber,
            amount: numAmount,
            customerId,
            invoiceId,
          },
        },
      });

      return payment;
    });

    await notifySafely(() => createNotification({
      userId: session.id,
      title: "Payment Received",
      message: `Payment of $${numAmount.toFixed(2)} received from ${customer.name}.`,
      type: "SUCCESS",
      link: invoiceId ? `/admin/invoices/${invoiceId}` : `/admin/customers/${customerId}`,
    }));

    return NextResponse.json(
      {
        message: "Customer payment recorded successfully",
        payment: {
          id: result.id,
          receiptNumber: result.receiptNumber,
          amount: Number(result.amount),
          paymentDate: result.paymentDate.toISOString().split("T")[0],
          paymentMethod: result.paymentMethod,
          referenceNo: result.referenceNo,
          notes: result.notes,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error recording customer payment:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while recording payment" },
      { status: 500 }
    );
  }
}
