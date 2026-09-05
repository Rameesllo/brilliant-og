import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

/**
 * GET /api/employee/attendance
 * Authenticated Employee: Retrieves their own verified attendance logs across all catering shifts.
 * IDOR Protected: Only accesses session.employeeId.
 */
export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    if (session.role !== "EMPLOYEE" || !session.employeeId) {
      return NextResponse.json(
        { error: "Only authenticated employees can access personal attendance records" },
        { status: 403 }
      );
    }

    const attendances = await prisma.programAttendance.findMany({
      where: { employeeId: session.employeeId },
      include: {
        program: {
          select: {
            id: true,
            code: true,
            title: true,
            eventDate: true,
            venueName: true,
            startTime: true,
            endTime: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    return NextResponse.json({
      attendances: attendances.map((att) => ({
        id: att.id,
        programId: att.program.id,
        programCode: att.program.code,
        programTitle: att.program.title,
        venueName: att.program.venueName,
        date: att.date.toISOString().split("T")[0],
        checkInTime: att.checkInTime ? att.checkInTime.toISOString() : null,
        checkOutTime: att.checkOutTime ? att.checkOutTime.toISOString() : null,
        hoursWorked: att.hoursWorked ? Number(att.hoursWorked) : 0,
        status: att.status,
        verifiedBy: att.verifiedBy || "Event Supervisor",
        remarks: att.remarks || "",
      })),
    });
  } catch (error) {
    console.error("Error fetching employee attendance:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred retrieving attendance" },
      { status: 500 }
    );
  }
}
