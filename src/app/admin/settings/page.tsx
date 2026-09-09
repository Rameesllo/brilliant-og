"use client";

import React, { useState, useEffect, useCallback } from "react";
import { AdminLayout } from "@/components/layout/AdminLayout";
import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Select } from "@/components/ui/Select";
import { 
  CheckCircle2, 
  Building, 
  Receipt, 
  User, 
  Key, 
  RotateCcw, 
  AlertCircle,
  Loader2,
  FileText
} from "lucide-react";

interface BusinessSettingsState {
  companyName: string;
  tagline: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  taxId: string;
  currencySymbol: string;
  currencyCode: string;
  defaultTaxRate: string;
  invoicePrefix: string;
  receiptPrefix: string;
  payoutPrefix: string;
  termsAndConditions: string;
}

export default function AdminSettingsPage() {
  // Business Settings State
  const [initialSettings, setInitialSettings] = useState<BusinessSettingsState | null>(null);
  const [settings, setSettings] = useState<BusinessSettingsState>({
    companyName: "",
    tagline: "",
    email: "",
    phone: "",
    address: "",
    city: "",
    taxId: "",
    currencySymbol: "₹",
    currencyCode: "INR",
    defaultTaxRate: "5.00",
    invoicePrefix: "INV",
    receiptPrefix: "RCP",
    payoutPrefix: "PAY",
    termsAndConditions: "",
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // User Profile & Password State
  const [currentUser, setCurrentUser] = useState<{ id: string; name: string; email: string; role: string } | null>(null);
  const [passwordState, setPasswordState] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);
  const [passwordError, setPasswordError] = useState<string | null>(null);

  // Fetch initial business settings & current user
  const fetchSettings = useCallback(async () => {
    setIsLoading(true);
    try {
      const [settingsRes, meRes] = await Promise.all([
        fetch("/api/settings"),
        fetch("/api/auth/me"),
      ]);

      if (settingsRes.ok) {
        const data = await settingsRes.json();
        if (data.settings) {
          const loaded: BusinessSettingsState = {
            companyName: data.settings.companyName || "",
            tagline: data.settings.tagline || "",
            email: data.settings.email || "",
            phone: data.settings.phone || "",
            address: data.settings.address || "",
            city: data.settings.city || "",
            taxId: data.settings.taxId || "",
            currencySymbol: data.settings.currencySymbol || "₹",
            currencyCode: data.settings.currencyCode || "INR",
            defaultTaxRate: String(data.settings.defaultTaxRate ?? "5.00"),
            invoicePrefix: data.settings.invoicePrefix || "INV",
            receiptPrefix: data.settings.receiptPrefix || "RCP",
            payoutPrefix: data.settings.payoutPrefix || "PAY",
            termsAndConditions: data.settings.termsAndConditions || "",
          };
          setSettings(loaded);
          setInitialSettings(loaded);
        }
      }

      if (meRes.ok) {
        const meData = await meRes.json();
        if (meData.user) {
          setCurrentUser(meData.user);
        }
      }
    } catch (err) {
      console.error("Failed to load settings:", err);
      setErrorMessage("Failed to load system settings from server.");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Handle Business Settings Save
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage(null);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to save settings.");
      }

      setInitialSettings(settings);
      setSuccessMessage("Business settings saved and synced to database.");
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error saving settings";
      setErrorMessage(msg);
    } finally {
      setIsSaving(false);
    }
  };

  // Reset unsaved changes
  const handleReset = () => {
    if (initialSettings) {
      setSettings(initialSettings);
      setErrorMessage(null);
    }
  };

  // Handle Password Change
  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsChangingPassword(true);
    setPasswordSuccess(null);
    setPasswordError(null);

    if (passwordState.newPassword !== passwordState.confirmPassword) {
      setPasswordError("New passwords do not match.");
      setIsChangingPassword(false);
      return;
    }

    if (passwordState.newPassword.length < 8) {
      setPasswordError("Password must be at least 8 characters long.");
      setIsChangingPassword(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(passwordState),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to change password.");
      }

      setPasswordSuccess("Password successfully changed.");
      setPasswordState({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      setTimeout(() => setPasswordSuccess(null), 4000);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Error updating password";
      setPasswordError(msg);
    } finally {
      setIsChangingPassword(false);
    }
  };

  if (isLoading) {
    return (
      <AdminLayout
        title="Business & System Settings"
        breadcrumbs={[{ label: "Admin Console" }, { label: "Settings" }]}
      >
        <div className="flex flex-col items-center justify-center min-h-[300px] text-center">
          <Loader2 className="w-8 h-8 text-[#F97316] animate-spin mb-2" />
          <p className="text-sm text-[#64748B]">Loading business settings...</p>
        </div>
      </AdminLayout>
    );
  }

  return (
    <AdminLayout
      title="Business & System Settings"
      breadcrumbs={[{ label: "Admin Console" }, { label: "Settings" }]}
    >
      <div className="space-y-8 max-w-4xl">
        {/* Top Notifications */}
        {successMessage && (
          <div className="flex items-center gap-2 p-3.5 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs font-medium text-[#15803D] animate-in fade-in">
            <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
            <span>{successMessage}</span>
          </div>
        )}

        {errorMessage && (
          <div className="flex items-center gap-2 p-3.5 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs font-medium text-[#DC2626] animate-in fade-in">
            <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* 1. BUSINESS PROFILE & SETTINGS FORM */}
        <form onSubmit={handleSaveSettings} className="space-y-6">
          {/* Company Profile Section */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Building className="w-4 h-4 text-[#F97316]" />
                <div>
                  <CardTitle>Catering Business Profile</CardTitle>
                  <CardDescription>Primary organization information displayed on client contracts and invoices</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Company Legal Name"
                  isRequired
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                />
                <Input
                  label="Tagline / Brand Subtitle"
                  value={settings.tagline}
                  onChange={(e) => setSettings({ ...settings, tagline: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Input
                  label="Operations Email"
                  type="email"
                  isRequired
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                />
                <Input
                  label="Contact Phone"
                  isRequired
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-2">
                  <Input
                    label="Office & Warehouse Address"
                    isRequired
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  />
                </div>
                <Input
                  label="City / Region"
                  value={settings.city}
                  onChange={(e) => setSettings({ ...settings, city: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          {/* Financial & Invoicing Defaults */}
          <Card>
            <CardHeader>
              <div className="flex items-center gap-2.5">
                <Receipt className="w-4 h-4 text-[#F97316]" />
                <div>
                  <CardTitle>Invoicing & Financial Configuration</CardTitle>
                  <CardDescription>Document prefixes, tax rates, and legal footer terms (Historical invoices remain unchanged)</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Business Tax ID / GSTIN"
                  value={settings.taxId}
                  onChange={(e) => setSettings({ ...settings, taxId: e.target.value })}
                />
                <Input
                  label="Default Sales Tax (%)"
                  type="number"
                  step="0.01"
                  min="0"
                  max="100"
                  value={settings.defaultTaxRate}
                  onChange={(e) => setSettings({ ...settings, defaultTaxRate: e.target.value })}
                />
                <Select
                  label="Operating Currency"
                  value={settings.currencyCode}
                  onChange={(e) => {
                    const val = e.target.value;
                    const symbols: Record<string, string> = {
                      INR: "₹",
                      USD: "$",
                      EUR: "€",
                      GBP: "£",
                    };
                    setSettings({
                      ...settings,
                      currencyCode: val,
                      currencySymbol: symbols[val] || val,
                    });
                  }}
                  options={[
                    { value: "INR", label: "INR (₹) - Indian Rupee" },
                    { value: "USD", label: "USD ($) - US Dollar" },
                    { value: "EUR", label: "EUR (€) - Euro" },
                    { value: "GBP", label: "GBP (£) - British Pound" },
                  ]}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Invoice Code Prefix"
                  value={settings.invoicePrefix}
                  onChange={(e) => setSettings({ ...settings, invoicePrefix: e.target.value })}
                />
                <Input
                  label="Receipt Code Prefix"
                  value={settings.receiptPrefix}
                  onChange={(e) => setSettings({ ...settings, receiptPrefix: e.target.value })}
                />
                <Input
                  label="Payout Code Prefix"
                  value={settings.payoutPrefix}
                  onChange={(e) => setSettings({ ...settings, payoutPrefix: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[#111827] mb-1.5 flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5 text-[#64748B]" />
                  Default Terms & Conditions / Invoice Notes
                </label>
                <textarea
                  className="w-full text-xs bg-white border border-[#E5E7EB] rounded-lg p-3 text-[#111827] placeholder:text-[#94A3B8] focus:outline-hidden focus:ring-1 focus:ring-[#F97316] focus:border-[#F97316] transition-colors"
                  rows={3}
                  placeholder="e.g. 50% advance required upon booking. Balance due 3 days prior to event date."
                  value={settings.termsAndConditions}
                  onChange={(e) => setSettings({ ...settings, termsAndConditions: e.target.value })}
                />
                <p className="text-[11px] text-[#94A3B8] mt-1">
                  Appears as default payment terms on newly generated catering client invoices
                </p>
              </div>
            </CardContent>
            <CardFooter className="justify-between bg-[#F8FAFC]/50 border-t border-[#E5E7EB]">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                leftIcon={<RotateCcw className="w-3.5 h-3.5 text-[#64748B]" />}
                onClick={handleReset}
              >
                Reset Unsaved Changes
              </Button>
              <Button type="submit" variant="primary" size="md" isLoading={isSaving}>
                Save Business Settings
              </Button>
            </CardFooter>
          </Card>
        </form>

        {/* 2. ADMIN USER ACCOUNT SETTINGS */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <User className="w-4 h-4 text-[#F97316]" />
              <div>
                <CardTitle>Admin Account Profile</CardTitle>
                <CardDescription>Your current administrative credentials and system role</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <span className="text-xs text-[#64748B] block mb-1">Full Name</span>
                <p className="text-sm font-semibold text-[#111827]">{currentUser?.name || "Victoria Sterling"}</p>
              </div>
              <div>
                <span className="text-xs text-[#64748B] block mb-1">Account Email</span>
                <p className="text-sm font-semibold text-[#111827]">{currentUser?.email || "victoria@royalheritage.com"}</p>
              </div>
              <div>
                <span className="text-xs text-[#64748B] block mb-1">System Authorization</span>
                <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-[#FFF7ED] text-[#EA580C] border border-[#FED7AA]">
                  {currentUser?.role || "ADMIN"}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* 3. PASSWORD CHANGE */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2.5">
              <Key className="w-4 h-4 text-[#F97316]" />
              <div>
                <CardTitle>Change Account Password</CardTitle>
                <CardDescription>Ensure your administrative account is secured with a strong password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <form onSubmit={handlePasswordChange}>
            <CardContent className="space-y-4">
              {passwordSuccess && (
                <div className="flex items-center gap-2 p-3 bg-[#F0FDF4] border border-[#BBF7D0] rounded-xl text-xs font-medium text-[#15803D]">
                  <CheckCircle2 className="w-4 h-4 text-[#16A34A] shrink-0" />
                  <span>{passwordSuccess}</span>
                </div>
              )}

              {passwordError && (
                <div className="flex items-center gap-2 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-xl text-xs font-medium text-[#DC2626]">
                  <AlertCircle className="w-4 h-4 text-[#DC2626] shrink-0" />
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <Input
                  label="Current Password"
                  type="password"
                  isRequired
                  value={passwordState.currentPassword}
                  onChange={(e) => setPasswordState({ ...passwordState, currentPassword: e.target.value })}
                />
                <Input
                  label="New Password"
                  type="password"
                  isRequired
                  value={passwordState.newPassword}
                  onChange={(e) => setPasswordState({ ...passwordState, newPassword: e.target.value })}
                />
                <Input
                  label="Confirm New Password"
                  type="password"
                  isRequired
                  value={passwordState.confirmPassword}
                  onChange={(e) => setPasswordState({ ...passwordState, confirmPassword: e.target.value })}
                />
              </div>
            </CardContent>
            <CardFooter className="justify-end bg-[#F8FAFC]/50 border-t border-[#E5E7EB]">
              <Button
                type="submit"
                variant="secondary"
                size="md"
                isLoading={isChangingPassword}
              >
                Update Password
              </Button>
            </CardFooter>
          </form>
        </Card>
      </div>
    </AdminLayout>
  );
}
