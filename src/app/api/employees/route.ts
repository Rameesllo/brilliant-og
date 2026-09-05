import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError, hashPassword } from "@/lib/auth";
import { EmployeeStatus, Role, Prisma } from "@prisma/client";

/**
 * GET /api/employees
 * Query parameters:
 * - search: string (name, code, phone, email)
 * - employeeTypeId: string (filter by designation)
 * - status: EmployeeStatus (ACTIVE, INACTIVE, ON_LEAVE, TERMINATED)
 * - sortBy: "name" | "code" | "wagePerEvent" | "status" | "createdAt" (default "name")
 * - sortOrder: "asc" | "desc" (default "asc")
 * - page: number (default 1)
 * - limit: number (default 10)
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const employeeTypeId = searchParams.get("employeeTypeId")?.trim() || "";
    const statusParam = searchParams.get("status")?.trim() || "";
    const sortBy = searchParams.get("sortBy") || "name";
    const sortOrder = searchParams.get("sortOrder") === "desc" ? "desc" : "asc";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(50, Math.max(1, parseInt(searchParams.get("limit") || "10", 10)));
    const skip = (page - 1) * limit;

    // Build Prisma where clause
    const where: Prisma.EmployeeWhereInput = {};

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
      ];
    }

    if (employeeTypeId) {
      where.employeeTypeId = employeeTypeId;
    }

    if (statusParam && Object.values(EmployeeStatus).includes(statusParam as EmployeeStatus)) {
      where.status = statusParam as EmployeeStatus;
    }

    // Build orderBy clause
    const allowedSortFields = ["name", "code", "wagePerEvent", "status", "createdAt"];
    const sortField = allowedSortFields.includes(sortBy) ? sortBy : "name";
    const orderBy = { [sortField]: sortOrder };

    // Run count and query in parallel
    const [total, employees] = await Promise.all([
      prisma.employee.count({ where }),
      prisma.employee.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          employeeType: {
            select: {
              id: true,
              name: true,
              description: true,
            },
          },
          _count: {
            select: {
              programEmployees: true,
            },
          },
          ledgerPayments: {
            select: {
              type: true,
              amount: true,
            },
          },
        },
      }),
    ]);

    // Format results and compute financial outstanding server-side
    const formattedEmployees = employees.map((emp) => {
      let totalCredit = 0;
      let totalDebit = 0;

      for (const p of emp.ledgerPayments) {
        const amt = Number(p.amount);
        if (p.type === "CREDIT") {
          totalCredit += amt;
        } else if (p.type === "DEBIT") {
          totalDebit += amt;
        }
      }

      const outstanding = totalCredit - totalDebit;

      return {
        id: emp.id,
        code: emp.code,
        name: emp.name,
        phone: emp.phone,
        email: emp.email || "",
        address: emp.address || "",
        emergencyContact: emp.emergencyContact || "",
        employeeType: {
          id: emp.employeeType.id,
          name: emp.employeeType.name,
          description: emp.employeeType.description || "",
        },
        wagePerEvent: Number(emp.wagePerEvent),
        status: emp.status,
        programsCount: emp._count.programEmployees,
        totalEarned: totalCredit,
        totalPaid: totalDebit,
        outstanding,
        joinDate: emp.joinDate.toISOString(),
        createdAt: emp.createdAt.toISOString(),
      };
    });

    const totalPages = Math.ceil(total / limit) || 1;

    return NextResponse.json({
      employees: formattedEmployees,
      total,
      page,
      limit,
      totalPages,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Error fetching employees:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred retrieving employee records" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/employees
 * Creates a new employee record and optional login account.
 * Accessible to ADMIN and MANAGER only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const {
      name,
      phone,
      email,
      address,
      emergencyContact,
      employeeTypeId,
      wagePerEvent,
      status = "ACTIVE",
      createAccount = false,
      password,
    } = body;

    // Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Employee full name is required" }, { status: 400 });
    }

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json({ error: "Contact phone number is required" }, { status: 400 });
    }

    if (!employeeTypeId || typeof employeeTypeId !== "string") {
      return NextResponse.json({ error: "Employee Type / Designation is required" }, { status: 400 });
    }

    // Verify employeeType exists
    const employeeType = await prisma.employeeType.findUnique({
      where: { id: employeeTypeId },
    });
    if (!employeeType) {
      return NextResponse.json({ error: "Selected Employee Type does not exist" }, { status: 400 });
    }

    // Validate email if provided
    const cleanEmail = email?.trim() ? email.trim().toLowerCase() : null;
    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ error: "Invalid email address format" }, { status: 400 });
      }

      // Check duplicate email in User or Employee
      const existingUser = await prisma.user.findUnique({ where: { email: cleanEmail } });
      if (existingUser) {
        return NextResponse.json(
          { error: "A user account with this email address already exists" },
          { status: 409 }
        );
      }

      const existingEmployee = await prisma.employee.findFirst({ where: { email: cleanEmail } });
      if (existingEmployee) {
        return NextResponse.json(
          { error: "An employee with this email address already exists" },
          { status: 409 }
        );
      }
    }

    // Wage validation
    const numWagePerEvent = wagePerEvent !== undefined && wagePerEvent !== ""
      ? Number(wagePerEvent)
      : Number(employeeType.defaultWagePerEvent);

    if (isNaN(numWagePerEvent) || numWagePerEvent < 0) {
      return NextResponse.json({ error: "Wage per event cannot be negative" }, { status: 400 });
    }

    // Status validation
    if (status && !Object.values(EmployeeStatus).includes(status as EmployeeStatus)) {
      return NextResponse.json({ error: "Invalid employee status" }, { status: 400 });
    }

    // Optional user account validation
    let userId: string | null = null;
    if (createAccount) {
      if (!cleanEmail) {
        return NextResponse.json(
          { error: "Email address is required to create a login account" },
          { status: 400 }
        );
      }
      if (!password || typeof password !== "string" || password.length < 6) {
        return NextResponse.json(
          { error: "Password must be at least 6 characters for user account" },
          { status: 400 }
        );
      }

      const passwordHash = await hashPassword(password);
      const newUser = await prisma.user.create({
        data: {
          email: cleanEmail,
          passwordHash,
          name: name.trim(),
          role: Role.EMPLOYEE,
          phone: phone.trim(),
          isActive: status === "ACTIVE",
        },
      });
      userId = newUser.id;
    }

    // Generate unique employee code: EMP-101, EMP-102...
    const lastEmployee = await prisma.employee.findFirst({
      orderBy: { createdAt: "desc" },
      select: { code: true },
    });

    let nextCodeNumber = 101;
    if (lastEmployee?.code) {
      const match = lastEmployee.code.match(/EMP-(\d+)/i);
      if (match) {
        nextCodeNumber = Math.max(nextCodeNumber, parseInt(match[1], 10) + 1);
      }
    }

    // Ensure uniqueness
    let generatedCode = `EMP-${nextCodeNumber}`;
    let codeExists = await prisma.employee.findUnique({ where: { code: generatedCode } });
    while (codeExists) {
      nextCodeNumber++;
      generatedCode = `EMP-${nextCodeNumber}`;
      codeExists = await prisma.employee.findUnique({ where: { code: generatedCode } });
    }

    // Create Employee record
    const createdEmployee = await prisma.employee.create({
      data: {
        code: generatedCode,
        name: name.trim(),
        phone: phone.trim(),
        email: cleanEmail,
        address: address?.trim() || null,
        emergencyContact: emergencyContact?.trim() || null,
        employeeTypeId,
        wagePerEvent: numWagePerEvent,
        status: (status as EmployeeStatus) || EmployeeStatus.ACTIVE,
        userId,
      },
      include: {
        employeeType: true,
      },
    });

    // Record ActivityLog
    try {
      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action: "EMPLOYEE_CREATED",
          entityType: "Employee",
          entityId: createdEmployee.id,
          details: {
            code: createdEmployee.code,
            name: createdEmployee.name,
            designation: createdEmployee.employeeType.name,
            createdUserAccount: Boolean(userId),
          },
        },
      });
    } catch (logError) {
      console.error("Failed to write activity log:", logError);
    }

    return NextResponse.json(
      {
        message: "Employee successfully created",
        employee: {
          id: createdEmployee.id,
          code: createdEmployee.code,
          name: createdEmployee.name,
          phone: createdEmployee.phone,
          email: createdEmployee.email,
          address: createdEmployee.address,
          emergencyContact: createdEmployee.emergencyContact,
          employeeType: {
            id: createdEmployee.employeeType.id,
            name: createdEmployee.employeeType.name,
          },
          wagePerEvent: Number(createdEmployee.wagePerEvent),
          status: createdEmployee.status,
          hasAccount: Boolean(userId),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Error creating employee:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating the employee" },
      { status: 500 }
    );
  }
}
