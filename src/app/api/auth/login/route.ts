import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyPassword, signToken, setSessionCookie, SessionUser } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { email, password, rememberMe = true } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 }
      );
    }

    const normalizedEmail = email.toLowerCase().trim();

    const dbUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      include: { employeeProfile: true },
    });

    if (!dbUser || !dbUser.isActive) {
      return NextResponse.json(
        { error: "Invalid email or password. Please check your credentials." },
        { status: 401 }
      );
    }

    const passwordMatch = await verifyPassword(password, dbUser.passwordHash);
    if (!passwordMatch) {
      return NextResponse.json(
        { error: "Invalid email or password. Please check your credentials." },
        { status: 401 }
      );
    }

    const sessionUser: SessionUser = {
      id: dbUser.id,
      email: dbUser.email,
      name: dbUser.name,
      role: dbUser.role,
      employeeId: dbUser.employeeProfile?.id,
    };

    // Sign JWT and set HTTP-only cookie
    const token = await signToken(sessionUser, Boolean(rememberMe));
    await setSessionCookie(token, Boolean(rememberMe));

    const redirectUrl =
      sessionUser.role === "ADMIN" || sessionUser.role === "MANAGER"
        ? "/admin/dashboard"
        : "/employee/dashboard";

    return NextResponse.json({
      ok: true,
      user: sessionUser,
      redirectUrl,
    });
  } catch (error) {
    console.error("Login error:", error);
    return NextResponse.json(
      { error: "An unexpected authentication error occurred. Please try again." },
      { status: 500 }
    );
  }
}
