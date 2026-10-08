import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useEffect, useState } from "react";

import { api } from "../../convex/_generated/api";
import { isInLineApp } from "../lib/liff";
import {
  currentPushEndpoint,
  pushSupported,
  subscribeToPush,
  unsubscribeFromPush,
} from "../lib/push";
import { useReadySession, useSession } from "../lib/session";

export const Route = createFileRoute("/settings")({ component: SettingsPage });

function SettingsPage() {
  const { member } = useReadySession();
  const { logout } = useSession();
  return (
    <section className="stack">
      <h1>ตั้งค่า</h1>
      <div className="card row">
        {member.pictureUrl && (
          <img className="avatar" src={member.pictureUrl} alt="" />
        )}
        <div className="grow">
          <div>{member.displayName ?? "สมาชิก"}</div>
          <div className="muted small">เข้าสู่ระบบด้วย LINE</div>
        </div>
        <button type="button" className="ghost" onClick={logout}>
          ออกจากระบบ
        </button>
      </div>
      <PushSection />
      <ReminderSection />
      <SourcesSection />
      <MembersSection />
    </section>
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
    <div className="card stack">
      <h2>การแจ้งเตือน</h2>
      <p className="muted small">
        สรุปของใกล้หมดอายุทุกเช้า 9 โมง ส่งเป็นการแจ้งเตือนของเบราว์เซอร์ ไม่ใช้โควตาข้อความ
        LINE
        {isInLineApp() &&
          " · ในแอป LINE เปิดการแจ้งเตือนไม่ได้ ให้เปิดเว็บนี้ใน Safari หรือ Chrome แล้วเพิ่มไปยังหน้าจอโฮม"}
      </p>
      {!pushSupported() && !isInLineApp() && (
        <p className="muted small">เบราว์เซอร์นี้ไม่รองรับการแจ้งเตือน</p>
      )}
      <div className="row">
        {thisDeviceOn ? (
          <button type="button" className="ghost" onClick={disable}>
            ปิดบนอุปกรณ์นี้
          </button>
        ) : (
          <button type="button" onClick={enable} disabled={isInLineApp()}>
            เปิดบนอุปกรณ์นี้
          </button>
        )}
      </div>
      {msg && <p className="muted small">{msg}</p>}
      {mine && mine.length > 0 && (
        <ul className="list compact">
          {mine.map((s) => (
            <li key={s.endpoint} className="item">
              <div className="small grow">
                {s.endpoint === endpoint
                  ? "อุปกรณ์นี้"
                  : (s.userAgent ?? "อุปกรณ์อื่น").slice(0, 60)}
              </div>
              <button
                type="button"
                className="ghost"
                onClick={() => remove({ endpoint: s.endpoint, token })}
              >
                ลบ
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
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
    <div className="card stack">
      <h2>ช่วงเวลาเตือน</h2>
      <label htmlFor="reminderDays">
        แจ้งเตือนบนเว็บและนับว่า "ใกล้หมด" เมื่อเหลือไม่เกิน (วัน)
      </label>
      <input
        id="reminderDays"
        type="number"
        min={0}
        max={60}
        value={reminderDays}
        onChange={(e) => setReminderDays(Number(e.target.value))}
      />
      <label htmlFor="piggybackDays">บอทเตือนในกลุ่มเมื่อเหลือไม่เกิน (วัน)</label>
      <input
        id="piggybackDays"
        type="number"
        min={0}
        max={60}
        value={piggybackDays}
        onChange={(e) => setPiggybackDays(Number(e.target.value))}
      />
      <p className="muted small">
        บอทจะตอบเตือนต่อท้ายข้อความใดก็ได้ในกลุ่ม วันละไม่เกินหนึ่งครั้งต่อกลุ่ม
      </p>
      <button type="button" onClick={save}>
        {saved ? "บันทึกแล้ว" : "บันทึก"}
      </button>
    </div>
  );
}

function SourcesSection() {
  const { token } = useReadySession();
  const sources = useQuery(api.sources.list, { token });
  const setPiggyback = useMutation(api.sources.setPiggyback);
  return (
    <div className="card stack">
      <h2>กลุ่มที่บอทอยู่</h2>
      {sources === undefined ? (
        <p className="muted">กำลังโหลด…</p>
      ) : sources.length === 0 ? (
        <p className="muted small">ยังไม่มี เชิญบอทเข้ากลุ่ม LINE ของบ้านก่อน</p>
      ) : (
        <ul className="list compact">
          {sources.map((s) => (
            <li key={s.id} className="item">
              <div className="grow">
                <div>
                  {s.displayName ??
                    (s.sourceType === "group" ? "กลุ่ม" : "แชทหลายคน")}
                </div>
                <div className="muted small">
                  {s.lastPiggybackOn
                    ? `เตือนล่าสุด ${s.lastPiggybackOn}`
                    : "ยังไม่เคยเตือน"}
                </div>
              </div>
              <label className="row small">
                <input
                  type="checkbox"
                  checked={s.piggybackEnabled}
                  onChange={(e) =>
                    setPiggyback({
                      enabled: e.target.checked,
                      sourceId: s.id,
                      token,
                    })
                  }
                />
                เตือนในกลุ่ม
              </label>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function MembersSection() {
  const { token } = useReadySession();
  const members = useQuery(api.members.list, { token });
  return (
    <div className="card stack">
      <h2>สมาชิกในบ้าน</h2>
      <p className="muted small">ใครที่เพิ่มบอทเป็นเพื่อนจะเห็นรายการเดียวกัน</p>
      {members === undefined ? (
        <p className="muted">กำลังโหลด…</p>
      ) : (
        <ul className="list compact">
          {members.map((m) => (
            <li key={m.id} className="item">
              {m.pictureUrl && (
                <img className="avatar small" src={m.pictureUrl} alt="" />
              )}
              <div className="grow">{m.displayName ?? "สมาชิก"}</div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
