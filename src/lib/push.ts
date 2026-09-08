import webpush, { type PushSubscription } from "web-push";
import { prisma } from "@/lib/prisma";

type PushMessage = {
  title: string;
  body: string;
  url: string;
  tag: string;
  data: Record<string, string>;
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

export async function sendPushToUsers(userIds: string[], message: PushMessage) {
  if (userIds.length === 0 || !configureWebPush()) return;

  try {
    const subscriptions = await prisma.pushSubscription.findMany({
      where: { userId: { in: userIds } },
    });

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
          await prisma.pushSubscription.update({
            where: { id: storedSubscription.id },
            data: { lastUsedAt: new Date() },
          });
        } catch (error: unknown) {
          const statusCode = (error as { statusCode?: number })?.statusCode;
          if (statusCode === 404 || statusCode === 410) {
            await prisma.pushSubscription.delete({ where: { id: storedSubscription.id } });
            return;
          }
          console.error("Failed to send web push notification:", error);
        }
      })
    );
  } catch (error) {
    console.error("Failed to load web push subscriptions:", error);
  }
}