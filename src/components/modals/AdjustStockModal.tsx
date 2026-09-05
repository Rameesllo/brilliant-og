"use client";

import React, { useState } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AlertCircle, Boxes } from "lucide-react";

export interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  product: {
    id: string;
    name: string;
    code: string;
    stockQuantity: number;
    unit: string;
  } | null;
  onSuccess?: () => void;
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  isOpen,
  onClose,
  product,
  onSuccess,
}) => {
  const [adjustmentType, setAdjustmentType] = useState<"ADD" | "DEDUCT" | "SET">("ADD");
  const [quantity, setQuantity] = useState("5");
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!product) return null;

  const currentStock = product.stockQuantity;
  const numQty = parseInt(quantity || "0", 10);
  let projectedStock = currentStock;
  if (adjustmentType === "ADD") projectedStock = currentStock + numQty;
  else if (adjustmentType === "DEDUCT") projectedStock = Math.max(0, currentStock - numQty);
  else if (adjustmentType === "SET") projectedStock = Math.max(0, numQty);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (isNaN(numQty) || numQty < 0) {
      setError("Please enter a valid non-negative quantity");
      return;
    }

    if (adjustmentType === "DEDUCT" && numQty > currentStock) {
      setError(`Cannot deduct ${numQty} units. Only ${currentStock} units currently in stock.`);
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/products/${product.id}/stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adjustmentType,
          quantity: numQty,
          reason: reason.trim() || `Manual stock ${adjustmentType.toLowerCase()}`,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to adjust stock");
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to record stock adjustment");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Adjust Inventory Stock"
      description={`Reconcile physical stock or record restock for ${product.name} (${product.code})`}
      maxWidth="md"
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
            Confirm Adjustment
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

        <div className="p-4 bg-[#F8FAFC] border border-[#E2E8F0] rounded-xl flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#FFF7ED] text-[#F97316] flex items-center justify-center">
              <Boxes className="w-5 h-5" />
            </div>
            <div>
              <div className="text-xs text-[#64748B]">Current Available</div>
              <div className="text-lg font-bold text-[#111827]">
                {currentStock} {product.unit}
              </div>
            </div>
          </div>

          <div className="text-right">
            <div className="text-xs text-[#64748B]">Projected Stock</div>
            <div className="text-lg font-bold text-[#F97316]">
              {projectedStock} {product.unit}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Adjustment Action"
            isRequired
            value={adjustmentType}
            onChange={(e) => setAdjustmentType(e.target.value as "ADD" | "DEDUCT" | "SET")}
            options={[
              { value: "ADD", label: "+ Add Stock (Restock/Arrival)" },
              { value: "DEDUCT", label: "- Deduct Stock (Used/Damaged)" },
              { value: "SET", label: "= Set Stock (Audit Count)" },
            ]}
          />
          <Input
            label={`Quantity (${product.unit})`}
            isRequired
            type="number"
            min="0"
            value={quantity}
            onChange={(e) => setQuantity(e.target.value)}
          />
        </div>

        <Input
          label="Reason / Reference Memo"
          isRequired
          placeholder="e.g. Warehouse receipt #892, Damaged during wedding, Physical inventory audit"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
        />
      </form>
    </Modal>
  );
};
