"use client";

import React, { useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { UtensilsCrossed, Shield, User, ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";

  const [email, setEmail] = useState("victoria@royalheritage.com");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<"ADMIN" | "EMPLOYEE">("ADMIN");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setErrorMessage(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || "Authentication failed. Please check your credentials.");
        setIsLoading(false);
        return;
      }

      // Redirect to callback URL if it matches role permissions, otherwise to role dashboard
      if (callbackUrl && !callbackUrl.includes("/login")) {
        router.push(callbackUrl);
      } else {
        router.push(data.redirectUrl);
      }
      router.refresh();
    } catch {
      setErrorMessage("Network error connecting to authentication service. Please try again.");
      setIsLoading(false);
    }
  };

  const selectDemoRole = (selectedRole: "ADMIN" | "EMPLOYEE") => {
    setRole(selectedRole);
    setErrorMessage(null);
    setPassword("");
    if (selectedRole === "ADMIN") {
      setEmail("victoria@royalheritage.com");
    } else {
      setEmail("marcus.vance@royalheritage.com");
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Brand Icon */}
        <div className="w-12 h-12 rounded-xl bg-[#F97316] text-white flex items-center justify-center mx-auto shadow-sm">
          <UtensilsCrossed className="w-6 h-6" />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#111827]">
          Catering & Event ERP
        </h1>
        <p className="mt-1 text-sm text-[#64748B]">
          Sign in to access your operations portal
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="bg-white py-8 px-6 sm:px-10 border border-[#E5E7EB] rounded-2xl shadow-xs">
          {/* Role selector tabs */}
          <div className="mb-6 p-1 bg-[#F8FAFC] rounded-lg border border-[#E2E8F0] flex gap-1">
            <button
              type="button"
              onClick={() => selectDemoRole("ADMIN")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                role === "ADMIN"
                  ? "bg-white text-[#111827] shadow-2xs border border-[#E5E7EB]"
                  : "text-[#64748B] hover:text-[#111827]"
              }`}
            >
              <Shield className={`w-3.5 h-3.5 ${role === "ADMIN" ? "text-[#F97316]" : "text-[#94A3B8]"}`} />
              Admin Portal
            </button>
            <button
              type="button"
              onClick={() => selectDemoRole("EMPLOYEE")}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-md flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                role === "EMPLOYEE"
                  ? "bg-white text-[#111827] shadow-2xs border border-[#E5E7EB]"
                  : "text-[#64748B] hover:text-[#111827]"
              }`}
            >
              <User className={`w-3.5 h-3.5 ${role === "EMPLOYEE" ? "text-[#F97316]" : "text-[#94A3B8]"}`} />
              Employee Portal
            </button>
          </div>

          {/* Error notification */}
          {errorMessage && (
            <div className="mb-4 p-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex items-start gap-2 text-xs text-[#B91C1C]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#DC2626]" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-4">
            <Input
              label="Email address"
              type="email"
              isRequired
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              leftIcon={<Mail className="w-4 h-4" />}
            />

            <Input
              label="Password"
              type="password"
              isRequired
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              leftIcon={<Lock className="w-4 h-4" />}
            />

            <div className="flex items-center justify-between text-xs pt-1">
              <label className="flex items-center gap-2 cursor-pointer text-[#475569]">
                <input
                  type="checkbox"
                  defaultChecked
                  className="rounded border-[#CBD5E1] text-[#F97316] focus:ring-[#F97316]"
                />
                Remember this device
              </label>
              <span className="text-[#64748B] hover:text-[#111827] cursor-pointer">
                Forgot password?
              </span>
            </div>

            <Button
              type="submit"
              variant="primary"
              size="lg"
              className="w-full mt-2"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-4 h-4" />}
            >
              Sign In as {role === "ADMIN" ? "Operations Manager" : "Event Staff"}
            </Button>
          </form>

          {/* Credentials helper */}
          <div className="mt-6 pt-5 border-t border-[#F1F5F9] text-center">
            <p className="text-xs text-[#64748B] font-medium mb-1">
              Encrypted Session & Access Control
            </p>
            <p className="text-[11px] text-[#94A3B8]">
              {role === "ADMIN"
                ? "Admin Portal: Operations & Management"
                : "Employee Portal: Staff Shifts & Assignments"}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
