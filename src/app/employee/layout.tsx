import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SessionProvider } from "@/components/providers/SessionProvider";

/**
 * Employee section layout — server-side authentication guard.
 * Every page under /employee is protected by this layout.
 * Unauthenticated users are redirected to /login.
 * Admin users visiting /employee are redirected to their own dashboard.
 */
export default async function EmployeeSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login?callbackUrl=/employee/dashboard");
  }

  if (session.role !== "EMPLOYEE") {
    redirect("/admin/dashboard");
  }

  return (
    <SessionProvider user={session}>
      {children}
    </SessionProvider>
  );
}
