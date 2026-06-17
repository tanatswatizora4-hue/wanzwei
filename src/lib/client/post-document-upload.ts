/** Client-side upload to `/api/uploads/*` (multipart FormData). */

export type DocumentUploadResponse = {
  document?: {
    id: string;
    file_name: string;
    public_url: string;
    content_type: string;
    created_at: string;
  };
};

export async function postDocumentUpload(
  file: File,
  apiPath:
    | "/api/uploads/professional"
    | "/api/uploads/facility-verification",
): Promise<DocumentUploadResponse> {
  const fd = new FormData();
  fd.append("file", file);
  const res = await fetch(apiPath, {
    method: "POST",
    body: fd,
    credentials: "same-origin",
  });
  const json = (await res.json().catch(() => ({}))) as DocumentUploadResponse & {
    error?: string;
  };
  if (!res.ok) {
    throw new Error(
      typeof json.error === "string" ? json.error : "Upload failed",
    );
  }
  return json;
}
