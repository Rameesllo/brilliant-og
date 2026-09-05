"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { AlertCircle } from "lucide-react";

export interface AddEmployeeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface EmployeeTypeOption {
  id: string;
  name: string;
  defaultHourlyRate: number;
  defaultDailyRate: number;
}

export const AddEmployeeModal: React.FC<AddEmployeeModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [types, setTypes] = useState<EmployeeTypeOption[]>([]);
  const [isLoadingTypes, setIsLoadingTypes] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    email: "",
    address: "",
    emergencyContact: "",
    employeeTypeId: "",
    wagePerEvent: "700.00",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    if (!isOpen) return;

    async function loadTypes() {
      setIsLoadingTypes(true);
      try {
        const res = await fetch("/api/employee-types");
        if (res.ok) {
          const data = await res.json();
          setTypes(data.types || []);
          if (data.types?.length > 0) {
            const first = data.types[0];
            setFormData((prev) => ({
              ...prev,
              employeeTypeId: prev.employeeTypeId || first.id,
              wagePerEvent: prev.wagePerEvent || (first.defaultDailyRate || first.defaultHourlyRate || 700).toFixed(2),
            }));
          }
        }
      } catch (err) {
        console.error("Failed to load types:", err);
      } finally {
        setIsLoadingTypes(false);
      }
    }

    loadTypes();
  }, [isOpen]);

  const handleTypeChange = (newTypeId: string) => {
    const selected = types.find((t) => t.id === newTypeId);
    setFormData((prev) => ({
      ...prev,
      employeeTypeId: newTypeId,
      wagePerEvent: selected ? (selected.defaultDailyRate || selected.defaultHourlyRate).toFixed(2) : prev.wagePerEvent,
    }));
  };

  const handleSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage("");

    if (!formData.name.trim()) {
      setErrorMessage("Employee full name is required.");
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

    setIsSubmitting(true);

    try {
      const wage = Number(formData.wagePerEvent) || 0;
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
          hourlyRate: wage,
          dailyRate: wage,
          status: "ACTIVE",
        }),
      });

      const result = await res.json();
      if (!res.ok) {
        throw new Error(result.error || "Failed to create employee");
      }

      onSuccess?.();
      onClose();
    } catch (err: unknown) {
      setErrorMessage((err as Error).message || "An unexpected error occurred while saving.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Add Event Employee"
      description="Register a new catering team member and set their per-work event wage."
      maxWidth="lg"
      footer={
        <>
          <Button variant="secondary" size="sm" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="sm"
            onClick={() => handleSubmit()}
            isLoading={isSubmitting}
          >
            Save Employee
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 rounded-lg bg-[#FEF2F2] border border-[#FCA5A5] flex items-center gap-2 text-xs text-[#991B1B] font-medium">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

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
            placeholder="e.g. Spouse / +1 (555) 000-1122"
            value={formData.emergencyContact}
            onChange={(e) => setFormData({ ...formData, emergencyContact: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Designation / Employee Type"
            isRequired
            value={formData.employeeTypeId}
            onChange={(e) => handleTypeChange(e.target.value)}
            options={types.map((t) => ({
              value: t.id,
              label: `${t.name} (₹${(t.defaultDailyRate || t.defaultHourlyRate || 0).toLocaleString()}/event)`,
            }))}
            disabled={isLoadingTypes}
          />
          <Input
            label="Wages Per Work (1 Event)"
            isRequired
            type="number"
            step="1"
            placeholder="700"
            value={formData.wagePerEvent}
            onChange={(e) => setFormData({ ...formData, wagePerEvent: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
};
