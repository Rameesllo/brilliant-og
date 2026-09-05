import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/employees/[id]/attendance
 * Retrieves attendance logs for an employee.
 * Protected by IDOR: Admin/Manager can view any; Employee can only view self.
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { id: requestedId } = await params;

    // IDOR Check
    if (session.role === "EMPLOYEE") {
      const isSelf = session.employeeId === requestedId || session.id === requestedId;
      if (!isSelf) {
        return NextResponse.json(
          { error: "Access denied: You cannot view other employees' attendance" },
          { status: 403 }
        );
      }
    }

    // Resolve employee id
    const employee = await prisma.employee.findFirst({
      where: { OR: [{ id: requestedId }, { userId: requestedId }] },
      select: { id: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    const attendances = await prisma.programAttendance.findMany({
      where: { employeeId: employee.id },
      include: {
        program: {
          select: {
            id: true,
            code: true,
            title: true,
            eventDate: true,
            venueName: true,
          },
        },
      },
      orderBy: { date: "desc" },
    });

    const formattedAttendance = attendances.map((att) => ({
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
      remarks: att.remarks || "",
      verifiedBy: att.verifiedBy || "",
    }));

    return NextResponse.json({ attendances: formattedAttendance });
  } catch (error) {
    console.error("Error fetching employee attendance:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred retrieving attendance history" },
      { status: 500 }
    );
  }
}
