import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";

/**
 * POST /api/products/[id]/stock
 * Adjusts inventory stock levels (ADD, DEDUCT, SET) with full audit logging.
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await request.json();

    const product = await prisma.product.findUnique({ where: { id } });
    if (!product) {
      return NextResponse.json({ error: "Product not found" }, { status: 404 });
    }

    const { adjustmentType, quantity, reason } = body;

    const numQty = parseInt(quantity, 10);
    if (isNaN(numQty) || numQty < 0) {
      return NextResponse.json({ error: "Valid non-negative quantity is required" }, { status: 400 });
    }

    const previousStock = product.stockQuantity;
    let newStock = previousStock;

    switch (adjustmentType) {
      case "ADD":
        newStock = previousStock + numQty;
        break;
      case "DEDUCT":
        if (numQty > previousStock) {
          return NextResponse.json(
            { error: `Cannot deduct ${numQty} units. Only ${previousStock} units currently available.` },
            { status: 400 }
          );
        }
        newStock = previousStock - numQty;
        break;
      case "SET":
        newStock = numQty;
        break;
      default:
        return NextResponse.json(
          { error: "Invalid adjustment type. Must be 'ADD', 'DEDUCT', or 'SET'." },
          { status: 400 }
        );
    }

    const updatedProduct = await prisma.product.update({
      where: { id },
      data: { stockQuantity: newStock },
    });

    const note = reason && typeof reason === "string" && reason.trim()
      ? reason.trim()
      : "Manual stock adjustment";

    // Record audit log
    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: "STOCK_ADJUSTED",
        entityType: "PRODUCT",
        entityId: product.id,
        details: {
          message: `Adjusted stock for ${product.name} (${product.code}): ${previousStock} → ${newStock} (${adjustmentType} ${numQty} ${product.unit}). Reason: ${note}`,
          previousStock,
          newStock,
          adjustmentType,
          quantity: numQty,
          reason: note,
        },
      },
    });

    return NextResponse.json({
      message: "Stock adjusted successfully",
      previousStock,
      newStock: updatedProduct.stockQuantity,
      unit: product.unit,
      isLowStock: updatedProduct.stockQuantity <= updatedProduct.minStockAlert,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error adjusting stock:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while adjusting stock" },
      { status: 500 }
    );
  }
}
