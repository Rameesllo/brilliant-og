import { notifyEmployeesProgramCreated } from "@/lib/notifications";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin, AuthError } from "@/lib/auth";
import { ProgramType, ProgramStatus, Prisma } from "@prisma/client";

/**
 * GET /api/programs
 * Admin/Manager: full list with filters
 * Employee: only UPCOMING programs (for browse & join)
 * Query params:
 *   search, type (ProgramType), status (ProgramStatus),
 *   sortBy (eventDate|title|createdAt), sortOrder (asc|desc),
 *   page, limit,
 *   employeeId=me (employee: filter to programs the session employee joined)
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const typeParam = searchParams.get("type")?.trim() || "";
    const statusParam = searchParams.get("status")?.trim() || "";
    const sortBy = searchParams.get("sortBy") || "eventDate";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;
    const employeeIdParam = searchParams.get("employeeId")?.trim() || "";

    const where: Prisma.ProgramWhereInput = {};

    // Employees can only see UPCOMING programs (unless filtering by their own joined programs)
    if (session.role === "EMPLOYEE") {
      if (employeeIdParam === "me") {
        // Filter: programs the logged-in employee has joined
        if (!session.employeeId) {
          return NextResponse.json({ programs: [], pagination: { page, limit, total: 0, totalPages: 0 } });
        }
        where.programEmployees = {
          some: { employeeId: session.employeeId },
        };
      } else {
        // Default: only UPCOMING programs visible to employees
        where.status = "UPCOMING";
      }
    } else {
      // Admin/Manager: apply status filter if provided
      if (statusParam && Object.values(ProgramStatus).includes(statusParam as ProgramStatus)) {
        where.status = statusParam as ProgramStatus;
      }
    }

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { venueName: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    if (typeParam && Object.values(ProgramType).includes(typeParam as ProgramType)) {
      where.type = typeParam as ProgramType;
    }

    // Build orderBy
    const validSortFields: Record<string, Prisma.ProgramOrderByWithRelationInput> = {
      eventDate: { eventDate: sortOrder },
      title: { title: sortOrder },
      createdAt: { createdAt: sortOrder },
      status: { status: sortOrder },
    };
    const orderBy = validSortFields[sortBy] || { eventDate: "asc" };

    const [programs, total] = await Promise.all([
      prisma.program.findMany({
        where,
        include: {
          customer: { select: { id: true, name: true, phone: true } },
          _count: { select: { programEmployees: true } },
          programEmployees: {
            where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
            select: { id: true },
          },
        },
        orderBy,
        skip,
        take: limit,
      }),
      prisma.program.count({ where }),
    ]);

    // If employee=me, also include their own ProgramEmployee row for status
    const employeeJoinMap: Map<string, { status: string; assignedRole: string | null }> = new Map();
    if (session.role === "EMPLOYEE" && session.employeeId) {
      const myJoins = await prisma.programEmployee.findMany({
        where: { employeeId: session.employeeId },
        select: { programId: true, status: true, assignedRole: true },
      });
      myJoins.forEach((j) => employeeJoinMap.set(j.programId, { status: j.status, assignedRole: j.assignedRole }));
    }

    return NextResponse.json({
      programs: programs.map((p) => ({
        id: p.id,
        code: p.code,
        title: p.title,
        type: p.type,
        status: p.status,
        eventDate: p.eventDate.toISOString(),
        startTime: p.startTime,
        endTime: p.endTime,
        venueName: p.venueName,
        venueAddress: p.venueAddress,
        expectedGuests: p.expectedGuests,
        requiredStaffCount: p.requiredStaffCount,
        confirmedStaffCount: p.programEmployees.length,
        totalJoinedCount: p._count.programEmployees,
        budget: Number(p.budget),
        notes: p.notes || "",
        customer: p.customer,
        createdAt: p.createdAt.toISOString(),
        // Employee-specific join info
        myStatus: employeeJoinMap.get(p.id)?.status || null,
        myRole: employeeJoinMap.get(p.id)?.assignedRole || null,
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching programs:", error);
    return NextResponse.json({ error: "An unexpected error occurred fetching programs" }, { status: 500 });
  }
}

/**
 * POST /api/programs
 * Admin/Manager only. Creates a new program.
 * Body: { title, type, customerId, eventDate, startTime, endTime, venueName, venueAddress, expectedGuests, requiredStaffCount, budget, notes }
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

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
    } = body;

    // Validate required fields
    if (!title || typeof title !== "string" || !title.trim()) {
      return NextResponse.json({ error: "Program title is required" }, { status: 400 });
    }
    if (!eventDate) {
      return NextResponse.json({ error: "Event date is required" }, { status: 400 });
    }
    const parsedEventDate = new Date(eventDate);
    if (isNaN(parsedEventDate.getTime())) {
      return NextResponse.json({ error: "Invalid event date format" }, { status: 400 });
    }
    if (!startTime || typeof startTime !== "string" || !startTime.trim()) {
      return NextResponse.json({ error: "Start time is required" }, { status: 400 });
    }
    if (!endTime || typeof endTime !== "string" || !endTime.trim()) {
      return NextResponse.json({ error: "End time is required" }, { status: 400 });
    }
    if (!venueName || typeof venueName !== "string" || !venueName.trim()) {
      return NextResponse.json({ error: "Venue name is required" }, { status: 400 });
    }

    let resolvedCustomerId = customerId && typeof customerId === "string" ? customerId.trim() : "";

    if (!resolvedCustomerId || resolvedCustomerId === "NEW") {
      const customerName = body.customerName && typeof body.customerName === "string" ? body.customerName.trim() : "";
      const customerPhone = body.customerPhone && typeof body.customerPhone === "string" ? body.customerPhone.trim() : "";
      if (!customerName) {
        return NextResponse.json({ error: "Customer selection or customer name is required" }, { status: 400 });
      }

      // Check if customer exists by phone or name
      let existingCustomer = customerPhone
        ? await prisma.customer.findFirst({ where: { phone: customerPhone } })
        : await prisma.customer.findFirst({ where: { name: customerName } });

      if (!existingCustomer) {
        const count = await prisma.customer.count();
        const code = `CUST-${String(count + 1001).padStart(4, "0")}`;
        existingCustomer = await prisma.customer.create({
          data: {
            code,
            name: customerName,
            phone: customerPhone || "N/A",
          },
        });
      }
      resolvedCustomerId = existingCustomer.id;
    } else {
      const customer = await prisma.customer.findUnique({ where: { id: resolvedCustomerId } });
      if (!customer) return NextResponse.json({ error: "Selected customer not found" }, { status: 404 });
    }

    // Generate unique code: EVT-YYYY-NNN
    const year = parsedEventDate.getFullYear();
    const prefix = `EVT-${year}-`;
    const lastProgram = await prisma.program.findFirst({
      where: { code: { startsWith: prefix } },
      orderBy: { code: "desc" },
      select: { code: true },
    });
    let seq = 1;
    if (lastProgram) {
      const parts = lastProgram.code.split("-");
      const lastSeq = parseInt(parts[parts.length - 1], 10);
      if (!isNaN(lastSeq)) seq = lastSeq + 1;
    }
    const code = `${prefix}${String(seq).padStart(3, "0")}`;

    // Validate type enum
    const validTypes: ProgramType[] = [
      ProgramType.WEDDING,
      ProgramType.BIRTHDAY,
      ProgramType.CORPORATE,
      ProgramType.RECEPTION,
      ProgramType.ANNIVERSARY,
      ProgramType.OTHER,
    ];
    const programType = validTypes.includes(type as ProgramType) ? (type as ProgramType) : ProgramType.WEDDING;

    const numGuests = Number(expectedGuests);
    const numStaff = Number(requiredStaffCount);
    const numBudget = Number(budget);

    // Verify if session user exists in users table for the optional relation programs_managerId_fkey
    let validManagerId: string | null = null;
    if (session.id) {
      const userExists = await prisma.user.findUnique({
        where: { id: session.id },
        select: { id: true },
      });
      if (userExists) {
        validManagerId = userExists.id;
      }
    }

    const program = await prisma.program.create({
      data: {
        code,
        title: title.trim(),
        type: programType,
        status: "UPCOMING",
        customerId: resolvedCustomerId,
        managerId: validManagerId,
        eventDate: parsedEventDate,
        startTime: startTime.trim(),
        endTime: endTime.trim(),
        venueName: venueName.trim(),
        venueAddress: (venueAddress && typeof venueAddress === "string" ? venueAddress.trim() : "") || "",
        expectedGuests: !isNaN(numGuests) && numGuests >= 0 ? Math.floor(numGuests) : 0,
        requiredStaffCount: !isNaN(numStaff) && numStaff >= 0 ? Math.floor(numStaff) : 0,
        budget: !isNaN(numBudget) && numBudget >= 0 ? numBudget : 0,
        notes: notes && typeof notes === "string" ? notes.trim() : null,
      },
      include: {
        customer: { select: { id: true, name: true, phone: true } },
      },
    });

    // Activity log
    try {
      await prisma.activityLog.create({
        data: {
          userId: validManagerId,
          action: "PROGRAM_CREATED",
          entityType: "Program",
          entityId: program.id,
          details: { code: program.code, title: program.title, type: program.type },
        },
      });
    } catch (logErr) {
      console.error("Failed to log PROGRAM_CREATED activity:", logErr);
    }

    try {
      await notifyEmployeesProgramCreated({
        programTitle: program.title,
        programId: program.id,
        eventDate: program.eventDate.toLocaleDateString("en-IN"),
      });
    } catch (notificationError) {
      console.error("Failed to notify employees about new program:", notificationError);
    }

    return NextResponse.json({ ok: true, program }, { status: 201 });
  } catch (error: any) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error creating program:", error);
    const message = error?.message || "An unexpected error occurred creating program";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
