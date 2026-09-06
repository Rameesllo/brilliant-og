import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { ProductType } from "@prisma/client";

/**
 * GET /api/products
 * Returns paginated, searchable products catalog with live inventory metrics.
 */
export async function GET(request: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(request.url);
    const search = searchParams.get("search")?.trim() || "";
    const type = searchParams.get("type") || "ALL";
    const categoryId = searchParams.get("categoryId") || "ALL";
    const lowStockOnly = searchParams.get("lowStock") === "true";
    const statusFilter = searchParams.get("status") || "ALL";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (statusFilter === "ACTIVE") {
      where.isActive = true;
    } else if (statusFilter === "INACTIVE") {
      where.isActive = false;
    }

    if (type !== "ALL" && Object.values(ProductType).includes(type as ProductType)) {
      where.type = type as ProductType;
    }

    if (categoryId !== "ALL") {
      where.categoryId = categoryId;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: "insensitive" } },
        { code: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
        { category: { name: { contains: search, mode: "insensitive" } } },
      ];
    }

    // Fetch all matching products or paginated
    // For lowStockOnly, Prisma doesn't support direct field-to-field comparison in `where`,
    // so if lowStockOnly is requested, we can filter in memory or query candidates.
    let products = await prisma.product.findMany({
      where,
      include: {
        category: {
          select: { id: true, name: true, type: true },
        },
        _count: {
          select: { invoiceItems: true },
        },
      },
      orderBy: [{ isActive: "desc" }, { name: "asc" }],
    });

    if (lowStockOnly) {
      products = products.filter((p) => p.stockQuantity <= p.minStockAlert);
    }

    const total = products.length;
    const paginatedProducts = products.slice(skip, skip + limit);

    // Compute inventory valuation and health metrics across all products
    const allProducts = await prisma.product.findMany({
      where: { isActive: true },
      select: {
        stockQuantity: true,
        minStockAlert: true,
        sellingPrice: true,
        costPrice: true,
      },
    });

    let totalStockUnits = 0;
    let lowStockCount = 0;
    let inventoryValuation = 0;

    for (const p of allProducts) {
      totalStockUnits += p.stockQuantity;
      if (p.stockQuantity <= p.minStockAlert) {
        lowStockCount++;
      }
      const unitPrice = Number(p.costPrice) > 0 ? Number(p.costPrice) : Number(p.sellingPrice);
      inventoryValuation += p.stockQuantity * unitPrice;
    }

    return NextResponse.json({
      products: paginatedProducts.map((p) => ({
        id: p.id,
        code: p.code,
        name: p.name,
        categoryId: p.categoryId,
        categoryName: p.category.name,
        type: p.type,
        unit: p.unit,
        sellingPrice: Number(p.sellingPrice),
        costPrice: Number(p.costPrice),
        stockQuantity: p.stockQuantity,
        minStockAlert: p.minStockAlert,
        isLowStock: p.stockQuantity <= p.minStockAlert,
        isActive: p.isActive,
        description: p.description || "",
        invoicesCount: p._count.invoiceItems,
        createdAt: p.createdAt.toISOString(),
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      metrics: {
        totalProducts: allProducts.length,
        totalStockUnits,
        lowStockCount,
        inventoryValuation,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching products:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching products" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/products
 * Creates a new catalog product or inventory asset.
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
      name,
      type = "CATERING_FOOD",
      categoryId,
      categoryName,
      unit = "unit",
      sellingPrice = 0,
      costPrice = 0,
      stockQuantity = 0,
      minStockAlert = 10,
      description,
      isActive = true,
    } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Product name is required" }, { status: 400 });
    }

    if (!unit || typeof unit !== "string" || !unit.trim()) {
      return NextResponse.json({ error: "Unit of measure is required (e.g. plate, unit, kg)" }, { status: 400 });
    }

    const validTypes = Object.values(ProductType);
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid product type" }, { status: 400 });
    }

    const numSellingPrice = Number(sellingPrice);
    if (isNaN(numSellingPrice) || numSellingPrice < 0) {
      return NextResponse.json({ error: "Selling price must be 0 or greater" }, { status: 400 });
    }

    const numCostPrice = Number(costPrice);
    if (isNaN(numCostPrice) || numCostPrice < 0) {
      return NextResponse.json({ error: "Cost price must be 0 or greater" }, { status: 400 });
    }

    const numStockQuantity = Math.max(0, parseInt(stockQuantity || "0", 10));
    const numMinAlert = Math.max(0, parseInt(minStockAlert || "10", 10));

    // Resolve Category ID
    let resolvedCategoryId = categoryId;
    if (!resolvedCategoryId && categoryName) {
      let cat = await prisma.productCategory.findFirst({
        where: { name: { equals: categoryName.trim(), mode: "insensitive" } },
      });
      if (!cat) {
        cat = await prisma.productCategory.create({
          data: {
            name: categoryName.trim(),
            type: type as ProductType,
            isActive: true,
          },
        });
      }
      resolvedCategoryId = cat.id;
    }

    if (!resolvedCategoryId) {
      // Fallback to default or first category of type
      let defaultCat = await prisma.productCategory.findFirst({
        where: { type: type as ProductType },
      });
      if (!defaultCat) {
        defaultCat = await prisma.productCategory.create({
          data: {
            name: type === "RENTAL_EQUIPMENT" ? "Equipment & Furniture" : "General Catering",
            type: type as ProductType,
            isActive: true,
          },
        });
      }
      resolvedCategoryId = defaultCat.id;
    }

    // Auto-generate code e.g. PRD-CAT-001 or PRD-RNT-001
    const prefixType =
      type === "RENTAL_EQUIPMENT" ? "RNT" : type === "SERVICE" ? "SRV" : "CAT";

    const lastProduct = await prisma.product.findFirst({
      where: { code: { startsWith: `PRD-${prefixType}-` } },
      orderBy: { createdAt: "desc" },
      select: { code: true },
    });

    let nextSeq = 1;
    if (lastProduct?.code) {
      const match = lastProduct.code.match(/PRD-[A-Z]+-(\d+)/i);
      if (match) {
        nextSeq = parseInt(match[1], 10) + 1;
      }
    }
    const code = `PRD-${prefixType}-${String(nextSeq).padStart(3, "0")}`;

    const product = await prisma.product.create({
      data: {
        code,
        name: name.trim(),
        categoryId: resolvedCategoryId,
        type: type as ProductType,
        unit: unit.trim().toLowerCase(),
        sellingPrice: numSellingPrice,
        costPrice: numCostPrice,
        stockQuantity: numStockQuantity,
        minStockAlert: numMinAlert,
        description: description?.trim() || null,
        isActive: Boolean(isActive),
      },
      include: {
        category: true,
      },
    });

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: auditUserId,
        action: "PRODUCT_CREATED",
        entityType: "PRODUCT",
        entityId: product.id,
        details: {
          message: `Created product ${product.name} (${product.code}) with initial stock of ${numStockQuantity} ${product.unit}`,
          code: product.code,
          name: product.name,
          stockQuantity: numStockQuantity,
          sellingPrice: numSellingPrice,
        },
      },
    });

    return NextResponse.json(
      {
        message: "Product created successfully",
        product: {
          id: product.id,
          code: product.code,
          name: product.name,
          categoryId: product.categoryId,
          categoryName: product.category.name,
          type: product.type,
          unit: product.unit,
          sellingPrice: Number(product.sellingPrice),
          costPrice: Number(product.costPrice),
          stockQuantity: product.stockQuantity,
          minStockAlert: product.minStockAlert,
          isActive: product.isActive,
          description: product.description || "",
        },
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error creating product:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating product" },
      { status: 500 }
    );
  }
}
