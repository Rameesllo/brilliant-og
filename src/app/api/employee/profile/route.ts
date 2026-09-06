import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireEmployee, AuthError } from "@/lib/auth";

/**
 * GET /api/employee/profile
 * Retrieves profile strictly for the authenticated employee in session.
 * Never trusts any client-provided ID.
 */
export async function GET() {
  try {
    const session = await requireEmployee();

    if (!session.employeeId && !session.id) {
      return NextResponse.json(
        { error: "Employee profile not linked to user account" },
        { status: 400 }
      );
    }

    const employee = await prisma.employee.findFirst({
      where: {
        OR: [
          ...(session.employeeId ? [{ id: session.employeeId }] : []),
          { userId: session.id },
        ],
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            role: true,
            phone: true,
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
      profile: {
        id: employee.id,
        code: employee.code,
        name: employee.name || employee.user?.name || "",
        email: employee.email || employee.user?.email || "",
        phone: employee.phone || employee.user?.phone || "",
        department: employee.employeeType.description || "Operations",
        designation: employee.employeeType.name,
        wagePerEvent: Number(employee.wagePerEvent),
        status: employee.status,
        emergencyContact: employee.emergencyContact || "",
        address: employee.address || "",
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error retrieving employee profile:", error);
    return NextResponse.json(
      { error: "Internal server error retrieving profile" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/employee/profile
 * Updates contact information for the authenticated employee.
 * Strictly derives the target employee from the session.
 */
export async function PUT(request: NextRequest) {
  try {
    const session = await requireEmployee();
    const body = await request.json();
    const { phone, emergencyContact, address } = body;

    const targetEmployee = await prisma.employee.findFirst({
      where: {
        OR: [
          ...(session.employeeId ? [{ id: session.employeeId }] : []),
          { userId: session.id },
        ],
      },
    });

    if (!targetEmployee) {
      return NextResponse.json(
        { error: "Employee profile not found" },
        { status: 404 }
      );
    }

    // Only allow updating safe contact information; disallow changing rate, designation, etc.
    const updated = await prisma.employee.update({
      where: { id: targetEmployee.id },
      data: {
        phone: phone !== undefined ? String(phone) : undefined,
        emergencyContact: emergencyContact !== undefined ? String(emergencyContact) : undefined,
        address: address !== undefined ? String(address) : undefined,
      },
    });

    // Also update phone on user record if provided
    if (phone !== undefined) {
      await prisma.user.update({
        where: { id: session.id },
        data: { phone: String(phone) },
      });
    }

    return NextResponse.json({
      ok: true,
      message: "Profile updated successfully",
      profile: {
        id: updated.id,
        phone: updated.phone,
        emergencyContact: updated.emergencyContact,
        address: updated.address,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error updating employee profile:", error);
    return NextResponse.json(
      { error: "Internal server error updating profile" },
      { status: 500 }
    );
  }
}
