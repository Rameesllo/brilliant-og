import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { ProgramEmployeeStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/programs/[id]/employees
 * Admin/Manager only: Retrieves all employees joined/assigned to this program.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    await requireAdmin();
    const { id: programId } = await params;

    const programEmployees = await prisma.programEmployee.findMany({
      where: { programId },
      include: {
        employee: {
          include: {
            employeeType: true,
          },
        },
      },
      orderBy: { requestedAt: "asc" },
    });

    return NextResponse.json({
      staff: programEmployees.map((pe) => ({
        id: pe.id,
        employeeId: pe.employee.id,
        employeeCode: pe.employee.code,
        name: pe.employee.name,
        phone: pe.employee.phone,
        email: pe.employee.email,
        designation: pe.employee.employeeType.name,
        wagePerEvent: Number(pe.employee.wagePerEvent),
        status: pe.status,
        assignedRole: pe.assignedRole || "",
        requestedAt: pe.requestedAt.toISOString(),
        confirmedAt: pe.confirmedAt?.toISOString() || null,
        confirmedBy: pe.confirmedBy || null,
        notes: pe.notes || "",
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching program employees:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred fetching staff" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/programs/[id]/employees
 * Admin/Manager only: Manually assigns an employee to this program.
 * Body: { employeeId: string, assignedRole?: string, notes?: string, status?: ProgramEmployeeStatus }
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id: programId } = await params;
    const body = await request.json();

    const { employeeId, assignedRole, notes, status } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    // Check program existence
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

    // Check employee existence
    const employee = await prisma.employee.findUnique({
      where: { id: employeeId },
      include: { employeeType: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    if (employee.status !== "ACTIVE") {
      return NextResponse.json(
        { error: `Cannot assign inactive employee (${employee.status})` },
        { status: 400 }
      );
    }

    // Check if already assigned
    const existing = await prisma.programEmployee.findUnique({
      where: {
        programId_employeeId: {
          programId,
          employeeId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: `Employee is already associated with this program (Status: ${existing.status})` },
        { status: 409 }
      );
    }

    const assignedStatus: ProgramEmployeeStatus =
      status && Object.values(ProgramEmployeeStatus).includes(status as ProgramEmployeeStatus)
        ? (status as ProgramEmployeeStatus)
        : "CONFIRMED";

    const isConfirmed = assignedStatus === "CONFIRMED";

    const programEmployee = await prisma.programEmployee.create({
      data: {
        programId,
        employeeId,
        status: assignedStatus,
        assignedRole: assignedRole?.trim() || employee.employeeType.name,
        notes: notes?.trim() || null,
        confirmedAt: isConfirmed ? new Date() : null,
        confirmedBy: isConfirmed ? session.name : null,
      },
      include: {
        employee: {
          include: { employeeType: true },
        },
      },
    });

    // Log Activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action: isConfirmed ? "EMPLOYEE_CONFIRMED" : "EMPLOYEE_ASSIGNED",
          entityType: "ProgramEmployee",
          entityId: programEmployee.id,
          details: {
            programCode: program.code,
            programTitle: program.title,
            employeeName: employee.name,
            status: assignedStatus,
          },
        },
      });
    } catch (logErr) {
      console.error("Failed to log assignment activity:", logErr);
    }

    return NextResponse.json(
      {
        ok: true,
        staffMember: {
          id: programEmployee.id,
          employeeId: programEmployee.employee.id,
          employeeCode: programEmployee.employee.code,
          name: programEmployee.employee.name,
          phone: programEmployee.employee.phone,
          email: programEmployee.employee.email,
          designation: programEmployee.employee.employeeType.name,
          wagePerEvent: Number(programEmployee.employee.wagePerEvent),
          status: programEmployee.status,
          assignedRole: programEmployee.assignedRole,
          requestedAt: programEmployee.requestedAt.toISOString(),
          confirmedAt: programEmployee.confirmedAt?.toISOString() || null,
          confirmedBy: programEmployee.confirmedBy,
          notes: programEmployee.notes || "",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error assigning employee to program:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred assigning employee" },
      { status: 500 }
    );
  }
}
