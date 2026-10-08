import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { useState } from "react";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { formatThai, parseIsoDate } from "../../convex/lib/dates";
import { UrgencyBadge } from "../components/item-card";
import { PhotoPicker } from "../components/photo-picker";
import { prepareImage } from "../lib/image";
import { useReadySession } from "../lib/session";
import { uploadToConvex } from "../lib/upload";

export const Route = createFileRoute("/items/$itemId")({ component: ItemPage });

const MAX_PHOTOS = 6;

function ItemPage() {
  const { itemId } = Route.useParams();
  const { token } = useReadySession();
  const item = useQuery(api.items.get, { itemId, token });

  if (item === undefined) {
    return <p className="muted">กำลังโหลด…</p>;
  }
  if (item === null) {
    return (
      <div className="card">
        <p className="muted">ไม่พบรายการนี้</p>
        <Link to="/">กลับไปหน้ารายการ</Link>
      </div>
    );
  }
  return <ItemEditor key={item.id} item={item} token={token} />;
}

type ItemDetail = NonNullable<
  ReturnType<typeof useQuery<typeof api.items.get>>
>;

function ItemEditor({ item, token }: { item: ItemDetail; token: string }) {
  const navigate = useNavigate();
  const update = useMutation(api.items.update);
  const markUsed = useMutation(api.items.markUsed);
  const remove = useMutation(api.items.remove);
  const restore = useMutation(api.items.restore);
  const addPhotos = useMutation(api.items.addPhotos);
  const removePhoto = useMutation(api.items.removePhoto);
  const generateUploadUrl = useMutation(api.items.generateUploadUrl);

  const [name, setName] = useState(item.name);
  const [expiresOn, setExpiresOn] = useState(item.expiresOn ?? "");
  const [note, setNote] = useState(item.note ?? "");
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [photoToRemove, setPhotoToRemove] = useState<Id<"photos"> | null>(null);

  const dirty =
    name !== item.name ||
    expiresOn !== (item.expiresOn ?? "") ||
    note !== (item.note ?? "");

  const run = async (label: string, fn: () => Promise<void>) => {
    setBusy(true);
    setMessage(null);
    try {
      await fn();
      setMessage(label);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : String(error));
    } finally {
      setBusy(false);
    }
  };

  const save = () =>
    run("บันทึกแล้ว", async () => {
      if (expiresOn !== "" && !parseIsoDate(expiresOn)) {
        throw new Error("รูปแบบวันที่ไม่ถูกต้อง");
      }
      await update({
        expiresOn: expiresOn === "" ? null : expiresOn,
        itemId: item.id,
        name,
        note: note.trim() === "" ? null : note,
        token,
      });
    });

  const uploadNew = () =>
    run("เพิ่มรูปแล้ว", async () => {
      const storageIds: Id<"_storage">[] = [];
      for (const file of newFiles) {
        const blob = await prepareImage(file);
        const url = await generateUploadUrl({ token });
        storageIds.push(await uploadToConvex(url, blob));
      }
      await addPhotos({ itemId: item.id, storageIds, token });
      setNewFiles([]);
    });

  const onUsed = () =>
    run("ทำเครื่องหมายว่าใช้แล้ว", async () => {
      await markUsed({ itemId: item.id, token });
      await navigate({ to: "/" });
    });

  const onDeleteConfirmed = () =>
    run("ลบแล้ว", async () => {
      await remove({ itemId: item.id, token });
      await navigate({ to: "/" });
    });

  const onRemovePhoto = (photoId: Id<"photos">) =>
    run("ลบรูปแล้ว", async () => {
      await removePhoto({ photoId, token });
      setPhotoToRemove(null);
    });

  const onRestore = () =>
    run("กู้คืนแล้ว", async () => {
      await restore({ itemId: item.id, token });
    });

  const photosLeft = Math.max(0, MAX_PHOTOS - item.photos.length);

  return (
    <section className="stack">
      <div className="row space-between">
        <h1>{item.name}</h1>
        <UrgencyBadge urgency={item.urgency} daysLeft={item.daysLeft} />
      </div>
      {item.status !== "active" && (
        <div className="card">
          <p className="muted">
            รายการนี้{item.status === "used" ? "ใช้แล้ว" : "ถูกลบแล้ว"}
            {item.archivedAt &&
              ` เมื่อ ${new Date(item.archivedAt).toLocaleDateString("th-TH")}`}
          </p>
          <button type="button" onClick={onRestore} disabled={busy}>
            กู้คืนกลับเข้ารายการ
          </button>
        </div>
      )}
      {message && <p className="muted">{message}</p>}

      {item.photos.length > 0 && (
        <div className="gallery">
          {item.photos.map((photo) => (
            <div key={photo.photoId} className="gallery-cell">
              {photo.url ? (
                <a href={photo.url} target="_blank" rel="noreferrer">
                  <img src={photo.url} alt="" />
                </a>
              ) : (
                <div className="thumb-empty">?</div>
              )}
              {photoToRemove === photo.photoId ? (
                <div className="gallery-confirm">
                  <button
                    type="button"
                    className="danger"
                    disabled={busy}
                    onClick={() => onRemovePhoto(photo.photoId)}
                  >
                    ลบรูป
                  </button>
                  <button
                    type="button"
                    className="ghost"
                    onClick={() => setPhotoToRemove(null)}
                  >
                    ยกเลิก
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  className="gallery-remove"
                  aria-label="ลบรูปนี้"
                  disabled={busy}
                  onClick={() => setPhotoToRemove(photo.photoId)}
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="card stack">
        <label htmlFor="name">ชื่อของ</label>
        <input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <label htmlFor="expiresOn">วันหมดอายุ</label>
        <input
          id="expiresOn"
          type="date"
          value={expiresOn}
          onChange={(e) => setExpiresOn(e.target.value)}
        />
        <p className="muted small">
          {item.expiresOn
            ? `ปัจจุบัน: ${formatThai(item.expiresOn)}`
            : "ยังไม่ระบุวันหมดอายุ"}
        </p>
        <label htmlFor="note">หมายเหตุ</label>
        <textarea
          id="note"
          value={note}
          onChange={(e) => setNote(e.target.value)}
        />
        {item.guess && (
          <p className="muted small">
            AI อ่านได้: {item.guess.name ?? "-"}
            {item.guess.expiresOn && ` · ${item.guess.expiresOn}`}
            {item.guess.note && ` · ${item.guess.note}`}
          </p>
        )}
        <div className="row">
          <button
            type="button"
            onClick={save}
            disabled={busy || !dirty || name.trim() === ""}
          >
            บันทึกการแก้ไข
          </button>
        </div>
      </div>

      {photosLeft > 0 && (
        <div className="card stack">
          <h2>เพิ่มรูป</h2>
          <PhotoPicker
            files={newFiles}
            onChange={setNewFiles}
            max={photosLeft}
            disabled={busy}
          />
          <button
            type="button"
            onClick={uploadNew}
            disabled={busy || newFiles.length === 0}
          >
            อัปโหลด
          </button>
        </div>
      )}

      {item.status === "active" && !confirmingDelete && (
        <div className="row">
          <button type="button" onClick={onUsed} disabled={busy}>
            ✅ ใช้แล้ว
          </button>
          <button
            type="button"
            className="danger"
            onClick={() => setConfirmingDelete(true)}
            disabled={busy}
          >
            🗑️ ลบ
          </button>
        </div>
      )}
      {item.status === "active" && confirmingDelete && (
        <div className="card stack">
          <p>ลบ "{item.name}" ออกจากรายการ? กู้คืนได้จากหน้าประวัติภายใน 30 วัน</p>
          <div className="row">
            <button
              type="button"
              className="danger"
              onClick={onDeleteConfirmed}
              disabled={busy}
            >
              ยืนยันลบ
            </button>
            <button
              type="button"
              className="ghost"
              onClick={() => setConfirmingDelete(false)}
            >
              ยกเลิก
            </button>
          </div>
        </div>
      )}
    </section>
  );
}
