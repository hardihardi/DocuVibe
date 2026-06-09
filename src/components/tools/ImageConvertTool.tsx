"use client";

import { useState } from "react";
import { FileDrop, RunButton } from "@/components/pdfui";
import { Banner, Segmented } from "@/components/ui";
import { baseName, downloadBlob, formatBytes } from "@/lib/pdf";

interface LoadedImage {
  file: File;
  dataUrl: string;
  w: number;
  h: number;
}

export default function ImageConvertTool() {
  const [img, setImg] = useState<LoadedImage | null>(null);
  const [targetFmt, setTargetFmt] = useState<"image/jpeg" | "image/png" | "image/webp">("image/jpeg");
  const [busy, setBusy] = useState(false);
  const [note, setNote] = useState<{ kind: "ok" | "err"; msg: string } | null>(null);

  const load = (files: File[]) => {
    const file = files[0];
    if (!file) return;
    setNote(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      const image = new Image();
      image.onload = () => {
        setImg({ file, dataUrl, w: image.width, h: image.height });
        // Set default target slightly intelligently
        if (file.type === "image/png") setTargetFmt("image/jpeg");
        else if (file.type === "image/jpeg") setTargetFmt("image/png");
        else setTargetFmt("image/jpeg");
      };
      image.src = dataUrl;
    };
    reader.onerror = () => setNote({ kind: "err", msg: "Failed to read image file." });
    reader.readAsDataURL(file);
  };

  const run = async () => {
    if (!img) return;
    setBusy(true);
    setNote(null);

    try {
      const canvas = document.createElement("canvas");
      canvas.width = img.w;
      canvas.height = img.h;
      const ctx = canvas.getContext("2d");
      if (!ctx) throw new Error("Could not get canvas context.");

      const image = new Image();
      image.src = img.dataUrl;
      await new Promise(r => { image.onload = r; });

      // If converting to JPEG, give it a white background instead of black
      if (targetFmt === "image/jpeg") {
        ctx.fillStyle = "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }
      ctx.drawImage(image, 0, 0);

      const blob = await new Promise<Blob | null>(r => canvas.toBlob(r, targetFmt, 0.92));
      if (!blob) throw new Error("Conversion failed.");

      const stem = baseName(img.file.name);
      let ext = "jpg";
      if (targetFmt === "image/png") ext = "png";
      else if (targetFmt === "image/webp") ext = "webp";

      downloadBlob(blob, `${stem}-converted.${ext}`);
      setNote({ kind: "ok", msg: `Converted to ${ext.toUpperCase()} (${formatBytes(blob.size)}).` });
    } catch (e) {
      setNote({ kind: "err", msg: `Error: ${(e as Error).message}` });
    } finally {
      setBusy(false);
    }
  };

  if (!img) {
    return (
      <div className="stack" style={{ gap: "var(--s-5)" }}>
        <FileDrop
          accept="image/jpeg, image/png, image/webp"
          multiple={false}
          onFiles={load}
          icon="image"
          title={<>Drop an image or <span className="em">browse</span></>}
          sub="Convert between PNG, JPG, and WEBP formats."
        />
        {note && <Banner kind="error">{note.msg}</Banner>}
      </div>
    );
  }

  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <div className="split-layout">
        <div className="panel">
          <div className="panel-title with-sub">{img.file.name}</div>
          <div className="panel-sub">{formatBytes(img.file.size)} · {img.w}×{img.h}px</div>

          <div className="field" style={{ marginTop: "var(--s-5)", marginBottom: 0 }}>
            <label>Convert To</label>
            <Segmented
              value={targetFmt}
              onChange={setTargetFmt}
              options={[
                { value: "image/jpeg", label: "JPG" },
                { value: "image/png", label: "PNG" },
                { value: "image/webp", label: "WEBP" },
              ]}
            />
          </div>
        </div>

        <div className="panel">
          <div className="panel-title">Preview</div>
          <div className="crop-preview" style={{ aspectRatio: `${img.w} / ${img.h}`, width: 260 }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={img.dataUrl} alt="preview" style={{ position: "absolute", inset: 0, width: "100%", height: "100%", objectFit: "contain", background: "url('data:image/svg+xml;utf8,<svg xmlns=\"http://www.w3.org/2000/svg\" width=\"20\" height=\"20\"><rect width=\"10\" height=\"10\" fill=\"%23ddd\"/><rect x=\"10\" width=\"10\" height=\"10\" fill=\"%23eee\"/><rect y=\"10\" width=\"10\" height=\"10\" fill=\"%23eee\"/><rect x=\"10\" y=\"10\" width=\"10\" height=\"10\" fill=\"%23ddd\"/></svg>') repeat" }} />
          </div>
        </div>
      </div>

      <div className="run-bar">
        <RunButton onClick={run} busy={busy} icon="image">
          Convert Image
        </RunButton>
        <button type="button" className="btn btn-ghost" onClick={() => setImg(null)} disabled={busy}>
          Choose another
        </button>
      </div>

      {note && (
        <Banner kind={note.kind === "ok" ? "success" : "error"} title={note.kind === "ok" ? "Done" : "Couldn't convert"}>
          {note.msg}
        </Banner>
      )}
    </div>
  );
}
