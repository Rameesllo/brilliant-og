import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession, requireAdmin, AuthError } from "@/lib/auth";
import { AttendanceStatus } from "@prisma/client";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/programs/[id]/attendance
 * Retrieves attendance logs for all confirmed staff of the program.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id: programId } = await params;

    const program = await prisma.program.findUnique({
      where: { id: programId },
      include: {
        programEmployees: {
          where: { status: { in: ["CONFIRMED", "COMPLETED"] } },
          include: {
            employee: {
              include: { employeeType: true },
            },
          },
        },
        attendances: {
          include: {
            employee: {
              include: { employeeType: true },
            },
          },
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    // Map existing attendance by employeeId
    const attendanceMap = new Map();
    program.attendances.forEach((att) => {
      attendanceMap.set(att.employeeId, {
        id: att.id,
        date: att.date.toISOString().split("T")[0],
        checkInTime: att.checkInTime ? att.checkInTime.toISOString() : null,
        checkOutTime: att.checkOutTime ? att.checkOutTime.toISOString() : null,
        hoursWorked: att.hoursWorked ? Number(att.hoursWorked) : 0,
        status: att.status,
        verifiedBy: att.verifiedBy || "",
        remarks: att.remarks || "",
      });
    });

    // If employee role, they can only view their own
    if (session.role === "EMPLOYEE") {
      const myAtt = attendanceMap.get(session.employeeId || "");
      return NextResponse.json({
        attendance: myAtt ? [myAtt] : [],
      });
    }

    // Admin view: Combine all confirmed staff with their attendance record
    const rosterAttendance = program.programEmployees.map((pe) => {
      const record = attendanceMap.get(pe.employeeId);
      return {
        employeeId: pe.employee.id,
        employeeCode: pe.employee.code,
        name: pe.employee.name,
        phone: pe.employee.phone,
        designation: pe.employee.employeeType.name,
        wagePerEvent: Number(pe.employee.wagePerEvent),
        assignedRole: pe.assignedRole || pe.employee.employeeType.name,
        attendanceId: record?.id || null,
        attendanceDate: record?.date || program.eventDate.toISOString().split("T")[0],
        status: (record?.status as AttendanceStatus) || null,
        hoursWorked: record?.hoursWorked ?? 0,
        checkInTime: record?.checkInTime || null,
        checkOutTime: record?.checkOutTime || null,
        verifiedBy: record?.verifiedBy || null,
        remarks: record?.remarks || "",
      };
    });

    return NextResponse.json({
      programId: program.id,
      programTitle: program.title,
      eventDate: program.eventDate.toISOString().split("T")[0],
      staff: rosterAttendance,
      summary: {
        totalConfirmed: program.programEmployees.length,
        markedCount: program.attendances.length,
        presentCount: program.attendances.filter((a) => a.status === "PRESENT" || a.status === "HALF_DAY").length,
        absentCount: program.attendances.filter((a) => a.status === "ABSENT").length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching program attendance:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred retrieving attendance" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/programs/[id]/attendance
 * Admin/Manager: Records or updates an attendance entry for a confirmed staff member.
 * Also connects to Employee Earnings by recording/updating a CREDIT ledger entry in EmployeePayment.
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await requireAdmin();
    const { id: programId } = await params;
    const body = await request.json();

    const {
      employeeId,
      status,
      date,
      checkInTime,
      checkOutTime,
      hoursWorked,
      remarks,
    } = body;

    if (!employeeId) {
      return NextResponse.json({ error: "Employee ID is required" }, { status: 400 });
    }

    if (!status || !Object.values(AttendanceStatus).includes(status as AttendanceStatus)) {
      return NextResponse.json({ error: "Valid attendance status is required" }, { status: 400 });
    }

    const program = await prisma.program.findUnique({
      where: { id: programId },
    });

    if (!program) {
      return NextResponse.json({ error: "Program not found" }, { status: 404 });
    }

    if (program.status === "CANCELLED") {
      return NextResponse.json(
        { error: "Cannot record attendance for a cancelled program" },
        { status: 400 }
      );
    }

    // Check that employee is in confirmed roster
    const rosterMembership = await prisma.programEmployee.findUnique({
      where: {
        programId_employeeId: {
          programId,
          employeeId,
        },
      },
      include: {
        employee: {
          include: { employeeType: true },
        },
      },
    });

    if (!rosterMembership || (rosterMembership.status !== "CONFIRMED" && rosterMembership.status !== "COMPLETED")) {
      return NextResponse.json(
        { error: "Attendance can only be logged for confirmed or completed staff members" },
        { status: 400 }
      );
    }

    const employee = rosterMembership.employee;
    const attendanceDate = date ? new Date(date) : new Date(program.eventDate);
    // Normalize date to YYYY-MM-DD
    const normalizedDate = new Date(attendanceDate.toISOString().split("T")[0]);

    const numHoursWorked = hoursWorked !== undefined ? Math.max(0, Number(hoursWorked)) : 8;

    // 1. Upsert Attendance Record
    const attendance = await prisma.programAttendance.upsert({
      where: {
        programId_employeeId_date: {
          programId,
          employeeId,
          date: normalizedDate,
        },
      },
      create: {
        programId,
        employeeId,
        date: normalizedDate,
        status: status as AttendanceStatus,
        checkInTime: checkInTime ? new Date(checkInTime) : null,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : null,
        hoursWorked: numHoursWorked,
        remarks: remarks?.trim() || null,
        verifiedBy: session.name,
      },
      update: {
        status: status as AttendanceStatus,
        checkInTime: checkInTime ? new Date(checkInTime) : undefined,
        checkOutTime: checkOutTime ? new Date(checkOutTime) : undefined,
        hoursWorked: numHoursWorked,
        remarks: remarks !== undefined ? remarks.trim() : undefined,
        verifiedBy: session.name,
      },
    });

    // 2. Earnings Calculation & Financial Ledger Integration
    // Wages are per-event (fixed per program attendance), not hourly
    let earnedWage = 0;
    const wagePerEvent = Number(employee.wagePerEvent);

    if (status === "PRESENT" || status === "LATE") {
      earnedWage = wagePerEvent;
    } else if (status === "HALF_DAY") {
      earnedWage = wagePerEvent / 2;
    }
    // ABSENT = 0 earnings

    // Check if an existing CREDIT payment record exists for this employee and program
    const existingCredit = await prisma.employeePayment.findFirst({
      where: {
        employeeId: employee.id,
        programId: program.id,
        type: "CREDIT",
      },
    });

    if (earnedWage > 0) {
      if (existingCredit) {
        await prisma.employeePayment.update({
          where: { id: existingCredit.id },
          data: {
            amount: earnedWage,
            description: `Event wages for ${program.title} (₹${wagePerEvent}/event${status === "HALF_DAY" ? " × 0.5" : ""})`,
            status: "APPROVED",
            updatedAt: new Date(),
          },
        });
      } else {
        const count = await prisma.employeePayment.count();
        const year = new Date().getFullYear();
        const transactionNumber = `TXN-EMP-${year}-${String(count + 1).padStart(4, "0")}`;

        await prisma.employeePayment.create({
          data: {
            transactionNumber,
            employeeId: employee.id,
            programId: program.id,
            type: "CREDIT",
            amount: earnedWage,
            status: "APPROVED",
            description: `Event wages for ${program.title} (₹${wagePerEvent}/event${status === "HALF_DAY" ? " × 0.5" : ""})`,
            createdBy: session.id,
          },
        });
      }
    } else if (existingCredit && status === "ABSENT") {
      // If marked absent, reset credit earnings
      await prisma.employeePayment.update({
        where: { id: existingCredit.id },
        data: {
          amount: 0,
          description: `Shift marked Absent for ${program.title}`,
          status: "CANCELLED",
        },
      });
    }

    // 3. Activity Log
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action: "ATTENDANCE_RECORDED",
          entityType: "ProgramAttendance",
          entityId: attendance.id,
          details: {
            programCode: program.code,
            employeeName: employee.name,
            status,
            hoursWorked: numHoursWorked,
            earnedWage,
          },
        },
      });
    } catch (logErr) {
      console.error("Failed to log activity:", logErr);
    }

    return NextResponse.json({
      ok: true,
      attendance: {
        id: attendance.id,
        status: attendance.status,
        hoursWorked: Number(attendance.hoursWorked),
        earnedWage,
        verifiedBy: attendance.verifiedBy,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error recording attendance:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred recording attendance" },
      { status: 500 }
    );
  }
}
