// LIFF bootstrap. The same app runs inside LINE (LIFF browser), in a phone
// browser as a PWA, and on desktop; LIFF handles login in all three.

import { liff } from "@line/liff";

const RELOGIN_FLAG = "bestbefore.relogin";

let initPromise: Promise<void> | null = null;

function liffId(): string {
  const id = import.meta.env.VITE_LIFF_ID;
  if (!id) {
    throw new Error("ยังไม่ได้ตั้งค่า VITE_LIFF_ID");
  }
  return id;
}

export function initLiff(): Promise<void> {
  initPromise ??= liff.init({ liffId: liffId() });
  return initPromise;
}

/**
 * Returns the LINE Login ID token, or null after starting a login redirect
 * (the page will reload at the same URL once LINE is done).
 */
export async function getLiffIdToken(): Promise<string | null> {
  await initLiff();
  if (!liff.isLoggedIn()) {
    liff.login({ redirectUri: window.location.href });
    return null;
  }
  return liff.getIDToken();
}

/**
 * The server rejected the ID token (usually expired after an hour in an external
 * browser). Log out of LIFF and back in once; a second failure surfaces as an error.
 */
export async function retryLiffLogin(): Promise<boolean> {
  if (sessionStorage.getItem(RELOGIN_FLAG) === "1") {
    sessionStorage.removeItem(RELOGIN_FLAG);
    return false;
  }
  sessionStorage.setItem(RELOGIN_FLAG, "1");
  await initLiff();
  liff.logout();
  liff.login({ redirectUri: window.location.href });
  return true;
}

export function clearReloginFlag(): void {
  sessionStorage.removeItem(RELOGIN_FLAG);
}

export function isInLineApp(): boolean {
  return liff.isInClient();
}

export async function liffLogout(): Promise<void> {
  await initLiff();
  if (liff.isLoggedIn()) {
    liff.logout();
  }
}

export async function closeLiffWindow(): Promise<void> {
  await initLiff();
  if (liff.isInClient()) {
    liff.closeWindow();
  }
}
