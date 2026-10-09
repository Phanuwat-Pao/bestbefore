import { useRegisterSW } from "virtual:pwa-register/react";

import { Button } from "@/components/ui/button";

// Registers the service worker and offers a reload when a new version ships.
export function ReloadPrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW();

  if (!needRefresh) {
    return null;
  }
  return (
    <div className="bg-card fixed inset-x-3 bottom-[calc(var(--tabbar-h)+0.75rem)] z-50 mx-auto flex max-w-md items-center gap-3 rounded-xl border p-3 shadow-lg">
      <span className="flex-1 text-sm">มีเวอร์ชันใหม่</span>
      <Button size="sm" onClick={() => updateServiceWorker(true)}>
        โหลดใหม่
      </Button>
      <Button size="sm" variant="ghost" onClick={() => setNeedRefresh(false)}>
        ปิด
      </Button>
    </div>
  );
}
