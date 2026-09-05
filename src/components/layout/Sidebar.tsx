"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Users,
  Contact2,
  Package,
  FileText,
  CreditCard,
  BarChart3,
  Settings,
  Clock,
  Wallet,
  UserCheck,
  X,
  UtensilsCrossed,
  Bell,
  Shield,
} from "lucide-react";

export interface SidebarProps {
  role?: "ADMIN" | "EMPLOYEE";
  isOpen?: boolean;
  onClose?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  role = "ADMIN",
  isOpen = false,
  onClose,
}) => {
  const pathname = usePathname();

  const adminNavItems = [
    { label: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
    { label: "Programs", href: "/admin/programs", icon: Calendar },
    { label: "Employees", href: "/admin/employees", icon: Users },
    { label: "Customers", href: "/admin/customers", icon: Contact2 },
    { label: "Products", href: "/admin/products", icon: Package },
    { label: "Invoices", href: "/admin/invoices", icon: FileText },
    { label: "Payments", href: "/admin/payments", icon: CreditCard },
    { label: "Reports", href: "/admin/reports", icon: BarChart3 },
    { label: "Notifications", href: "/admin/notifications", icon: Bell },
    { label: "Activity Log", href: "/admin/activity", icon: Shield },
    { label: "Settings", href: "/admin/settings", icon: Settings },
  ];

  const employeeNavItems = [
    { label: "Dashboard", href: "/employee/dashboard", icon: LayoutDashboard },
    { label: "All Programs", href: "/employee/programs", icon: Calendar },
    { label: "My Programs", href: "/employee/my-programs", icon: UserCheck },
    { label: "Attendance", href: "/employee/attendance", icon: Clock },
    { label: "Earnings", href: "/employee/earnings", icon: Wallet },
    { label: "My Profile", href: "/employee/profile", icon: Users },
  ];

  const navItems = role === "ADMIN" ? adminNavItems : employeeNavItems;

  const NavContent = (
    <div className="flex flex-col h-full bg-white border-r border-[#E5E7EB]">
      {/* Brand logo & company title */}
      <div className="flex items-center justify-between h-16 px-5 border-b border-[#E5E7EB]">
        <Link href={role === "ADMIN" ? "/admin/dashboard" : "/employee/dashboard"} className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-lg bg-[#F97316] text-white flex items-center justify-center shadow-xs">
            <UtensilsCrossed className="w-5 h-5" />
          </div>
          <div>
            <span className="text-sm font-bold text-[#111827] tracking-tight block leading-tight">
              Catering ERP
            </span>
            <span className="text-[10px] font-medium text-[#64748B] uppercase tracking-wider block">
              {role === "ADMIN" ? "Admin Console" : "Staff Portal"}
            </span>
          </div>
        </Link>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-[#94A3B8] hover:text-[#111827] rounded-lg lg:hidden"
            aria-label="Close sidebar"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation links */}
      <div className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        <div className="px-3 pb-2 text-[11px] font-semibold text-[#94A3B8] uppercase tracking-wider">
          {role === "ADMIN" ? "Management" : "My Work"}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = pathname === item.href || (item.href !== "/admin" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onClose}
              className={cn(
                "flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-lg transition-colors group relative",
                isActive
                  ? "bg-[#FFF7ED] text-[#C2410C] font-semibold"
                  : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#111827]"
              )}
            >
              {isActive && (
                <span className="absolute left-0 top-1.5 bottom-1.5 w-1 bg-[#F97316] rounded-r-full" />
              )}
              <Icon
                className={cn(
                  "w-4 h-4 transition-colors shrink-0",
                  isActive
                    ? "text-[#F97316]"
                    : "text-[#94A3B8] group-hover:text-[#64748B]"
                )}
              />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </div>

      {/* Bottom system status badge */}
      <div className="p-3.5 m-3 rounded-lg bg-[#F8FAFC] border border-[#E5E7EB] text-xs">
        <div className="flex items-center justify-between mb-1">
          <span className="text-[11px] font-semibold text-[#111827]">System Online</span>
          <span className="w-2 h-2 rounded-full bg-[#16A34A] animate-pulse" />
        </div>
        <p className="text-[11px] text-[#64748B] leading-tight">
          ERP v1.0 • Enterprise Ready
        </p>
      </div>
    </div>
  );

  return (
    <>
      {/* Desktop Sidebar (Fixed) */}
      <aside className="hidden lg:block w-64 shrink-0 h-screen sticky top-0">
        {NavContent}
      </aside>

      {/* Mobile Drawer Backdrop & Container */}
      {isOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div
            className="fixed inset-0 bg-[#0F172A]/40 backdrop-blur-xs"
            onClick={onClose}
            aria-hidden="true"
          />
          <div className="fixed inset-y-0 left-0 w-64 max-w-[80vw] bg-white shadow-xl z-50 animate-in slide-in-from-left duration-200">
            {NavContent}
          </div>
        </div>
      )}
    </>
  );
};
