"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge, BadgeVariant } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { Pagination } from "@/components/ui/Pagination";
import { formatCurrency } from "@/lib/utils";
import {
  Plus,
  Package,
  AlertTriangle,
  Boxes,
  DollarSign,
  Loader2,
  AlertCircle,
  ArrowUpRight,
  Sliders,
} from "lucide-react";
import { AddProductModal } from "@/components/modals/AddProductModal";
import { AdjustStockModal } from "@/components/modals/AdjustStockModal";

interface ProductRecord {
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
}

interface ProductMetrics {
  totalProducts: number;
  totalStockUnits: number;
  lowStockCount: number;
  inventoryValuation: number;
}

export default function AdminProductsPage() {
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [metrics, setMetrics] = useState<ProductMetrics>({
    totalProducts: 0,
    totalStockUnits: 0,
    lowStockCount: 0,
    inventoryValuation: 0,
  });
  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [lowStockFilter, setLowStockFilter] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [adjustTargetProduct, setAdjustTargetProduct] = useState<ProductRecord | null>(null);

  const fetchProducts = useCallback((page: number, q: string, type: string, lowStock: boolean) => {
    const params = new URLSearchParams({
      page: page.toString(),
      limit: "15",
      type,
      lowStock: lowStock ? "true" : "false",
    });
    if (q) params.set("search", q);

    fetch(`/api/products?${params.toString()}`)
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load products catalog");
        return res.json();
      })
      .then((data) => {
        setProducts(data.products || []);
        if (data.metrics) setMetrics(data.metrics);
        if (data.pagination) {
          setTotalPages(data.pagination.totalPages || 1);
          setTotalCount(data.pagination.total || 0);
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setError(err.message || "An unexpected error occurred");
        setIsLoading(false);
      });
  }, []);

  useEffect(() => {
    fetchProducts(currentPage, search, typeFilter, lowStockFilter);
  }, [fetchProducts, currentPage, search, typeFilter, lowStockFilter]);

  const handleSearchChange = (val: string) => {
    setSearch(val);
    setCurrentPage(1);
  };

  const handleTypeChange = (val: string) => {
    setTypeFilter(val);
    setCurrentPage(1);
  };

  const toggleLowStock = () => {
    setLowStockFilter((prev) => !prev);
    setCurrentPage(1);
  };

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

  return (
    <AdminLayout
      title="Catering & Rental Catalog"
      breadcrumbs={[{ label: "Admin Console" }, { label: "Products" }]}
    >
      <div className="space-y-6">
        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Total Catalog Items</span>
                <Package className="w-4 h-4 text-[#F97316]" />
              </div>
              <div className="text-2xl font-bold text-[#111827] mt-2">
                {metrics.totalProducts}
              </div>
              <p className="text-xs text-[#64748B] mt-1">Food recipes, rentals, & services</p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Total Stock Units</span>
                <Boxes className="w-4 h-4 text-[#6366F1]" />
              </div>
              <div className="text-2xl font-bold text-[#111827] mt-2">
                {metrics.totalStockUnits.toLocaleString()}
              </div>
              <p className="text-xs text-[#64748B] mt-1">Available across warehouse</p>
            </CardContent>
          </Card>

          <Card
            className={`cursor-pointer transition-all ${
              lowStockFilter ? "ring-2 ring-[#DC2626]" : ""
            }`}
            onClick={toggleLowStock}
          >
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Low-Stock Alerts</span>
                <AlertTriangle className="w-4 h-4 text-[#DC2626]" />
              </div>
              <div className="text-2xl font-bold text-[#DC2626] mt-2 flex items-center gap-2">
                <span>{metrics.lowStockCount}</span>
                {metrics.lowStockCount > 0 && (
                  <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5]">
                    Requires Action
                  </span>
                )}
              </div>
              <p className="text-xs text-[#64748B] mt-1">
                {lowStockFilter ? "Showing low stock only" : "Click to filter low stock items"}
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-[#64748B]">Inventory Valuation</span>
                <DollarSign className="w-4 h-4 text-[#16A34A]" />
              </div>
              <div className="text-2xl font-bold text-[#15803D] mt-2">
                {formatCurrency(metrics.inventoryValuation)}
              </div>
              <p className="text-xs text-[#16A34A] mt-1">Calculated replacement value</p>
            </CardContent>
          </Card>
        </div>

        {error && (
          <div className="p-4 bg-[#FEF2F2] border border-[#FCA5A5] rounded-xl flex items-center gap-3 text-sm text-[#991B1B]">
            <AlertCircle className="w-5 h-5 flex-shrink-0 text-[#DC2626]" />
            <span>{error}</span>
          </div>
        )}

        {/* Toolbar & Filters */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex flex-1 flex-wrap items-center gap-3">
            <SearchInput
              value={search}
              onChange={handleSearchChange}
              placeholder="Search catering recipes, rental dishes, chairs, codes..."
            />
            <div className="flex items-center bg-[#F1F5F9] p-1 rounded-lg border border-[#E2E8F0] text-xs">
              {[
                { id: "ALL", label: "All Items" },
                { id: "CATERING_FOOD", label: "Food & Recipes" },
                { id: "RENTAL_EQUIPMENT", label: "Rental Assets" },
                { id: "SERVICE", label: "Services" },
              ].map((tab) => (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => handleTypeChange(tab.id)}
                  className={`px-3 py-1 rounded-md font-medium transition-colors ${
                    typeFilter === tab.id
                      ? "bg-white text-[#111827] shadow-sm"
                      : "text-[#64748B] hover:text-[#111827]"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {lowStockFilter && (
              <button
                type="button"
                onClick={toggleLowStock}
                className="px-2.5 py-1 rounded-lg bg-[#FEF2F2] text-[#DC2626] border border-[#FCA5A5] text-xs font-semibold hover:bg-[#FEE2E2] transition-colors"
              >
                Clear Low Stock Filter ✕
              </button>
            )}
          </div>

          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => setIsAddOpen(true)}
          >
            Add Product
          </Button>
        </div>

        {/* Catalog Table */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Inventory & Equipment Asset Manager</CardTitle>
                <CardDescription>
                  Catering food recipes, rental chafing dishes, furniture, and stock levels
                </CardDescription>
              </div>
              <span className="text-xs text-[#64748B] font-medium">
                {totalCount} Total Catalog Items
              </span>
            </div>
          </CardHeader>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="py-20 flex flex-col items-center justify-center text-[#64748B] gap-3">
                <Loader2 className="w-8 h-8 animate-spin text-[#F97316]" />
                <span className="text-sm font-medium">Loading inventory catalog...</span>
              </div>
            ) : products.length === 0 ? (
              <div className="py-20 text-center text-[#64748B]">
                <Package className="w-12 h-12 text-[#CBD5E1] mx-auto mb-3" />
                <p className="text-base font-semibold text-[#111827]">No products found</p>
                <p className="text-sm mt-1">
                  {search || typeFilter !== "ALL" || lowStockFilter
                    ? "No catalog items match your search or active filters."
                    : "Get started by adding your first catering dish or rental equipment."}
                </p>
                <Button
                  variant="primary"
                  size="sm"
                  className="mt-4"
                  leftIcon={<Plus className="w-4 h-4" />}
                  onClick={() => setIsAddOpen(true)}
                >
                  Add Catalog Item
                </Button>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Code & Name</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead className="text-right">Price</TableHead>
                    <TableHead className="text-center">Current Stock</TableHead>
                    <TableHead className="text-center">Min Threshold</TableHead>
                    <TableHead className="text-center">Stock Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {products.map((item) => (
                    <TableRow key={item.id}>
                      <TableCell>
                        <div className="flex items-center gap-1.5">
                          <div>
                            <Link
                              href={`/admin/products/${item.id}`}
                              className="font-semibold text-[#111827] hover:text-[#F97316] transition-colors flex items-center gap-1"
                            >
                              <span>{item.name}</span>
                              <ArrowUpRight className="w-3.5 h-3.5 text-[#94A3B8]" />
                            </Link>
                            <div className="text-xs font-mono text-[#F97316] mt-0.5">
                              {item.code}
                            </div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge variant={getTypeBadgeVariant(item.type)} size="sm">
                          {item.type === "RENTAL_EQUIPMENT"
                            ? "Rental Asset"
                            : item.type === "SERVICE"
                            ? "Service"
                            : "Catering Food"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-xs text-[#475569] font-medium">
                        {item.categoryName}
                      </TableCell>
                      <TableCell className="text-right font-medium text-[#111827]">
                        {formatCurrency(item.sellingPrice)}
                        <span className="text-xs text-[#94A3B8] block font-normal">
                          /{item.unit}
                        </span>
                      </TableCell>
                      <TableCell
                        className={`text-center font-bold ${
                          item.isLowStock ? "text-[#DC2626]" : "text-[#111827]"
                        }`}
                      >
                        {item.stockQuantity} {item.unit}
                      </TableCell>
                      <TableCell className="text-center text-xs text-[#64748B]">
                        {item.minStockAlert} {item.unit}
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge variant={item.isLowStock ? "danger" : "active"} size="sm">
                          {item.isLowStock ? "Low Stock" : "In Stock"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-[#F97316] hover:bg-[#FFF7ED]"
                            leftIcon={<Sliders className="w-3 h-3" />}
                            onClick={() => setAdjustTargetProduct(item)}
                          >
                            Adjust
                          </Button>
                          <Link href={`/admin/products/${item.id}/edit`}>
                            <Button variant="ghost" size="sm" className="h-7 px-2 text-xs text-[#64748B]">
                              Edit
                            </Button>
                          </Link>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={totalCount}
            onPageChange={setCurrentPage}
          />
        </Card>
      </div>

      <AddProductModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onSuccess={() => fetchProducts(currentPage, search, typeFilter, lowStockFilter)}
      />

      <AdjustStockModal
        isOpen={Boolean(adjustTargetProduct)}
        onClose={() => setAdjustTargetProduct(null)}
        product={adjustTargetProduct}
        onSuccess={() => fetchProducts(currentPage, search, typeFilter, lowStockFilter)}
      />
    </AdminLayout>
  );
}
