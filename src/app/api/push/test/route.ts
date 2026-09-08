import { NextResponse } from "next/server";
import { requireAuth, AuthError } from "@/lib/auth";
import { isPushConfigured, sendPushToUsers } from "@/lib/push";
import { prisma } from "@/lib/prisma";

export async function POST() {
  if (process.env.NODE_ENV !== "development") {
    return NextResponse.json({ error: "Push test endpoint is development-only" }, { status: 404 });
  }

  try {
    const session = await requireAuth();
    const subscriptionCount = await prisma.pushSubscription.count({
      where: { userId: session.id },
    });

    console.info(`[push-test] user=${session.id} subscriptions=${subscriptionCount}`);

    if (!isPushConfigured()) {
      console.info("[push-test] VAPID configuration missing status=400");
      return NextResponse.json(
        { error: "Web Push is not configured. Set VAPID_SUBJECT, NEXT_PUBLIC_VAPID_PUBLIC_KEY, and VAPID_PRIVATE_KEY." },
        { status: 400 }
      );
    }

    if (subscriptionCount === 0) {
      console.info("[push-test] no subscriptions status=404");
      return NextResponse.json(
        { error: "No push subscription is registered for this user. Enable notifications first." },
        { status: 404 }
      );
    }

    console.info(`[push-test] send attempted=${subscriptionCount}`);
    const result = await sendPushToUsers([session.id], {
      title: "Brilliant Event Test",
      body: "Web Push is working!",
      url: "/employee/dashboard",
      tag: `push-test-${session.id}`,
      data: { url: "/employee/dashboard" },
    });
    console.info(
      `[push-test] send success=${result.succeeded} failed=${result.failed} removed=${result.removed}`
    );

    if (result.succeeded === 0) {
      return NextResponse.json(
        { error: "Web Push delivery failed for all stored subscriptions", result },
        { status: 502 }
      );
    }

    return NextResponse.json({ ok: true, message: "Test push sent", result });
  } catch (error) {
    if (error instanceof AuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }
    console.error("[push-test] unexpected error", error);
    return NextResponse.json({ error: "Unable to send test push" }, { status: 500 });
  }
}