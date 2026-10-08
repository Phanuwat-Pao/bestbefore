import { useRegisterSW } from "virtual:pwa-register/react";

// Registers the service worker and offers a reload when a new version ships .
export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }
  return (
    <div className="toast">
      <span>มีเวอร์ชันใหม่</span>
      <button onClick={() => updateServiceWorker(true)}>โหลดใหม่</button>
      <button className="ghost" onClick={() => setNeedRefresh(false)}>
        ปิด
      </button>
    </div>
  );
}
