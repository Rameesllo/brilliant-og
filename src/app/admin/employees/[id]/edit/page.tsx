"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/LoadingState";
import { ArrowLeft, Save, AlertCircle } from "lucide-react";

interface EmployeeTypeOption {
  id: string;
  name: string;
  defaultWagePerEvent: number;
}

export default function EditEmployeePage() {
  const router = useRouter();
  const params = useParams();
  const employeeId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");
  const [types, setTypes] = useState<EmployeeTypeOption[]>([]);

  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    employeeTypeId: "",
    ratePerWork: "",
    status: "ACTIVE",
    code: "",
  });

  useEffect(() => {
    async function loadData() {
      setIsLoading(true);
      try {
        const [empRes, typesRes] = await Promise.all([
          fetch(`/api/employees/${employeeId}`),
          fetch("/api/employee-types"),
        ]);

        if (!empRes.ok) {
          throw new Error("Failed to load employee record");
        }

        const empData = await empRes.json();
        const typesData = await typesRes.json();

        setTypes(typesData.types || []);

        const emp = empData.employee;
        if (emp) {
          setFormData({
            name: emp.name || "",
            phone: emp.phone || "",
            email: emp.email || "",
            address: emp.address || "",
            emergencyContact: emp.emergencyContact || "",
            employeeTypeId: emp.employeeTypeId || "",
            ratePerWork: emp.wagePerEvent !== undefined ? Number(emp.wagePerEvent).toFixed(2) : "",
            status: emp.status || "ACTIVE",
            code: emp.code || "",
          });
        }
      } catch (err: unknown) {
        setErrorMessage((err as Error).message || "Failed to load employee details.");
      } finally {
        setIsLoading(false);
      }
    }

    if (employeeId) {
      loadData();
    }
  }, [employeeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage("");

    if (!formData.name.trim()) {
      setErrorMessage("Full name is required.");
      return;
    }
    if (!formData.phone.trim()) {
      setErrorMessage("Phone number is required.");
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
    if (Number(formData.ratePerWork) < 0) {
      setErrorMessage("Rate per work cannot be negative.");
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch(`/api/employees/${employeeId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name.trim(),
          phone: formData.phone.trim(),
          email: formData.email.trim() || undefined,
          address: formData.address.trim() || undefined,
          emergencyContact: formData.emergencyContact.trim() || undefined,
          employeeTypeId: formData.employeeTypeId,
          wagePerEvent: Number(formData.ratePerWork) || 0,
          status: formData.status,
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to update employee");
      }

      router.push(`/admin/employees/${employeeId}`);
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "An unexpected error occurred while updating.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AdminLayout
      title={`Edit Employee — ${formData.code || "Staff"}`}
      breadcrumbs={[
        { label: "Admin Console", href: "/admin/dashboard" },
        { label: "Employees", href: "/admin/employees" },
        { label: formData.name || "Employee", href: `/admin/employees/${employeeId}` },
        { label: "Edit" },
      ]}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <Link
            href={`/admin/employees/${employeeId}`}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#64748B] hover:text-[#111827] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Employee Profile
          </Link>
          {formData.code && (
            <span className="font-mono text-xs px-2.5 py-1 rounded bg-[#F8FAFC] border border-[#E2E8F0] text-[#475569] font-medium">
              ID: {formData.code}
            </span>
          )}
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-[#FEF2F2] border border-[#FCA5A5] flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#DC2626] shrink-0 mt-0.5" />
            <div className="text-sm text-[#991B1B] font-medium">{errorMessage}</div>
          </div>
        )}

        {isLoading ? (
          <LoadingState message="Loading employee information..." />
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <Card>
              <CardHeader>
                <div>
                  <CardTitle>Personal & Contact Details</CardTitle>
                  <CardDescription>
                    Update personal profile and communication details.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Full Name"
                    isRequired
                    placeholder="e.g. Marcus Sterling"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  />
                  <Input
                    label="Phone Number"
                    isRequired
                    placeholder="e.g. +1 (555) 234-8901"
                    value={formData.phone}
                    onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Email Address"
                    type="email"
                    placeholder="e.g. marcus@catering.com"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  />
                  <Input
                    label="Emergency Contact"
                    placeholder="e.g. Spouse / +1 (555) 999-8877"
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
                  <CardTitle>Role & Compensation</CardTitle>
                  <CardDescription>
                    Adjust role category, rates, and active employment status.
                  </CardDescription>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Select
                    label="Employee Type / Designation"
                    isRequired
                    value={formData.employeeTypeId}
                    onChange={(e) => setFormData({ ...formData, employeeTypeId: e.target.value })}
                    options={types.map((t) => ({
                      value: t.id,
                      label: t.name,
                    }))}
                  />
                  <Select
                    label="Employment Status"
                    isRequired
                    value={formData.status}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                    options={[
                      { value: "ACTIVE", label: "Active" },
                      { value: "INACTIVE", label: "Inactive" },
                      { value: "ON_LEAVE", label: "On Leave" },
                      { value: "TERMINATED", label: "Terminated" },
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
                    placeholder="700.00"
                    value={formData.ratePerWork}
                    onChange={(e) => setFormData({ ...formData, ratePerWork: e.target.value })}
                    helperText="Fixed amount paid for each work assignment."
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex items-center justify-end gap-3">
              <Button
                type="button"
                variant="secondary"
                onClick={() => router.push(`/admin/employees/${employeeId}`)}
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
                Update Employee
              </Button>
            </div>
          </form>
        )}
      </div>
    </AdminLayout>
  );
}
