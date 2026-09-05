import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin, AuthError } from "@/lib/auth";
import { ProgramType, ProgramStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/programs/[id]
 * Retrieves program detail including venue, customer, assigned/requested employees, and staffing stats.
 * Accessible by ADMIN, MANAGER, and authenticated EMPLOYEE.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id } = await params;

    const program = await prisma.program.findUnique({
      where: { id },
      include: {
        customer: true,
        manager: {
          select: {
            id: true,
            name: true,
            email: true,
            phone: true,
          },
        },
        programEmployees: {
          include: {
            employee: {
              include: {
                employeeType: true,
              },
            },
          },
          orderBy: { requestedAt: "asc" },
        },
        _count: {
          select: {
            attendances: true,
            invoices: true,
            expenses: true,
            employeePayments: true,
          },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const confirmedCount = program.programEmployees.filter(
      (pe) => pe.status === "CONFIRMED" || pe.status === "COMPLETED"
    ).length;

    const requestedCount = program.programEmployees.filter(
      (pe) => pe.status === "REQUESTED"
    ).length;

    // Check if the current user (if employee) is joined
    let myParticipation = null;
    if (session.role === "EMPLOYEE" && session.employeeId) {
      const match = program.programEmployees.find(
        (pe) => pe.employeeId === session.employeeId
      );
      if (match) {
        myParticipation = {
          id: match.id,
          status: match.status,
          assignedRole: match.assignedRole,
          requestedAt: match.requestedAt.toISOString(),
          confirmedAt: match.confirmedAt?.toISOString() || null,
        };
      }
    }

    return NextResponse.json({
      program: {
        id: program.id,
        code: program.code,
        title: program.title,
        type: program.type,
        status: program.status,
        eventDate: program.eventDate.toISOString(),
        startTime: program.startTime,
        endTime: program.endTime,
        venueName: program.venueName,
        venueAddress: program.venueAddress,
        expectedGuests: program.expectedGuests,
        requiredStaffCount: program.requiredStaffCount,
        confirmedStaffCount: confirmedCount,
        requestedStaffCount: requestedCount,
        budget: Number(program.budget),
        notes: program.notes || "",
        createdAt: program.createdAt.toISOString(),
        updatedAt: program.updatedAt.toISOString(),
        customer: program.customer,
        manager: program.manager,
        counts: program._count,
        staff: program.programEmployees.map((pe) => ({
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
        myParticipation,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching program detail:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred retrieving program" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/programs/[id]
 * Updates program information. Admin/Manager only.
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const existing = await prisma.program.findUnique({
      where: { id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    const {
      title,
      type,
      customerId,
      eventDate,
      startTime,
      endTime,
      venueName,
      venueAddress,
      expectedGuests,
      requiredStaffCount,
      budget,
      notes,
      status,
    } = body;

    if (type && !Object.values(ProgramType).includes(type as ProgramType)) {
      return NextResponse.json({ error: "Invalid program type" }, { status: 400 });
    }

    if (status && !Object.values(ProgramStatus).includes(status as ProgramStatus)) {
      return NextResponse.json({ error: "Invalid program status" }, { status: 400 });
    }

    if (customerId) {
      const customerExists = await prisma.customer.findUnique({ where: { id: customerId } });
      if (!customerExists) {
        return NextResponse.json({ error: "Selected customer does not exist" }, { status: 400 });
      }
    }

    const updated = await prisma.program.update({
      where: { id },
      data: {
        title: title !== undefined ? title.trim() : undefined,
        type: type !== undefined ? (type as ProgramType) : undefined,
        customerId: customerId !== undefined ? customerId : undefined,
        eventDate: eventDate !== undefined ? new Date(eventDate) : undefined,
        startTime: startTime !== undefined ? startTime.trim() : undefined,
        endTime: endTime !== undefined ? endTime.trim() : undefined,
        venueName: venueName !== undefined ? venueName.trim() : undefined,
        venueAddress: venueAddress !== undefined ? venueAddress.trim() : undefined,
        expectedGuests: expectedGuests !== undefined ? parseInt(expectedGuests) || 0 : undefined,
        requiredStaffCount: requiredStaffCount !== undefined ? parseInt(requiredStaffCount) || 0 : undefined,
        budget: budget !== undefined ? parseFloat(budget) || 0 : undefined,
        notes: notes !== undefined ? notes.trim() : undefined,
        status: status !== undefined ? (status as ProgramStatus) : undefined,
      },
      include: {
        customer: true,
      },
    });

    // Log Activity
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action: "PROGRAM_UPDATED",
          entityType: "Program",
          entityId: updated.id,
          details: {
            title: updated.title,
            status: updated.status,
            code: updated.code,
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
    console.error("Error updating program:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred updating program" },
      { status: 500 }
    );
  }
}

export const PUT = PATCH;
