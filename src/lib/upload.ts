import type { Id } from "../../convex/_generated/dataModel";

/** Upload one blob to a Convex upload URL and return its storage id. */
export async function uploadToConvex(
  uploadUrl: string,
  blob: Blob
): Promise<Id<"_storage">> {
  const res = await fetch(uploadUrl, {
    body: blob,
    headers: { "Content-Type": blob.type || "application/octet-stream" },
    method: "POST",
  });
  if (!res.ok) {
    throw new Error(`อัปโหลดรูปไม่สำเร็จ (${res.status})`);
  }
  const data: unknown = await res.json();
  if (
    typeof data !== "object" ||
    data === null ||
    !("storageId" in data) ||
    typeof data.storageId !== "string"
  ) {
    throw new Error("อัปโหลดรูปไม่สำเร็จ: ไม่ได้รับ storageId");
  }
  // Earned cast: the Convex upload endpoint only ever returns a `_storage` id.
  return data.storageId as Id<"_storage">;
}
