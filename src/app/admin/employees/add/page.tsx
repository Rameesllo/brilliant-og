"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

interface EmployeeTypeOption {
  id: string;
  name: string;
  defaultWagePerEvent: number;
}

export default function AddEmployeePage() {
  const router = useRouter();
  const [types, setTypes] = useState<EmployeeTypeOption[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(true);
  const [typesError, setTypesError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    employeeTypeId: "",
    wagePerEvent: "",
    status: "ACTIVE",
    createAccount: false,
    password: "",
  });

  // Fetch employee types from database
  useEffect(() => {
    async function loadTypes() {
      try {
        const res = await fetch("/api/employee-types");
        if (res.ok) {
          const data = await res.json();
          setTypes(data.types || []);
          if (data.types?.length > 0) {
            const first = data.types[0];
            setFormData((prev) => ({
              ...prev,
              employeeTypeId: first.id,
              wagePerEvent: first.defaultWagePerEvent.toFixed(2),
            }));
          }
        } else {
          const data = await res.json().catch(() => null);
          setTypesError(data?.error || "Unable to load employee designations.");
        }
      } catch (err) {
        console.error("Failed to load employee types:", err);
        setTypesError("Unable to load employee designations. Please refresh and try again.");
      } finally {
        setIsLoadingTypes(false);
      }
    }
    loadTypes();
  }, []);

  const handleTypeChange = (newTypeId: string) => {
    const selected = types.find((t) => t.id === newTypeId);
    setFormData((prev) => ({
      ...prev,
      employeeTypeId: newTypeId,
      wagePerEvent: selected ? selected.defaultWagePerEvent.toFixed(2) : prev.wagePerEvent,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    // Client-side validation
    if (!formData.name.trim()) {
      setErrorMessage("Employee full name is required.");
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage("Contact phone number is required.");
      return;
    }
    if (!formData.employeeTypeId) {
      setErrorMessage("Please select an employee designation.");
      return;
    }
    if (formData.email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        setErrorMessage("Please provide a valid email address.");
        return;
      }
    }
    if (Number(formData.wagePerEvent) < 0) {
      setErrorMessage("Wage per event cannot be negative.");
      return;
    }
    if (formData.createAccount) {
      if (!formData.email.trim()) {
        setErrorMessage("Email address is required to create a login account.");
        return;
      }
      if (!formData.password || formData.password.length < 6) {
        setErrorMessage("Password must be at least 6 characters for the login account.");
        return;
      }
    }

    setIsSubmitting(true);

    try {
      const res = await fetch("/api/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          emergencyContact: formData.emergencyContact.trim() || undefined,
          employeeTypeId: formData.employeeTypeId,
          wagePerEvent: formData.wagePerEvent ? Number(formData.wagePerEvent) : undefined,
          status: formData.status,
          createAccount: formData.createAccount,
          password: formData.createAccount ? formData.password : undefined,
        }),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || "Failed to create employee");
      }

      // Redirect to newly created employee detail page or list
      if (result.employee?.id) {
        router.push(`/admin/employees/${result.employee.id}`);
      } else {
        router.push("/admin/employees");
      }
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "An unexpected error occurred while saving the employee.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title="Add New Employee"
      breadcrumbs={[
        { label: "Admin Console", href: "/admin/dashboard" },
        { label: "Employees", href: "/admin/employees" },
        { label: "Add Employee" },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href="/admin/employees"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#111827] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Employees Directory
          </Link>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
            <div className="text-sm text-[#991B1B] font-medium">{errorMessage}</div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>Personal &amp; Contact Information</CardTitle>
                <CardDescription>
                  Core details and contact information for the event crew member.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Full Name"
                  isRequired
                  placeholder="e.g. Ravi Kumar"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                />
                <Input
                  label="Phone Number"
                  isRequired
                  placeholder="e.g. +91 98765 43210"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Email Address"
                  type="email"
                  placeholder="e.g. ravi@catering.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
                <Input
                  label="Emergency Contact"
                  placeholder="e.g. Spouse / +91 99887 66554"
                  value={formData.emergencyContact}
                  onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5">
                  Residential Address
                </label>
                <textarea
                  rows={2}
                  className="w-full px-3 py-2 text-xs text-[#111827] bg-white border border-[#E5E7EB] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#F97316]/20 focus:border-[#F97316] transition-all placeholder:text-[#94A3B8]"
                  placeholder="Street address, city, state, zip"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>Role &amp; Compensation</CardTitle>
                <CardDescription>
                  Assign designation and set the wage paid per event worked.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Select
                  label="Employee Type / Designation"
                  isRequired
                  value={formData.employeeTypeId}
                  onChange={(e) => handleTypeChange(e.target.value)}
                  options={[
                    {
                      value: "",
                      label: isLoadingTypes ? "Loading designations..." : "Select a designation",
                    },
                    ...types.map((t) => ({
                      value: t.id,
                      label: `${t.name} — ₹${t.defaultWagePerEvent.toLocaleString("en-IN")}/event`,
                    })),
                  ]}
                  disabled={isLoadingTypes}
                />
                {typesError && <p className="mt-1 text-xs text-[#DC2626]">{typesError}</p>}
                {!isLoadingTypes && !typesError && types.length === 0 && (
                  <p className="mt-1 text-xs text-[#DC2626]">No active employee designations are available.</p>
                )}
                <Select
                  label="Initial Status"
                  isRequired
                  value={formData.status}
                  onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                  options={[
                    { value: "ACTIVE", label: "Active" },
                    { value: "INACTIVE", label: "Inactive" },
                    { value: "ON_LEAVE", label: "On Leave" },
                  ]}
                />
              </div>

              <div className="max-w-xs">
                <Input
                  label="Rate Per Work (₹)"
                  isRequired
                  type="number"
                  step="0.01"
                  min="0"
                  placeholder="e.g. 700.00"
                  value={formData.wagePerEvent}
                  onChange={(e) => setFormData({ ...formData, wagePerEvent: e.target.value })}
                  helperText="Fixed amount paid to this employee for each event or work assignment."
                />
              </div>

              <div className="p-3 bg-[#FFF7ED] border border-[#FED7AA] rounded-lg">
                <p className="text-xs text-[#92400E]">
                  <strong>Note:</strong> Wages are calculated per event/work (not hourly or daily). Each employee 
                  earns this fixed amount for one full event. Half-day attendance earns 50% of this wage.
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div>
                <CardTitle>System Login Account (Optional)</CardTitle>
                <CardDescription>
                  Create portal access credentials so the employee can view assignments, attendance, and earnings.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  id="createAccount"
                  checked={formData.createAccount}
                  onChange={(e) => setFormData({ ...formData, createAccount: e.target.checked })}
                  className="w-4 h-4 rounded border-[#CBD5E1] text-[#F97316] focus:ring-[#F97316]"
                />
                <label htmlFor="createAccount" className="text-xs font-semibold text-[#111827] cursor-pointer">
                  Enable Employee Portal Login for this staff member
                </label>
              </div>

              {formData.createAccount && (
                <div className="p-4 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] space-y-3">
                  <p className="text-xs text-[#64748B]">
                    A login account with role <strong className="text-[#111827]">EMPLOYEE</strong> will be created using the email provided above.
                  </p>
                  <Input
                    label="Account Password"
                    isRequired
                    type="password"
                    placeholder="Minimum 6 characters"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              onClick={() => router.push("/admin/employees")}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="primary"
              leftIcon={<Save className="w-4 h-4" />}
              isLoading={isSubmitting}
            >
              Save Employee
            </Button>
          </div>
        </form>
      </div>
    </AdminLayout>
  );
}
