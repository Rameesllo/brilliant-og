"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, PackageCheck, AlertCircle, Loader2 } from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
  type: string;
}

export default function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const productId = unwrappedParams.id;
  const router = useRouter();

  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [productCode, setProductCode] = useState("");
  const [formData, setFormData] = useState({
    name: "",
    type: "CATERING_FOOD",
    categoryId: "",
    unit: "plate",
    sellingPrice: "",
    costPrice: "",
    stockQuantity: "0",
    minStockAlert: "10",
    description: "",
    isActive: true,
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    Promise.all([
      fetch(`/api/products/${productId}`).then((res) => {
        if (!res.ok) throw new Error("Failed to load product details");
        return res.json();
      }),
      fetch("/api/product-categories").then((res) => {
        return res.ok ? res.json() : { categories: [] };
      }),
    ])
      .then(([prodData, catData]) => {
        if (catData.categories) {
          setCategories(catData.categories);
        }
        if (prodData.product) {
          const p = prodData.product;
          setProductCode(p.code);
          setFormData({
            name: p.name || "",
            type: p.type || "CATERING_FOOD",
            categoryId: p.categoryId || "",
            unit: p.unit || "unit",
            sellingPrice: p.sellingPrice?.toString() || "0",
            costPrice: p.costPrice?.toString() || "0",
            stockQuantity: p.stockQuantity?.toString() || "0",
            minStockAlert: p.minStockAlert?.toString() || "10",
            description: p.description || "",
            isActive: Boolean(p.isActive),
          });
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "Failed to load product data");
        setIsLoading(false);
      });
  }, [productId]);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
  ) => {
    const { name, value, type } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? (e.target as HTMLInputElement).checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Product name is required");
      return;
    }

    if (!formData.unit.trim()) {
      setError("Inventory measurement unit is required");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          categoryId: formData.categoryId,
          unit: formData.unit,
          sellingPrice: Number(formData.sellingPrice || 0),
          costPrice: Number(formData.costPrice || 0),
          stockQuantity: parseInt(formData.stockQuantity || "0", 10),
          minStockAlert: parseInt(formData.minStockAlert || "10", 10),
          description: formData.description,
          isActive: formData.isActive,
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to update product");

      router.push(`/admin/products/${productId}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout
        title="Edit Product"
        breadcrumbs={[
          { label: "Admin Console" },
          { label: "Products", href: "/admin/products" },
          { label: "Edit" },
        ]}
      >
        <div className="py-24 flex flex-col items-center justify-center text-[#64748B] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
          <span className="text-sm font-medium">Loading catalog asset specifications...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`Edit Product — ${formData.name || productCode}`}
      breadcrumbs={[
        { label: "Admin Console" },
        { label: "Products", href: "/admin/products" },
        { label: formData.name || productCode, href: `/admin/products/${productId}` },
        { label: "Edit" },
      ]}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href={`/admin/products/${productId}`}>
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Product Details
            </Button>
          </Link>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-center gap-3 text-sm text-[#991B1B]">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center text-[#F97316]">
                    <PackageCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <CardTitle>Update Catalog Asset</CardTitle>
                    <CardDescription>
                      Edit specifications, pricing, inventory alert thresholds, and availability
                    </CardDescription>
                  </div>
                </div>
                <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                  {productCode}
                </span>
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                    Product / Dish Name <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                    Asset Type <span className="text-[#DC2626]">*</span>
                  </label>
                  <select
                    name="type"
                    value={formData.type}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  >
                    <option value="CATERING_FOOD">Catering Food / Ingredient</option>
                    <option value="RENTAL_EQUIPMENT">Rental Equipment Asset</option>
                    <option value="SERVICE">Service / Staffing Package</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                    Category
                  </label>
                  <select
                    name="categoryId"
                    value={formData.categoryId}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  >
                    {categories.map((cat) => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} ({cat.type})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                    Inventory Unit <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="text"
                    name="unit"
                    value={formData.unit}
                    onChange={handleChange}
                    required
                    placeholder="e.g. plate, unit, kg"
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                    Selling / Rental Price ($) <span className="text-[#DC2626]">*</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="sellingPrice"
                    value={formData.sellingPrice}
                    onChange={handleChange}
                    required
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                    Cost Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    name="costPrice"
                    value={formData.costPrice}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                    Current Stock Quantity
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="stockQuantity"
                    value={formData.stockQuantity}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                    Low-Stock Alert Threshold
                  </label>
                  <input
                    type="number"
                    min="0"
                    name="minStockAlert"
                    value={formData.minStockAlert}
                    onChange={handleChange}
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                  Catalog Status
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="isActive"
                    name="isActive"
                    checked={formData.isActive}
                    onChange={handleChange}
                    className="w-4 h-4 text-[#F97316] rounded border-[#CBD5E1] focus:ring-[#F97316]"
                  />
                  <label htmlFor="isActive" className="text-sm font-medium text-[#111827]">
                    Active item (available for event bookings and invoices)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                  Description / Preparation Specifications
                </label>
                <textarea
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="e.g. Premium chafing dish with gold accents, requires 2 canned heat units per 4-hour banquet"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] placeholder-[#94A3B8] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                />
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-[#E2E8F0] pt-4">
              <Link href={`/admin/products/${productId}`}>
                <Button variant="ghost" size="sm" type="button">
                  Cancel
                </Button>
              </Link>
              <Button
                variant="primary"
                size="sm"
                type="submit"
                disabled={isSubmitting}
                leftIcon={isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : undefined}
              >
                {isSubmitting ? "Updating..." : "Save Changes"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </AdminLayout>
  );
}
