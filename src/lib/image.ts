// Client-side photo preparation: downscale and re-encode as JPEG so uploads stay
// small and the model gets a sensible image. Falls back to the original file.

const MAX_EDGE = 1600;
const JPEG_QUALITY = 0.85;

export async function prepareImage(file: File): Promise<Blob> {
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.max(1, Math.round(bitmap.width * scale));
    const height = Math.max(1, Math.round(bitmap.height * scale));
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext("2d");
    if (!context) {
      return file;
    }
    context.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    return await canvas.convertToBlob({
      quality: JPEG_QUALITY,
      type: "image/jpeg",
    });
  } catch {
    return file;
  }
}
