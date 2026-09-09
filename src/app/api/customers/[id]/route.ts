import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { Prisma } from "@prisma/client";

/**
 * GET /api/customers/[id]
 * Retrieves single customer profile, full financial ledger, program history, and invoices.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        programs: {
          select: {
            id: true,
            code: true,
            title: true,
            type: true,
            status: true,
            eventDate: true,
            startTime: true,
            endTime: true,
            venueName: true,
            venueAddress: true,
            expectedGuests: true,
            budget: true,
          },
          orderBy: { eventDate: "desc" },
        },
        invoices: {
          select: {
            id: true,
            invoiceNumber: true,
            issueDate: true,
            dueDate: true,
            grandTotal: true,
            paidAmount: true,
            outstandingAmount: true,
            status: true,
            notes: true,
          },
          orderBy: { issueDate: "desc" },
        },
        payments: {
          select: {
            id: true,
            receiptNumber: true,
            amount: true,
            paymentDate: true,
            paymentMethod: true,
            referenceNo: true,
            notes: true,
            invoiceId: true,
            invoice: {
              select: {
                invoiceNumber: true,
              },
            },
          },
          orderBy: { paymentDate: "desc" },
        },
      },
    });

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Calculate live ledger totals
    let totalBilled = 0;
    let totalPaid = 0;
    let outstandingBalance = 0;
    let overdueCount = 0;

    for (const inv of customer.invoices) {
      totalBilled += Number(inv.grandTotal);
      totalPaid += Number(inv.paidAmount);
      outstandingBalance += Number(inv.outstandingAmount);
      if (inv.status === "OVERDUE") {
        overdueCount++;
      }
    }

    return NextResponse.json({
      customer: {
        id: customer.id,
        code: customer.code,
        name: customer.name,
        companyName: customer.companyName || "",
        phone: customer.phone,
        email: customer.email || "",
        address: customer.address || "",
        city: customer.city || "",
        notes: customer.notes || "",
        isActive: customer.isActive,
        createdAt: customer.createdAt.toISOString(),
        updatedAt: customer.updatedAt.toISOString(),
      },
      financials: {
        totalBilled,
        totalPaid,
        outstandingBalance,
        overdueCount,
        status: overdueCount > 0 ? "OVERDUE" : outstandingBalance > 0 ? "PENDING" : "PAID",
      },
      programs: customer.programs.map((prog) => ({
        id: prog.id,
        code: prog.code,
        title: prog.title,
        type: prog.type,
        status: prog.status,
        eventDate: prog.eventDate.toISOString().split("T")[0],
        startTime: prog.startTime,
        endTime: prog.endTime,
        venueName: prog.venueName,
        venueAddress: prog.venueAddress,
        expectedGuests: prog.expectedGuests,
        budget: Number(prog.budget),
      })),
      invoices: customer.invoices.map((inv) => ({
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        issueDate: inv.issueDate.toISOString().split("T")[0],
        dueDate: inv.dueDate.toISOString().split("T")[0],
        grandTotal: Number(inv.grandTotal),
        paidAmount: Number(inv.paidAmount),
        outstandingAmount: Number(inv.outstandingAmount),
        status: inv.status,
        notes: inv.notes || "",
      })),
      payments: customer.payments.map((pmt) => ({
        id: pmt.id,
        receiptNumber: pmt.receiptNumber,
        amount: Number(pmt.amount),
        paymentDate: pmt.paymentDate.toISOString().split("T")[0],
        paymentMethod: pmt.paymentMethod,
        referenceNo: pmt.referenceNo || "",
        notes: pmt.notes || "",
        invoiceId: pmt.invoiceId,
        invoiceNumber: pmt.invoice?.invoiceNumber || null,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching customer profile:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred fetching customer details" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/customers/[id]
 * Updates customer profile and active status.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const existingCustomer = await prisma.customer.findUnique({ where: { id } });
    if (!existingCustomer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    const { name, phone, companyName, email, address, city, notes, isActive } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Customer name cannot be empty" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (phone !== undefined) {
      if (typeof phone !== "string" || !phone.trim()) {
        return NextResponse.json({ error: "Phone number cannot be empty" }, { status: 400 });
      }
      updateData.phone = phone.trim();
    }

    if (companyName !== undefined) {
      updateData.companyName = typeof companyName === "string" && companyName.trim() ? companyName.trim() : null;
    }

    if (email !== undefined) {
      const cleanEmail = typeof email === "string" ? email.trim() : "";
      if (cleanEmail) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(cleanEmail)) {
          return NextResponse.json({ error: "Invalid email address format" }, { status: 400 });
        }
        updateData.email = cleanEmail;
      } else {
        updateData.email = null;
      }
    }

    if (address !== undefined) {
      updateData.address = typeof address === "string" && address.trim() ? address.trim() : null;
    }

    if (city !== undefined) {
      updateData.city = typeof city === "string" && city.trim() ? city.trim() : null;
    }

    if (notes !== undefined) {
      updateData.notes = typeof notes === "string" && notes.trim() ? notes.trim() : null;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updatedCustomer = await prisma.customer.update({
      where: { id },
      data: updateData,
    });

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: "CUSTOMER_UPDATED",
        entityType: "CUSTOMER",
        entityId: updatedCustomer.id,
        details: {
          message: `Updated customer details for ${updatedCustomer.name} (${updatedCustomer.code})`,
          ...updateData,
        },
      },
    });

    return NextResponse.json({
      message: "Customer updated successfully",
      customer: {
        id: updatedCustomer.id,
        code: updatedCustomer.code,
        name: updatedCustomer.name,
        phone: updatedCustomer.phone,
        companyName: updatedCustomer.companyName,
        email: updatedCustomer.email,
        address: updatedCustomer.address,
        city: updatedCustomer.city,
        notes: updatedCustomer.notes,
        isActive: updatedCustomer.isActive,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while updating customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const customer = await prisma.customer.findUnique({
      where: { id },
      include: {
        _count: { select: { programs: true, invoices: true, payments: true } },
      },
    });

    if (!customer) return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    if (customer._count.programs || customer._count.invoices || customer._count.payments) {
      return NextResponse.json(
        { error: "Cannot delete a customer with programs, invoices, or payment receipts. Deactivate the customer instead." },
        { status: 400 }
      );
    }

    await prisma.customer.delete({ where: { id } });
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action: "CUSTOMER_DELETED",
          entityType: "CUSTOMER",
          entityId: id,
          details: { message: `Deleted customer ${customer.name} (${customer.code})` },
        },
      });
    } catch (logError) {
      console.error("Failed to record CUSTOMER_DELETED activity:", logError);
    }

    return NextResponse.json({ deleted: true, message: "Customer deleted successfully" });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2003") {
      return NextResponse.json(
        { error: "This customer still has related records and cannot be deleted. Deactivate the customer instead." },
        { status: 400 }
      );
    }
    console.error("Error deleting customer:", error);
    return NextResponse.json({ error: "Unable to delete customer" }, { status: 500 });
  }
}
