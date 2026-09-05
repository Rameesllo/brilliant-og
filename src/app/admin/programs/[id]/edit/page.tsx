"use client";

import React, { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { LoadingState } from "@/components/ui/LoadingState";
import { ArrowLeft, Save, Calendar, MapPin, Users } from "lucide-react";

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  code: string;
}

export default function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: programId } = use(params);
  const router = useRouter();

  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [customers, setCustomers] = useState<CustomerOption[]>([]);

  const [formData, setFormData] = useState({
    title: "",
    type: "WEDDING",
    customerId: "",
    eventDate: "",
    startTime: "17:00",
    endTime: "23:00",
    venueName: "",
    venueAddress: "",
    expectedGuests: "0",
    requiredStaffCount: "0",
    budget: "0",
    status: "UPCOMING",
    notes: "",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    async function loadData() {
      try {
        setIsLoading(true);
        const [progRes, custRes] = await Promise.all([
          fetch(`/api/programs/${programId}`),
          fetch("/api/customers?limit=100"),
        ]);

        if (!progRes.ok) {
          throw new Error(`Failed to load program (${progRes.status})`);
        }

        const progData = await progRes.json();
        const p = progData.program;

        if (custRes.ok) {
          const custData = await custRes.json();
          if (custData.customers) setCustomers(custData.customers);
        }

        setFormData({
          title: p.title || "",
          type: p.type || "WEDDING",
          customerId: p.customer?.id || "",
          eventDate: p.eventDate ? p.eventDate.split("T")[0] : "",
          startTime: p.startTime || "17:00",
          endTime: p.endTime || "23:00",
          venueName: p.venueName || "",
          venueAddress: p.venueAddress || "",
          expectedGuests: String(p.expectedGuests || 0),
          requiredStaffCount: String(p.requiredStaffCount || 0),
          budget: String(p.budget || 0),
          status: p.status || "UPCOMING",
          notes: p.notes || "",
        });
      } catch (err) {
        console.error("Error loading program for edit:", err);
        setLoadError(err instanceof Error ? err.message : "Failed to load program");
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [programId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!formData.title.trim()) {
      setErrorMessage("Program title is required.");
      return;
    }
    if (!formData.eventDate) {
      setErrorMessage("Event date is required.");
      return;
    }
    if (!formData.venueName.trim()) {
      setErrorMessage("Venue name is required.");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: formData.title.trim(),
        type: formData.type,
        customerId: formData.customerId || undefined,
        eventDate: formData.eventDate,
        startTime: formData.startTime,
        endTime: formData.endTime,
        venueName: formData.venueName.trim(),
        venueAddress: formData.venueAddress.trim(),
        expectedGuests: parseInt(formData.expectedGuests, 10) || 0,
        requiredStaffCount: parseInt(formData.requiredStaffCount, 10) || 0,
        budget: parseFloat(formData.budget) || 0,
        status: formData.status,
        notes: formData.notes.trim() || undefined,
      };

      const res = await fetch(`/api/programs/${programId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update program");
      }

      router.push(`/admin/programs/${programId}`);
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error saving program changes");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout
        title="Edit Program"
        breadcrumbs={[
          { label: "Admin Console" },
          { label: "Programs", href: "/admin/programs" },
          { label: "Edit" },
        ]}
      >
        <div className="p-16">
          <LoadingState message="Loading program details for editing..." />
        </div>
      </AdminLayout>
    );
  }

  if (loadError) {
    return (
      <AdminLayout
        title="Edit Program"
        breadcrumbs={[
          { label: "Admin Console" },
          { label: "Programs", href: "/admin/programs" },
          { label: "Edit" },
        ]}
      >
        <div className="p-12 text-center">
          <p className="text-sm text-red-600 mb-4">{loadError}</p>
          <Link href="/admin/programs">
            <Button variant="outline" size="sm">
              Back to Programs
            </Button>
          </Link>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title={`Edit: ${formData.title}`}
      breadcrumbs={[
        { label: "Admin Console" },
        { label: "Programs", href: "/admin/programs" },
        { label: "Details", href: `/admin/programs/${programId}` },
        { label: "Edit" },
      ]}
    >
      <form onSubmit={handleSubmit} className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <Link href={`/admin/programs/${programId}`}>
            <Button
              type="button"
              variant="outline"
              size="sm"
              leftIcon={<ArrowLeft className="w-4 h-4" />}
            >
              Cancel & Back
            </Button>
          </Link>
          <Button
            type="submit"
            variant="primary"
            size="md"
            isLoading={isSubmitting}
            leftIcon={<Save className="w-4 h-4" />}
          >
            Save Changes
          </Button>
        </div>

        {errorMessage && (
          <div className="p-4 bg-red-50 border border-red-200 text-red-700 text-sm rounded-lg font-medium">
            {errorMessage}
          </div>
        )}

        {/* 1. Core Event Info */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Calendar className="w-5 h-5 text-[#C2410C]" />
              <CardTitle>Event Overview & Status</CardTitle>
            </div>
            <CardDescription>Update title, type classification, and event status</CardDescription>
          </CardHeader>
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Program Title"
                  isRequired
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

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Select
                label="Current Lifecycle Status"
                isRequired
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                options={[
                  { value: "UPCOMING", label: "Upcoming (Rostering / Planning)" },
                  { value: "IN_PROGRESS", label: "In Progress (Live Event)" },
                  { value: "COMPLETED", label: "Completed (Finished)" },
                  { value: "CANCELLED", label: "Cancelled" },
                ]}
              />

              <Select
                label="Assigned Customer"
                value={formData.customerId}
                onChange={(e) => setFormData({ ...formData, customerId: e.target.value })}
                options={[
                  { value: "", label: "-- Keep current customer --" },
                  ...customers.map((c) => ({
                    value: c.id,
                    label: `${c.name} (${c.phone || c.code})`,
                  })),
                ]}
              />
            </div>
          </div>
        </Card>

        {/* 2. Schedule & Capacity */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C2410C]" />
              <CardTitle>Schedule & Capacity Requirements</CardTitle>
            </div>
            <CardDescription>Event date, service window, and staffing quota</CardDescription>
          </CardHeader>
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <Input
                label="Event Date"
                isRequired
                type="date"
                value={formData.eventDate}
                onChange={(e) => setFormData({ ...formData, eventDate: e.target.value })}
              />
              <Input
                label="Start Time"
                isRequired
                type="time"
                value={formData.startTime}
                onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
              />
              <Input
                label="End Time"
                isRequired
                type="time"
                value={formData.endTime}
                onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2">
              <Input
                label="Expected Guests"
                type="number"
                value={formData.expectedGuests}
                onChange={(e) => setFormData({ ...formData, expectedGuests: e.target.value })}
              />
              <Input
                label="Required Staff Count"
                isRequired
                type="number"
                value={formData.requiredStaffCount}
                onChange={(e) => setFormData({ ...formData, requiredStaffCount: e.target.value })}
              />
              <Input
                label="Estimated Budget"
                type="number"
                value={formData.budget}
                onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* 3. Venue Details */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MapPin className="w-5 h-5 text-[#C2410C]" />
              <CardTitle>Venue & Location Details</CardTitle>
            </div>
            <CardDescription>Location coordinates and logistics notes</CardDescription>
          </CardHeader>
          <div className="p-6 pt-0 space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Venue Name"
                isRequired
                value={formData.venueName}
                onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
              />
              <Input
                label="Venue Address"
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
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              />
            </div>
          </div>
        </Card>

        {/* Bottom Actions */}
        <div className="flex items-center justify-end gap-3 pt-2">
          <Link href={`/admin/programs/${programId}`}>
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
            Save Changes
          </Button>
        </div>
      </form>
    </AdminLayout>
  );
}
