import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { notifyEmployeeJoined, notifySafely } from "@/lib/notifications";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * POST /api/programs/[id]/join
 * Employee self-service: Submits a request to join an upcoming program shift.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (session.role !== "EMPLOYEE" || !session.employeeId) {
      return NextResponse.json(
        { error: "Only active employees can request to join program shifts" },
        { status: 403 }
      );
    }

    const { id: programId } = await params;

    // Check program details
    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        _count: {
          select: {
            programEmployees: {
              where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
            },
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    if (program.status !== "UPCOMING") {
      return NextResponse.json(
        { error: `Cannot join program with status: ${program.status}. Only UPCOMING programs accept shift requests.` },
        { status: 400 }
      );
    }

    // Check employee status
    const employee = await prisma.employee.findUnique({
      where: { id: session.employeeId },
      include: { employeeType: true },
    });

    if (!employee || employee.status !== "ACTIVE") {
      return NextResponse.json(
        { error: "Only active employee profiles can join programs" },
        { status: 403 }
      );
    }

    // Check if already requested or joined
    const existing = await prisma.programEmployee.findUnique({
      where: {
        programId_employeeId: {
          programId,
          employeeId: session.employeeId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `You have already requested or joined this program (Status: ${existing.status})` },
        { status: 409 }
      );
    }

    // Check capacity
    const confirmedCount = program._count.programEmployees;
    if (program.requiredStaffCount > 0 && confirmedCount >= program.requiredStaffCount) {
      return NextResponse.json(
        { error: "This program has reached its maximum confirmed staff capacity" },
        { status: 400 }
      );
    }

    // Create ProgramEmployee record
    const programEmployee = await prisma.programEmployee.create({
      data: {
        programId,
        employeeId: session.employeeId,
        status: "REQUESTED",
        assignedRole: employee.employeeType.name,
        notes: "Requested via Employee Portal",
      },
    });

    // Log Activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action: "EMPLOYEE_JOINED",
          entityType: "ProgramEmployee",
          entityId: programEmployee.id,
          details: {
            programCode: program.code,
            programTitle: program.title,
            employeeName: employee.name,
            status: "REQUESTED",
          },
        },
      });
    } catch (logErr) {
      console.error("Failed to log activity:", logErr);
    }

    await notifySafely(() => notifyEmployeeJoined({
      adminUserId: session.id,
      employeeName: employee.name,
      programTitle: program.title,
      programId: program.id,
    }));

    return NextResponse.json(
      {
        ok: true,
        message: "Shift request submitted successfully. Awaiting admin confirmation.",
        participation: {
          id: programEmployee.id,
          status: programEmployee.status,
          assignedRole: programEmployee.assignedRole,
          requestedAt: programEmployee.requestedAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error joining program:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred submitting shift request" },
      { status: 500 }
    );
  }
}
