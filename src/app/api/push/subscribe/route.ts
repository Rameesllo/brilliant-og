import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth, AuthError } from "@/lib/auth";

function isValidSubscription(value: unknown): value is {
  endpoint: string;
  keys: { p256dh: string; auth: string };
} {
  if (!value || typeof value !== "object") return false;
  const subscription = value as { endpoint?: unknown; keys?: { p256dh?: unknown; auth?: unknown } };
  return (
    typeof subscription.endpoint === "string" &&
    subscription.endpoint.length > 0 &&
    subscription.endpoint.length <= 2048 &&
    typeof subscription.keys?.p256dh === "string" &&
    typeof subscription.keys.auth === "string"
  );
}

export async function POST(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const subscription = body?.subscription;

    if (!isValidSubscription(subscription)) {
      return NextResponse.json({ error: "Invalid push subscription" }, { status: 400 });
    }

    const existing = await prisma.pushSubscription.findUnique({
      where: { endpoint: subscription.endpoint },
      select: { id: true, userId: true },
    });

    if (existing && existing.userId !== session.id) {
      return NextResponse.json({ error: "Push subscription is already registered" }, { status: 409 });
    }

    await prisma.pushSubscription.upsert({
      where: { endpoint: subscription.endpoint },
      create: {
        userId: session.id,
        endpoint: subscription.endpoint,
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: request.headers.get("user-agent")?.slice(0, 512),
      },
      update: {
        p256dh: subscription.keys.p256dh,
        auth: subscription.keys.auth,
        userAgent: request.headers.get("user-agent")?.slice(0, 512),
        lastUsedAt: new Date(),
      },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error registering push subscription:", error);
    return NextResponse.json({ error: "Unable to register push subscription" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const session = await requireAuth();
    const body = await request.json();
    const endpoint = body?.endpoint;

    if (typeof endpoint !== "string" || endpoint.length === 0) {
      return NextResponse.json({ error: "Endpoint is required" }, { status: 400 });
    }

    await prisma.pushSubscription.deleteMany({
      where: { endpoint, userId: session.id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("Error removing push subscription:", error);
    return NextResponse.json({ error: "Unable to remove push subscription" }, { status: 500 });
  }
}