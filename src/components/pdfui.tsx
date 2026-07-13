"use client";

import { useCallback, useRef, useState, type ReactNode } from "react";
import { cx, Icon } from "@/components/ui";
import { formatBytes, openPdfjsDoc, renderThumbnail } from "@/lib/pdf";
import { useEffect } from "react";

/* ---------------- Drop zone ---------------- */
export function FileDrop({
  accept,
  multiple = true,
  onFiles,
  title,
  sub,
  icon = "upload",
  compact,
  hint = "Files never leave your device",
}: {
  accept: string;
  multiple?: boolean;
  onFiles: (files: File[]) => void;
  title?: ReactNode;
  sub?: ReactNode;
  icon?: string;
  compact?: boolean;
  hint?: ReactNode | null;
}) {
  const [over, setOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const pick = useCallback(
    (list: FileList | null) => {
      if (!list || list.length === 0) return;
      onFiles(Array.from(list));
    },
    [onFiles],
  );

  return (
    <div
      className={cx("dropzone", over && "over", compact && "sm")}
      onClick={() => inputRef.current?.click()}
      onDragOver={(e) => {
        e.preventDefault();
        setOver(true);
      }}
      onDragLeave={() => setOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setOver(false);
        pick(e.dataTransfer.files);
      }}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === "Enter" || e.key === " ") {
          e.preventDefault();
          inputRef.current?.click();
        }
      }}
    >
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        multiple={multiple}
        hidden
        onChange={(e) => {
          pick(e.target.files);
          e.target.value = "";
        }}
      />
      <div className="dz-glyph">
        <Icon name={icon} size={compact ? 26 : 32} strokeWidth={1.6} />
      </div>
      <div className="stack" style={{ gap: 6, alignItems: "center" }}>
        <div className="dz-title">
          {title ?? (
            <>
              Drop files or <span className="em">browse</span>
            </>
          )}
        </div>
        <div className="dz-sub">
          {sub ?? `Drag & drop ${multiple ? "files" : "a file"} here, or click to choose.`}
        </div>
      </div>
      {hint !== null && (
        <div className="dz-hint">
          <Icon name="lock" size={13} strokeWidth={2} />
          {hint}
        </div>
      )}
    </div>
  );
}

/* ---------------- Reorderable file list ---------------- */
export interface NamedFile {
  id: string;
  file: File;
}

