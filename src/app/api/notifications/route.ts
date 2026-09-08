import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, getSession, AuthError } from "@/lib/auth";

/**
 * GET /api/notifications
 * Returns notifications for the current user.
 * Admins/Managers see all notifications.
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const unreadOnly = searchParams.get("unreadOnly") === "true";
    const page = Math.max(1, parseInt(searchParams.get("page") || "1", 10));
    const limit = Math.min(100, Math.max(1, parseInt(searchParams.get("limit") || "50", 10)));
    const skip = (page - 1) * limit;

    const isAdmin = session.role === "ADMIN" || session.role === "MANAGER";

    // Admins see their own + broadcast (userId null). Employees see only their own.
    const where = {
      ...(isAdmin
        ? { OR: [{ userId: session.id }, { userId: null }] }
        : { userId: session.id }),
      ...(unreadOnly ? { isRead: false } : {}),
    };

    const [notifications, total, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          user: { select: { name: true, role: true } },
        },
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: {
          ...(isAdmin
            ? { OR: [{ userId: session.id }, { userId: null }] }
            : { userId: session.id }),
          isRead: false,
        },
      }),
    ]);

    return NextResponse.json({
      notifications: notifications.map((n) => ({
        id: n.id,
        title: n.title,
        message: n.message,
        type: n.type,
        isRead: n.isRead,
        link: n.link || "",
        createdAt: n.createdAt.toISOString(),
        userName: n.user?.name || "System",
      })),
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit) || 1,
      },
      unreadCount,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error fetching notifications:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while fetching notifications" },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notifications
 * Marks notifications as read.
 * Body: { ids?: string[] } — if omitted, marks all for current user as read.
 */
export async function PATCH(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Authentication required" }, { status: 401 });
    }

    const body = await request.json().catch(() => ({}));
    const { ids } = body as { ids?: string[] };

    const isAdmin = session.role === "ADMIN" || session.role === "MANAGER";

    const where = ids && ids.length > 0
      ? { id: { in: ids } }
      : isAdmin
        ? { OR: [{ userId: session.id }, { userId: null }] }
        : { userId: session.id };

    const result = await prisma.notification.updateMany({
      where: { ...where, isRead: false },
      data: { isRead: true },
    });

    return NextResponse.json({
      message: `Marked ${result.count} notification(s) as read`,
      count: result.count,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error updating notifications:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while updating notifications" },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notifications
 * Admin: clear all read notifications.
 */
export async function DELETE() {
  try {
    const session = await requireAuth();
    const isAdmin = session.role === "ADMIN" || session.role === "MANAGER";

    const result = await prisma.notification.deleteMany({
      where: {
        isRead: true,
        ...(isAdmin
          ? { OR: [{ userId: session.id }, { userId: null }] }
          : { userId: session.id }),
      },
    });

    return NextResponse.json({
      message: `Deleted ${result.count} read notifications`,
      count: result.count,
    });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error clearing notifications:", error);
    return NextResponse.json(
      { error: "An unexpected error occurred while clearing notifications" },
      { status: 500 }
    );
  }
}
