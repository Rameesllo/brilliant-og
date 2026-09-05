"use client";

import React, { useState } from "react";
import { Sidebar } from "./Sidebar";
import { Header } from "./Header";
import { useSession } from "@/components/providers/SessionProvider";

export interface EmployeeLayoutProps {
  children: React.ReactNode;
  title: string;
  breadcrumbs?: { label: string; href?: string }[];
}

export const EmployeeLayout: React.FC<EmployeeLayoutProps> = ({
  children,
  title,
  breadcrumbs,
}) => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
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
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          {children}
        </main>
      </div>
    </div>
  );
};
