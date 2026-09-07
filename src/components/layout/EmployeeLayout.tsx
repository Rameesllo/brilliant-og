"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Clock, LayoutDashboard, List, Wallet } from "lucide-react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useSession } from "@/components/providers/SessionProvider";
import { PushNotificationSetup } from "@/components/providers/PushNotificationSetup";

export interface EmployeeLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

const mobileNavItems = [
  { label: "Home", href: "/employee/dashboard", icon: LayoutDashboard },
  { label: "All Programs", href: "/employee/programs", icon: List },
  { label: "My Programs", href: "/employee/my-programs", icon: Calendar },
  { label: "Attendance", href: "/employee/attendance", icon: Clock },
  { label: "Earnings", href: "/employee/earnings", icon: Wallet },
];

export const EmployeeLayout: React.FC<EmployeeLayoutProps> = ({
  children,
  title,
  breadcrumbs,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();
  const { user } = useSession();

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      {/* Desktop & Mobile Responsive Sidebar */}
      <Sidebar
        role="EMPLOYEE"
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
      />

      {/* Main Content Area */}
      <div className="flex flex-col flex-1 min-w-0">
        <Header
          title={title}
          breadcrumbs={breadcrumbs}
          userRole="EMPLOYEE"
          userName={user?.name ?? "Staff"}
          userEmail={user?.email ?? ""}
          onMobileMenuToggle={() => setMobileMenuOpen(!mobileMenuOpen)}
        />
        <main className="flex-1 p-4 pb-24 sm:p-6 sm:pb-24 lg:p-8 lg:pb-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
        <p className="pb-5 text-center text-xs text-[#94A3B8]">
          <span className="mb-2 block">
            <PushNotificationSetup />
          </span>
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
        <nav
          aria-label="Employee navigation"
          className="fixed inset-x-0 bottom-0 z-30 border-t border-[#E5E7EB] bg-white/95 px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-2 shadow-[0_-4px_16px_rgba(15,23,42,0.06)] backdrop-blur lg:hidden"
        >
          <div className="mx-auto grid max-w-md grid-cols-5 gap-1">
            {mobileNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = pathname === item.href || pathname.startsWith(`${item.href}/`);

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex min-h-12 flex-col items-center justify-center gap-1 rounded-lg text-[10px] font-medium transition-colors ${
                    isActive
                      ? "bg-[#FFF7ED] text-[#C2410C]"
                      : "text-[#64748B] hover:bg-[#F8FAFC] hover:text-[#111827]"
                  }`}
                >
                  <Icon className={`h-4 w-4 ${isActive ? "text-[#F97316]" : "text-[#94A3B8]"}`} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      </div>
    </div>
  );
};
