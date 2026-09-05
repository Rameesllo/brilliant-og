"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Badge } from "@/components/ui/Badge";
import { Table, TableHeader, TableRow, TableHead, TableBody, TableCell } from "@/components/ui/Table";
import { SearchInput } from "@/components/ui/SearchInput";
import { Select } from "@/components/ui/Select";
import { Pagination } from "@/components/ui/Pagination";
import { LoadingState } from "@/components/ui/LoadingState";
import { EmptyState } from "@/components/ui/EmptyState";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { formatCurrency } from "@/lib/utils";
import { Plus, Eye, Edit2, UserCheck, UserX, AlertCircle, RefreshCw } from "lucide-react";

interface EmployeeItem {
  id: string;
  code: string;
  name: string;
  phone: string;
  email: string;
  employeeType: {
    id: string;
    name: string;
    description: string;
  };
  hourlyRate: number;
  dailyRate: number;
  status: "ACTIVE" | "INACTIVE" | "ON_LEAVE" | "TERMINATED";
  programsCount: number;
  totalEarned: number;
  totalPaid: number;
  outstanding: number;
  joinDate: string;
}

interface EmployeeTypeOption {
  id: string;
  name: string;
}

export default function AdminEmployeesPage() {
  const router = useRouter();

  // State
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [types, setTypes] = useState<EmployeeTypeOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  // Filters & Pagination
  const [search, setSearch] = useState("");
  const [selectedType, setSelectedType] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("");
  const [sortBy, setSortBy] = useState("name");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);

  // Status Toggle Modal
  const [targetEmployee, setTargetEmployee] = useState<EmployeeItem | null>(null);
  const [isStatusDialogOpen, setIsStatusDialogOpen] = useState(false);
  const [isUpdatingStatus, setIsUpdatingStatus] = useState(false);

  // Fetch employee types on mount
  useEffect(() => {
    async function loadTypes() {
      try {
        const res = await fetch("/api/employee-types");
        if (res.ok) {
          const data = await res.json();
          setTypes(data.types || []);
        }
      } catch (err) {
        console.error("Failed to load types:", err);
      }
    }
    loadTypes();
  }, []);

  // Fetch employees from API
  const fetchEmployees = useCallback(() => {
    const params = new URLSearchParams();
    if (search.trim()) params.set("search", search.trim());
    if (selectedType) params.set("employeeTypeId", selectedType);
    if (selectedStatus) params.set("status", selectedStatus);
    if (sortBy) params.set("sortBy", sortBy);
    if (sortOrder) params.set("sortOrder", sortOrder);
    params.set("page", currentPage.toString());
    params.set("limit", "10");

    fetch(`/api/employees?${params.toString()}`)
      .then((res) => {
        if (!res.ok) {
          return res.json().then((err) => {
            throw new Error(err.error || "Failed to load employee list");
          });
        }
        return res.json();
      })
      .then((data) => {
        setEmployees(data.employees || []);
        setTotalPages(data.totalPages || 1);
        setTotalItems(data.total || 0);
        setIsError(false);
        setErrorMessage("");
      })
      .catch((err: unknown) => {
        console.error("Error fetching employees:", err);
        setIsError(true);
        setErrorMessage((err as Error).message || "Failed to load employee directory.");
      })
      .finally(() => {
        setIsLoading(false);
      });
  }, [search, selectedType, selectedStatus, sortBy, sortOrder, currentPage]);

  // Trigger fetch when parameters change
  useEffect(() => {
    fetchEmployees();
  }, [fetchEmployees]);

  // Handle status toggle (Activate / Deactivate)
  const handleToggleStatus = async () => {
    if (!targetEmployee) return;
    setIsUpdatingStatus(true);

    const targetStatus = targetEmployee.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    try {
      const res = await fetch(`/api/employees/${targetEmployee.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: targetStatus }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to update employee status");
      }

      setIsStatusDialogOpen(false);
      setTargetEmployee(null);
      setIsLoading(true);
      await fetchEmployees();
    } catch (err: unknown) {
      alert((err as Error).message || "Error updating employee status");
    } finally {
      setIsUpdatingStatus(false);
    }
  };

  const openStatusDialog = (emp: EmployeeItem) => {
    setTargetEmployee(emp);
    setIsStatusDialogOpen(true);
  };

  return (
    <AdminLayout
      title="Employees"
      breadcrumbs={[{ label: "Admin Console", href: "/admin/dashboard" }, { label: "Employees" }]}
    >
      <div className="space-y-6">
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-[#111827] tracking-tight">Employees</h1>
            <p className="text-xs text-[#64748B] mt-0.5">
              Manage staff, roles, attendance and payments.
            </p>
          </div>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-4 h-4" />}
            onClick={() => router.push("/admin/employees/add")}
          >
            + Add Employee
          </Button>
        </div>

        {/* Filter and Search Bar */}
        <Card className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div>
              <SearchInput
                value={search}
                onChange={(val) => {
                  setSearch(val);
                  setCurrentPage(1);
                }}
                placeholder="Search by name, phone, code..."
              />
            </div>

            <div>
              <Select
                value={selectedType}
                onChange={(e) => {
                  setSelectedType(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "All Employee Types" },
                  ...types.map((t) => ({ value: t.id, label: t.name })),
                ]}
              />
            </div>

            <div>
              <Select
                value={selectedStatus}
                onChange={(e) => {
                  setSelectedStatus(e.target.value);
                  setCurrentPage(1);
                }}
                options={[
                  { value: "", label: "All Statuses" },
                  { value: "ACTIVE", label: "Active" },
                  { value: "INACTIVE", label: "Inactive" },
                  { value: "ON_LEAVE", label: "On Leave" },
                  { value: "TERMINATED", label: "Terminated" },
                ]}
              />
            </div>

            <div>
              <Select
                value={`${sortBy}:${sortOrder}`}
                onChange={(e) => {
                  const [field, order] = e.target.value.split(":");
                  setSortBy(field);
                  setSortOrder((order as "asc" | "desc") || "asc");
                  setCurrentPage(1);
                }}
                options={[
                  { value: "name:asc", label: "Sort: Name (A–Z)" },
                  { value: "name:desc", label: "Sort: Name (Z–A)" },
                  { value: "dailyRate:desc", label: "Sort: Event Wage (Highest)" },
                  { value: "dailyRate:asc", label: "Sort: Event Wage (Lowest)" },
                  { value: "status:asc", label: "Sort: Status" },
                  { value: "createdAt:desc", label: "Sort: Recently Added" },
                ]}
              />
            </div>
          </div>
        </Card>

        {/* Employee Table Card */}
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Staff Directory</CardTitle>
              <CardDescription>
                Active catering crew, banquet servers, chefs, and event coordinators
              </CardDescription>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs text-[#64748B] font-medium">
                {totalItems} {totalItems === 1 ? "employee" : "employees"} total
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 w-7 p-0"
                onClick={() => fetchEmployees()}
                title="Refresh employee data"
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#64748B]" />
              </Button>
            </div>
          </CardHeader>

          {/* Loading State */}
          {isLoading ? (
            <div className="p-6">
              <LoadingState message="Loading staff directory from database..." />
            </div>
          ) : isError ? (
            /* Error State */
            <div className="p-8">
              <EmptyState
                icon={<AlertCircle className="w-7 h-7 text-[#DC2626]" />}
                title="Failed to Load Employees"
                description={errorMessage || "Unable to reach the server. Please try again."}
                actionLabel="Retry"
                onAction={() => fetchEmployees()}
              />
            </div>
          ) : employees.length === 0 ? (
            /* Empty State */
            <div className="p-8">
              <EmptyState
                title="No Employees Found"
                description={
                  search || selectedType || selectedStatus
                    ? "No staff members matched your current filter criteria. Try clearing the search or filters."
                    : "No employee records exist yet in the database. Add your first employee to get started."
                }
                actionLabel={search || selectedType || selectedStatus ? "Clear Filters" : "+ Add Employee"}
                onAction={() => {
                  if (search || selectedType || selectedStatus) {
                    setSearch("");
                    setSelectedType("");
                    setSelectedStatus("");
                    setCurrentPage(1);
                  } else {
                    router.push("/admin/employees/add");
                  }
                }}
              />
            </div>
          ) : (
            /* Real Data Table */
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee</TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Employee Type</TableHead>
                      <TableHead>Wages (Per Event)</TableHead>
                      <TableHead>Programs</TableHead>
                      <TableHead>Outstanding</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {employees.map((emp) => {
                      const isInactive = emp.status === "INACTIVE" || emp.status === "TERMINATED";
                      return (
                        <TableRow key={emp.id}>
                          {/* Employee Name & Code */}
                          <TableCell>
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#FFF7ED] border border-[#FFEDD5] flex items-center justify-center text-[#EA580C] font-semibold text-xs shrink-0">
                                {emp.name.charAt(0).toUpperCase()}
                              </div>
                              <div>
                                <Link
                                  href={`/admin/employees/${emp.id}`}
                                  className="font-semibold text-xs text-[#111827] hover:text-[#F97316] transition-colors"
                                >
                                  {emp.name}
                                </Link>
                                <div className="text-[11px] text-[#64748B] flex items-center gap-1.5 mt-0.5">
                                  <span className="font-mono text-[10px] bg-[#F8FAFC] px-1.5 py-0.5 rounded border border-[#E5E7EB]">
                                    {emp.code}
                                  </span>
                                  {emp.email && <span className="truncate max-w-[140px]">• {emp.email}</span>}
                                </div>
                              </div>
                            </div>
                          </TableCell>

                          {/* Contact Phone */}
                          <TableCell className="text-xs text-[#475569]">
                            {emp.phone}
                          </TableCell>

                          {/* Employee Type */}
                          <TableCell>
                            <span className="text-xs font-medium text-[#111827]">
                              {emp.employeeType.name}
                            </span>
                          </TableCell>

                          {/* Wages (Per Event) */}
                          <TableCell>
                            <div className="text-xs font-semibold text-[#111827]">
                              {formatCurrency(emp.dailyRate || emp.hourlyRate)}
                            </div>
                            <div className="text-[10px] text-[#64748B]">
                              per work (1 event)
                            </div>
                          </TableCell>

                          {/* Associated Programs */}
                          <TableCell className="text-xs text-[#64748B]">
                            <span className="font-medium text-[#111827]">{emp.programsCount}</span> events
                          </TableCell>

                          {/* Outstanding Balance */}
                          <TableCell>
                            <span
                              className={`text-xs font-bold ${
                                emp.outstanding > 0 ? "text-[#C2410C]" : "text-[#10B981]"
                              }`}
                            >
                              {formatCurrency(emp.outstanding)}
                            </span>
                          </TableCell>

                          {/* Status */}
                          <TableCell>
                            <Badge
                              variant={
                                emp.status === "ACTIVE"
                                  ? "active"
                                  : emp.status === "ON_LEAVE"
                                  ? "warning"
                                  : "inactive"
                              }
                              size="sm"
                            >
                              {emp.status}
                            </Badge>
                          </TableCell>

                          {/* Actions */}
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-[#475569] hover:text-[#111827]"
                                onClick={() => router.push(`/admin/employees/${emp.id}`)}
                                title="View Details"
                              >
                                <Eye className="w-3.5 h-3.5 mr-1" />
                                View
                              </Button>

                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-[#475569] hover:text-[#111827]"
                                onClick={() => router.push(`/admin/employees/${emp.id}/edit`)}
                                title="Edit"
                              >
                                <Edit2 className="w-3.5 h-3.5 mr-1" />
                                Edit
                              </Button>

                              {isInactive ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-[#10B981] hover:text-[#059669]"
                                  onClick={() => openStatusDialog(emp)}
                                  title="Reactivate"
                                >
                                  <UserCheck className="w-3.5 h-3.5 mr-1" />
                                  Activate
                                </Button>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 px-2 text-xs text-[#DC2626] hover:text-[#B91C1C]"
                                  onClick={() => openStatusDialog(emp)}
                                  title="Deactivate"
                                >
                                  <UserX className="w-3.5 h-3.5 mr-1" />
                                  Deactivate
                                </Button>
                              )}
                            </div>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>

              {/* Pagination */}
              <Pagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={totalItems}
                onPageChange={(p) => setCurrentPage(p)}
              />
            </>
          )}
        </Card>
      </div>

      {/* Confirmation Dialog for Status Change */}
      {targetEmployee && (
        <ConfirmDialog
          isOpen={isStatusDialogOpen}
          onClose={() => {
            setIsStatusDialogOpen(false);
            setTargetEmployee(null);
          }}
          onConfirm={handleToggleStatus}
          isLoading={isUpdatingStatus}
          title={
            targetEmployee.status === "ACTIVE"
              ? `Deactivate ${targetEmployee.name}?`
              : `Reactivate ${targetEmployee.name}?`
          }
          message={
            targetEmployee.status === "ACTIVE"
              ? "Are you sure you want to deactivate this employee? Historical programs, attendance logs, and financial records will be preserved."
              : `Are you sure you want to reactivate ${targetEmployee.name}? The employee will be eligible for new program shifts.`
          }
          confirmText={targetEmployee.status === "ACTIVE" ? "Deactivate" : "Reactivate"}
          variant={targetEmployee.status === "ACTIVE" ? "danger" : "primary"}
        />
      )}
    </AdminLayout>
  );
}
