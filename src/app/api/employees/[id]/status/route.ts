import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { EmployeeStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/employees/[id]/status
 * Updates employee status (ACTIVE, INACTIVE, ON_LEAVE, TERMINATED).
 * Admin / Manager only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id: requestedId } = await params;
    const body = await request.json();
    const { status } = body;

    if (!status || !Object.values(EmployeeStatus).includes(status as EmployeeStatus)) {
      return NextResponse.json(
        { error: "Invalid status value provided" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: { OR: [{ id: requestedId }, { userId: requestedId }] },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const newStatus = status as EmployeeStatus;
    const updated = await prisma.employee.update({
      where: { id: employee.id },
      data: { status: newStatus },
      include: { employeeType: true },
    });

    // Keep linked user active status in sync
    if (employee.userId) {
      try {
        await prisma.user.update({
          where: { id: employee.userId },
          data: { isActive: newStatus === EmployeeStatus.ACTIVE },
        });
      } catch (err) {
        console.error("Failed to update user active status:", err);
      }
    }

    // Record ActivityLog
    const actionName =
      newStatus === EmployeeStatus.ACTIVE
        ? "EMPLOYEE_ACTIVATED"
        : newStatus === EmployeeStatus.INACTIVE
        ? "EMPLOYEE_DEACTIVATED"
        : "EMPLOYEE_STATUS_CHANGED";

    try {
      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action: actionName,
          entityType: "Employee",
          entityId: updated.id,
          details: {
            code: updated.code,
            name: updated.name,
            oldStatus: employee.status,
            newStatus: updated.status,
          },
        },
      });
    } catch (logErr) {
      console.error("Failed to log status change activity:", logErr);
    }

    return NextResponse.json({
      ok: true,
      message: `Employee status updated to ${newStatus}`,
      employee: {
        id: updated.id,
        code: updated.code,
        name: updated.name,
        status: updated.status,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Error updating employee status:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred updating employee status" },
      { status: 500 }
    );
  }
}
