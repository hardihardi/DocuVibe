
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import JSZip from "jszip";
import {  FileDrop, RunButton , DetailedPreview } from "@/components/pdfui";
import { formatBytes } from "@/lib/pdf";
import { Banner, Segmented } from "@/components/ui";

async function compressImageBuffer(buffer: ArrayBuffer, type: string, quality: number): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const blob = new Blob([buffer], { type });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext("2d");
      if (!ctx) return reject(new Error("No 2d context"));
      ctx.drawImage(img, 0, 0);
      canvas.toBlob((b) => {
        URL.revokeObjectURL(url);
        if (b) {
          b.arrayBuffer().then(resolve).catch(reject);
        } else {
          resolve(buffer); // fallback
        }
      }, type, quality);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(buffer); // fallback if it can't be read as image
    };
    img.src = url;
  });
}


interface Loaded {
  name: string;
  bytes: ArrayBuffer;
  size: number;
}
export default function CompressWordTool() {
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [level, setLevel] = useState<"light" | "balanced" | "strong">("balanced");


  const load = (files: File[]) => {
    const f = files[0];
    if (!f) return;
    setError(null);
    f.arrayBuffer().then((bytes) => setDoc({ name: f.name, bytes, size: f.size }));
  };

  const handleProcess = async () => {
    if (!doc) return;

    setProcessing(true);
    setError(null);

    try {
      const quality = level === "light" ? 0.8 : level === "balanced" ? 0.5 : 0.2;
      const arrayBuffer = doc.bytes;
      const zip = await JSZip.loadAsync(arrayBuffer);
      const newZip = new JSZip();

      const files = Object.keys(zip.files);
      for (const relativePath of files) {
        const zipEntry = zip.files[relativePath];
        if (zipEntry.dir) continue;

        const content = await zipEntry.async("arraybuffer");

        if (relativePath.startsWith("word/media/") && (relativePath.endsWith(".jpeg") || relativePath.endsWith(".jpg") || relativePath.endsWith(".png"))) {
          const type = relativePath.endsWith(".png") ? "image/png" : "image/jpeg";
          const compressed = await compressImageBuffer(content, type, quality);
          newZip.file(relativePath, compressed);
        } else {
          newZip.file(relativePath, content);
        }
      }

      const compressedBlob = await newZip.generateAsync({ type: "blob", compression: "DEFLATE", compressionOptions: { level: 9 } });

      const url = URL.createObjectURL(compressedBlob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `compressed_${doc.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Failed to compress Word document."));
    } finally {
      setProcessing(false);
    }
  };


  if (!doc) {
    return (
      <FileDrop
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onFiles={load}
        multiple={false}
        icon="compress"
        title={<>Drop a Word document or <span className="em">browse</span></>}
        sub="Best for shrinking images inside Word files."
      />
    );
  }

  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <div className="panel">
        <DetailedPreview name={doc.name} data={doc.bytes} size={doc.size} onRemove={() => setDoc(null)} />
        <div className="field">
          <label>Compression level</label>
          <Segmented
            value={level}
            onChange={(v) => setLevel(v)}
            options={[
              { value: "strong", label: "Strong" },
              { value: "balanced", label: "Balanced" },
              { value: "light", label: "Light" },
            ]}
          />
        </div>
      </div>

      <Banner kind="info" title="How this works">
        Compression extracts images from the Word document and re-compresses them. It will shrink image-heavy Word files but won&apos;t help pure text files.
      </Banner>

      <div className="run-bar">
        <RunButton onClick={handleProcess} disabled={processing} busy={processing} icon="compress">
          {processing ? "Compressing..." : "Compress Document"}
        </RunButton>
        <button type="button" className="btn btn-ghost" onClick={() => setDoc(null)} disabled={processing}>
          Choose another
        </button>
      </div>

      {error && (
        <Banner kind="error" title="Couldn't compress">
          {error}
        </Banner>
      )}
    </div>
  );
}
