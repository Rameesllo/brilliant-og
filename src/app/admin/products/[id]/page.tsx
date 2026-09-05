"use client";

import React, { useState, useEffect, useCallback, use } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  ArrowLeft,
  Edit,
  Sliders,
  Boxes,
  Tag,
  DollarSign,
  AlertTriangle,
  History,
  AlertCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import { AdjustStockModal } from "@/components/modals/AdjustStockModal";

interface ProductDetails {
  id: string;
  code: string;
  name: string;
  categoryId: string;
  categoryName: string;
  type: "CATERING_FOOD" | "RENTAL_EQUIPMENT" | "SERVICE";
  unit: string;
  sellingPrice: number;
  costPrice: number;
  stockQuantity: number;
  minStockAlert: number;
  isLowStock: boolean;
  isActive: boolean;
  description: string;
  invoicesCount: number;
  createdAt: string;
  updatedAt: string;
}

interface ActivityRecord {
  id: string;
  action: string;
  details: string;
  userName: string;
  createdAt: string;
}

export default function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const unwrappedParams = use(params);
  const productId = unwrappedParams.id;

  const [product, setProduct] = useState<ProductDetails | null>(null);
  const [activityLogs, setActivityLogs] = useState<ActivityRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAdjustOpen, setIsAdjustOpen] = useState(false);

  const fetchProductData = useCallback(() => {
    fetch(`/api/products/${productId}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load product details");
        return res.json();
      })
      .then((data) => {
        setProduct(data.product || null);
        setActivityLogs(data.activityLogs || []);
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "An unexpected error occurred");
        setIsLoading(false);
      });
  }, [productId]);

  useEffect(() => {
    fetchProductData();
  }, [fetchProductData]);

  const getTypeBadgeVariant = (type: string): BadgeVariant => {
    switch (type) {
      case "RENTAL_EQUIPMENT":
        return "orange";
      case "SERVICE":
        return "paid";
      default:
        return "neutral";
    }
  };

  if (isLoading) {
    return (
      <AdminLayout
        title="Product Details"
        breadcrumbs={[{ label: "Admin Console" }, { label: "Products", href: "/admin/products" }]}
      >
        <div className="py-24 flex flex-col items-center justify-center text-[#64748B] gap-3">
          <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
          <span className="text-sm font-medium">Loading catalog asset details...</span>
        </div>
      </AdminLayout>
    );
  }

  if (!product) {
    return (
      <AdminLayout
        title="Product Not Found"
        breadcrumbs={[{ label: "Admin Console" }, { label: "Products", href: "/admin/products" }]}
      >
        <div className="max-w-xl mx-auto py-16 text-center space-y-4">
          <AlertCircle className="w-12 h-12 text-[#DC2626] mx-auto" />
          <h2 className="text-xl font-bold text-[#111827]">Product Not Found</h2>
          <p className="text-sm text-[#64748B]">The requested catalog item does not exist or may have been deleted.</p>
          <Link href="/admin/products">
            <Button variant="primary" size="sm">Back to Product Catalog</Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  const marginPercent =
    product.sellingPrice > 0
      ? (((product.sellingPrice - product.costPrice) / product.sellingPrice) * 100).toFixed(1)
      : "0.0";

  return (
    <AdminLayout
      title={`${product.name} — Inventory Details`}
      breadcrumbs={[
        { label: "Admin Console" },
        { label: "Products", href: "/admin/products" },
        { label: product.name },
      ]}
    >
      <div className="space-y-6">
        {/* Top Header & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/admin/products">
              <Button variant="ghost" size="sm" leftIcon={<ArrowLeft className="w-4 h-4" />}>
                Catalog
              </Button>
            </Link>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#FFF7ED] text-[#F97316] border border-[#FFEDD5]">
                {product.code}
              </span>
              <Badge variant={getTypeBadgeVariant(product.type)} size="sm">
                {product.type === "RENTAL_EQUIPMENT"
                  ? "Rental Equipment"
                  : product.type === "SERVICE"
                  ? "Service"
                  : "Catering Food"}
              </Badge>
              <Badge variant={product.isActive ? "active" : "inactive"} size="sm">
                {product.isActive ? "Active in Catalog" : "Inactive"}
              </Badge>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Sliders className="w-4 h-4 text-[#F97316]" />}
              onClick={() => setIsAdjustOpen(true)}
            >
              Adjust Stock
            </Button>
            <Link href={`/admin/products/${product.id}/edit`}>
              <Button variant="primary" size="sm" leftIcon={<Edit className="w-4 h-4" />}>
                Edit Product
              </Button>
            </Link>
          </div>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-center gap-3 text-sm text-[#991B1B]">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}

        {/* Low Stock Banner */}
        {product.isLowStock && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-[#DC2626] flex-shrink-0" />
              <div>
                <p className="text-sm font-semibold text-[#991B1B]">Low Stock Alert Triggered</p>
                <p className="text-xs text-[#DC2626] mt-0.5">
                  Current stock ({product.stockQuantity} {product.unit}) is at or below the minimum threshold ({product.minStockAlert} {product.unit}). Reorder or replenish inventory to prevent event fulfillment bottlenecks.
                </p>
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsAdjustOpen(true)}
              className="flex-shrink-0"
            >
              Replenish Stock
            </Button>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Available Stock</span>
                <Boxes className="w-4 h-4 text-[#F97316]" />
              </div>
              <div className={`text-2xl font-bold mt-2 ${product.isLowStock ? "text-[#DC2626]" : "text-[#111827]"}`}>
                {product.stockQuantity} <span className="text-sm font-normal text-[#64748B]">{product.unit}</span>
              </div>
              <p className="text-xs text-[#64748B] mt-1">Min Alert: {product.minStockAlert} {product.unit}</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Selling / Rental Rate</span>
                <DollarSign className="w-4 h-4 text-[#16A34A]" />
              </div>
              <div className="text-2xl font-bold text-[#15803D] mt-2">
                {formatCurrency(product.sellingPrice)}
                <span className="text-xs font-normal text-[#64748B] ml-1">/{product.unit}</span>
              </div>
              <p className="text-xs text-[#16A34A] mt-1">Gross unit billing rate</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Cost & Margin</span>
                <Tag className="w-4 h-4 text-[#6366F1]" />
              </div>
              <div className="text-2xl font-bold text-[#111827] mt-2">
                {formatCurrency(product.costPrice)}
              </div>
              <p className="text-xs text-[#64748B] mt-1">Est. Margin: {marginPercent}%</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Invoice References</span>
                <Calendar className="w-4 h-4 text-[#EA580C]" />
              </div>
              <div className="text-2xl font-bold text-[#111827] mt-2">
                {product.invoicesCount}
              </div>
              <p className="text-xs text-[#64748B] mt-1">Billed on client invoices</p>
            </CardContent>
          </Card>
        </div>

        {/* Product Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Catalog Asset Information</CardTitle>
            <CardDescription>Specifications, categorization, and operational descriptions</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              <div>
                <span className="text-xs font-medium text-[#64748B]">Category</span>
                <p className="text-sm font-semibold text-[#111827] mt-1">{product.categoryName}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-[#64748B]">Measurement Unit</span>
                <p className="text-sm font-semibold text-[#111827] mt-1 capitalize">{product.unit}</p>
              </div>
              <div>
                <span className="text-xs font-medium text-[#64748B]">Date Registered</span>
                <p className="text-sm font-semibold text-[#111827] mt-1">{formatDate(product.createdAt)}</p>
              </div>
            </div>

            <div className="pt-3 border-t border-[#E2E8F0]">
              <span className="text-xs font-medium text-[#64748B]">Product Description</span>
              <p className="text-sm text-[#334155] mt-1 whitespace-pre-wrap">
                {product.description || "No specific preparation instructions or notes recorded for this item."}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Audit Logs / Stock History */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-[#F97316]" />
              <div>
                <CardTitle>Stock Adjustment History & Audit Trail</CardTitle>
                <CardDescription>Verified inventory movements, physical counts, and system updates</CardDescription>
              </div>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            {activityLogs.length === 0 ? (
              <div className="py-12 text-center text-[#64748B]">
                <History className="w-10 h-10 text-[#CBD5E1] mx-auto mb-2" />
                <p className="text-sm font-semibold text-[#111827]">No stock adjustment logs recorded</p>
                <p className="text-xs text-[#94A3B8] mt-0.5">Use the Adjust Stock action above to log restocks or count reconciliations.</p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Adjustment Details</TableHead>
                    <TableHead>Logged By</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {activityLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs text-[#64748B] whitespace-nowrap">
                        {formatDate(log.createdAt)}
                      </TableCell>
                      <TableCell>
                        <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-[#F1F5F9] text-[#475569]">
                          {log.action}
                        </span>
                      </TableCell>
                      <TableCell className="text-xs font-medium text-[#111827]">
                        {log.details}
                      </TableCell>
                      <TableCell className="text-xs text-[#64748B]">
                        {log.userName}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </Card>
      </div>

      <AdjustStockModal
        isOpen={isAdjustOpen}
        onClose={() => setIsAdjustOpen(false)}
        product={product}
        onSuccess={fetchProductData}
      />
    </AdminLayout>
  );
}
