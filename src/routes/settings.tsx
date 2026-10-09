import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { BellOff, BellRing, LogOut, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

import { Page } from "@/components/page";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Switch } from "@/components/ui/switch";
import { isInLineApp } from "@/lib/liff";
import {
  currentPushEndpoint,
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "@/lib/push";
import { useReadySession, useSession } from "@/lib/session";

import { api } from "../../convex/_generated/api";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { member } = useReadySession();
  const { logout } = useSession();
  return (
    <Page title="ตั้งค่า">
      <Card>
        <CardContent className="flex items-center gap-3">
          {member.pictureUrl ? (
            <img
              className="size-11 rounded-full object-cover"
              src={member.pictureUrl}
              alt=""
            />
          ) : (
            <div className="bg-muted size-11 rounded-full" />
          )}
          <div className="min-w-0 flex-1">
            <div className="truncate font-medium">
              {member.displayName ?? "สมาชิก"}
            </div>
            <div className="text-muted-foreground text-xs">
              เข้าสู่ระบบด้วย LINE
            </div>
          </div>
          <Button variant="outline" size="sm" onClick={logout}>
            <LogOut data-icon="inline-start" />
            ออก
          </Button>
        </CardContent>
      </Card>
      <PushSection />
      <ReminderSection />
      <SourcesSection />
      <MembersSection />
    </Page>
  );
}

function PushSection() {
  const { token } = useReadySession();
  const save = useMutation(api.push.subscriptions.save);
  const remove = useMutation(api.push.subscriptions.remove);
  const mine = useQuery(api.push.subscriptions.mine, { token });
  const [endpoint, setEndpoint] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setEndpoint(await currentPushEndpoint());
    };
    load();
  }, []);

  const inLine = isInLineApp();
  const thisDeviceOn =
    endpoint !== null && (mine ?? []).some((s) => s.endpoint === endpoint);

  const enable = async () => {
    setMsg(null);
    try {
      const sub = await subscribeToPush();
      await save({ ...sub, token, userAgent: navigator.userAgent });
      setEndpoint(sub.endpoint);
      setMsg("เปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว");
    } catch (error) {
      setMsg(error instanceof Error ? error.message : String(error));
    }
  };

  const disable = async () => {
    setMsg(null);
    const removed = await unsubscribeFromPush();
    if (removed) {
      await remove({ endpoint: removed, token });
    }
    setEndpoint(null);
    setMsg("ปิดการแจ้งเตือนบนอุปกรณ์นี้แล้ว");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>การแจ้งเตือน</CardTitle>
        <CardDescription>
          สรุปของใกล้หมดอายุทุกเช้า 9 โมง ส่งเป็นการแจ้งเตือนของเบราว์เซอร์ ไม่ใช้โควตาข้อความ
          LINE
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-3">
        {inLine && (
          <p className="text-muted-foreground text-sm">
            ในแอป LINE เปิดการแจ้งเตือนไม่ได้ ให้เปิดเว็บนี้ใน Safari หรือ Chrome
            แล้วเพิ่มไปยังหน้าจอโฮม
          </p>
        )}
        {!(pushSupported() || inLine) && (
          <p className="text-muted-foreground text-sm">
            เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน
          </p>
        )}
        {thisDeviceOn ? (
          <Button variant="outline" onClick={disable}>
            <BellOff data-icon="inline-start" />
            ปิดบนอุปกรณ์นี้
          </Button>
        ) : (
          <Button onClick={enable} disabled={inLine}>
            <BellRing data-icon="inline-start" />
            เปิดบนอุปกรณ์นี้
          </Button>
        )}
        {msg && <p className="text-muted-foreground text-sm">{msg}</p>}
        {mine && mine.length > 0 && (
          <>
            <Separator />
            <ul className="flex flex-col gap-2">
              {mine.map((s) => (
                <li
                  key={s.endpoint}
                  className="flex items-center gap-2 text-sm"
                >
                  <span className="min-w-0 flex-1 truncate">
                    {s.endpoint === endpoint
                      ? "อุปกรณ์นี้"
                      : (s.userAgent ?? "อุปกรณ์อื่น")}
                  </span>
                  <Button
                    size="icon-sm"
                    variant="ghost"
                    aria-label="ลบอุปกรณ์นี้"
                    onClick={() => remove({ endpoint: s.endpoint, token })}
                  >
                    <Trash2 />
                  </Button>
                </li>
              ))}
            </ul>
          </>
        )}
      </CardContent>
    </Card>
  );
}

