"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { ArrowLeft, PlusCircle, AlertCircle, Loader2 } from "lucide-react";

export default function AddProductPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    name: "",
    sellingPrice: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

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

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          type: "CATERING_FOOD",
          unit: "plate",
          sellingPrice: Number(formData.sellingPrice || 0),
          costPrice: 0,
          stockQuantity: 0,
          minStockAlert: 10,
          isActive: true,
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
                    Add a product name and selling price to the catalog.
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
