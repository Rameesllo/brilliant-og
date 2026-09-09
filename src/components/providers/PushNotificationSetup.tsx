"use client";

import React, { useCallback, useEffect, useState } from "react";
import { Bell, BellOff, Loader2 } from "lucide-react";

function toUint8Array(value: string) {
  const padding = "=".repeat((4 - (value.length % 4)) % 4);
  const base64 = `${value}${padding}`.replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  return Uint8Array.from([...rawData].map((character) => character.charCodeAt(0)));
}

export function PushNotificationSetup({ showStatus = true }: { showStatus?: boolean }) {
  const [status, setStatus] = useState<"loading" | "enabled" | "available" | "denied" | "unsupported" | "insecure">("loading");
  const [isEnabling, setIsEnabling] = useState(false);
  const [isConfigured, setIsConfigured] = useState(true);
  const [subscriptionCount, setSubscriptionCount] = useState(0);

  const registerSubscription = useCallback(async () => {
    const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    if (!publicKey || !("serviceWorker" in navigator) || !("PushManager" in window)) {
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    await navigator.serviceWorker.register("/push-sw.js", { scope: "/" });
    await navigator.serviceWorker.ready.then((registration) => registration.update());
    const readyRegistration = await navigator.serviceWorker.ready;
    let subscription = await readyRegistration.pushManager.getSubscription();

    if (!subscription) {
      subscription = await readyRegistration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: toUint8Array(publicKey),
      });
    }

    const response = await fetch("/api/push/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: subscription.toJSON() }),
    });

    if (!response.ok && response.status !== 409) {
      throw new Error("Subscription registration failed");
    }

    const statusResponse = await fetch("/api/push/subscribe");
    if (statusResponse.ok) {
      const statusData = await statusResponse.json() as { subscriptionCount?: number };
      setSubscriptionCount(statusData.subscriptionCount ?? 0);
    }
    setStatus("enabled");
  }, []);

  useEffect(() => {
    if (!window.isSecureContext) {
      setStatus("insecure");
      return;
    }

    if (!("Notification" in window)) {
      setStatus("unsupported");
      return;
    }

    if (Notification.permission === "granted") {
      registerSubscription().catch(() => setStatus("available"));
      return;
    }

    if (Notification.permission === "denied") {
      setStatus("denied");
      return;
    }

    setStatus("available");

    void fetch("/api/push/subscribe")
      .then((response) => response.ok ? response.json() : null)
      .then((data: { configured?: boolean; subscriptionCount?: number } | null) => {
        if (!data) return;
        setIsConfigured(data.configured !== false);
        setSubscriptionCount(data.subscriptionCount ?? 0);
        if (data.subscriptionCount && Notification.permission === "granted") {
          setStatus("enabled");
        }
      })
      .catch(() => undefined);
  }, [registerSubscription]);

  const enableNotifications = async () => {
    setIsEnabling(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "available");
        return;
      }
      await registerSubscription();
    } catch {
      setStatus("available");
    } finally {
      setIsEnabling(false);
    }
  };

  if (status === "unsupported") return null;

  if (status === "insecure") {
    return (
      <span
        className="inline-flex items-center gap-1.5 text-[11px] text-[#B45309]"
        title="Web Push requires HTTPS on phones. Deploy the ERP with an HTTPS URL."
      >
        <BellOff className="h-3.5 w-3.5" />
        Notifications require HTTPS on this device
      </span>
    );
  }

  if (!isConfigured) {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-[#94A3B8]" title="Configure VAPID keys on the server to enable push notifications">
        <BellOff className="h-3.5 w-3.5" />
        Push notifications are not configured
      </span>
    );
  }

  if (status === "denied") {
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-[#94A3B8]">
        <BellOff className="h-3.5 w-3.5" />
        Notifications blocked in browser settings
      </span>
    );
  }

  if (status === "enabled") {
    if (!showStatus) return null;
    return (
      <span className="inline-flex items-center gap-1.5 text-[11px] text-[#16A34A]">
        <Bell className="h-3.5 w-3.5" />
        Notifications enabled{subscriptionCount > 1 ? ` on ${subscriptionCount} devices` : ""}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={enableNotifications}
      disabled={isEnabling}
      className="inline-flex items-center gap-1.5 text-[11px] font-medium text-[#C2410C] hover:text-[#9A3412] disabled:opacity-60"
    >
      {isEnabling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Bell className="h-3.5 w-3.5" />}
      Enable notifications
    </button>
  );
}