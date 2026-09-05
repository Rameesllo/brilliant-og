"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { formatCurrency } from "@/lib/utils";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Search,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";

interface Customer {
  id: string;
  code: string;
  name: string;
  companyName?: string;
  phone: string;
}
interface Program {
  id: string;
  code: string;
  title: string;
  eventDate: string;
}
interface Product {
  id: string;
  code: string;
  name: string;
  unit: string;
  sellingPrice: number;
  category?: string;
}
interface LineItem {
  productId: string;
  productName: string;
  productCode: string;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
  unit: string;
}

export default function CreateInvoicePage() {
  const router = useRouter();

  // Form fields
  const [customerId, setCustomerId] = useState("");
  const [programId, setProgramId] = useState("");
  const [issueDate, setIssueDate] = useState(new Date().toISOString().split("T")[0]);
  const [dueDate, setDueDate] = useState("");
  const [discount, setDiscount] = useState("0");
  const [taxRate, setTaxRate] = useState("0");
  const [notes, setNotes] = useState("");
  const [terms, setTerms] = useState("Payment due upon receipt or per agreed banquet contract terms.");
  const [lineItems, setLineItems] = useState<LineItem[]>([]);
  const [productSearch, setProductSearch] = useState("");

  // Dropdown data
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [programs, setPrograms] = useState<Program[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // UI state
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [productPickerOpen, setProductPickerOpen] = useState(false);
  const [toast, setToast] = useState<{ type: "success" | "error"; msg: string } | null>(null);

  const showToast = (type: "success" | "error", msg: string) => {
    setToast({ type, msg });
    setTimeout(() => setToast(null), 5000);
  };

  // Load reference data
  const fetchData = useCallback(async () => {
    try {
      const [custRes, progRes, prodRes] = await Promise.all([
        fetch("/api/customers?limit=200"),
        fetch("/api/programs?limit=200&status=CONFIRMED"),
        fetch("/api/products?limit=500&isActive=true"),
      ]);
      const [custData, progData, prodData] = await Promise.all([
        custRes.json(),
        progRes.json(),
        prodRes.json(),
      ]);
      setCustomers(custData.customers || []);
      setPrograms(progData.programs || []);
      setProducts(prodData.products || []);
      setFilteredProducts(prodData.products || []);
    } catch {
      console.warn("Failed to load reference data");
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  useEffect(() => {
    if (!productSearch.trim()) {
      setFilteredProducts(products);
    } else {
      const q = productSearch.toLowerCase();
      setFilteredProducts(
        products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q) ||
            (p.category?.toLowerCase().includes(q))
        )
      );
    }
  }, [productSearch, products]);

  const addProduct = (product: Product) => {
    const existing = lineItems.findIndex((i) => i.productId === product.id);
    if (existing !== -1) {
      // increment qty
      const updated = [...lineItems];
      updated[existing].quantity += 1;
      updated[existing].total = Math.round(updated[existing].quantity * updated[existing].unitPrice * 100) / 100;
      setLineItems(updated);
    } else {
      setLineItems([
        ...lineItems,
        {
          productId: product.id,
          productName: product.name,
          productCode: product.code,
          description: product.name,
          quantity: 1,
          unitPrice: product.sellingPrice,
          total: product.sellingPrice,
          unit: product.unit,
        },
      ]);
    }
    setProductPickerOpen(false);
    setProductSearch("");
  };

  const updateLineItem = (index: number, field: keyof LineItem, value: string | number) => {
    const updated = [...lineItems];
    const item = { ...updated[index], [field]: value };

    if (field === "quantity" || field === "unitPrice") {
      item.total = Math.round(Number(item.quantity) * Number(item.unitPrice) * 100) / 100;
    }
    updated[index] = item;
    setLineItems(updated);
  };

  const removeLineItem = (index: number) => {
    setLineItems(lineItems.filter((_, i) => i !== index));
  };

  // Computed totals
  const subtotal = lineItems.reduce((sum, item) => sum + item.total, 0);
  const numDiscount = Math.max(0, Number(discount) || 0);
  const numTaxRate = Math.max(0, Number(taxRate) || 0);
  const taxableAmount = Math.max(0, subtotal - numDiscount);
  const taxAmount = Math.round(((taxableAmount * numTaxRate) / 100) * 100) / 100;
  const grandTotal = Math.round((taxableAmount + taxAmount) * 100) / 100;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (!customerId) {
      setError("Please select a customer");
      return;
    }
    if (!dueDate) {
      setError("Payment due date is required");
      return;
    }
    if (lineItems.length === 0) {
      setError("Add at least one line item");
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          customerId,
          programId: programId || undefined,
          issueDate,
          dueDate,
          discount: numDiscount,
          taxRate: numTaxRate,
          notes: notes || undefined,
          terms: terms || undefined,
          items: lineItems.map((it) => ({
            productId: it.productId,
            description: it.description,
            quantity: it.quantity,
            unitPrice: it.unitPrice,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.error || "Failed to create invoice");
        return;
      }

      showToast("success", `Invoice ${data.invoice.invoiceNumber} created successfully!`);
      setTimeout(() => {
        router.push(`/admin/invoices/${data.invoice.id}`);
      }, 1000);
    } catch {
      setError("An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerOptions = [
    { value: "", label: "Select customer..." },
    ...customers.map((c) => ({
      value: c.id,
      label: `${c.name}${c.companyName ? ` — ${c.companyName}` : ""} (${c.code})`,
    })),
  ];

  const programOptions = [
    { value: "", label: "No linked event (standalone order)" },
    ...programs.map((p) => ({
      value: p.id,
      label: `${p.title} (${p.code})`,
    })),
  ];

  return (
    <AdminLayout
      title="Create Invoice"
      breadcrumbs={[
        { label: "Admin Console" },
        { label: "Invoices", href: "/admin/invoices" },
        { label: "Create Invoice" },
      ]}
    >
      {/* Toast */}
      {toast && (
        <div className={`mb-4 flex items-center gap-2 p-3.5 rounded-xl text-xs font-medium animate-in fade-in ${
          toast.type === "success"
            ? "bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D]"
            : "bg-[#FEF2F2] border border-[#FECACA] text-[#DC2626]"
        }`}>
          {toast.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
          {toast.msg}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Header actions */}
        <div className="flex items-center justify-between">
          <Link href="/admin/invoices">
            <Button type="button" variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="sm"
            isLoading={isSubmitting}
            disabled={lineItems.length === 0 || !customerId || !dueDate}
          >
            Generate Invoice
          </Button>
        </div>

        {error && (
          <div className="flex items-center gap-2 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg text-xs text-[#DC2626]">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main form */}
          <div className="lg:col-span-2 space-y-5">
            {/* Customer & Program */}
            <Card>
              <CardHeader>
                <CardTitle>Invoice Details</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <Select
                  label="Customer"
                  isRequired
                  value={customerId}
                  onChange={(e) => setCustomerId(e.target.value)}
                  options={customerOptions}
                />
                <Select
                  label="Linked Event / Program"
                  value={programId}
                  onChange={(e) => setProgramId(e.target.value)}
                  options={programOptions}
                />
                <div className="grid grid-cols-2 gap-4">
                  <Input
                    label="Issue Date"
                    type="date"
                    value={issueDate}
                    onChange={(e) => setIssueDate(e.target.value)}
                  />
                  <Input
                    label="Payment Due Date"
                    type="date"
                    isRequired
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Line Items */}
            <Card>
              <CardHeader>
                <CardTitle>Line Items</CardTitle>
                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  leftIcon={<Plus className="w-4 h-4 text-[#64748B]" />}
                  onClick={() => setProductPickerOpen(true)}
                >
                  Add Item
                </Button>
              </CardHeader>
              <CardContent className="p-0">
                {lineItems.length === 0 ? (
                  <div className="text-center py-12">
                    <p className="text-sm text-[#94A3B8]">No items added yet</p>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() => setProductPickerOpen(true)}
                    >
                      + Add first item
                    </Button>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead className="bg-[#F8FAFC] border-b border-[#E5E7EB]">
                        <tr>
                          <th className="text-left p-3 font-semibold text-[#64748B]">Description</th>
                          <th className="text-center p-3 font-semibold text-[#64748B] w-24">Qty</th>
                          <th className="text-right p-3 font-semibold text-[#64748B] w-32">Unit Price</th>
                          <th className="text-right p-3 font-semibold text-[#64748B] w-28">Total</th>
                          <th className="w-8" />
                        </tr>
                      </thead>
                      <tbody>
                        {lineItems.map((item, idx) => (
                          <tr key={idx} className="border-b border-[#F1F5F9]">
                            <td className="p-2">
                              <input
                                className="w-full text-xs text-[#111827] bg-transparent border-0 outline-none focus:ring-1 focus:ring-[#6366F1] rounded px-1"
                                value={item.description}
                                onChange={(e) => updateLineItem(idx, "description", e.target.value)}
                              />
                              <div className="text-[11px] font-mono text-[#94A3B8] px-1">{item.productCode}</div>
                            </td>
                            <td className="p-2 text-center">
                              <input
                                type="number"
                                min="0.01"
                                step="0.01"
                                className="w-20 text-xs text-center text-[#111827] bg-[#F8FAFC] border border-[#E5E7EB] rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-[#6366F1]"
                                value={item.quantity}
                                onChange={(e) => updateLineItem(idx, "quantity", Number(e.target.value))}
                              />
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                min="0"
                                step="0.01"
                                className="w-28 text-xs text-right text-[#111827] bg-[#F8FAFC] border border-[#E5E7EB] rounded px-1.5 py-1 outline-none focus:ring-1 focus:ring-[#6366F1]"
                                value={item.unitPrice}
                                onChange={(e) => updateLineItem(idx, "unitPrice", Number(e.target.value))}
                              />
                            </td>
                            <td className="p-2 text-right font-semibold text-[#111827]">
                              {formatCurrency(item.total)}
                            </td>
                            <td className="p-2">
                              <button
                                type="button"
                                onClick={() => removeLineItem(idx)}
                                className="text-[#DC2626] hover:bg-[#FEF2F2] rounded p-0.5 transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Notes */}
            <Card>
              <CardHeader>
                <CardTitle>Notes & Terms</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                    Invoice Notes
                  </label>
                  <textarea
                    rows={2}
                    className="w-full text-xs text-[#111827] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent resize-none transition-all"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Any special notes for this invoice..."
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                    Terms & Conditions
                  </label>
                  <textarea
                    rows={2}
                    className="w-full text-xs text-[#111827] bg-white border border-[#E5E7EB] rounded-lg px-3 py-2 outline-none focus:ring-2 focus:ring-[#6366F1] focus:border-transparent resize-none transition-all"
                    value={terms}
                    onChange={(e) => setTerms(e.target.value)}
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right sidebar: totals */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Invoice Summary</CardTitle>
              </CardHeader>
              <CardContent className="p-5 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Discount ($)"
                    type="number"
                    min="0"
                    step="0.01"
                    value={discount}
                    onChange={(e) => setDiscount(e.target.value)}
                  />
                  <Input
                    label="Tax Rate (%)"
                    type="number"
                    min="0"
                    step="0.1"
                    value={taxRate}
                    onChange={(e) => setTaxRate(e.target.value)}
                  />
                </div>

                <div className="border-t border-[#F1F5F9] pt-3 space-y-2 text-xs">
                  <div className="flex justify-between text-[#64748B]">
                    <span>Subtotal</span>
                    <span className="font-medium text-[#111827]">{formatCurrency(subtotal)}</span>
                  </div>
                  {numDiscount > 0 && (
                    <div className="flex justify-between text-[#64748B]">
                      <span>Discount</span>
                      <span className="font-medium text-[#16A34A]">-{formatCurrency(numDiscount)}</span>
                    </div>
                  )}
                  {numTaxRate > 0 && (
                    <div className="flex justify-between text-[#64748B]">
                      <span>Tax ({numTaxRate}%)</span>
                      <span className="font-medium text-[#111827]">{formatCurrency(taxAmount)}</span>
                    </div>
                  )}
                  <div className="flex justify-between border-t-2 border-[#E5E7EB] pt-2 font-bold text-sm text-[#111827]">
                    <span>Grand Total</span>
                    <span>{formatCurrency(grandTotal)}</span>
                  </div>
                </div>

                <div className="pt-2">
                  <Button
                    type="submit"
                    variant="primary"
                    className="w-full"
                    isLoading={isSubmitting}
                    disabled={lineItems.length === 0 || !customerId || !dueDate}
                  >
                    Generate Invoice
                  </Button>
                  <p className="text-[11px] text-[#94A3B8] text-center mt-2">
                    {lineItems.length} item{lineItems.length !== 1 ? "s" : ""} · Total: {formatCurrency(grandTotal)}
                  </p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </form>

      {/* Product Picker Panel */}
      {productPickerOpen && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg max-h-[80vh] flex flex-col">
            <div className="p-4 border-b border-[#E5E7EB]">
              <h3 className="font-semibold text-[#111827] text-sm">Add Product / Service</h3>
              <div className="mt-3 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#94A3B8]" />
                <input
                  autoFocus
                  className="w-full text-sm pl-9 pr-3 py-2 border border-[#E5E7EB] rounded-lg outline-none focus:ring-2 focus:ring-[#6366F1]"
                  placeholder="Search products..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-y-auto flex-1 p-2">
              {filteredProducts.length === 0 ? (
                <p className="text-center text-sm text-[#94A3B8] py-8">No products found</p>
              ) : (
                filteredProducts.slice(0, 50).map((prod) => (
                  <button
                    key={prod.id}
                    type="button"
                    onClick={() => addProduct(prod)}
                    className="w-full text-left flex items-center justify-between p-3 rounded-lg hover:bg-[#F8FAFC] transition-colors gap-4"
                  >
                    <div>
                      <div className="font-medium text-[#111827] text-sm">{prod.name}</div>
                      <div className="text-xs text-[#94A3B8] font-mono">{prod.code} · {prod.unit}</div>
                    </div>
                    <span className="font-semibold text-[#111827] text-sm shrink-0">
                      {formatCurrency(prod.sellingPrice)}
                    </span>
                  </button>
                ))
              )}
            </div>
            <div className="p-4 border-t border-[#E5E7EB]">
              <Button
                type="button"
                variant="secondary"
                size="sm"
                className="w-full"
                onClick={() => { setProductPickerOpen(false); setProductSearch(""); }}
              >
                Close
              </Button>
            </div>
          </div>
        </div>
      )}
    </AdminLayout>
  );
}
