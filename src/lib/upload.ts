/**
 * Client-side wrapper over the existing POST /api/upload route. The route does
 * the validation, size limits and storage decision; this only carries the file
 * to it and hands back the URL it returns.
 */
export async function uploadFile(file: File): Promise<{ url: string } | { error: string }> {
  const body = new FormData();
  body.append("file", file);

  try {
    const response = await fetch("/api/upload", { method: "POST", body });
    const payload = (await response.json()) as { url?: string; error?: string };

    if (!response.ok || !payload.url) {
      return { error: payload.error ?? "Upload failed" };
    }
    return { url: payload.url };
  } catch {
    return { error: "Upload failed. Check your connection and try again." };
  }
}
