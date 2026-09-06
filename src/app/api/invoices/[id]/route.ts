import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { InvoicePaymentStatus } from "@prisma/client";

/**
 * GET /api/invoices/[id]
 * Retrieves detailed invoice statement with line items, customer profile, event program, and receipts.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const [invoice, businessSettings] = await Promise.all([
      prisma.invoice.findUnique({
        where: { id },
        include: {
          customer: true,
          program: true,
          items: {
            include: {
              product: {
                select: { id: true, code: true, name: true, unit: true, type: true },
              },
            },
            orderBy: { createdAt: "asc" },
          },
          customerPayments: {
            orderBy: { paymentDate: "desc" },
          },
        },
      }),
      prisma.businessSettings.findFirst(),
    ]);

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const now = new Date();
    let computedStatus = invoice.status;
    if (
      Number(invoice.outstandingAmount) > 0 &&
      invoice.dueDate < now &&
      invoice.status !== "CANCELLED"
    ) {
      computedStatus = InvoicePaymentStatus.OVERDUE;
    }

    return NextResponse.json({
      invoice: {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        issueDate: invoice.issueDate.toISOString().split("T")[0],
        dueDate: invoice.dueDate.toISOString().split("T")[0],
        subtotal: Number(invoice.subtotal),
        discount: Number(invoice.discount),
        taxRate: Number(invoice.taxRate),
        taxAmount: Number(invoice.taxAmount),
        grandTotal: Number(invoice.grandTotal),
        paidAmount: Number(invoice.paidAmount),
        outstandingAmount: Number(invoice.outstandingAmount),
        status: computedStatus,
        notes: invoice.notes || "",
        terms: invoice.terms || "",
        createdAt: invoice.createdAt.toISOString(),
      },
      customer: {
        id: invoice.customer.id,
        code: invoice.customer.code,
        name: invoice.customer.name,
        companyName: invoice.customer.companyName || "",
        phone: invoice.customer.phone,
        email: invoice.customer.email || "",
        address: invoice.customer.address || "",
        city: invoice.customer.city || "",
      },
      program: invoice.program
        ? {
            id: invoice.program.id,
            code: invoice.program.code,
            title: invoice.program.title,
            eventDate: invoice.program.eventDate.toISOString().split("T")[0],
            venueName: invoice.program.venueName,
            venueAddress: invoice.program.venueAddress,
            expectedGuests: invoice.program.expectedGuests,
          }
        : null,
      items: invoice.items.map((item) => ({
        id: item.id,
        productId: item.productId,
        productCode: item.product.code,
        productName: item.product.name,
        productType: item.product.type,
        unit: item.product.unit,
        description: item.description || item.product.name,
        quantity: Number(item.quantity),
        unitPrice: Number(item.unitPrice),
        total: Number(item.total),
      })),
      payments: invoice.customerPayments.map((pmt) => ({
        id: pmt.id,
        receiptNumber: pmt.receiptNumber,
        amount: Number(pmt.amount),
        paymentDate: pmt.paymentDate.toISOString().split("T")[0],
        paymentMethod: pmt.paymentMethod,
        referenceNo: pmt.referenceNo || "",
        notes: pmt.notes || "",
      })),
      business: {
        companyName: businessSettings?.companyName || "Brilliant Catering & Events",
        tagline: businessSettings?.tagline || "Premium Catering & Event Management Solutions",
        email: businessSettings?.email || "",
        phone: businessSettings?.phone || "+91 7034510537",
        address: businessSettings?.address || "Parappanangadi, malappuram, Kerala, India",
        city: businessSettings?.city || "Parappanangadi",
        taxId: businessSettings?.taxId || "TAX-99482710",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching invoice details:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching invoice" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/invoices/[id]
 * Updates invoice notes, terms, due date, or status.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const invoice = await prisma.invoice.findUnique({ where: { id } });
    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    const { dueDate, notes, terms, status } = body;
    const updateData: Record<string, unknown> = {};

    if (dueDate) {
      updateData.dueDate = new Date(dueDate);
    }

    if (notes !== undefined) {
      updateData.notes = typeof notes === "string" ? notes.trim() : null;
    }

    if (terms !== undefined) {
      updateData.terms = typeof terms === "string" ? terms.trim() : null;
    }

    if (status && Object.values(InvoicePaymentStatus).includes(status)) {
      updateData.status = status;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: updateData,
    });

    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: "INVOICE_UPDATED",
        entityType: "INVOICE",
        entityId: updated.id,
        details: {
          message: `Updated invoice ${updated.invoiceNumber}`,
          ...updateData,
        },
      },
    });

    return NextResponse.json({
      message: "Invoice updated successfully",
      invoice: {
        id: updated.id,
        invoiceNumber: updated.invoiceNumber,
        status: updated.status,
        dueDate: updated.dueDate.toISOString().split("T")[0],
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error updating invoice:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while updating invoice" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/invoices/[id]
 * Safely deletes invoice if no customer payments exist, preserving financial integrity.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const invoice = await prisma.invoice.findUnique({
      where: { id },
      include: {
        customerPayments: true,
      },
    });

    if (!invoice) {
      return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    }

    if (invoice.customerPayments.length > 0) {
      return NextResponse.json(
        {
          error:
            "Cannot delete an invoice that has recorded payment receipts. Please cancel or void the invoice instead to preserve ledger integrity.",
        },
        { status: 400 }
      );
    }

    await prisma.invoice.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: "INVOICE_DELETED",
        entityType: "INVOICE",
        entityId: invoice.id,
        details: {
          message: `Deleted invoice ${invoice.invoiceNumber}`,
          invoiceNumber: invoice.invoiceNumber,
        },
      },
    });

    return NextResponse.json({
      message: `Invoice ${invoice.invoiceNumber} deleted successfully`,
      deleted: true,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error deleting invoice:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while deleting invoice" },
      { status: 500 }
    );
  }
}
