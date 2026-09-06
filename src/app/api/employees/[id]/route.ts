import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/employees/[id]
 * Enforces strict Resource Ownership & IDOR Protection:
 * - Unauthenticated: 401 Unauthorized
 * - Admin/Manager: Allowed to view any employee record
 * - Employee: Strictly allowed to view ONLY their own linked employee record
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required to access employee data" },
        { status: 401 }
      );
    }

    const { id: requestedId } = await params;

    // Authorization & IDOR Check
    if (session.role === "EMPLOYEE") {
      const isSelf = session.employeeId === requestedId || session.id === requestedId;
      if (!isSelf) {
        return NextResponse.json(
          { error: "Access denied: You cannot view other employees' private information" },
          { status: 403 }
        );
      }
    }

    // Fetch employee from database
    const employee = await prisma.employee.findFirst({
      where: {
        OR: [{ id: requestedId }, { userId: requestedId }],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
            isActive: true,
          },
        },
        employeeType: true,
      },
    });

    if (!employee) {
      return NextResponse.json(
        { error: "Employee record not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({
      employee: {
        id: employee.id,
        code: employee.code,
        name: employee.name || employee.user?.name || "",
        email: employee.email || employee.user?.email || "",
        phone: employee.phone || employee.user?.phone || "",
        department: employee.employeeType.description || "Operations",
        designation: employee.employeeType.name,
        employeeTypeId: employee.employeeTypeId,
        employeeType: {
          id: employee.employeeType.id,
          name: employee.employeeType.name,
          description: employee.employeeType.description || "",
        },
        wagePerEvent: Number(employee.dailyRate),
        status: employee.status,
        emergencyContact: employee.emergencyContact || "",
        address: employee.address || "",
        joinDate: employee.joinDate.toISOString(),
        hasAccount: Boolean(employee.userId),
      },
    });
  } catch (error) {
    console.error("Error retrieving employee:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred retrieving employee record" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/employees/[id]
 * Enforces strict write authorization:
 * - Unauthenticated: 401 Unauthorized
 * - Employee: Can only update personal fields on their own record
 * - Admin/Manager: Full management access
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: "Authentication required" },
        { status: 401 }
      );
    }

    const { id: requestedId } = await params;
    const body = await request.json();

    // Check ownership for employees
    if (session.role === "EMPLOYEE") {
      const isSelf = session.employeeId === requestedId || session.id === requestedId;
      if (!isSelf) {
        return NextResponse.json(
          { error: "Access denied: You cannot modify another employee's records" },
          { status: 403 }
        );
      }

      // Employees can only update safe contact fields
      const { phone, emergencyContact, address } = body;

      const updated = await prisma.employee.updateMany({
        where: {
          OR: [{ id: requestedId }, { userId: requestedId }],
        },
        data: {
          phone: phone !== undefined ? phone.trim() : undefined,
          emergencyContact: emergencyContact !== undefined ? emergencyContact.trim() : undefined,
          address: address !== undefined ? address.trim() : undefined,
        },
      });

      if (updated.count === 0) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      return NextResponse.json({ ok: true, message: "Profile updated successfully" });
    }

    // Admin/Manager update
    if (session.role === "ADMIN" || session.role === "MANAGER") {
      const {
        name,
        phone,
        email,
        employeeTypeId,
        wagePerEvent,
        status,
        address,
        emergencyContact,
      } = body;

      const target = await prisma.employee.findFirst({
        where: { OR: [{ id: requestedId }, { userId: requestedId }] },
      });

      if (!target) {
        return NextResponse.json({ error: "Employee not found" }, { status: 404 });
      }

      // Validate employeeTypeId if provided
      if (employeeTypeId) {
        const typeExists = await prisma.employeeType.findUnique({
          where: { id: employeeTypeId },
        });
        if (!typeExists) {
          return NextResponse.json({ error: "Invalid employee type selected" }, { status: 400 });
        }
      }

      // Validate email uniqueness if changed
      let cleanEmail: string | undefined = undefined;
      if (email !== undefined) {
        const trimmedEmail = email?.trim() ? email.trim().toLowerCase() : null;
        if (trimmedEmail && trimmedEmail !== target.email) {
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(trimmedEmail)) {
            return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
          }

          const existingEmp = await prisma.employee.findFirst({
            where: { email: trimmedEmail, id: { not: target.id } },
          });
          if (existingEmp) {
            return NextResponse.json({ error: "Email is already taken by another employee" }, { status: 409 });
          }
        }
        cleanEmail = trimmedEmail || undefined;
      }

      // Validate wage
      if (wagePerEvent !== undefined && Number(wagePerEvent) < 0) {
        return NextResponse.json({ error: "Wage per event cannot be negative" }, { status: 400 });
      }

      const updated = await prisma.employee.update({
        where: { id: target.id },
        data: {
          name: name !== undefined ? name.trim() : undefined,
          phone: phone !== undefined ? phone.trim() : undefined,
          email: cleanEmail !== undefined ? cleanEmail : undefined,
          employeeTypeId: employeeTypeId !== undefined ? employeeTypeId : undefined,
          dailyRate: wagePerEvent !== undefined ? Number(wagePerEvent) : undefined,
          status: status !== undefined ? status : undefined,
          address: address !== undefined ? address.trim() : undefined,
          emergencyContact: emergencyContact !== undefined ? emergencyContact.trim() : undefined,
        },
        include: {
          employeeType: true,
        },
      });

      // If user account is linked and status changed, keep user isActive in sync
      if (target.userId && status !== undefined) {
        try {
          await prisma.user.update({
            where: { id: target.userId },
            data: { isActive: status === "ACTIVE" },
          });
        } catch (uErr) {
          console.error("Failed to sync user active state:", uErr);
        }
      }

      // Log activity
      try {
        await prisma.activityLog.create({
          data: {
            userId: session.id,
            action: "EMPLOYEE_UPDATED",
            entityType: "Employee",
            entityId: updated.id,
            details: {
              name: updated.name,
              code: updated.code,
              status: updated.status,
            },
          },
        });
      } catch (logErr) {
        console.error("Failed to log activity:", logErr);
      }

      return NextResponse.json({ ok: true, employee: updated });
    }

    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  } catch (error) {
    console.error("Error updating employee:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred updating employee record" },
      { status: 500 }
    );
  }
}

export const PATCH = PUT;
