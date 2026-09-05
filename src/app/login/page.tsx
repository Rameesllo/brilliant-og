import { Suspense } from "react";
import { LoadingState } from "@/components/ui/LoadingState";
import { LoginForm } from "./LoginForm";

export const metadata = {
  title: "Sign In — Catering & Event ERP",
  description: "Sign in to access your catering and event management operations portal.",
};

export default function LoginPage() {
  return (
    <Suspense fallback={<LoadingState message="Loading sign in page…" />}>
      <LoginForm />
    </Suspense>
  );
}
