import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { cookies } from "next/headers";
import { Role } from "@prisma/client";

export const SESSION_COOKIE_NAME = "catering_erp_session";

// Secret used to sign session cookies
const AUTH_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || "catering-erp-secret-key-32-chars-minimum-production-secure"
);

export interface SessionUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  employeeId?: string;
}

/**
 * Hashes a plaintext password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

/**
 * Compares plaintext password with stored bcrypt hash
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Signs a JWT with user claims for the session cookie
 */
export async function signToken(user: SessionUser, rememberMe = true): Promise<string> {
  return new SignJWT({
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    employeeId: user.employeeId,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(rememberMe ? "30d" : "24h")
    .sign(AUTH_SECRET);
}

/**
 * Verifies and decodes a signed session token
 */
export async function verifyToken(token: string): Promise<SessionUser | null> {
  try {
    const { payload } = await jwtVerify(token, AUTH_SECRET);
    return {
      id: payload.id as string,
      email: payload.email as string,
      name: payload.name as string,
      role: payload.role as Role,
      employeeId: payload.employeeId as string | undefined,
    };
  } catch {
    return null;
  }
}

/**
 * Sets the HTTP-only session cookie (Server Actions & Route Handlers)
 */
export async function setSessionCookie(token: string, rememberMe = true) {
  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    ...(rememberMe ? { maxAge: 60 * 60 * 24 * 30 } : {}),
  });
}

export class AuthError extends Error {
  status: number;
  constructor(message: string, status: number = 401) {
    super(message);
    this.name = "AuthError";
    this.status = status;
  }
}

/**
 * Clears the session cookie
 */
export async function destroySession() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}

/**
 * Retrieves the current session user from the incoming request cookies
 */
export async function getSession(): Promise<SessionUser | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return verifyToken(token);
}

/**
 * Server-side authorization guard for Server Actions & API Handlers
 */
export async function requireAuth(allowedRoles?: Role[]): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw new AuthError("Authentication required to access this resource", 401);
  }

  if (allowedRoles && allowedRoles.length > 0 && !allowedRoles.includes(session.role)) {
    throw new AuthError("Forbidden: You do not have permission to perform this action", 403);
  }

  return session;
}

/**
 * Guard ensuring only ADMIN and MANAGER roles can proceed
 */
export async function requireAdmin(): Promise<SessionUser> {
  return requireAuth(["ADMIN", "MANAGER"]);
}

/**
 * Guard ensuring the user is an EMPLOYEE and returns their linked employeeId
 */
export async function requireEmployee(): Promise<SessionUser> {
  const session = await requireAuth(["EMPLOYEE"]);
  return session;
}
