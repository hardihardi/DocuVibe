"use client";

import { useState } from "react";
import JSZip from "jszip";
import { FileDrop, RunButton } from "@/components/pdfui";
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

export default function CompressPowerPointTool() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [level, setLevel] = useState<"light" | "medium" | "strong">("medium");

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const quality = level === "light" ? 0.8 : level === "medium" ? 0.5 : 0.2;
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);
      const newZip = new JSZip();

      const files = Object.keys(zip.files);
      for (const relativePath of files) {
        const zipEntry = zip.files[relativePath];
        if (zipEntry.dir) continue;

        const content = await zipEntry.async("arraybuffer");

        if (relativePath.startsWith("ppt/media/") && (relativePath.endsWith(".jpeg") || relativePath.endsWith(".jpg") || relativePath.endsWith(".png"))) {
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
      a.download = `compressed_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Failed to compress PowerPoint document."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tool-container flex flex-col gap-6">
      <FileDrop
        accept=".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation"
        onFiles={(files) => setFile(files[0])}
        multiple={false}
      />
      {error && <Banner kind="error">{error}</Banner>}
      {file && (
        <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-4 rounded shadow">
          <p>Selected: {file.name}</p>
          <div className="flex flex-col gap-1 w-full max-w-sm mb-2">
            <label className="text-sm font-medium">Compression Level</label>
            <Segmented
              value={level}
              onChange={(v) => setLevel(v)}
              options={[
                { value: "light", label: "Light" },
                { value: "medium", label: "Medium" },
                { value: "strong", label: "Strong" },
              ]}
              block
            />
          </div>
          <RunButton onClick={handleProcess} disabled={processing} busy={processing} icon="compress">
            {processing ? "Compressing..." : "Compress PowerPoint"}
          </RunButton>
        </div>
      )}
    </div>
  );
}
