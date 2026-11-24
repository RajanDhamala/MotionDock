import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Clapperboard, Film, FolderOpen, LogOut, Play, RefreshCw, Upload, X } from "lucide-react";
import { useEffect, useRef, useState, type ChangeEvent } from "react";
import { sessionCleared, type User } from "../store/session";
import { useAppDispatch } from "../store/store";
import api from "../Utils/AxiosWrapper";
import { beginUpload, completeUpload, listVideos, sendVideo, videoPlaybackUrl, type UploadTicket, type VideoUpload } from "../Utils/VideoApi";
import "./dashboard.css";

type Media =
  | { source: "local"; file: File; url: string }
  | { source: "library"; name: string; url: string };

type Transfer =
  | { phase: "uploading" | "confirming" | "complete" }
  | { phase: "failed"; ticket: UploadTicket | null }
  | { phase: "unconfirmed"; id: string };

function videoName(video: VideoUpload) {
  return typeof video.metadata?.name === "string" && video.metadata.name.trim()
    ? video.metadata.name
    : `Video ${video._id.slice(0, 8)}`;
}

export default function DashboardPage({ user }: { user: User }) {
  const dispatch = useAppDispatch();
  const queryClient = useQueryClient();
  const fileInput = useRef<HTMLInputElement>(null);
  const preview = useRef<HTMLElement>(null);
  const [media, setMedia] = useState<Media | null>(null);
  const [transfer, setTransfer] = useState<Transfer | null>(null);
  const [openingVideo, setOpeningVideo] = useState<string | null>(null);
  const [playFailed, setPlayFailed] = useState(false);
  const [playbackFailed, setPlaybackFailed] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutFailed, setSignOutFailed] = useState(false);
  const accountName = user.name.trim() || user.email;
  const initials = accountName.split(/\s+/).slice(0, 2)
    .map((part) => Array.from(part)[0]).join("").toUpperCase();
  const localUrl = media?.source === "local" ? media.url : undefined;
  const mediaName = media?.source === "local" ? media.file.name : media?.name;
  const transferring = transfer?.phase === "uploading" || transfer?.phase === "confirming";
  const videoQueryKey = ["video-uploads", user.id];
  const videos = useQuery({ queryKey: videoQueryKey, queryFn: ({ signal }) => listVideos(signal) });

  useEffect(() => {
    document.title = "Workspace | MotionDock";
    return () => { document.title = "MotionDock"; };
  }, []);

  useEffect(() => {
    return () => {
      if (localUrl) URL.revokeObjectURL(localUrl);
    };
  }, [localUrl]);

  function openVideo(event: ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) return;

    event.currentTarget.value = "";
    setPlaybackFailed(false);
    setTransfer(null);
    setMedia({ source: "local", file, url: URL.createObjectURL(file) });
  }

  async function confirmUpload(id: string) {
    setTransfer({ phase: "confirming" });
    try {
      await completeUpload(id);
      setTransfer({ phase: "complete" });
    } catch {
      setTransfer({ phase: "unconfirmed", id });
    } finally {
      void queryClient.invalidateQueries({ queryKey: videoQueryKey });
    }
  }

  async function uploadSelectedVideo() {
    if (media?.source !== "local" || transferring) return;

    let ticket = transfer?.phase === "failed" ? transfer.ticket : null;
    setTransfer({ phase: "uploading" });
    try {
      if (!ticket || ticket.expiresAt <= Date.now()) ticket = await beginUpload(media.file);
      await sendVideo(ticket.url, media.file);
    } catch {
      setTransfer({ phase: "failed", ticket });
      void queryClient.invalidateQueries({ queryKey: videoQueryKey });
      return;
    }

    await confirmUpload(ticket.id);
  }

  async function playVideo(video: VideoUpload) {
    setOpeningVideo(video._id);
    setPlayFailed(false);
    try {
      const url = await videoPlaybackUrl(video._id);
      setPlaybackFailed(false);
      setTransfer(null);
      setMedia({ source: "library", name: videoName(video), url });
      preview.current?.scrollIntoView({ block: "nearest" });
    } catch {
      setPlayFailed(true);
    } finally {
      setOpeningVideo(null);
    }
  }

  async function signOut() {
    setSigningOut(true);
    setSignOutFailed(false);

    try {
      const response = await api.post<{ message: string }>("/users/logout");
      if (response.status !== 200 || response.data?.message !== "logged out") {
        setSignOutFailed(true);
        return;
      }
      dispatch(sessionCleared());
    } catch {
      setSignOutFailed(true);
    } finally {
      setSigningOut(false);
    }
  }

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="dashboard-header-inner">
          <span className="dashboard-brand">
            <span className="dashboard-brand-icon"><Clapperboard size={19} aria-hidden="true" /></span>
            MotionDock
          </span>
          <button className="dashboard-signout" type="button" onClick={signOut} disabled={signingOut || transferring}>
            <LogOut size={17} aria-hidden="true" />
            {signingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <main className="dashboard-content">
        <h1>Media workspace</h1>
        {signOutFailed && <p className="dashboard-error" role="alert">Couldn’t sign you out. Please try again.</p>}

        <div className="dashboard-grid">
          <section className="dashboard-panel" aria-labelledby="preview-title" ref={preview}>
            <div className="dashboard-panel-heading">
              <h2 id="preview-title">Video preview</h2>
              <input ref={fileInput} type="file" accept="video/*" onChange={openVideo} hidden />
              <button className="dashboard-open" type="button" disabled={transferring || openingVideo !== null} onClick={() => fileInput.current?.click()}>
                <FolderOpen size={17} aria-hidden="true" />
                {media ? "Open another video" : "Open video"}
              </button>
            </div>

            {media ? (
              <video
                className="dashboard-video"
                key={media.url}
                src={media.url}
                controls
                playsInline
                autoPlay={media.source === "library"}
                preload="metadata"
                aria-label={`Preview of ${mediaName}`}
                onError={() => setPlaybackFailed(true)}
              />
            ) : (
              <div className="dashboard-empty">
                <span className="dashboard-play-icon"><Play size={25} aria-hidden="true" /></span>
                <p>No video open</p>
              </div>
            )}

            {playbackFailed && (
              <p className="dashboard-error dashboard-playback-error" role="alert">This browser couldn’t play that video. Try opening another file.</p>
            )}
            <div className="dashboard-panel-footer">
              {media ? (
                <>
                  <span className="dashboard-file"><Film size={17} aria-hidden="true" /> {mediaName}</span>
                  <div className="dashboard-actions">
                    {media.source === "local" && transfer?.phase !== "complete" && transfer?.phase !== "unconfirmed" && (
                      <button className="dashboard-open" type="button" disabled={transferring || openingVideo !== null} onClick={uploadSelectedVideo}>
                        <Upload size={17} aria-hidden="true" />
                        {transfer?.phase === "uploading" ? "Uploading…" : transfer?.phase === "confirming" ? "Confirming…" : "Upload video"}
                      </button>
                    )}
                    <button className="dashboard-close" type="button" disabled={transferring || openingVideo !== null} onClick={() => {
                      setMedia(null);
                      setTransfer(null);
                      setPlaybackFailed(false);
                    }}>
                      <X size={17} aria-hidden="true" />
                      Close video
                    </button>
                  </div>
                </>
              ) : (
                <p>Open a video to preview it before uploading.</p>
              )}
            </div>
            {transfer?.phase === "complete" && <p className="dashboard-transfer-note" role="status">Upload confirmed.</p>}
            {transfer?.phase === "failed" && <p className="dashboard-transfer-note" role="alert">Couldn’t upload the video. Try again.</p>}
            {transfer?.phase === "unconfirmed" && (
              <div className="dashboard-transfer-note" role="status">
                <p>The file reached storage. MotionDock couldn’t confirm the upload.</p>
                <button className="dashboard-compact" type="button" disabled={openingVideo !== null} onClick={() => void confirmUpload(transfer.id)}>Retry confirmation</button>
              </div>
            )}
          </section>

          <aside className="dashboard-sidebar">
            <section className="dashboard-panel" aria-labelledby="video-library-title">
              <div className="dashboard-panel-heading">
                <h2 id="video-library-title">Your videos</h2>
                <button className="dashboard-compact" type="button" disabled={videos.isFetching} onClick={() => void videos.refetch()}>
                  <RefreshCw size={15} aria-hidden="true" />
                  Refresh
                </button>
              </div>
              {videos.isPending && <p className="dashboard-library-note" role="status">Loading videos…</p>}
              {videos.isError && <p className="dashboard-library-note" role="alert">Couldn’t load your videos.</p>}
              {videos.data?.length === 0 && <p className="dashboard-library-note">No uploads yet.</p>}
              {playFailed && <p className="dashboard-library-note" role="alert">Couldn’t open that video. Try again.</p>}
              {videos.data && videos.data.length > 0 && (
                <ul className="dashboard-library">
                  {[...videos.data].sort((a, b) => b.created_at.localeCompare(a.created_at)).map((video) => {
                    const status = video.status?.valid ? video.status.upload_status : "unknown";
                    const playable = status === "completed" || status === "uploaded";
                    return (
                      <li key={video._id} className="dashboard-library-item">
                        <span className="dashboard-library-icon"><Film size={17} aria-hidden="true" /></span>
                        <div className="dashboard-library-details">
                          <p className="dashboard-library-name">{videoName(video)}</p>
                          <p className="dashboard-library-status">{status}</p>
                        </div>
                        {playable && (
                          <button className="dashboard-compact" type="button" aria-label={`Play ${videoName(video)}`} disabled={transferring || openingVideo !== null} onClick={() => void playVideo(video)}>
                            <Play size={15} aria-hidden="true" />
                            {openingVideo === video._id ? "Opening…" : "Play"}
                          </button>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>

            <section className="dashboard-panel dashboard-account" aria-labelledby="account-title">
              <h2 id="account-title">Account</h2>
              <div className="dashboard-account-details">
                <span className="dashboard-avatar" aria-hidden="true">{initials}</span>
                <div>
                  <p className="dashboard-account-name">{accountName}</p>
                  {accountName !== user.email && <p className="dashboard-account-email">{user.email}</p>}
                </div>
              </div>
            </section>
          </aside>
        </div>
      </main>
    </div>
  );
}
