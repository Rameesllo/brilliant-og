import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { ProgramEmployeeStatus } from "@prisma/client";
import {
  notifyAssignedEmployeesProgramStatus,
  notifyProgramEmployeeAssigned,
} from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ id: string; employeeId: string }>;
}

/**
 * PATCH /api/programs/[id]/employees/[employeeId]
 * Admin/Manager: Updates status (CONFIRMED, REJECTED, CANCELLED, COMPLETED) or assignedRole of an employee on a program.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id: programId, employeeId } = await params;
    const body = await request.json();

    const { status, assignedRole, notes } = body;

    if (status && !Object.values(ProgramEmployeeStatus).includes(status as ProgramEmployeeStatus)) {
      return NextResponse.json({ error: "Invalid status value" }, { status: 400 });
    }

    // Find the record by programId and employeeId (or by programEmployee.id)
    const existing = await prisma.programEmployee.findFirst({
      where: {
        programId,
        OR: [{ employeeId }, { id: employeeId }],
      },
      include: {
        employee: true,
        program: true,
      },
    });

    if (!existing) {
      return NextResponse.json(
        { error: "Staff member record not found for this program" },
        { status: 404 }
      );
    }

    const newStatus = (status as ProgramEmployeeStatus) || existing.status;
    const isNowConfirmed = newStatus === "CONFIRMED" && existing.status !== "CONFIRMED";

    const updated = await prisma.programEmployee.update({
      where: { id: existing.id },
      data: {
        status: newStatus,
        assignedRole: assignedRole !== undefined ? assignedRole.trim() : undefined,
        notes: notes !== undefined ? notes.trim() : undefined,
        confirmedAt: isNowConfirmed ? new Date() : undefined,
        confirmedBy: isNowConfirmed ? session.name : undefined,
      },
      include: {
        employee: {
          include: { employeeType: true },
        },
      },
    });

    // Log Activity
    try {
      let action = "EMPLOYEE_STATUS_UPDATED";
      if (newStatus === "CONFIRMED") action = "EMPLOYEE_CONFIRMED";
      else if (newStatus === "REJECTED") action = "EMPLOYEE_REJECTED";

      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action,
          entityType: "ProgramEmployee",
          entityId: updated.id,
          details: {
            programCode: existing.program.code,
            employeeName: existing.employee.name,
            previousStatus: existing.status,
            newStatus,
          },
        },
      });
    } catch (logErr) {
      console.error("Failed to log activity:", logErr);
    }

    if (existing.employee.userId && newStatus !== existing.status) {
      if (newStatus === "CONFIRMED" || newStatus === "REQUESTED") {
        await notifyProgramEmployeeAssigned({
          employeeUserId: existing.employee.userId,
          programTitle: existing.program.title,
          programId: existing.program.id,
          eventDate: existing.program.eventDate.toLocaleDateString("en-IN"),
          startTime: existing.program.startTime,
          status: newStatus,
        });
      } else {
        await notifyAssignedEmployeesProgramStatus({
          employeeUserIds: [existing.employee.userId],
          programTitle: existing.program.title,
          programId: existing.program.id,
          status: newStatus,
        });
      }
    }

    return NextResponse.json({
      ok: true,
      staffMember: {
        id: updated.id,
        employeeId: updated.employee.id,
        employeeCode: updated.employee.code,
        name: updated.employee.name,
        phone: updated.employee.phone,
        email: updated.employee.email,
        designation: updated.employee.employeeType.name,
        wagePerEvent: Number(updated.employee.wagePerEvent),
        status: updated.status,
        assignedRole: updated.assignedRole || "",
        requestedAt: updated.requestedAt.toISOString(),
        confirmedAt: updated.confirmedAt?.toISOString() || null,
        confirmedBy: updated.confirmedBy || null,
        notes: updated.notes || "",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error updating program employee:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred updating staff member" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/programs/[id]/employees/[employeeId]
 * Admin/Manager: Removes employee assignment from program.
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id: programId, employeeId } = await params;

    const existing = await prisma.programEmployee.findFirst({
      where: {
        programId,
        OR: [{ employeeId }, { id: employeeId }],
      },
      include: {
        employee: true,
        program: true,
      },
    });

    if (!existing) {
      return NextResponse.json({ error: "Record not found" }, { status: 404 });
    }

    await prisma.programEmployee.delete({
      where: { id: existing.id },
    });

    // Log Activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action: "EMPLOYEE_REMOVED",
          entityType: "ProgramEmployee",
          entityId: existing.id,
          details: {
            programCode: existing.program.code,
            employeeName: existing.employee.name,
          },
        },
      });
    } catch (logErr) {
      console.error("Failed to log activity:", logErr);
    }

    return NextResponse.json({ ok: true, message: "Staff member removed from program" });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error removing program employee:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred removing staff member" },
      { status: 500 }
    );
  }
}
