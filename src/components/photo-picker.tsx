import { Camera, Images, X } from "lucide-react";
import { useEffect, useMemo, useRef } from "react";

import { Button } from "@/components/ui/button";

interface PhotoPickerProps {
  files: File[];
  onChange: (files: File[]) => void;
  max: number;
  disabled?: boolean;
}

/** Camera / gallery picker with previews. The capture attribute opens the camera on phones. */
export function PhotoPicker({
  files,
  onChange,
  max,
  disabled,
}: PhotoPickerProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);
  const previews = useMemo(
    () => files.map((f) => URL.createObjectURL(f)),
    [files]
  );

  useEffect(
    () => () => {
      for (const url of previews) {
        URL.revokeObjectURL(url);
      }
    },
    [previews]
  );

  const add = (list: FileList | null) => {
    if (!list) {
      return;
    }
    onChange([...files, ...list].slice(0, max));
  };

  const full = files.length >= max;

  return (
    <div className="flex flex-col gap-3">
      <div className="grid grid-cols-2 gap-2">
        <Button
          type="button"
          size="lg"
          className="h-12 text-base"
          onClick={() => cameraRef.current?.click()}
          disabled={disabled || full}
        >
          <Camera data-icon="inline-start" />
          ถ่ายรูป
        </Button>
        <Button
          type="button"
          size="lg"
          variant="outline"
          className="h-12 text-base"
          onClick={() => galleryRef.current?.click()}
          disabled={disabled || full}
        >
          <Images data-icon="inline-start" />
          เลือกจากคลัง
        </Button>
      </div>
      <input
        ref={cameraRef}
        type="file"
        accept="image/*"
        capture="environment"
        hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      <input
        ref={galleryRef}
        type="file"
        accept="image/*"
        multiple
        hidden
        onChange={(e) => {
          add(e.target.files);
          e.target.value = "";
        }}
      />
      {previews.length > 0 && (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
          {previews.map((url, i) => (
            <div
              key={url}
              className="bg-muted relative aspect-square overflow-hidden rounded-lg"
            >
              <img src={url} alt="" className="size-full object-cover" />
              <Button
                type="button"
                size="icon-sm"
                variant="secondary"
                className="absolute top-1 right-1 rounded-full bg-black/60 text-white hover:bg-black/80"
                onClick={() => onChange(files.filter((_, j) => j !== i))}
                disabled={disabled}
                aria-label="ลบรูปนี้"
              >
                <X />
              </Button>
            </div>
          ))}
        </div>
      )}
      <p className="text-muted-foreground text-sm">
        ถ่ายด้านหน้าสินค้าและวันหมดอายุให้ชัด สูงสุด {max} รูป
      </p>
    </div>
  );
}
