"use client";
import { useRef, useCallback, useState, DragEvent } from "react";
import Image from "next/image";
import { motion, AnimatePresence } from "framer-motion";
import { useOrchestrationStore, MediaItem } from "@/store/orchestrationStore";

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */
function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileToMediaItem(file: File): MediaItem {
  return {
    id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
    url: URL.createObjectURL(file),
    name: file.name,
    type: file.type.startsWith("video/") ? "video" : "photo",
    selected: true,   // auto-select on upload
    size: file.size,
  };
}

/* ------------------------------------------------------------------ */
/*  Video thumbnail — renders first frame on a small canvas            */
/* ------------------------------------------------------------------ */
function VideoThumb({ url, alt }: { url: string; alt: string }) {
  return (
    <video
      src={url}
      preload="metadata"
      muted
      playsInline
      style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
      aria-label={alt}
    />
  );
}

/* ------------------------------------------------------------------ */
/*  Single grid cell                                                    */
/* ------------------------------------------------------------------ */
function MediaCell({ item, index }: { item: MediaItem; index: number }) {
  const toggleMediaItem = useOrchestrationStore((s) => s.toggleMediaItem);
  const removeMediaItem = useOrchestrationStore((s) => s.removeMediaItem);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ delay: index * 0.04, duration: 0.25 }}
      style={{ position: "relative", aspectRatio: "2/3", overflow: "hidden", background: "var(--color-slate-800)" }}
    >
      {/* Thumbnail */}
      {item.type === "video" ? (
        <VideoThumb url={item.url} alt={item.name} />
      ) : (
        <Image
          src={item.url}
          alt={item.name}
          fill
          sizes="(max-width: 480px) 33vw, 160px"
          style={{ objectFit: "cover" }}
          unoptimized   // blob: URLs bypass Next.js optimizer
        />
      )}

      {/* Type badge */}
      <div
        style={{
          position: "absolute",
          top: "5px",
          left: "5px",
          background: "rgba(2,6,23,0.75)",
          borderRadius: "4px",
          padding: "2px 5px",
          fontSize: "9px",
          fontWeight: 700,
          letterSpacing: "0.05em",
          color: item.type === "video" ? "var(--color-cyan)" : "var(--color-indigo-400)",
        }}
      >
        {item.type === "video" ? "VID" : "IMG"}
      </div>

      {/* Remove button */}
      <button
        aria-label={`Remove ${item.name}`}
        onClick={(e) => { e.stopPropagation(); removeMediaItem(item.id); }}
        style={{
          position: "absolute",
          top: "5px",
          right: "5px",
          width: "20px",
          height: "20px",
          borderRadius: "50%",
          background: "rgba(2,6,23,0.75)",
          border: "none",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--color-slate-400)",
          fontSize: "12px",
          lineHeight: 1,
        }}
      >
        ✕
      </button>

      {/* Select overlay */}
      <button
        aria-label={`${item.selected ? "Deselect" : "Select"} ${item.name}`}
        aria-pressed={item.selected}
        onClick={() => toggleMediaItem(item.id)}
        style={{
          position: "absolute",
          inset: 0,
          background: item.selected ? "rgba(99,102,241,0.30)" : "transparent",
          border: "none",
          cursor: "pointer",
          transition: "background 0.2s",
        }}
      />

      {/* Checkmark */}
      <AnimatePresence>
        {item.selected && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            style={{
              position: "absolute",
              bottom: "8px",
              right: "8px",
              width: "24px",
              height: "24px",
              borderRadius: "50%",
              background: "var(--color-indigo)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              boxShadow: "0 0 12px rgba(99,102,241,0.7)",
              pointerEvents: "none",
            }}
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

/* ------------------------------------------------------------------ */
/*  Drop Zone                                                           */
/* ------------------------------------------------------------------ */
function DropZone({ onFiles }: { onFiles: (files: FileList) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);

  const handleDrop = useCallback((e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setDragging(false);
    if (e.dataTransfer.files.length > 0) onFiles(e.dataTransfer.files);
  }, [onFiles]);

  const handleDragOver = (e: DragEvent) => { e.preventDefault(); setDragging(true); };
  const handleDragLeave = () => setDragging(false);

  return (
    <div
      role="button"
      tabIndex={0}
      aria-label="Upload photos and videos"
      onDrop={handleDrop}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDragEnd={handleDragLeave}
      onClick={() => inputRef.current?.click()}
      onKeyDown={(e) => e.key === "Enter" && inputRef.current?.click()}
      style={{
        border: `2px dashed ${dragging ? "var(--color-indigo)" : "var(--color-slate-700)"}`,
        borderRadius: "16px",
        padding: "32px 20px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        cursor: "pointer",
        background: dragging
          ? "rgba(99,102,241,0.08)"
          : "rgba(15,23,42,0.5)",
        transition: "all 0.2s ease",
        userSelect: "none",
      }}
    >
      {/* Upload icon */}
      <div
        style={{
          width: "56px",
          height: "56px",
          borderRadius: "16px",
          background: "rgba(99,102,241,0.12)",
          border: "1px solid rgba(99,102,241,0.25)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="var(--color-indigo-400)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
          <polyline points="17 8 12 3 7 8" />
          <line x1="12" y1="3" x2="12" y2="15" />
        </svg>
      </div>

      <div style={{ textAlign: "center" }}>
        <p style={{ margin: 0, fontWeight: 600, color: "var(--color-slate-50)", fontSize: "15px" }}>
          {dragging ? "Drop files here" : "Upload your media"}
        </p>
        <p style={{ margin: "4px 0 0", color: "var(--color-slate-400)", fontSize: "13px" }}>
          Drag &amp; drop or{" "}
          <span style={{ color: "var(--color-indigo-400)", fontWeight: 600 }}>browse</span>
        </p>
        <p style={{ margin: "8px 0 0", color: "var(--color-slate-600)", fontSize: "11px", letterSpacing: "0.03em" }}>
          JPG · PNG · WEBP · MP4 · MOV · WEBM
        </p>
      </div>

      <input
        ref={inputRef}
        type="file"
        id="media-file-input"
        multiple
        accept="image/jpeg,image/png,image/webp,image/gif,image/heic,video/mp4,video/quicktime,video/webm,video/x-msvideo"
        style={{ display: "none" }}
        onChange={(e) => { if (e.target.files?.length) onFiles(e.target.files); e.target.value = ""; }}
      />
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Main MediaGrid component                                            */
/* ------------------------------------------------------------------ */
export default function MediaGrid() {
  const mediaItems    = useOrchestrationStore((s) => s.mediaItems);
  const addMediaItems = useOrchestrationStore((s) => s.addMediaItems);
  const selectedCount = useOrchestrationStore((s) => s.selectedCount);
  const setStep       = useOrchestrationStore((s) => s.setStep);
  const clearMediaItems = useOrchestrationStore((s) => s.clearMediaItems);

  const handleFiles = useCallback((fileList: FileList) => {
    const items: MediaItem[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      // 100 MB per file limit
      if (file.size > 100 * 1024 * 1024) continue;
      items.push(fileToMediaItem(file));
    }
    if (items.length > 0) addMediaItems(items);
  }, [addMediaItems]);

  const totalSize = mediaItems.reduce((s, m) => s + m.size, 0);

  return (
    <section style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "20px" }}>
      {/* Header */}
      <div>
        <h2 className="text-display" style={{ margin: 0, marginBottom: "6px" }}>
          Select Media
        </h2>
        <p className="text-body-sm" style={{ color: "var(--color-slate-400)", margin: 0 }}>
          Upload your photos &amp; videos — the AI will generate a video from them
        </p>
      </div>

      {/* Drop zone */}
      <DropZone onFiles={handleFiles} />

      {/* Stats row */}
      {mediaItems.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "10px 14px",
            background: "var(--color-slate-900)",
            border: "1px solid var(--color-slate-800)",
            borderRadius: "10px",
          }}
        >
          <div style={{ display: "flex", gap: "16px" }}>
            <span className="text-body-sm" style={{ color: "var(--color-slate-50)", fontWeight: 600 }}>
              {mediaItems.length} file{mediaItems.length > 1 ? "s" : ""}
            </span>
            <span className="text-mono" style={{ color: "var(--color-slate-400)" }}>
              {formatBytes(totalSize)}
            </span>
          </div>
          <button
            onClick={clearMediaItems}
            style={{
              background: "none",
              border: "none",
              color: "var(--color-slate-600)",
              fontSize: "12px",
              cursor: "pointer",
              padding: "2px 6px",
            }}
          >
            Clear all
          </button>
        </div>
      )}

      {/* Grid */}
      {mediaItems.length > 0 && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: "4px",
            borderRadius: "12px",
            overflow: "hidden",
          }}
        >
          <AnimatePresence mode="popLayout">
            {mediaItems.map((item, idx) => (
              <MediaCell key={item.id} item={item} index={idx} />
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty state hint */}
      {mediaItems.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "16px",
            color: "var(--color-slate-600)",
            fontSize: "13px",
          }}
        >
          Your uploaded files will appear here
        </div>
      )}

      {/* Sticky CTA */}
      <AnimatePresence>
        {selectedCount > 0 && (
          <motion.div
            initial={{ y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: 40, opacity: 0 }}
            style={{ position: "sticky", bottom: "0", paddingBottom: "8px" }}
          >
            <button
              id="btn-continue-to-configure"
              className="btn-primary"
              onClick={() => setStep("configure")}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                <path d="M5 12h14M12 5l7 7-7 7" />
              </svg>
              Generate video from {selectedCount} file{selectedCount > 1 ? "s" : ""}
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
  );
}
