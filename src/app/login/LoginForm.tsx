"use client";

import React, { useState } from "react";
import { useSearchParams } from "next/navigation";
import Image from "next/image";
import { Shield, User, ArrowRight, Lock, Mail, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";

export function LoginForm() {
  const searchParams = useSearchParams();
  const callbackUrl = searchParams.get("callbackUrl") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [rememberMe, setRememberMe] = useState(true);
  const [role, setRole] = useState<"ADMIN" | "EMPLOYEE">("EMPLOYEE");
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
        credentials: "same-origin",
        body: JSON.stringify({ email, password, rememberMe }),
      });

      const data = await res.json();

      if (!res.ok || !data.ok) {
        setErrorMessage(data.error || "Authentication failed. Please check your credentials.");
        setIsLoading(false);
        return;
      }

      // Redirect to callback URL if it matches role permissions, otherwise to role dashboard
      if (callbackUrl && !callbackUrl.includes("/login")) {
        window.location.replace(callbackUrl);
      } else {
        window.location.replace(data.redirectUrl);
      }
    } catch {
      setErrorMessage("Network error connecting to authentication service. Please try again.");
      setIsLoading(false);
    }
  };

  const selectDemoRole = (selectedRole: "ADMIN" | "EMPLOYEE") => {
    setRole(selectedRole);
    setErrorMessage(null);
    setPassword("");
    setEmail("");
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Business Logo */}
        <div className="w-24 h-24 rounded-full overflow-hidden mx-auto shadow-sm">
          <Image
            src="/brilliant-event-logo.svg"
            alt="Brilliant Event"
            width={96}
            height={96}
            className="w-full h-full object-cover"
          />
        </div>
        <h1 className="mt-4 text-2xl font-bold tracking-tight text-[#111827]">
          Brilliant Event
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
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
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

        <p className="mt-6 text-center text-xs text-[#94A3B8]">
          Web built by{" "}
          <a
            href="https://portfolio-og-sandy.vercel.app/"
            target="_blank"
            rel="noopener noreferrer"
            className="font-medium text-[#64748B] hover:text-[#F97316] transition-colors"
          >
            Ramees Llo
          </a>
        </p>
      </div>
    </div>
  );
}
