import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { InvoicePaymentStatus } from "@prisma/client";

/**
 * GET /api/invoices
 * Returns paginated, searchable invoices with customer, program, and ledger totals.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const status = searchParams.get("status") || "ALL";
    const customerId = searchParams.get("customerId");
    const programId = searchParams.get("programId");
    const outstandingOnly = searchParams.get("outstandingOnly") === "true";
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (status !== "ALL" && Object.values(InvoicePaymentStatus).includes(status as InvoicePaymentStatus)) {
      where.status = status as InvoicePaymentStatus;
    }

    if (customerId) {
      where.customerId = customerId;
    }

    if (programId) {
      where.programId = programId;
    }

    if (outstandingOnly) {
      where.outstandingAmount = { gt: 0 };
    }

    if (startDate || endDate) {
      const dateFilter: Record<string, Date> = {};
      if (startDate) dateFilter.gte = new Date(startDate);
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        dateFilter.lte = end;
      }
      where.issueDate = dateFilter;
    }

    if (search) {
      where.OR = [
        { invoiceNumber: { contains: search, mode: "insensitive" } },
        { customer: { name: { contains: search, mode: "insensitive" } } },
        { customer: { phone: { contains: search, mode: "insensitive" } } },
        { customer: { companyName: { contains: search, mode: "insensitive" } } },
        { program: { title: { contains: search, mode: "insensitive" } } },
        { program: { code: { contains: search, mode: "insensitive" } } },
      ];
    }

    const [invoices, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        include: {
          customer: {
            select: { id: true, code: true, name: true, phone: true, companyName: true },
          },
          program: {
            select: { id: true, code: true, title: true, eventDate: true },
          },
          _count: {
            select: { items: true, customerPayments: true },
          },
        },
        orderBy: { issueDate: "desc" },
        skip,
        take: limit,
      }),
      prisma.invoice.count({ where }),
    ]);

    // Compute overall invoice metrics
    const allInvoices = await prisma.invoice.findMany({
      select: {
        grandTotal: true,
        paidAmount: true,
        outstandingAmount: true,
        status: true,
        dueDate: true,
      },
    });

    const now = new Date();
    let totalInvoiced = 0;
    let totalPaid = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;

    for (const inv of allInvoices) {
      totalInvoiced += Number(inv.grandTotal);
      totalPaid += Number(inv.paidAmount);
      totalOutstanding += Number(inv.outstandingAmount);
      if (inv.status === "OVERDUE" || (Number(inv.outstandingAmount) > 0 && inv.dueDate < now)) {
        overdueCount++;
      }
    }

    return NextResponse.json({
      invoices: invoices.map((inv) => {
        // Evaluate if dynamically overdue
        let currentStatus = inv.status;
        if (Number(inv.outstandingAmount) > 0 && inv.dueDate < now && inv.status !== "CANCELLED") {
          currentStatus = InvoicePaymentStatus.OVERDUE;
        }

        return {
          id: inv.id,
          invoiceNumber: inv.invoiceNumber,
          customerId: inv.customerId,
          customerName: inv.customer.name,
          customerCode: inv.customer.code,
          customerPhone: inv.customer.phone,
          customerCompany: inv.customer.companyName || "",
          programId: inv.programId,
          programTitle: inv.program?.title || "",
          programCode: inv.program?.code || "",
          issueDate: inv.issueDate.toISOString().split("T")[0],
          dueDate: inv.dueDate.toISOString().split("T")[0],
          subtotal: Number(inv.subtotal),
          taxRate: Number(inv.taxRate),
          taxAmount: Number(inv.taxAmount),
          discount: Number(inv.discount),
          grandTotal: Number(inv.grandTotal),
          paidAmount: Number(inv.paidAmount),
          outstandingAmount: Number(inv.outstandingAmount),
          status: currentStatus,
          itemsCount: inv._count.items,
          paymentsCount: inv._count.customerPayments,
          notes: inv.notes || "",
        };
      }),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      metrics: {
        totalInvoiced,
        totalPaid,
        totalOutstanding,
        overdueCount,
        totalInvoicesCount: allInvoices.length,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching invoices:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching invoices" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/invoices
 * Creates an invoice with line items, recalculates totals server-side, and generates INV-YYYY-XXXX.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAdmin();
    const body = await request.json();
    const auditUser = await prisma.user.findUnique({
      where: { id: session.id },
      select: { id: true },
    });
    const auditUserId = auditUser?.id ?? null;

    const {
      customerId,
      programId,
      issueDate,
      dueDate,
      items,
      discount = 0,
      taxRate = 0,
      notes,
      terms,
    } = body;

    // Validate Customer
    if (!customerId || typeof customerId !== "string") {
      return NextResponse.json({ error: "Valid customer is required" }, { status: 400 });
    }
    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 });
    }

    // Validate Program if supplied
    let program = null;
    if (programId) {
      program = await prisma.program.findUnique({ where: { id: programId } });
      if (!program) {
        return NextResponse.json({ error: "Linked program event not found" }, { status: 404 });
      }
    }

    // Validate Dates
    if (!dueDate) {
      return NextResponse.json({ error: "Invoice payment due date is required" }, { status: 400 });
    }
    const parsedIssueDate = issueDate ? new Date(issueDate) : new Date();
    const parsedDueDate = new Date(dueDate);

    // Validate Items
    if (!Array.isArray(items) || items.length === 0) {
      return NextResponse.json({ error: "Invoice must contain at least one line item" }, { status: 400 });
    }

    // Fetch all referenced products to guarantee authentic pricing & prevent client tampering
    const productIds = items.map((it: { productId: string }) => it.productId);
    const existingProducts = await prisma.product.findMany({
      where: { id: { in: productIds } },
    });
    const productMap = new Map(existingProducts.map((p) => [p.id, p]));

    let calculatedSubtotal = 0;
    const validatedItems: Array<{
      productId: string;
      description: string;
      quantity: number;
      unitPrice: number;
      total: number;
    }> = [];

    for (const item of items) {
      if (!item.productId) {
        return NextResponse.json({ error: "Each invoice item must have a valid productId" }, { status: 400 });
      }

      const product = productMap.get(item.productId);
      if (!product) {
        return NextResponse.json({ error: `Product with ID ${item.productId} not found` }, { status: 404 });
      }

      const quantity = Number(item.quantity);
      if (isNaN(quantity) || quantity <= 0) {
        return NextResponse.json({ error: `Item ${product.name} must have quantity greater than 0` }, { status: 400 });
      }

      // Unit price: use provided rate or fallback to product's catalog selling price
      const unitPrice =
        item.unitPrice !== undefined && item.unitPrice !== null && !isNaN(Number(item.unitPrice))
          ? Number(item.unitPrice)
          : Number(product.sellingPrice);

      if (unitPrice < 0) {
        return NextResponse.json({ error: `Unit price for ${product.name} cannot be negative` }, { status: 400 });
      }

      const itemTotal = Math.round(quantity * unitPrice * 100) / 100;
      calculatedSubtotal += itemTotal;

      validatedItems.push({
        productId: product.id,
        description: item.description?.trim() || product.name,
        quantity,
        unitPrice,
        total: itemTotal,
      });
    }

    calculatedSubtotal = Math.round(calculatedSubtotal * 100) / 100;

    // Validate Discount and Tax
    const numDiscount = Math.max(0, Number(discount) || 0);
    if (numDiscount > calculatedSubtotal) {
      return NextResponse.json({ error: "Discount cannot exceed subtotal amount" }, { status: 400 });
    }

    const numTaxRate = Math.max(0, Number(taxRate) || 0);
    const taxableAmount = Math.max(0, calculatedSubtotal - numDiscount);
    const calculatedTaxAmount = Math.round(((taxableAmount * numTaxRate) / 100) * 100) / 100;
    const calculatedGrandTotal = Math.round((taxableAmount + calculatedTaxAmount) * 100) / 100;

    // Generate Invoice Number: INV-YYYY-XXXX
    const currentYear = new Date().getFullYear();
    const lastInvoice = await prisma.invoice.findFirst({
      where: { invoiceNumber: { startsWith: `INV-${currentYear}-` } },
      orderBy: { createdAt: "desc" },
      select: { invoiceNumber: true },
    });

    let nextSeq = 1;
    if (lastInvoice?.invoiceNumber) {
      const match = lastInvoice.invoiceNumber.match(/INV-\d+-(\d+)/i);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }
    const invoiceNumber = `INV-${currentYear}-${String(nextSeq).padStart(4, "0")}`;

    // Execute atomic creation
    const createdInvoice = await prisma.$transaction(async (tx) => {
      const inv = await tx.invoice.create({
        data: {
          invoiceNumber,
          customerId,
          programId: programId || null,
          issueDate: parsedIssueDate,
          dueDate: parsedDueDate,
          subtotal: calculatedSubtotal,
          discount: numDiscount,
          taxRate: numTaxRate,
          taxAmount: calculatedTaxAmount,
          grandTotal: calculatedGrandTotal,
          paidAmount: 0,
          outstandingAmount: calculatedGrandTotal,
          status: InvoicePaymentStatus.UNPAID,
          notes: notes?.trim() || null,
          terms: terms?.trim() || "Payment due upon receipt or per agreed banquet contract terms.",
          items: {
            create: validatedItems.map((it) => ({
              productId: it.productId,
              description: it.description,
              quantity: it.quantity,
              unitPrice: it.unitPrice,
              total: it.total,
            })),
          },
        },
        include: {
          customer: true,
          program: true,
          items: {
            include: { product: true },
          },
        },
      });

      // Log Activity
      await tx.activityLog.create({
        data: {
          userId: auditUserId,
          action: "INVOICE_CREATED",
          entityType: "INVOICE",
          entityId: inv.id,
          details: {
            message: `Created invoice ${inv.invoiceNumber} for ${customer.name} (Total: $${calculatedGrandTotal.toFixed(2)})`,
            invoiceNumber: inv.invoiceNumber,
            customerId,
            grandTotal: calculatedGrandTotal,
            itemCount: validatedItems.length,
          },
        },
      });

      // Create Notification for Admins
      await tx.notification.create({
        data: {
          userId: auditUserId,
          title: "New Invoice Issued",
          message: `Invoice ${inv.invoiceNumber} for ${customer.name} ($${calculatedGrandTotal.toFixed(2)}) has been created.`,
          type: "INFO",
          link: `/admin/invoices/${inv.id}`,
        },
      });

      return inv;
    });

    return NextResponse.json(
      {
        message: "Invoice created successfully",
        invoice: {
          id: createdInvoice.id,
          invoiceNumber: createdInvoice.invoiceNumber,
          customerName: createdInvoice.customer.name,
          grandTotal: Number(createdInvoice.grandTotal),
          outstandingAmount: Number(createdInvoice.outstandingAmount),
          status: createdInvoice.status,
          dueDate: createdInvoice.dueDate.toISOString().split("T")[0],
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating invoice" },
      { status: 500 }
    );
  }
}
