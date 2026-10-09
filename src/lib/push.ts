// Web Push subscription helper. Runs in the browser, on a user gesture.

import { dict } from "./i18n";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding)
    .replaceAll("-", "+")
    .replaceAll("_", "/");
  const raw = atob(base64);
  return Uint8Array.from(raw, (char) => char.codePointAt(0) ?? 0);
}

export interface PushKeys {
  endpoint: string;
  keys: { p256dh: string; auth: string };
}

export function pushSupported(): boolean {
  return "serviceWorker" in navigator && "PushManager" in window;
}

/** Request permission and create a push subscription. Throws with a Thai message. */
export async function subscribeToPush(): Promise<PushKeys> {
  const vapid = import.meta.env.VITE_VAPID_PUBLIC_KEY;
  if (!vapid) {
    throw new Error(dict().pushNoVapid);
  }
  if (!pushSupported()) {
    throw new Error(dict().pushNotSupported);
  }
  const permission = await Notification.requestPermission();
  if (permission !== "granted") {
    throw new Error(dict().pushDenied);
  }

  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  const subscription =
    existing ??
    (await registration.pushManager.subscribe({
      applicationServerKey: urlBase64ToUint8Array(vapid),
      userVisibleOnly: true,
    }));

  const json = subscription.toJSON();
  if (!(json.endpoint && json.keys?.p256dh && json.keys?.auth)) {
    throw new Error(dict().pushKeysFailed);
  }
  return {
    endpoint: json.endpoint,
    keys: { auth: json.keys.auth, p256dh: json.keys.p256dh },
  };
}

/** The endpoint this browser is subscribed with, if any. */
export async function currentPushEndpoint(): Promise<string | null> {
  if (!pushSupported()) {
    return null;
  }
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  return existing?.endpoint ?? null;
}

export async function unsubscribeFromPush(): Promise<string | null> {
  if (!pushSupported()) {
    return null;
  }
  const registration = await navigator.serviceWorker.ready;
  const existing = await registration.pushManager.getSubscription();
  if (!existing) {
    return null;
  }
  await existing.unsubscribe();
  return existing.endpoint;
}
