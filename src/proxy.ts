import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const SESSION_COOKIE_NAME = "catering_erp_session";
const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "catering-erp-secret-key-32-chars-minimum-production-secure"
);

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE_NAME)?.value;

  let sessionUser: { role: string; email: string } | null = null;
  let isTokenInvalid = false;

  if (token) {
    try {
      const { payload } = await jwtVerify(token, AUTH_SECRET);
      sessionUser = {
        role: payload.role as string,
        email: payload.email as string,
      };
    } catch {
      // Invalid or expired token
      sessionUser = null;
      isTokenInvalid = true;
    }
  }

  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/");
  const isEmployeeRoute = pathname === "/employee" || pathname.startsWith("/employee/");
  const isLoginRoute = pathname === "/login";
  const isRootRoute = pathname === "/";

  // Helper to attach cookie deletion if token was corrupted/expired
  const handleRedirect = (targetUrl: URL | string) => {
    const response = NextResponse.redirect(targetUrl);
    if (isTokenInvalid) {
      response.cookies.delete(SESSION_COOKIE_NAME);
    }
    return response;
  };

  // 1. Root route: redirect authenticated users to their dashboard, otherwise to login
  if (isRootRoute) {
    if (!sessionUser) {
      return handleRedirect(new URL("/login", request.url));
    }
    if (sessionUser.role === "ADMIN" || sessionUser.role === "MANAGER") {
      return handleRedirect(new URL("/admin/dashboard", request.url));
    }
    return handleRedirect(new URL("/employee/dashboard", request.url));
  }

  // 2. Unauthenticated users trying to access protected areas
  if (!sessionUser && (isAdminRoute || isEmployeeRoute)) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return handleRedirect(loginUrl);
  }

  // 3. Authenticated users visiting /login -> redirect to their designated dashboard
  if (sessionUser && isLoginRoute) {
    if (sessionUser.role === "ADMIN" || sessionUser.role === "MANAGER") {
      return NextResponse.redirect(new URL("/admin/dashboard", request.url));
    }
    return NextResponse.redirect(new URL("/employee/dashboard", request.url));
  }

  // 4. Role-Based Access Control: Strict Isolation
  // Employee trying to access Admin area
  if (sessionUser && sessionUser.role === "EMPLOYEE" && isAdminRoute) {
    return NextResponse.redirect(new URL("/employee/dashboard", request.url));
  }

  // Admin trying to access Employee area
  if (sessionUser && (sessionUser.role === "ADMIN" || sessionUser.role === "MANAGER") && isEmployeeRoute) {
    return NextResponse.redirect(new URL("/admin/dashboard", request.url));
  }

  // Invalid/corrupted token on non-protected route
  if (isTokenInvalid) {
    const response = NextResponse.next();
    response.cookies.delete(SESSION_COOKIE_NAME);
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/",
    "/admin",
    "/admin/:path*",
    "/employee",
    "/employee/:path*",
    "/login",
  ],
};
