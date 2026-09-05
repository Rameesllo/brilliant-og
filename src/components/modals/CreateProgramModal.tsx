"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/Modal";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";

export interface CreateProgramModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

interface CustomerOption {
  id: string;
  name: string;
  phone: string;
  code: string;
}

export const CreateProgramModal: React.FC<CreateProgramModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
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
    requiredStaffCount: "12",
    budget: "15000",
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      // Fetch customers
      fetch("/api/customers?limit=100")
        .then((res) => res.json())
        .then((data) => {
          if (data.customers) {
            setCustomers(data.customers);
          }
        })
        .catch((err) => console.error("Failed to load customers:", err));
    }
  }, [isOpen]);

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
      setErrorMessage("Please enter a program title.");
      return;
    }
    if (!formData.eventDate) {
      setErrorMessage("Please select an event date.");
      return;
    }
    if (!formData.venueName.trim()) {
      setErrorMessage("Please enter a venue name.");
      return;
    }

    if (!selectedCustomerId || selectedCustomerId === "NEW") {
      if (!formData.customerName.trim()) {
        setErrorMessage("Please select or enter customer name.");
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

      // Reset form
      setFormData({
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
        requiredStaffCount: "12",
        budget: "15000",
      });
      setSelectedCustomerId("");
      setIsCustomCustomer(false);

      onSuccess?.();
      onClose();
    } catch (err) {
      setErrorMessage(err instanceof Error ? err.message : "Error creating program");
    } finally {
      setIsSubmitting(false);
    }
  };

  const customerOptions = [
    { value: "", label: "-- Select Customer --" },
    ...customers.map((c) => ({
      value: c.id,
      label: `${c.name} (${c.phone || c.code})`,
    })),
    { value: "NEW", label: "+ Add New Customer" },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Event / Program"
      description="Schedule a new catering or event program, configure staff requirement and venue details."
      maxWidth="xl"
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
            Create Program
          </Button>
        </>
      }
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-50 border border-red-200 text-red-700 text-xs rounded-lg font-medium">
            {errorMessage}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Event / Program Title"
            isRequired
            placeholder="e.g. Sharma Wedding Grand Reception"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
          <Select
            label="Program Type"
            isRequired
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            options={[
              { value: "WEDDING", label: "Wedding Program" },
              { value: "BIRTHDAY", label: "Birthday Program" },
              { value: "CORPORATE", label: "Corporate Banquet" },
              { value: "RECEPTION", label: "Cocktail & Reception" },
              { value: "ANNIVERSARY", label: "Anniversary Celebration" },
              { value: "OTHER", label: "Custom Event" },
            ]}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Select
            label="Customer"
            isRequired
            value={selectedCustomerId}
            onChange={(e) => handleCustomerSelect(e.target.value)}
            options={customerOptions}
          />

          {(isCustomCustomer || customers.length === 0) ? (
            <div className="grid grid-cols-2 gap-2">
              <Input
                label="Customer Name"
                isRequired
                placeholder="Full Name"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
              />
              <Input
                label="Phone"
                placeholder="Phone number"
                value={formData.customerPhone}
                onChange={(e) => setFormData({ ...formData, customerPhone: e.target.value })}
              />
            </div>
          ) : (
            <Input
              label="Customer Contact"
              disabled
              value={formData.customerPhone ? `${formData.customerName} • ${formData.customerPhone}` : "Select a customer from the dropdown"}
            />
          )}
        </div>

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

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Input
            label="Venue Name"
            isRequired
            placeholder="e.g. Grand Ballroom, Marriott Suites"
            value={formData.venueName}
            onChange={(e) => setFormData({ ...formData, venueName: e.target.value })}
          />
          <Input
            label="Venue Address"
            placeholder="e.g. 700 Riverside Blvd, Metro City"
            value={formData.venueAddress}
            onChange={(e) => setFormData({ ...formData, venueAddress: e.target.value })}
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Input
            label="Expected Guests"
            type="number"
            placeholder="e.g. 250"
            value={formData.expectedGuests}
            onChange={(e) => setFormData({ ...formData, expectedGuests: e.target.value })}
          />
          <Input
            label="Required Staff"
            type="number"
            placeholder="e.g. 15"
            value={formData.requiredStaffCount}
            onChange={(e) => setFormData({ ...formData, requiredStaffCount: e.target.value })}
          />
          <Input
            label="Est. Budget ($)"
            type="number"
            placeholder="e.g. 18000"
            value={formData.budget}
            onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
          />
        </div>
      </form>
    </Modal>
  );
};
