import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { SessionProvider } from "@/components/providers/SessionProvider";
import { PushNotificationSetup } from "@/components/providers/PushNotificationSetup";

/**
 * Admin section layout — server-side authentication guard.
 * Every page under /admin is protected by this layout.
 * Non-admin users and unauthenticated visitors are redirected.
 */
export default async function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();

  if (!session) {
    redirect("/login?callbackUrl=/admin/dashboard");
  }

  if (session.role !== "ADMIN" && session.role !== "MANAGER") {
    redirect("/employee/dashboard");
  }

  return (
    <SessionProvider user={session}>
      <div className="min-h-screen">
        {children}
        <div className="pointer-events-none fixed bottom-3 right-3 z-50 [&>*]:pointer-events-auto">
          <PushNotificationSetup />
        </div>
      </div>
    </SessionProvider>
  );
}
