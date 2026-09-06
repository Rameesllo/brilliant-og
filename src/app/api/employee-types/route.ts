import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/auth";

/**
 * GET /api/employee-types
 * Returns list of active employee types for selection dropdowns.
 * Requires authenticated session (Admin, Manager, or Employee).
 */
export async function GET() {
  try {
    await requireAuth();

    const allowedDesignations = [
      "Service Boy",
      "Base Boy",
      "Supervisor",
      "Captain",
      "Hosting Boy",
      "Hosting Girl",
    ];

    const types = await prisma.employeeType.findMany({
      where: {
        isActive: true,
        name: { in: allowedDesignations },
      },
      orderBy: { name: "asc" },
      select: {
        id: true,
        name: true,
        description: true,
        defaultWagePerEvent: true,
      },
    });

    return NextResponse.json({
      types: types.map((t) => ({
        id: t.id,
        name: t.name,
        description: t.description,
        defaultWagePerEvent: Number(t.defaultWagePerEvent),
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    console.error("Error fetching employee types:", error);
    return NextResponse.json(
      { error: "Failed to fetch employee types" },
      { status: 500 }
    );
  }
}
