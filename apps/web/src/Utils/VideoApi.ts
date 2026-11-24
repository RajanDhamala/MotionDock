import api from "./AxiosWrapper";

export interface VideoUpload {
  _id: string;
  status: { valid: boolean; upload_status: string } | null;
  metadata: { name?: string; size?: number; type?: string } | null;
  created_at: string;
}

export interface UploadTicket {
  id: string;
  url: string;
  expiresAt: number;
}

const uploadPath = "/users/upload";

export async function listVideos(signal: AbortSignal): Promise<VideoUpload[]> {
  const { data } = await api.get<{ data: VideoUpload[] | null }>(`${uploadPath}/video`, { signal });
  if (data?.data === null) return [];
  if (!Array.isArray(data?.data)) throw new Error("Invalid video list");
  return data.data;
}

export async function beginUpload(file: File): Promise<UploadTicket> {
  const expiresAt = Date.now() + 5 * 60_000;
  const { data } = await api.post<{ id: string; url: string }>(`${uploadPath}/init`, {
    size: file.size,
    string: file.name,
    metadata: { name: file.name, size: file.size, type: file.type },
  });
  if (!data?.id || !data.url) throw new Error("Invalid upload link");
  return { ...data, expiresAt };
}

export async function sendVideo(url: string, file: File) {
  const response = await fetch(url, { method: "PUT", body: file, credentials: "omit" });
  if (!response.ok) throw new Error("Video transfer failed");
}

export async function completeUpload(id: string) {
  const { status } = await api.post(`${uploadPath}/${encodeURIComponent(id)}/complete`);
  if (status !== 202) throw new Error("Invalid upload confirmation");
}

export async function videoPlaybackUrl(id: string): Promise<string> {
  const { data } = await api.get<{ data: { URL: string } | null }>(`${uploadPath}/${encodeURIComponent(id)}/play`);
  if (!data?.data?.URL) throw new Error("Invalid playback link");
  return data.data.URL;
}
