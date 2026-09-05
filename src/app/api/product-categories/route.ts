import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAdmin, AuthError } from "@/lib/auth";
import { ProductType } from "@prisma/client";

/**
 * GET /api/product-categories
 * Returns product categories with product counts.
 */
export async function GET() {
  try {
    await requireAdmin();

    const categories = await prisma.productCategory.findMany({
      include: {
        _count: {
          select: { products: true },
        },
      },
      orderBy: { name: "asc" },
    });

    return NextResponse.json({
      categories: categories.map((cat) => ({
        id: cat.id,
        name: cat.name,
        description: cat.description || "",
        type: cat.type,
        isActive: cat.isActive,
        productsCount: cat._count.products,
      })),
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching product categories:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred retrieving categories" },
      { status: 500 }
    );
  }
}

/**
 * POST /api/product-categories
 * Creates a new product category.
 */
export async function POST(request: NextRequest) {
  try {
    await requireAdmin();
    const body = await request.json();

    const { name, description, type = "CATERING_FOOD" } = body;

    if (!name || typeof name !== "string" || !name.trim()) {
      return NextResponse.json({ error: "Category name is required" }, { status: 400 });
    }

    const validTypes = Object.values(ProductType);
    if (!validTypes.includes(type)) {
      return NextResponse.json({ error: "Invalid product category type" }, { status: 400 });
    }

    const existing = await prisma.productCategory.findUnique({
      where: { name: name.trim() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "A category with this name already exists" },
        { status: 409 }
      );
    }

    const category = await prisma.productCategory.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        type: type as ProductType,
        isActive: true,
      },
    });

    return NextResponse.json(
      {
        message: "Category created successfully",
        category,
      },
      { status: 201 }
    );
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error creating product category:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while creating category" },
      { status: 500 }
    );
  }
}
