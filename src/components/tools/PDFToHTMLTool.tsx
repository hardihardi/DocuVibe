
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import {  FileDrop , DetailedPreview } from "@/components/pdfui";
import { formatBytes } from "@/lib/pdf";
import { Banner, Segmented } from "@/components/ui";
import { RunButton } from "@/components/pdfui";


interface Loaded {
  name: string;
  bytes: ArrayBuffer;
  size: number;
}
export default function PDFToHTMLTool() {
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"text" | "images">("text");



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
      const arrayBuffer = doc.bytes;
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const numPages = pdf.numPages;

      let htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${doc.name.replace(/\.pdf$/i, "")}</title>
<style>
  body { font-family: sans-serif; background: #f0f0f0; margin: 0; padding: 20px; }
  .page { background: white; margin: 0 auto 20px auto; padding: 40px; box-shadow: 0 2px 5px rgba(0,0,0,0.1); max-width: 800px; }
  p { line-height: 1.5; }
</style>
</head>
<body>
`;

      for (let i = 1; i <= numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        htmlContent += `<div class="page">\n`;
        let lastY = -1;
        let line = "";
        for (const item of textContent.items) {
          if ("str" in item) {
             const y = item.transform[5];
             if (lastY !== -1 && Math.abs(y - lastY) > 5) {
                htmlContent += `<p>${line}</p>\n`;
                line = "";
             }
             line += item.str + " ";
             lastY = y;
          }
        }
        if (line) {
          htmlContent += `<p>${line}</p>\n`;
        }
        htmlContent += `</div>\n`;
      }

      htmlContent += `</body></html>`;

      const blob = new Blob([htmlContent], { type: "text/html" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name.replace(/\.pdf$/i, ".html");
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Failed to process PDF."));
    } finally {
      setProcessing(false);
    }
  };


  if (!doc) {
    return (
      <FileDrop
        accept="application/pdf"
        onFiles={load}
        multiple={false}
        icon="type"
        title={<>Drop a PDF or <span className="em">browse</span></>}
        sub="Convert PDF content to HTML."
      />
    );
  }

  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <div className="panel">
        <DetailedPreview name={doc.name} data={doc.bytes} size={doc.size} onRemove={() => setDoc(null)} />
        <div className="field">
          <label>Extraction Mode</label>
          <Segmented
            value={mode}
            onChange={(v) => setMode(v)}
            options={[
              { value: "text", label: "Text Only (Semantic)" },
              { value: "images", label: "High Fidelity (Images)" },
            ]}
          />
        </div>
      </div>

      <Banner kind="info" title="How this works">
        Extracts textual content and attempts to map it to HTML. Formatting may not perfectly match the original PDF structure.
      </Banner>

      <div className="run-bar">
        <RunButton onClick={handleProcess} disabled={processing} busy={processing} icon="type">
          {processing ? "Converting..." : "Convert to HTML"}
        </RunButton>
        <button type="button" className="btn btn-ghost" onClick={() => setDoc(null)} disabled={processing}>
          Choose another
        </button>
      </div>

      {error && (
        <Banner kind="error" title="Couldn't process">
          {error}
        </Banner>
      )}
    </div>
  );
}
