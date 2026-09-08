import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { ProgramStatus } from "@prisma/client";
import { notifyAssignedEmployeesProgramStatus, notifySafely } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * PATCH /api/programs/[id]/status
 * Admin/Manager: Updates program lifecycle status (UPCOMING, IN_PROGRESS, COMPLETED, CANCELLED).
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id: programId } = await params;
    const body = await request.json();

    const { status } = body;

    if (!status || !Object.values(ProgramStatus).includes(status as ProgramStatus)) {
      return NextResponse.json(
        { error: "Valid status required: UPCOMING, IN_PROGRESS, COMPLETED, CANCELLED" },
        { status: 400 }
      );
    }

    const existing = await prisma.program.findUnique({
      where: { id: programId },
    });

    if (!existing) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const updated = await prisma.program.update({
      where: { id: programId },
      data: { status: status as ProgramStatus },
    });

    // If program is marked COMPLETED, update confirmed staff to COMPLETED as well
    if (status === "COMPLETED") {
      await prisma.programEmployee.updateMany({
        where: {
          programId,
          status: "CONFIRMED",
        },
        data: {
          status: "COMPLETED",
        },
      });
    }

    const assignedEmployees = await prisma.programEmployee.findMany({
      where: {
        programId,
        status: { in: ["CONFIRMED", "COMPLETED"] },
      },
      select: { employee: { select: { userId: true } } },
    });

    await notifySafely(() => notifyAssignedEmployeesProgramStatus({
      employeeUserIds: assignedEmployees
        .map(({ employee }) => employee.userId)
        .filter((userId): userId is string => Boolean(userId)),
      programTitle: updated.title,
      programId: updated.id,
      status,
    }));

    // Log Activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action: "PROGRAM_STATUS_CHANGED",
          entityType: "Program",
          entityId: updated.id,
          details: {
            programCode: existing.code,
            programTitle: existing.title,
            previousStatus: existing.status,
            newStatus: status,
          },
        },
      });
    } catch (logErr) {
      console.error("Failed to log activity:", logErr);
    }

    return NextResponse.json({ ok: true, program: updated });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error updating program status:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred updating program status" },
      { status: 500 }
    );
  }
}
