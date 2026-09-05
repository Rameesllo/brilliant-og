"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { ArrowLeft, Save, Calendar, MapPin, Users, DollarSign, User } from "lucide-react";

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  code: string;
}

export default function CreateProgramPage() {
  const router = useRouter();

  const [customers, setCustomers] = useState<CustomerOption[]>([]);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string>("");
  const [isCustomCustomer, setIsCustomCustomer] = useState(false);

  const [formData, setFormData] = useState({
    title: "",
    type: "WEDDING",
    customerName: "",
    customerPhone: "",
    eventDate: "",
    startTime: "17:00",
    endTime: "23:00",
    venueName: "",
    venueAddress: "",
    expectedGuests: "250",
    requiredStaffCount: "10",
    budget: "25000",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/customers?limit=100")
      .then((res) => res.json())
      .then((data) => {
        if (data.customers) setCustomers(data.customers);
      })
      .catch((err) => console.error("Error fetching customers:", err));
  }, []);

  const handleCustomerSelect = (custId: string) => {
    setSelectedCustomerId(custId);
    if (custId === "NEW") {
      setIsCustomCustomer(true);
      setFormData((prev) => ({ ...prev, customerName: "", customerPhone: "" }));
    } else {
      setIsCustomCustomer(false);
      const cust = customers.find((c) => c.id === custId);
      if (cust) {
        setFormData((prev) => ({
          ...prev,
          customerName: cust.name,
          customerPhone: cust.phone,
        }));
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.title.trim()) {
      setErrorMessage("Program Title is required.");
      return;
    }
    if (!formData.eventDate) {
      setErrorMessage("Event Date is required.");
      return;
    }
    if (!formData.venueName.trim()) {
      setErrorMessage("Venue Name is required.");
      return;
    }

    if (!selectedCustomerId || selectedCustomerId === "NEW") {
      if (!formData.customerName.trim()) {
        setErrorMessage("Please select or enter Customer Name.");
        return;
      }
    }

    setIsSubmitting(true);
    try {
      const payload: Record<string, unknown> = {
        title: formData.title.trim(),
        type: formData.type,
        eventDate: formData.eventDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venueName: formData.venueName.trim(),
        venueAddress: formData.venueAddress.trim(),
        expectedGuests: parseInt(formData.expectedGuests, 10) || 0,
        requiredStaffCount: parseInt(formData.requiredStaffCount, 10) || 0,
        budget: parseFloat(formData.budget) || 0,
        notes: formData.notes.trim() || undefined,
      };

      if (selectedCustomerId && selectedCustomerId !== "NEW") {
        payload.customerId = selectedCustomerId;
      } else {
        payload.customerName = formData.customerName.trim();
        payload.customerPhone = formData.customerPhone.trim();
      }

      const res = await fetch("/api/programs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to create program");
      }

      router.push(`/admin/programs/${data.program.id}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error creating program");
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerOptions = [
    { value: "", label: "-- Choose an existing customer --" },
    ...customers.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.phone || c.code})`,
    })),
    { value: "NEW", label: "+ Add / Enter New Customer" },
  ];

  return (
    <AdminLayout
      title="Create New Catering Program"
      breadcrumbs={[
        { label: "Admin Console" },
        { label: "Programs", href: "/admin/programs" },
        { label: "Create" },
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
        {/* Header Actions */}
        <div className="flex items-center justify-between">
          <Link href="/admin/programs">
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Back to Programs
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save & Publish Program
          </Button>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg font-medium">
            {errorMessage}
          </div>
        )}

        {/* 1. Event Essentials */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#C2410C]" />
              <CardTitle>Event Essentials</CardTitle>
            </div>
            <CardDescription>
              Core title, event classification, capacity planning, and estimated budget
            </CardDescription>
          </CardHeader>
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Event / Program Title"
                  isRequired
                  placeholder="e.g. Grand Royal Wedding Reception - Malhotra Family"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                />
              </div>
              <Select
                label="Program Type"
                isRequired
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                options={[
                  { value: "WEDDING", label: "Wedding Program" },
                  { value: "BIRTHDAY", label: "Birthday Celebration" },
                  { value: "CORPORATE", label: "Corporate Banquet" },
                  { value: "RECEPTION", label: "Cocktail & Reception" },
                  { value: "ANNIVERSARY", label: "Anniversary Celebration" },
                  { value: "OTHER", label: "Custom Event" },
                ]}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Input
                label="Expected Guests"
                type="number"
                placeholder="250"
                value={formData.expectedGuests}
                onChange={(e) => setFormData({ ...formData, expectedGuests: e.target.value })}
                leftIcon={<Users className="w-4 h-4 text-[#94A3B8]" />}
              />
              <Input
                label="Required Staff Count"
                isRequired
                type="number"
                placeholder="10"
                value={formData.requiredStaffCount}
                onChange={(e) => setFormData({ ...formData, requiredStaffCount: e.target.value })}
                leftIcon={<Users className="w-4 h-4 text-[#94A3B8]" />}
              />
              <Input
                label="Estimated Budget"
                type="number"
                placeholder="25000"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
                leftIcon={<DollarSign className="w-4 h-4 text-[#94A3B8]" />}
              />
            </div>
          </div>
        </Card>

        {/* 2. Customer & Client Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User className="w-5 h-5 text-[#C2410C]" />
              <CardTitle>Customer & Client Details</CardTitle>
            </div>
            <CardDescription>
              Select an existing client or enter a new contact for this event
            </CardDescription>
          </CardHeader>
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Select
                label="Select Client / Customer"
                isRequired
                value={selectedCustomerId}
                onChange={(e) => handleCustomerSelect(e.target.value)}
                options={customerOptions}
              />

              {(isCustomCustomer || customers.length === 0) ? (
                <div className="grid grid-cols-2 gap-3">
                  <Input
                    label="Customer Name"
                    isRequired
                    placeholder="Full Name"
                    value={formData.customerName}
                    onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  />
                  <Input
                    label="Customer Phone"
                    placeholder="Contact Number"
                    value={formData.customerPhone}
                    onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
                  />
                </div>
              ) : (
                <Input
                  label="Contact Phone"
                  disabled
                  value={formData.customerPhone || "Select client from dropdown"}
                />
              )}
            </div>
          </div>
        </Card>

        {/* 3. Schedule & Timing */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#C2410C]" />
              <CardTitle>Event Schedule & Shift Timing</CardTitle>
            </div>
            <CardDescription>
              Set the event date and service shift window for rostered staff
            </CardDescription>
          </CardHeader>
          <div className="p-6 pt-0">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Event Date"
                isRequired
                type="date"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              />
              <Input
                label="Service Start Time"
                isRequired
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
              <Input
                label="Service End Time"
                isRequired
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* 4. Venue & Logistics */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#C2410C]" />
              <CardTitle>Venue & Location Details</CardTitle>
            </div>
            <CardDescription>
              Venue location, directions, and special instructions for the team
            </CardDescription>
          </CardHeader>
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Venue Name"
                isRequired
                placeholder="e.g. Grand Crystal Ballroom, Taj Palace"
                value={formData.venueName}
                onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
              />
              <Input
                label="Venue Full Address"
                placeholder="e.g. 100 Diplomatic Enclave, Chanakyapuri"
                value={formData.venueAddress}
                onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[#374151] mb-1.5">
                Special Instructions & Notes
              </label>
              <textarea
                rows={3}
                className="w-full text-sm rounded-lg border border-[#D1D5DB] px-3.5 py-2.5 text-[#111827] focus:outline-none focus:ring-2 focus:ring-[#C2410C]/20 focus:border-[#C2410C]"
                placeholder="e.g. Strict dress code: All banquet staff in black bow ties. Welcome drinks start at 17:30."
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href="/admin/programs">
            <Button type="button" variant="secondary" size="md">
              Cancel
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save & Publish Program
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
}
