

"use client";

import { useState, useRef } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile } from "@ffmpeg/util";
import {  FileDrop, ProgressBar, RunButton , DetailedPreview } from "@/components/pdfui";
import { Banner, RangeField } from "@/components/ui";
import { baseName, downloadBlob, formatBytes } from "@/lib/pdf";

export default function VideoCompressTool() {
  const [file, setFile] = useState<File | null>(null);
  const [crf, setCrf] = useState(28); // 23 is default, 28 is high compression, 0 is lossless, 51 is worst
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ val: number; label: string } | null>(null);
  const [note, setNote] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const ffmpegRef = useRef(new FFmpeg());

  const load = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setFile(f);
    setNote(null);
  };

  const run = async () => {
    if (!file) return;
    setBusy(true);
    setNote(null);
    setProgress({ val: 0, label: "Loading video engine..." });

    try {
      const ffmpeg = ffmpegRef.current;

      if (!ffmpeg.loaded) {
        // Load ffmpeg. We use default core (which loads from unpkg).
        // For a true offline app we'd bundle the core files, but this works for now.
        await ffmpeg.load();
      }

      ffmpeg.on("progress", ({ progress }) => {
        setProgress({ val: progress, label: "Compressing video..." });
      });

      setProgress({ val: 0, label: "Reading file..." });
      await ffmpeg.writeFile(file.name, await fetchFile(file));

      setProgress({ val: 0, label: "Compressing (this will take a while)..." });

      const outName = "output.mp4";
      // Run compression: -vcodec libx264 -crf (constant rate factor)
      // We also lower the audio bitrate to save space
      await ffmpeg.exec([
        '-i', file.name,
        '-vcodec', 'libx264',
        '-crf', crf.toString(),
        '-preset', 'fast',
        '-b:a', '128k',
        outName
      ]);

      setProgress({ val: 1, label: "Saving..." });

      const data = await ffmpeg.readFile(outName);
      const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: "video/mp4" });

      const stem = baseName(file.name);
      downloadBlob(blob, `${stem}-compressed.mp4`);

      const savings = 1 - (blob.size / file.size);
      const msg = savings > 0
        ? `Compressed ${formatBytes(file.size)} → ${formatBytes(blob.size)} (${(savings * 100).toFixed(1)}% smaller).`
        : `Saved ${formatBytes(blob.size)}. Note: Original was already highly compressed.`;

      setNote({ kind: "ok", msg });

      // Cleanup memory
      await ffmpeg.deleteFile(file.name);
      await ffmpeg.deleteFile(outName);

    } catch (e) {
      setNote({ kind: "err", msg: `Error: ${(e as Error).message}` });
    } finally {
      setBusy(false);
      setProgress(null);
    }
  };

  if (!file) {
    return (
      <div className="stack" style={{ gap: "var(--s-5)" }}>
        <FileDrop
          accept="video/mp4, video/quicktime, video/x-m4v"
          multiple={false}
          onFiles={load}
          icon="image"
          title={<>Drop a video or <span className="em">browse</span></>}
          sub="Compress MP4/MOV videos to reduce file size."
        />
        {note && <Banner kind="error">{note.msg}</Banner>}
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <div className="panel">
        <DetailedPreview file={file} onRemove={() => setFile(null)} />

        <div className="field" style={{ marginTop: "var(--s-5)", marginBottom: 0 }}>
          <label>Compression Level (CRF)</label>
          <RangeField value={crf} min={18} max={40} step={1} onChange={setCrf} />
          <p className="hint">Higher value = more compression, lower file size, but worse quality. 23 is default, 28 is standard compression.</p>
        </div>
      </div>

      <div className="run-bar">
        <RunButton onClick={run} busy={busy} icon="compress">
          Compress Video
        </RunButton>
        <button type="button" className="btn btn-ghost" onClick={() => setFile(null)} disabled={busy}>
          Choose another
        </button>
      </div>

      {progress && <ProgressBar value={progress.val} label={progress.label} />}

      {note && (
        <Banner kind={note.kind === "ok" ? "success" : "error"} title={note.kind === "ok" ? "Done" : "Couldn't compress"}>
          {note.msg}
        </Banner>
      )}
    </div>
  );
}
