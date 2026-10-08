import { useEffect, useMemo, useRef } from "react";

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
    const next = [...files, ...list].slice(0, max);
    onChange(next);
  };

  const remove = (index: number) => {
    onChange(files.filter((_, i) => i !== index));
  };

  return (
    <div className="stack">
      <div className="row">
        <button
          type="button"
          onClick={() => cameraRef.current?.click()}
          disabled={disabled || files.length >= max}
        >
          📷 ถ่ายรูป
        </button>
        <button
          type="button"
          className="ghost"
          onClick={() => galleryRef.current?.click()}
          disabled={disabled || files.length >= max}
        >
          🖼️ เลือกจากคลัง
        </button>
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
        <div className="gallery">
          {previews.map((url, i) => (
            <div key={url} className="gallery-cell">
              <img src={url} alt="" />
              <button
                type="button"
                className="gallery-remove"
                onClick={() => remove(i)}
                disabled={disabled}
                aria-label="ลบรูปนี้"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}
      <p className="muted small">ถ่ายด้านหน้าสินค้าและวันหมดอายุให้ชัด สูงสุด {max} รูป</p>
    </div>
  );
}
