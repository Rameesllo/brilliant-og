import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { Prisma } from "@prisma/client";

/**
 * GET /api/customers
 * Returns paginated, searchable list of customers with computed ledger balances.
 * Admin/Manager only.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const statusFilter = searchParams.get("status") || "ALL"; // ALL, ACTIVE, INACTIVE
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};
    if (statusFilter === "ACTIVE") {
      where.isActive = true;
    } else if (statusFilter === "INACTIVE") {
      where.isActive = false;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { phone: { contains: search, mode: "insensitive" } },
        { companyName: { contains: search, mode: "insensitive" } },
        { email: { contains: search, mode: "insensitive" } },
        { city: { contains: search, mode: "insensitive" } },
      ];
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({
        where,
        include: {
          invoices: {
            select: {
              grandTotal: true,
              paidAmount: true,
              outstandingAmount: true,
              status: true,
            },
          },
          _count: {
            select: {
              programs: true,
              invoices: true,
              payments: true,
            },
          },
        },
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
      }),
      prisma.customer.count({ where }),
    ]);

    // Format customer records with computed financial balances
    const formattedCustomers = customers.map((c) => {
      let totalBilled = 0;
      let paidAmount = 0;
      let outstanding = 0;
      let hasOverdue = false;

      for (const inv of c.invoices) {
        totalBilled += Number(inv.grandTotal);
        paidAmount += Number(inv.paidAmount);
        outstanding += Number(inv.outstandingAmount);
        if (inv.status === "OVERDUE") {
          hasOverdue = true;
        }
      }

      let ledgerStatus: "PAID" | "PENDING" | "OVERDUE" = "PAID";
      if (hasOverdue) {
        ledgerStatus = "OVERDUE";
      } else if (outstanding > 0) {
        ledgerStatus = "PENDING";
      }

      return {
        id: c.id,
        code: c.code,
        name: c.name,
        companyName: c.companyName || "",
        phone: c.phone,
        email: c.email || "",
        address: c.address || "",
        city: c.city || "",
        notes: c.notes || "",
        isActive: c.isActive,
        programsCount: c._count.programs,
        invoicesCount: c._count.invoices,
        paymentsCount: c._count.payments,
        totalBilled,
        paidAmount,
        outstanding,
        ledgerStatus,
        createdAt: c.createdAt.toISOString(),
      };
    });

    // Compute overall KPI aggregates for all active/filtered customers
    const allCustomersInvoices = await prisma.invoice.findMany({
      select: {
        grandTotal: true,
        paidAmount: true,
        outstandingAmount: true,
      },
    });

    let overallBilled = 0;
    let overallPaid = 0;
    let overallOutstanding = 0;

    for (const inv of allCustomersInvoices) {
      overallBilled += Number(inv.grandTotal);
      overallPaid += Number(inv.paidAmount);
      overallOutstanding += Number(inv.outstandingAmount);
    }

    return NextResponse.json({
      customers: formattedCustomers,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      metrics: {
        totalCustomers: total,
        totalBilled: overallBilled,
        totalPaid: overallPaid,
        totalOutstanding: overallOutstanding,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred fetching customers" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/customers
 * Creates a new customer record.
 * Admin/Manager only.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();

    const { name, phone, companyName, email, address, city, notes, isActive = true } = body;

    // Validation
    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Customer full name is required" }, { status: 400 });
    }

    if (!phone || typeof phone !== "string" || !phone.trim()) {
      return NextResponse.json({ error: "Contact phone number is required" }, { status: 400 });
    }

    const cleanEmail = email && typeof email === "string" ? email.trim() : null;
    if (cleanEmail) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(cleanEmail)) {
        return NextResponse.json({ error: "Invalid email address format" }, { status: 400 });
      }
    }

    let customer;
    for (let attempt = 0; attempt < 5; attempt++) {
      const customers = await prisma.customer.findMany({ select: { code: true } });
      const highestCode = customers.reduce((highest, item) => {
        const match = item.code.match(/^CUST-(\d+)$/i);
        return match ? Math.max(highest, Number(match[1])) : highest;
      }, 1000);
      const customerCode = `CUST-${String(highestCode + 1 + attempt).padStart(4, "0")}`;

      try {
        customer = await prisma.customer.create({
          data: {
            code: customerCode,
            name: name.trim(),
            phone: phone.trim(),
            companyName: companyName && typeof companyName === "string" ? companyName.trim() : null,
            email: cleanEmail,
            address: address && typeof address === "string" ? address.trim() : null,
            city: city && typeof city === "string" ? city.trim() : null,
            notes: notes && typeof notes === "string" ? notes.trim() : null,
            isActive: Boolean(isActive),
          },
        });
        break;
      } catch (error) {
        if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
          throw error;
        }
      }
    }

    if (!customer) {
      return NextResponse.json({ error: "Unable to generate a unique customer code" }, { status: 409 });
    }

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: "CUSTOMER_CREATED",
        entityType: "CUSTOMER",
        entityId: customer.id,
        details: {
          message: `Created customer ${customer.name} (${customer.code})`,
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
          companyName: customer.companyName,
        },
      },
    });

    return NextResponse.json(
      {
        message: "Customer created successfully",
        customer: {
          id: customer.id,
          code: customer.code,
          name: customer.name,
          phone: customer.phone,
          companyName: customer.companyName,
          email: customer.email,
          city: customer.city,
          address: customer.address,
          notes: customer.notes,
          isActive: customer.isActive,
          createdAt: customer.createdAt.toISOString(),
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating customer" },
      { status: 500 }
    );
  }
}
