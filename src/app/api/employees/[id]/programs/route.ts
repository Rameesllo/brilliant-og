import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/employees/[id]/programs
 * Retrieves program assignments for an employee.
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
          { error: "Access denied: You cannot view other employees' programs" },
          { status: 403 }
        );
      }
    }

    // Resolve employee id
    const employee = await prisma.employee.findFirst({
      where: { OR: [{ id: requestedId }, { userId: requestedId }] },
      select: { id: true, wagePerEvent: true },
    });

    if (!employee) {
      return NextResponse.json({ error: "Employee not found" }, { status: 404 });
    }

    // Fetch program assignments with program details and customer
    const assignments = await prisma.programEmployee.findMany({
      where: { employeeId: employee.id },
      include: {
        program: {
          include: {
            customer: {
              select: { name: true, phone: true },
            },
            attendances: {
              where: { employeeId: employee.id },
              select: {
                id: true,
                status: true,
                hoursWorked: true,
                checkInTime: true,
                checkOutTime: true,
              },
            },
            employeePayments: {
              where: { employeeId: employee.id },
              select: {
                id: true,
                type: true,
                amount: true,
                status: true,
              },
            },
          },
        },
      },
      orderBy: {
        program: {
          eventDate: "desc",
        },
      },
    });

    const programHistory = assignments.map((a) => {
      const p = a.program;
      const attendance = p.attendances[0] || null;

      // Calculate earned (credits) and paid (debits) for this specific program
      let earned = 0;
      let paid = 0;
      let paymentStatus: "PAID" | "PENDING" | "PARTIAL" | "UNPAID" = "UNPAID";

      for (const pay of p.employeePayments) {
        const amt = Number(pay.amount);
        if (pay.type === "CREDIT") {
          earned += amt;
        } else if (pay.type === "DEBIT") {
          paid += amt;
        }
      }

      // If no explicit credit record yet, but attendance worked hours exist, estimate earned
      if (earned === 0 && attendance && attendance.hoursWorked) {
        earned = Number(employee.wagePerEvent);
      }

      const outstanding = Math.max(0, earned - paid);
      if (earned > 0 && paid >= earned) {
        paymentStatus = "PAID";
      } else if (paid > 0 && paid < earned) {
        paymentStatus = "PARTIAL";
      } else if (earned > 0 && paid === 0) {
        paymentStatus = "PENDING";
      }

      return {
        id: a.id,
        programId: p.id,
        programCode: p.code,
        title: p.title,
        customerName: p.customer?.name || "Private Event",
        eventDate: p.eventDate.toISOString().split("T")[0],
        time: `${p.startTime} - ${p.endTime}`,
        venueName: p.venueName,
        assignedRole: a.assignedRole || "Staff",
        assignmentStatus: a.status,
        attendanceStatus: attendance ? attendance.status : null,
        hoursWorked: attendance && attendance.hoursWorked ? Number(attendance.hoursWorked) : null,
        earned,
        paid,
        outstanding,
        paymentStatus,
      };
    });

    return NextResponse.json({ programs: programHistory });
  } catch (error) {
    console.error("Error fetching employee programs:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred retrieving program history" },
      { status: 500 }
    );
  }
}