function ReminderSection() {
  const { token, settings } = useReadySession();
  const update = useMutation(api.settings.update);
  const [reminderDays, setReminderDays] = useState(settings.reminderDays);
  const [piggybackDays, setPiggybackDays] = useState(settings.piggybackDays);
  const [saved, setSaved] = useState(false);

  const save = async () => {
    await update({ piggybackDays, reminderDays, token });
    setSaved(true);
    setTimeout(() => setSaved(false), 1500);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>ช่วงเวลาเตือน</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <Label htmlFor="reminderDays">
            นับว่า "ใกล้หมด" และแจ้งเตือนบนเว็บเมื่อเหลือไม่เกิน (วัน)
          </Label>
          <Input
            id="reminderDays"
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            className="h-11 text-base"
            value={reminderDays}
            onChange={(e) => setReminderDays(Number(e.target.value))}
          />
        </div>
        <div className="flex flex-col gap-2">
          <Label htmlFor="piggybackDays">บอทเตือนในกลุ่มเมื่อเหลือไม่เกิน (วัน)</Label>
          <Input
            id="piggybackDays"
            type="number"
            inputMode="numeric"
            min={0}
            max={60}
            className="h-11 text-base"
            value={piggybackDays}
            onChange={(e) => setPiggybackDays(Number(e.target.value))}
          />
          <p className="text-muted-foreground text-sm">
            บอทจะตอบเตือนต่อท้ายข้อความใดก็ได้ในกลุ่ม วันละไม่เกินหนึ่งครั้งต่อกลุ่ม
          </p>
        </div>
        <Button onClick={save}>{saved ? "บันทึกแล้ว" : "บันทึก"}</Button>
      </CardContent>
    </Card>
  );
}

function SourcesSection() {
  const { token } = useReadySession();
  const sources = useQuery(api.sources.list, { token });
  const setPiggyback = useMutation(api.sources.setPiggyback);
  return (
    <Card>
      <CardHeader>
        <CardTitle>กลุ่มที่บอทอยู่</CardTitle>
      </CardHeader>
      <CardContent>
        {sources === undefined ? (
          <Skeleton className="h-10 w-full" />
        ) : sources.length === 0 ? (
          <p className="text-muted-foreground text-sm">
            ยังไม่มี เชิญบอทเข้ากลุ่ม LINE ของบ้านก่อน
          </p>
        ) : (
          <ul className="flex flex-col divide-y">
            {sources.map((s) => (
              <li
                key={s.id}
                className="flex items-center gap-3 py-3 first:pt-0 last:pb-0"
              >
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">
                    {s.displayName ??
                      (s.sourceType === "group" ? "กลุ่ม" : "แชทหลายคน")}
                  </div>
                  <div className="text-muted-foreground text-xs">
                    {s.lastPiggybackOn
                      ? `เตือนล่าสุด ${s.lastPiggybackOn}`
                      : "ยังไม่เคยเตือน"}
                  </div>
                </div>
                <Label htmlFor={`pb-${s.id}`} className="text-sm">
                  เตือนในกลุ่ม
                </Label>
                <Switch
                  id={`pb-${s.id}`}
                  checked={s.piggybackEnabled}
                  onCheckedChange={(enabled) =>
                    setPiggyback({ enabled, sourceId: s.id, token })
                  }
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function MembersSection() {
  const { token } = useReadySession();
  const members = useQuery(api.members.list, { token });
  return (
    <Card>
      <CardHeader>
        <CardTitle>สมาชิกในบ้าน</CardTitle>
        <CardDescription>ใครที่เพิ่มบอทเป็นเพื่อนจะเห็นรายการเดียวกัน</CardDescription>
      </CardHeader>
      <CardContent>
        {members === undefined ? (
          <Skeleton className="h-10 w-full" />
        ) : (
          <ul className="flex flex-col gap-3">
            {members.map((m) => (
              <li key={m.id} className="flex items-center gap-3">
                {m.pictureUrl ? (
                  <img
                    className="size-8 rounded-full object-cover"
                    src={m.pictureUrl}
                    alt=""
                  />
                ) : (
                  <div className="bg-muted size-8 rounded-full" />
                )}
                <span className="truncate">{m.displayName ?? "สมาชิก"}</span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
