import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, verifyPassword, hashPassword, AuthError } from "@/lib/auth";

/**
 * POST /api/auth/password
 * Changes password for the currently authenticated user.
 * Validates current password and updates securely with bcrypt.
 * Never logs or exposes passwords.
 */
export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const { currentPassword, newPassword, confirmPassword } = body;

    if (!currentPassword || !newPassword || !confirmPassword) {
      return NextResponse.json(
        { error: "Current password, new password, and confirmation are required." },
        { status: 400 }
      );
    }

    if (newPassword !== confirmPassword) {
      return NextResponse.json(
        { error: "New password and confirmation do not match." },
        { status: 400 }
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json(
        { error: "New password must be at least 8 characters long." },
        { status: 400 }
      );
    }

    // Retrieve user from DB to check current hash
    const user = await prisma.user.findUnique({
      where: { id: session.id },
    });

    if (!user) {
      return NextResponse.json(
        { error: "User record not found." },
        { status: 404 }
      );
    }

    const isMatch = await verifyPassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: "Incorrect current password." },
        { status: 400 }
      );
    }

    // Hash the new password
    const newPasswordHash = await hashPassword(newPassword);

    await prisma.user.update({
      where: { id: session.id },
      data: { passwordHash: newPasswordHash },
    });

    // Create activity log
    await prisma.activityLog.create({
      data: {
        userId: session.id,
        action: "PASSWORD_CHANGED",
        entityType: "User",
        entityId: session.id,
        details: {
          userEmail: session.email,
        },
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Password changed successfully.",
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error changing password:", error);
    return NextResponse.json(
      { error: "Internal server error changing password." },
      { status: 500 }
    );
  }
}
