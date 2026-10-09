import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useAction, useMutation } from "convex/react";
import { Loader2, ScanLine, Sparkles } from "lucide-react";
import { useState } from "react";

import { Page } from "@/components/page";
import { PhotoPicker } from "@/components/photo-picker";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { prepareImage } from "@/lib/image";
import { useReadySession } from "@/lib/session";
import { uploadToConvex } from "@/lib/upload";

import { api } from "../../convex/_generated/api";
import type { Id } from "../../convex/_generated/dataModel";
import type { Guess } from "../../convex/ai";
import { formatThai, parseIsoDate } from "../../convex/lib/dates";

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
  const busy =
    stage.kind === "uploading" ||
    stage.kind === "reading" ||
    stage.kind === "saving";

  return (
    <Page title="เพิ่มของ">
      {formError && (
        <Alert variant="destructive">
          <AlertTitle>ไม่สำเร็จ</AlertTitle>
          <AlertDescription>{formError}</AlertDescription>
        </Alert>
      )}

      {stage.kind === "pick" && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            <PhotoPicker files={files} onChange={setFiles} max={MAX_PHOTOS} />
            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                className="h-12 text-base"
                onClick={readPhotos}
                disabled={files.length === 0}
              >
                <ScanLine data-icon="inline-start" />
                อ่านวันหมดอายุจากรูป
              </Button>
              <Button
                size="lg"
                variant="ghost"
                onClick={() =>
                  setStage({
                    aiNote: null,
                    guess: null,
                    kind: "form",
                    storageIds: [],
                  })
                }
              >
                กรอกเองโดยไม่ใช้รูป
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {(stage.kind === "uploading" || stage.kind === "reading") && (
        <Card>
          <CardContent className="text-muted-foreground flex items-center gap-3 py-8">
            <Loader2 className="size-5 animate-spin" />
            {stage.kind === "uploading"
              ? `กำลังอัปโหลดรูป ${stage.done}/${stage.total}…`
              : "กำลังอ่านชื่อและวันหมดอายุจากรูป…"}
          </CardContent>
        </Card>
      )}

      {(stage.kind === "form" || stage.kind === "saving") && (
        <Card>
          <CardContent className="flex flex-col gap-4">
            {stage.guess && (
              <Alert>
                <Sparkles />
                <AlertTitle>AI อ่านได้ว่า</AlertTitle>
                <AlertDescription>
                  {stage.guess.note ?? "ไม่มีรายละเอียด"} ·{" "}
                  {CONFIDENCE_LABEL[stage.guess.confidence]}
                  {stage.guess.basis === "estimated" &&
                    " · ประเมินจากประเภทสินค้า กรุณาตรวจสอบ"}
                  {stage.guess.basis === "none" &&
                    " · ไม่พบวันหมดอายุ กรุณากรอกเอง"}
                </AlertDescription>
              </Alert>
            )}
            {stage.aiNote && (
              <Alert>
                <AlertDescription>{stage.aiNote}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-2">
              <Label htmlFor="name">ชื่อของ</Label>
              <Input
                id="name"
                className="h-11 text-base"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="เช่น นมสด ดัชมิลล์"
                autoFocus
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
                {expiresParsed
                  ? `หมดอายุ ${formatThai(expiresParsed)}`
                  : "เว้นว่างได้ถ้ายังไม่ทราบ แล้วมาใส่ทีหลัง"}
              </p>
            </div>

            <div className="flex flex-col gap-2">
              <Label htmlFor="note">หมายเหตุ</Label>
              <Textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="เช่น เปิดแล้วเมื่อ 10 ต.ค."
              />
            </div>

            <div className="flex flex-col gap-2">
              <Button
                size="lg"
                className="h-12 text-base"
                onClick={save}
                disabled={busy || name.trim() === ""}
              >
                {stage.kind === "saving" && (
                  <Loader2 className="animate-spin" data-icon="inline-start" />
                )}
                {stage.kind === "saving" ? "กำลังบันทึก…" : "บันทึก"}
              </Button>
              <Button
                variant="ghost"
                disabled={busy}
                onClick={() => setStage({ kind: "pick" })}
              >
                กลับไปเลือกรูป
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </Page>
  );
}
