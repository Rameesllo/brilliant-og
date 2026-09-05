"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, PlusCircle, AlertCircle, Loader2 } from "lucide-react";

interface CategoryOption {
  id: string;
  name: string;
  type: string;
}

export default function AddProductPage() {
  const router = useRouter();
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    type: "CATERING_FOOD",
    categoryId: "",
    newCategoryName: "",
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
    fetch("/api/product-categories")
      .then((res) => (res.ok ? res.json() : { categories: [] }))
      .then((data) => {
        setCategories(data.categories || []);
        if (data.categories?.length > 0) {
          setFormData((prev) => ({
            ...prev,
            categoryId: data.categories[0].id,
          }));
        }
        setIsLoading(false);
      })
      .catch(() => {
        setIsLoading(false);
      });
  }, []);

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
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: formData.type,
          categoryId: formData.categoryId || undefined,
          categoryName: formData.newCategoryName.trim() || undefined,
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
      if (!res.ok) throw new Error(data.error || "Failed to create product");

      router.push(`/admin/products/${data.product.id}`);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "An unexpected error occurred");
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout
        title="Add Product"
        breadcrumbs={[
          { label: "Admin Console" },
          { label: "Products", href: "/admin/products" },
          { label: "Add" },
        ]}
      >
        <div className="py-24 flex flex-col items-center justify-center text-[#64748B] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
          <span className="text-sm font-medium">Loading catalog categories...</span>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Add Catalog Product / Inventory Item"
      breadcrumbs={[
        { label: "Admin Console" },
        { label: "Products", href: "/admin/products" },
        { label: "Add Item" },
      ]}
    >
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex items-center gap-3">
          <Link href="/admin/products">
            <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Back to Catalog
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
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center text-[#F97316]">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <div>
                  <CardTitle>Catalog Asset Registration</CardTitle>
                  <CardDescription>
                    Define specifications, unit pricing, initial stock levels, and reorder alerts
                  </CardDescription>
                </div>
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
                    placeholder="e.g. Herb-Crusted Prime Rib Roast"
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
                    <option value="CATERING_FOOD">Catering Food / Recipe</option>
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
                    <option value="">+ New Category Below...</option>
                  </select>
                </div>

                {!formData.categoryId ? (
                  <div>
                    <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                      New Category Name
                    </label>
                    <input
                      type="text"
                      name="newCategoryName"
                      value={formData.newCategoryName}
                      onChange={handleChange}
                      placeholder="e.g. Seafood & Raw Bar"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                    />
                  </div>
                ) : (
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
                      placeholder="e.g. plate, unit, portion, kg"
                      className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                    />
                  </div>
                )}

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
                    placeholder="0.00"
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
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                    Initial Stock Count
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
                    Active Item (Available for events and invoicing)
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-2">
                  Description & Catering Specifications
                </label>
                <textarea
                  rows={3}
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder="e.g. Ingredients, allergen warnings, or equipment handling requirements"
                  className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] placeholder-[#94A3B8] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
                />
              </div>
            </CardContent>

            <CardFooter className="flex items-center justify-between border-t border-[#E2E8F0] pt-4">
              <Link href="/admin/products">
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
                {isSubmitting ? "Creating..." : "Save Product"}
              </Button>
            </CardFooter>
          </Card>
        </form>
      </div>
    </AdminLayout>
  );
}
