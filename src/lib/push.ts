import webpush, { type PushSubscription } from "web-push";
import { prisma } from "@/lib/prisma";

type PushMessage = {
  title: string;
  body: string;
  url: string;
  tag: string;
  data: Record<string, string>;
};

export type PushDeliveryResult = {
  configured: boolean;
  subscriptionCount: number;
  attempted: number;
  succeeded: number;
  removed: number;
  failed: number;
  errorCodes: Array<number | string>;
};

export function isPushConfigured() {
  const subject = process.env.VAPID_SUBJECT;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
  const privateKey = process.env.VAPID_PRIVATE_KEY;

  return Boolean(subject && publicKey && privateKey);
}

function configureWebPush() {
  if (!isPushConfigured()) return false;

  const subject = process.env.VAPID_SUBJECT as string;
  const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY as string;
  const privateKey = process.env.VAPID_PRIVATE_KEY as string;

  webpush.setVapidDetails(subject, publicKey, privateKey);
  return true;
}

export async function sendPushToUsers(userIds: string[], message: PushMessage): Promise<PushDeliveryResult> {
  const emptyResult = (configured: boolean): PushDeliveryResult => ({
    configured,
    subscriptionCount: 0,
    attempted: 0,
    succeeded: 0,
    removed: 0,
    failed: 0,
    errorCodes: [],
  });

  if (userIds.length === 0) return emptyResult(isPushConfigured());
  if (!configureWebPush()) return emptyResult(false);

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });
    const result: PushDeliveryResult = {
      ...emptyResult(true),
      subscriptionCount: subscriptions.length,
      attempted: subscriptions.length,
    };

    await Promise.allSettled(
      subscriptions.map(async (storedSubscription) => {
        const subscription: PushSubscription = {
          endpoint: storedSubscription.endpoint,
          keys: {
            p256dh: storedSubscription.p256dh,
            auth: storedSubscription.auth,
          },
        };

        try {
          await webpush.sendNotification(subscription, JSON.stringify(message));
          result.succeeded += 1;
          await prisma.pushSubscription.update({
            where: { id: storedSubscription.id },
            data: { lastUsedAt: new Date() },
          });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            console.error(`[push] delivery failed code=${statusCode}; removing subscription`);
            await prisma.pushSubscription.delete({ where: { id: storedSubscription.id } });
            result.removed += 1;
            return;
          }
          result.failed += 1;
          result.errorCodes.push(statusCode ?? "unknown");
          console.error(`[push] delivery failed code=${statusCode ?? "unknown"}`);
        }
      })
    );
    return result;
  } catch (error) {
    console.error("Failed to load web push subscriptions:", error);
    return emptyResult(true);
  }
}