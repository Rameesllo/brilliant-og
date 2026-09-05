"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AlertCircle } from "lucide-react";

export interface AddProductModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CategoryOption {
  id: string;
  name: string;
  type: string;
}

export const AddProductModal: React.FC<AddProductModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [formData, setFormData] = useState({
    name: "",
    type: "CATERING_FOOD",
    categoryId: "",
    newCategoryName: "",
    unit: "plate",
    sellingPrice: "",
    costPrice: "",
    initialStock: "0",
    minStockAlert: "10",
    description: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetch("/api/product-categories")
        .then((res) => (res.ok ? res.json() : { categories: [] }))
        .then((data) => {
          setCategories(data.categories || []);
          if (data.categories?.length > 0) {
            setFormData((prev) => ({
              ...prev,
              categoryId: prev.categoryId || data.categories[0].id,
            }));
          }
        })
        .catch(() => {});
    }
  }, [isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!formData.name.trim()) {
      setError("Product name is required");
      return;
    }

    if (!formData.unit.trim()) {
      setError("Inventory unit of measurement is required");
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
          stockQuantity: parseInt(formData.initialStock || "0", 10),
          minStockAlert: parseInt(formData.minStockAlert || "10", 10),
          description: formData.description,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create product");
      }

      setFormData({
        name: "",
        type: "CATERING_FOOD",
        categoryId: "",
        newCategoryName: "",
        unit: "plate",
        sellingPrice: "",
        costPrice: "",
        initialStock: "0",
        minStockAlert: "10",
        description: "",
      });

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to save product");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Product / Inventory Asset"
      description="Register a new catering menu item, ingredient, or rental equipment asset."
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={handleSubmit}
            isLoading={isSubmitting}
          >
            Save Product
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="p-3 bg-[#FEF2F2] border border-[#FCA5A5] rounded-lg text-xs text-[#DC2626] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Product Name"
            isRequired
            placeholder="e.g. Stainless Roll-Top Chafing Dish (9L)"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          />
          <Select
            label="Product Type"
            isRequired
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { value: "CATERING_FOOD", label: "Catering Food / Ingredient" },
              { value: "RENTAL_EQUIPMENT", label: "Rental Equipment Asset" },
              { value: "SERVICE", label: "Service / Staffing Package" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              value={formData.categoryId}
              onChange={(e) => setFormData({ ...formData, categoryId: e.target.value })}
              className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
            >
              {categories.map((cat) => (
                <option key={cat.id} value={cat.id}>
                  {cat.name} ({cat.type})
                </option>
              ))}
              <option value="">+ New Category Name Below...</option>
            </select>
          </div>

          {!formData.categoryId ? (
            <Input
              label="New Category Name"
              placeholder="e.g. Dessert Station"
              value={formData.newCategoryName}
              onChange={(e) => setFormData({ ...formData, newCategoryName: e.target.value })}
            />
          ) : (
            <Input
              label="Inventory Unit"
              isRequired
              placeholder="e.g. plate, unit, kg, set"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            />
          )}
        </div>

        {formData.categoryId && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Input
              label="Selling / Rental Price ($)"
              isRequired
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
            />
            <Input
              label="Cost Price ($)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
            />
          </div>
        )}

        {!formData.categoryId && (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Input
              label="Inventory Unit"
              isRequired
              placeholder="e.g. plate, unit, kg"
              value={formData.unit}
              onChange={(e) => setFormData({ ...formData, unit: e.target.value })}
            />
            <Input
              label="Selling Price ($)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.sellingPrice}
              onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
            />
            <Input
              label="Cost Price ($)"
              type="number"
              step="0.01"
              min="0"
              placeholder="0.00"
              value={formData.costPrice}
              onChange={(e) => setFormData({ ...formData, costPrice: e.target.value })}
            />
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Initial Stock Quantity"
            isRequired
            type="number"
            min="0"
            value={formData.initialStock}
            onChange={(e) => setFormData({ ...formData, initialStock: e.target.value })}
          />
          <Input
            label="Low-Stock Alert Threshold"
            isRequired
            type="number"
            min="0"
            value={formData.minStockAlert}
            onChange={(e) => setFormData({ ...formData, minStockAlert: e.target.value })}
          />
        </div>

        <div>
          <label className="block text-xs font-semibold text-[#111827] uppercase tracking-wider mb-1.5">
            Product Description / Notes (Optional)
          </label>
          <textarea
            rows={2}
            value={formData.description}
            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            placeholder="e.g. High-grade stainless steel chafing dish with water pan and burner holder"
            className="w-full px-3 py-2 bg-white border border-[#E2E8F0] rounded-lg text-sm text-[#111827] placeholder-[#94A3B8] focus:outline-none focus:border-[#F97316] focus:ring-1 focus:ring-[#F97316]"
          />
        </div>
      </form>
    </Modal>
  );
};
