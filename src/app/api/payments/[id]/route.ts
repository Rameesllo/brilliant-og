import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const payment = await prisma.employeePayment.findUnique({
      where: { id },
      include: { employee: { select: { name: true } } },
    });

    if (!payment) return NextResponse.json({ error: "Payment record not found" }, { status: 404 });
    await prisma.employeePayment.delete({ where: { id } });
    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: "PAYMENT_DELETED",
        entityType: "EmployeePayment",
        entityId: id,
        details: { message: `Deleted payment ${payment.transactionNumber} for ${payment.employee.name}` },
      },
    });
    return NextResponse.json({ deleted: true, message: "Payment deleted successfully" });
  } catch (error) {
    if (error instanceof AuthError) return NextResponse.json({ error: error.message }, { status: error.status });
    console.error("Error deleting payment:", error);
    return NextResponse.json({ error: "Unable to delete payment" }, { status: 500 });
  }
}