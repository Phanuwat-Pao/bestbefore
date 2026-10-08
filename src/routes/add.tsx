import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAction, useMutation } from "convex/react";
import { useState } from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Guess } from "../../convex/ai";
import { formatThai, parseIsoDate } from "../../convex/lib/dates";
import { PhotoPicker } from "../components/photo-picker";
import { prepareImage } from "../lib/image";
import { useReadySession } from "../lib/session";
import { uploadToConvex } from "../lib/upload";

export const Route = createFileRoute("/add")({ component: AddPage });

const MAX_PHOTOS = 4;

type Stage =
  | { kind: "pick" }
  | { kind: "uploading"; done: number; total: number }
  | { kind: "reading" }
  | {
      kind: "form";
      storageIds: Id<"_storage">[];
      guess: Guess | null;
      aiNote: string | null;
    }
  | {
      kind: "saving";
      storageIds: Id<"_storage">[];
      guess: Guess | null;
      aiNote: string | null;
    };

const CONFIDENCE_LABEL: Record<Guess["confidence"], string> = {
  high: "มั่นใจสูง",
  low: "ไม่ค่อยมั่นใจ",
  medium: "มั่นใจปานกลาง",
};

function AddPage() {
  const { token } = useReadySession();
  const navigate = useNavigate();
  const generateUploadUrl = useMutation(api.items.generateUploadUrl);
  const guessAction = useAction(api.ai.guess);
  const createItem = useMutation(api.items.create);

  const [files, setFiles] = useState<File[]>([]);
  const [stage, setStage] = useState<Stage>({ kind: "pick" });
  const [name, setName] = useState("");
  const [expiresOn, setExpiresOn] = useState("");
  const [note, setNote] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  const readPhotos = async () => {
    setFormError(null);
    try {
      const storageIds: Id<"_storage">[] = [];
      setStage({ done: 0, kind: "uploading", total: files.length });
      for (const [i, file] of files.entries()) {
        const blob = await prepareImage(file);
        const url = await generateUploadUrl({ token });
        storageIds.push(await uploadToConvex(url, blob));
        setStage({ done: i + 1, kind: "uploading", total: files.length });
      }
      setStage({ kind: "reading" });
      const result = await guessAction({ storageIds, token });
      if (result.kind === "ok") {
        setName(result.guess.name ?? "");
        setExpiresOn(result.guess.expiresOn ?? "");
        setStage({
          aiNote: null,
          guess: result.guess,
          kind: "form",
          storageIds,
        });
      } else {
        setStage({
          aiNote: "อ่านรูปไม่ได้ในตอนนี้ กรุณากรอกชื่อและวันหมดอายุเอง",
          guess: null,
          kind: "form",
          storageIds,
        });
      }
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
      setStage({ kind: "pick" });
    }
  };

  const skipPhotos = () => {
    setStage({ aiNote: null, guess: null, kind: "form", storageIds: [] });
  };

  const save = async () => {
    if (stage.kind !== "form") {
      return;
    }
    setFormError(null);
    if (expiresOn !== "" && !parseIsoDate(expiresOn)) {
      setFormError("รูปแบบวันที่ไม่ถูกต้อง");
      return;
    }
    setStage({ ...stage, kind: "saving" });
    try {
      await createItem({
        expiresOn: expiresOn === "" ? undefined : expiresOn,
        guess: stage.guess ?? undefined,
        name,
        note: note.trim() === "" ? undefined : note,
        storageIds: stage.storageIds,
        token,
      });
      await navigate({ to: "/" });
    } catch (error) {
      setFormError(error instanceof Error ? error.message : String(error));
      setStage({ ...stage, kind: "form" });
    }
  };

  const expiresParsed = expiresOn === "" ? null : parseIsoDate(expiresOn);

  return (
    <section className="stack">
      <h1>เพิ่มของ</h1>
      {formError && <p className="error">{formError}</p>}

      {stage.kind === "pick" && (
        <div className="card stack">
          <PhotoPicker files={files} onChange={setFiles} max={MAX_PHOTOS} />
          <div className="row">
            <button
              type="button"
              onClick={readPhotos}
              disabled={files.length === 0}
            >
              อ่านวันหมดอายุจากรูป
            </button>
            <button type="button" className="ghost" onClick={skipPhotos}>
              กรอกเองโดยไม่ใช้รูป
            </button>
          </div>
        </div>
      )}

      {stage.kind === "uploading" && (
        <div className="card">
          <p className="muted">
            กำลังอัปโหลดรูป {stage.done}/{stage.total}…
          </p>
        </div>
      )}

      {stage.kind === "reading" && (
        <div className="card">
          <p className="muted">กำลังอ่านชื่อและวันหมดอายุจากรูป…</p>
        </div>
      )}

      {(stage.kind === "form" || stage.kind === "saving") && (
        <div className="card stack">
          {stage.guess && (
            <div className="ai-note">
              <strong>AI อ่านได้ว่า</strong>
              <div className="muted small">
                {stage.guess.note ?? "ไม่มีรายละเอียด"} ·{" "}
                {CONFIDENCE_LABEL[stage.guess.confidence]}
                {stage.guess.basis === "estimated" &&
                  " · ประเมินจากประเภทสินค้า กรุณาตรวจสอบ"}
                {stage.guess.basis === "none" && " · ไม่พบวันหมดอายุ กรุณากรอกเอง"}
              </div>
            </div>
          )}
          {stage.aiNote && <p className="muted small">{stage.aiNote}</p>}

          <label htmlFor="name">ชื่อของ</label>
          <input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="เช่น นมสด ดัชมิลล์"
            autoFocus
          />

          <label htmlFor="expiresOn">วันหมดอายุ</label>
          <input
            id="expiresOn"
            type="date"
            value={expiresOn}
            onChange={(e) => setExpiresOn(e.target.value)}
          />
          <p className="muted small">
            {expiresParsed
              ? `หมดอายุ ${formatThai(expiresParsed)}`
              : "เว้นว่างได้ถ้ายังไม่ทราบ แล้วมาใส่ทีหลัง"}
          </p>

          <label htmlFor="note">หมายเหตุ</label>
          <textarea
            id="note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="เช่น เปิดแล้วเมื่อ 10 ต.ค."
          />

          <div className="row">
            <button
              type="button"
              onClick={save}
              disabled={stage.kind === "saving" || name.trim() === ""}
            >
              {stage.kind === "saving" ? "กำลังบันทึก…" : "บันทึก"}
            </button>
            <button
              type="button"
              className="ghost"
              disabled={stage.kind === "saving"}
              onClick={() => {
                setStage({ kind: "pick" });
              }}
            >
              กลับไปเลือกรูป
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
