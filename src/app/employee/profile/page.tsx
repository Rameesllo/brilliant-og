"use client";

import React, { useState, useEffect } from "react";
import { EmployeeLayout } from "@/components/layout/EmployeeLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Badge } from "@/components/ui/Badge";
import { CheckCircle2, AlertCircle, Loader2 } from "lucide-react";

interface ProfileState {
  name: string;
  code: string;
  email: string;
  phone: string;
  designation: string;
  department: string;
  hourlyRate: string;
  emergencyContact: string;
  address: string;
}

export default function EmployeeProfilePage() {
  const [saved, setSaved] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [profile, setProfile] = useState<ProfileState>({
    name: "",
    code: "",
    email: "",
    phone: "",
    designation: "",
    department: "",
    hourlyRate: "0.00",
    emergencyContact: "",
    address: "",
  });

  useEffect(() => {
    fetch("/api/employee/profile")
      .then((res) => {
        if (!res.ok) throw new Error("Failed to load profile");
        return res.json();
      })
      .then((data) => {
        if (data.profile) {
          setProfile({
            name: data.profile.name || "",
            code: data.profile.code || "",
            email: data.profile.email || "",
            phone: data.profile.phone || "",
            designation: data.profile.designation || "",
            department: data.profile.department || "",
            hourlyRate: String(data.profile.hourlyRate ?? "0.00"),
            emergencyContact: data.profile.emergencyContact || "",
            address: data.profile.address || "",
          });
        }
        setIsLoading(false);
      })
      .catch((err) => {
        setErrorMessage(err.message || "Failed to load profile");
        setIsLoading(false);
      });
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaved(false);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/employee/profile", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: profile.phone,
          emergencyContact: profile.emergencyContact,
          address: profile.address,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to update profile");
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 3500);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to update profile";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <EmployeeLayout
        title="Staff Profile & Credentials"
        breadcrumbs={[{ label: "Employee Portal" }, { label: "My Profile" }]}
      >
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <Loader2 className="w-8 h-8 text-[#F97316] animate-spin mb-2" />
          <p className="text-sm text-[#64748B]">Loading employee profile...</p>
        </div>
      </EmployeeLayout>
    );
  }

  const initials = profile.name
    ? profile.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)
    : "ST";

  return (
    <EmployeeLayout
      title="Staff Profile & Credentials"
      breadcrumbs={[{ label: "Employee Portal" }, { label: "My Profile" }]}
    >
      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        {saved && (
          <div className="flex items-center gap-2 p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs font-medium text-[#15803D] animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A]" />
            <span>Profile details updated successfully.</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs font-medium text-[#DC2626] animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-[#DC2626]" />
            <span>{errorMessage}</span>
          </div>
        )}

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-full bg-[#FFF7ED] border border-[#FED7AA] flex items-center justify-center text-base font-bold text-[#EA580C]">
                {initials}
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <CardTitle>{profile.name || "Employee"}</CardTitle>
                  <Badge variant="active" size="sm">Active Staff</Badge>
                </div>
                <CardDescription>
                  {profile.designation} • {profile.department} • <span className="font-mono">{profile.code}</span>
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Full Name"
                disabled
                value={profile.name}
              />
              <Input
                label="Staff ID"
                disabled
                value={profile.code}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Contact Phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
              <Input
                label="Work Email"
                type="email"
                disabled
                value={profile.email}
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                label="Primary Designation"
                disabled
                value={profile.designation}
              />
              <Input
                label="Hourly Compensation ($)"
                disabled
                value={`$${profile.hourlyRate}/hr`}
              />
            </div>

            <Input
              label="Emergency Contact & Relationship"
              value={profile.emergencyContact}
              onChange={(e) => setProfile({ ...profile, emergencyContact: e.target.value })}
            />

            <Input
              label="Residential Address"
              value={profile.address}
              onChange={(e) => setProfile({ ...profile, address: e.target.value })}
            />
          </CardContent>
          <CardFooter className="justify-end">
            <Button type="submit" variant="primary" size="md" isLoading={isSaving}>
              Update Profile Information
            </Button>
          </CardFooter>
        </Card>
      </form>
    </EmployeeLayout>
  );
}