export function FileList({
  items,
  onRemove,
  onMove,
  meta,
}: {
  items: NamedFile[];
  onRemove: (id: string) => void;
  onMove?: (id: string, dir: -1 | 1) => void;
  meta?: (f: NamedFile, index: number) => ReactNode;
}) {
  if (items.length === 0) return null;
  return (
    <div className="file-list">
      {items.map((it, i) => (
        <div className="file-row" key={it.id}>
          <span className="file-idx">{i + 1}</span>
          <span className="file-thumb">
            <FileThumb file={it.file} />
          </span>
          <div className="file-meta">
            <div className="file-name" title={it.file.name}>
              {it.file.name}
            </div>
            <div className="file-info">{meta ? meta(it, i) : <span className="mono">{formatBytes(it.file.size)}</span>}</div>
          </div>
          <div className="row-actions">
            {onMove && (
              <div className="reorder-btns">
                <button
                  type="button"
                  className="icon-btn"
                  disabled={i === 0}
                  onClick={() => onMove(it.id, -1)}
                  aria-label="Move up"
                >
                  <Icon name="arrowUp" size={14} strokeWidth={2} />
                </button>
                <button
                  type="button"
                  className="icon-btn"
                  disabled={i === items.length - 1}
                  onClick={() => onMove(it.id, 1)}
                  aria-label="Move down"
                >
                  <Icon name="arrowDown" size={14} strokeWidth={2} />
                </button>
              </div>
            )}
            <button
              type="button"
              className="icon-btn danger"
              onClick={() => onRemove(it.id)}
              aria-label="Remove"
            >
              <Icon name="trash" size={16} />
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}



/* eslint-disable react-hooks/set-state-in-effect */
/* eslint-disable @next/next/no-img-element */
export function FileThumb({ file }: { file: File }) {
  const [thumb, setThumb] = useState<string | null>(null);
  useEffect(() => {
    let active = true;
    const type = file.type;
    const nameLower = file.name.toLowerCase();

    if (type.startsWith("image/")) {
      const url = URL.createObjectURL(file);
      if (active) setThumb(url);
      return () => URL.revokeObjectURL(url);
    }
    if (type === "application/pdf" || nameLower.endsWith(".pdf")) {
      file.arrayBuffer().then(buf => openPdfjsDoc(buf)).then(doc => {
        if (!active) { doc.destroy(); return; }
        renderThumbnail(doc, 1, 100).then(({url}) => {
          if (active) setThumb(url);
          doc.destroy();
        }).catch(() => doc.destroy());
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [file]);

  if (thumb) {
    return <img src={thumb} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />;
  }
  return <Icon name="file" size={18} />;
}

export function DetailedPreview({ file, name, size, type, data, meta, onRemove }: { file?: File, name?: string, size?: number, type?: string, data?: ArrayBuffer, meta?: ReactNode, onRemove?: () => void }) {
  const [thumb, setThumb] = useState<string | null>(null);
  const fileType = file?.type || type || "";
  const fileName = (file?.name || name || "").toLowerCase();

  const isImg = fileType.startsWith("image/");
  const isVideo = fileType.startsWith("video/");
  const isPdf = fileType === "application/pdf" || fileName.endsWith(".pdf");

  useEffect(() => {
    let active = true;

    if (isImg || isVideo) {
      if (file) {
        const url = URL.createObjectURL(file);
        if (active) setThumb(url);
        return () => URL.revokeObjectURL(url);
      } else if (data) {
        const blob = new Blob([data], { type: fileType });
        const url = URL.createObjectURL(blob);
        if (active) setThumb(url);
        return () => URL.revokeObjectURL(url);
      }
    }
    if (isPdf) {
      const promise = file ? file.arrayBuffer() : Promise.resolve(data);
      promise.then(buf => { if (!buf) throw new Error(); return openPdfjsDoc(buf); }).then(doc => {
        if (!active) { doc.destroy(); return; }
        renderThumbnail(doc, 1, 800).then(({url}) => {
          if (active) setThumb(url);
          doc.destroy();
        }).catch(() => doc.destroy());
      }).catch(() => {});
    }
    return () => { active = false; };
  }, [file, data, isImg, isVideo, isPdf, fileType]);

  return (
    <div className="detailed-preview">
      <div className="dp-visual">
         {isVideo ? (
            <video src={thumb || ""} controls className="dp-video" />
         ) : isImg || isPdf ? (
            thumb ? <img src={thumb} alt="" className="dp-img" /> : <div className="dp-loading"><span className="btn-spinner" /> Loading preview...</div>
         ) : (
            <div className="dp-icon"><Icon name="file" size={48} /></div>
         )}
      </div>
      <div className="dp-info">
        <div className="dp-head">
          <div className="dp-name" title={file?.name || name}>{file?.name || name}</div>
          {onRemove && (
            <button type="button" className="icon-btn danger" onClick={onRemove} aria-label="Remove">
              <Icon name="trash" size={16} />
            </button>
          )}
        </div>
        <div className="dp-meta">
           <span className="chip"><Icon name="info" size={14}/> {formatBytes(file?.size || size || 0)}</span>
           {meta && <span className="chip">{meta}</span>}
        </div>
      </div>
    </div>
  );
}
/* ---------------- Progress bar ---------------- */
export function ProgressBar({ value, label }: { value: number; label?: string }) {
  const pct = Math.max(0, Math.min(100, Math.round(value * 100)));
  return (
    <div>
      <div className="progress-label">
        <span>{label ?? "Working…"}</span>
        <span className="mono">{pct}%</span>
      </div>
      <div className="progress">
        <div className="progress-fill" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

/* ---------------- Run / primary action button ---------------- */
export function RunButton({
  onClick,
  busy,
  disabled,
  icon = "bolt",
  block,
  children,
}: {
  onClick: () => void;
  busy?: boolean;
  disabled?: boolean;
  icon?: string;
  block?: boolean;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      className={cx("btn", "btn-primary", "btn-lg", block && "btn-block")}
      onClick={onClick}
      disabled={busy || disabled}
    >
      {busy ? (
        <>
          <span className="btn-spinner" aria-hidden="true" /> Working…
        </>
      ) : (
        <>
          <Icon name={icon} size={17} /> {children}
        </>
      )}
    </button>
  );
}

/* ---------------- Mascot empty / success / error state ---------------- */
export function MascotState({
  variant = "default",
  title,
  children,
  action,
}: {
  variant?: "default" | "success" | "oops";
  title: ReactNode;
  children?: ReactNode;
  action?: ReactNode;
}) {
  return (
    <div className="empty-state">
      <div className={cx("mascot-frame", variant !== "default" && variant)}>
        { }
        <img src="/mascot.png" alt="DocuVibe mascot" />
      </div>
      <h3>{title}</h3>
      {children && <p>{children}</p>}
      {action}
    </div>
  );
}
