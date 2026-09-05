import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { ProductType } from "@prisma/client";

/**
 * GET /api/products/[id]
 * Retrieves single product details, category info, invoice usage, and audit logs.
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        category: true,
        _count: {
          select: { invoiceItems: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // Fetch recent activity logs for this product
    const logs = await prisma.activityLog.findMany({
      where: {
        entityType: "PRODUCT",
        entityId: id,
      },
      include: {
        user: { select: { name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return NextResponse.json({
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
        isLowStock: product.stockQuantity <= product.minStockAlert,
        isActive: product.isActive,
        description: product.description || "",
        invoicesCount: product._count.invoiceItems,
        createdAt: product.createdAt.toISOString(),
        updatedAt: product.updatedAt.toISOString(),
      },
      activityLogs: logs.map((log) => ({
        id: log.id,
        action: log.action,
        details: log.details,
        userName: log.user?.name || "System Admin",
        createdAt: log.createdAt.toISOString(),
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching product details:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred retrieving product" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/products/[id]
 * Updates product details and stock thresholds.
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const existingProduct = await prisma.product.findUnique({ where: { id } });
    if (!existingProduct) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const {
      name,
      categoryId,
      type,
      unit,
      sellingPrice,
      costPrice,
      stockQuantity,
      minStockAlert,
      description,
      isActive,
    } = body;

    const updateData: Record<string, unknown> = {};

    if (name !== undefined) {
      if (typeof name !== "string" || !name.trim()) {
        return NextResponse.json({ error: "Product name cannot be empty" }, { status: 400 });
      }
      updateData.name = name.trim();
    }

    if (categoryId !== undefined) {
      updateData.categoryId = categoryId;
    }

    if (type !== undefined) {
      if (!Object.values(ProductType).includes(type)) {
        return NextResponse.json({ error: "Invalid product type" }, { status: 400 });
      }
      updateData.type = type;
    }

    if (unit !== undefined) {
      if (typeof unit !== "string" || !unit.trim()) {
        return NextResponse.json({ error: "Unit cannot be empty" }, { status: 400 });
      }
      updateData.unit = unit.trim().toLowerCase();
    }

    if (sellingPrice !== undefined) {
      const sp = Number(sellingPrice);
      if (isNaN(sp) || sp < 0) {
        return NextResponse.json({ error: "Selling price must be 0 or greater" }, { status: 400 });
      }
      updateData.sellingPrice = sp;
    }

    if (costPrice !== undefined) {
      const cp = Number(costPrice);
      if (isNaN(cp) || cp < 0) {
        return NextResponse.json({ error: "Cost price must be 0 or greater" }, { status: 400 });
      }
      updateData.costPrice = cp;
    }

    if (stockQuantity !== undefined) {
      const sq = parseInt(stockQuantity, 10);
      if (isNaN(sq) || sq < 0) {
        return NextResponse.json({ error: "Stock quantity must be 0 or greater" }, { status: 400 });
      }
      updateData.stockQuantity = sq;
    }

    if (minStockAlert !== undefined) {
      const msa = parseInt(minStockAlert, 10);
      if (isNaN(msa) || msa < 0) {
        return NextResponse.json({ error: "Min stock alert must be 0 or greater" }, { status: 400 });
      }
      updateData.minStockAlert = msa;
    }

    if (description !== undefined) {
      updateData.description = typeof description === "string" ? description.trim() : null;
    }

    if (isActive !== undefined) {
      updateData.isActive = Boolean(isActive);
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: updateData,
      include: { category: true },
    });

    // Audit log
    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: "PRODUCT_UPDATED",
        entityType: "PRODUCT",
        entityId: updatedProduct.id,
        details: {
          message: `Updated details for ${updatedProduct.name} (${updatedProduct.code})`,
          ...updateData,
        },
      },
    });

    return NextResponse.json({
      message: "Product updated successfully",
      product: {
        id: updatedProduct.id,
        code: updatedProduct.code,
        name: updatedProduct.name,
        categoryId: updatedProduct.categoryId,
        categoryName: updatedProduct.category.name,
        type: updatedProduct.type,
        unit: updatedProduct.unit,
        sellingPrice: Number(updatedProduct.sellingPrice),
        costPrice: Number(updatedProduct.costPrice),
        stockQuantity: updatedProduct.stockQuantity,
        minStockAlert: updatedProduct.minStockAlert,
        isActive: updatedProduct.isActive,
        description: updatedProduct.description,
      },
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error updating product:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while updating product" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/products/[id]
 * Deletes or deactivates product.
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        _count: {
          select: { invoiceItems: true },
        },
      },
    });

    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    // If product is attached to invoices, soft-deactivate instead of hard-delete to preserve ledger integrity
    if (product._count.invoiceItems > 0) {
      await prisma.product.update({
        where: { id },
        data: { isActive: false },
      });

      await prisma.activityLog.create({
        data: {
          userId: session.id,
          action: "PRODUCT_DEACTIVATED",
          entityType: "PRODUCT",
          entityId: product.id,
          details: {
            message: `Deactivated product ${product.name} (${product.code}) as it is referenced in past invoices`,
          },
        },
      });

      return NextResponse.json({
        message: "Product has past invoice history and was deactivated instead of deleted",
        deactivated: true,
      });
    }

    await prisma.product.delete({ where: { id } });

    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: "PRODUCT_DELETED",
        entityType: "PRODUCT",
        entityId: product.id,
        details: {
          message: `Deleted product ${product.name} (${product.code})`,
        },
      },
    });

    return NextResponse.json({
      message: "Product deleted successfully",
      deleted: true,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while deleting product" },
      { status: 500 }
    );
  }
}
