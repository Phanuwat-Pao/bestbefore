import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMutation, useQuery } from "convex/react";
import { Check, Loader2, Trash2, Undo2, X } from "lucide-react";
import { useState } from "react";

import { Page } from "@/components/page";
import { PhotoPicker } from "@/components/photo-picker";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { UrgencyBadge } from "@/components/urgency-badge";
import { prepareImage } from "@/lib/image";
import { useReadySession } from "@/lib/session";
import { uploadToConvex } from "@/lib/upload";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import { formatThai, parseIsoDate } from "../../convex/lib/dates";

export const Route = createFileRoute("/items/$itemId")({ component: ItemPage });

const MAX_PHOTOS = 6;

function ItemPage() {
  const { itemId } = Route.useParams();
  const { token } = useReadySession();
  const item = useQuery(api.items.get, { itemId, token });

  if (item === undefined) {
    return (
      <div className="flex flex-col gap-3">
        <Skeleton className="h-8 w-48" />
        <Skeleton className="h-40 w-full" />
      </div>
    );
  }
  if (item === null) {
    return (
      <Card>
        <CardContent className="flex flex-col items-start gap-3">
          <p className="text-muted-foreground">ไม่พบรายการนี้</p>
          <Button asChild variant="outline">
            <Link to="/">กลับไปหน้ารายการ</Link>
          </Button>
        </CardContent>
      </Card>
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

  const onRestore = () =>
    run("กู้คืนแล้ว", async () => {
      await restore({ itemId: item.id, token });
    });

  const onRemovePhoto = (photoId: Id<"photos">) =>
    run("ลบรูปแล้ว", async () => {
      await removePhoto({ photoId, token });
      setPhotoToRemove(null);
    });

  const photosLeft = Math.max(0, MAX_PHOTOS - item.photos.length);

  return (
    <Page
      title={item.name}
      aside={
        <UrgencyBadge
          urgency={item.urgency}
          daysLeft={item.daysLeft}
          className="shrink-0"
        />
      }
    >
      {item.status !== "active" && (
        <Alert>
          <AlertDescription className="flex flex-wrap items-center justify-between gap-2">
            <span>
              รายการนี้{item.status === "used" ? "ใช้แล้ว" : "ถูกลบแล้ว"}
              {item.archivedAt &&
                ` เมื่อ ${new Date(item.archivedAt).toLocaleDateString("th-TH")}`}
            </span>
            <Button size="sm" onClick={onRestore} disabled={busy}>
              <Undo2 data-icon="inline-start" />
              กู้คืน
            </Button>
          </AlertDescription>
        </Alert>
      )}
      {message && <p className="text-muted-foreground text-sm">{message}</p>}

      {item.photos.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {item.photos.map((photo) => (
            <div
              key={photo.photoId}
              className="bg-muted relative aspect-square overflow-hidden rounded-lg"
            >
              {photo.url ? (
                <a href={photo.url} target="_blank" rel="noreferrer">
                  <img
                    src={photo.url}
                    alt=""
                    className="size-full object-cover"
                  />
                </a>
              ) : (
                <div className="text-muted-foreground flex size-full items-center justify-center">
                  ?
                </div>
              )}
              <Button
                size="icon-sm"
                variant="secondary"
                className="absolute top-1 right-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                aria-label="ลบรูปนี้"
                disabled={busy}
                onClick={() => setPhotoToRemove(photo.photoId)}
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Card>
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-2">
            <Label htmlFor="name">ชื่อของ</Label>
            <Input
              id="name"
              className="h-11 text-base"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="expiresOn">วันหมดอายุ</Label>
            <Input
              id="expiresOn"
              type="date"
              className="h-11 text-base"
              value={expiresOn}
              onChange={(e) => setExpiresOn(e.target.value)}
            />
            <p className="text-muted-foreground text-sm">
              {item.expiresOn
                ? `ปัจจุบัน: ${formatThai(item.expiresOn)}`
                : "ยังไม่ระบุวันหมดอายุ"}
            </p>
          </div>
          <div className="flex flex-col gap-2">
            <Label htmlFor="note">หมายเหตุ</Label>
            <Textarea
              id="note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
            />
          </div>
          {item.guess && (
            <p className="text-muted-foreground text-xs">
              AI อ่านได้: {item.guess.name ?? "-"}
              {item.guess.expiresOn && ` · ${item.guess.expiresOn}`}
              {item.guess.note && ` · ${item.guess.note}`}
            </p>
          )}
          <Button
            size="lg"
            className="h-11"
            onClick={save}
            disabled={busy || !dirty || name.trim() === ""}
          >
            บันทึกการแก้ไข
          </Button>
        </CardContent>
      </Card>

      {photosLeft > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>เพิ่มรูป</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-3">
            <PhotoPicker
              files={newFiles}
              onChange={setNewFiles}
              max={photosLeft}
              disabled={busy}
            />
            <Button
              onClick={uploadNew}
              disabled={busy || newFiles.length === 0}
            >
              {busy && (
                <Loader2 className="animate-spin" data-icon="inline-start" />
              )}
              อัปโหลด
            </Button>
          </CardContent>
        </Card>
      )}

      {item.status === "active" && (
        <div className="grid grid-cols-2 gap-2">
          <Button
            size="lg"
            className="h-12 text-base"
            onClick={onUsed}
            disabled={busy}
          >
            <Check data-icon="inline-start" />
            ใช้แล้ว
          </Button>
          <Button
            size="lg"
            variant="destructive"
            className="h-12 text-base"
            onClick={() => setConfirmingDelete(true)}
            disabled={busy}
          >
            <Trash2 data-icon="inline-start" />
            ลบ
          </Button>
        </div>
      )}

      <Dialog open={confirmingDelete} onOpenChange={setConfirmingDelete}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบ "{item.name}"?</DialogTitle>
            <DialogDescription>
              กู้คืนได้จากหน้าประวัติภายใน 30 วัน หลังจากนั้นจะถูกลบถาวรพร้อมรูป
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setConfirmingDelete(false)}
            >
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              onClick={onDeleteConfirmed}
              disabled={busy}
            >
              ยืนยันลบ
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={photoToRemove !== null}
        onOpenChange={(open) => !open && setPhotoToRemove(null)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>ลบรูปนี้?</DialogTitle>
            <DialogDescription>รูปจะถูกลบทันทีและกู้คืนไม่ได้</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setPhotoToRemove(null)}>
              ยกเลิก
            </Button>
            <Button
              variant="destructive"
              disabled={busy}
              onClick={() => photoToRemove && onRemovePhoto(photoToRemove)}
            >
              ลบรูป
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Page>
  );
}
