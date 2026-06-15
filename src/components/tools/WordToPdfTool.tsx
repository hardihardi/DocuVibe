
/* eslint-disable @typescript-eslint/no-unused-vars */
"use client";

import { useState } from "react";
import mammoth from "mammoth";
import { PDFDocument } from "pdf-lib";
import html2canvas from "html2canvas";
import {  FileDrop, RunButton , DetailedPreview } from "@/components/pdfui";
import { formatBytes } from "@/lib/pdf";
import { Banner } from "@/components/ui";


interface Loaded {
  name: string;
  bytes: ArrayBuffer;
  size: number;
}
export default function WordToPdfTool() {
  const [doc, setDoc] = useState<Loaded | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);



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
      const result = await mammoth.convertToHtml({ arrayBuffer });
      const html = result.value;

      // Create a temporary iframe to render the HTML
      const iframe = document.createElement("iframe");
      iframe.style.position = "absolute";
      iframe.style.width = "800px";
      iframe.style.height = "1131px"; // Approximate A4 aspect ratio (800x1131)
      iframe.style.top = "-9999px";
      iframe.style.left = "-9999px";
      document.body.appendChild(iframe);

      const iframeDoc = iframe.contentWindow?.document;
      if (!iframeDoc) throw new Error("Could not create iframe document");

      iframeDoc.open();
      iframeDoc.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <style>
            body { font-family: sans-serif; padding: 40px; margin: 0; background: white; color: black; line-height: 1.5; font-size: 14px; }
            img { max-width: 100%; height: auto; }
            table { border-collapse: collapse; width: 100%; margin-bottom: 1em; }
            td, th { border: 1px solid #ccc; padding: 4px; }
          </style>
        </head>
        <body>${html}</body>
        </html>
      `);
      iframeDoc.close();

      // Wait a bit for images to load if any
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(iframeDoc.body, {
          scale: 2, // higher res
          useCORS: true,
          windowWidth: 800,
          windowHeight: iframeDoc.body.scrollHeight,
      });

      document.body.removeChild(iframe);

      const imgData = canvas.toDataURL('image/jpeg', 0.95);

      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([canvas.width, canvas.height]);
      const image = await pdfDoc.embedJpg(imgData);

      page.drawImage(image, {
        x: 0,
        y: 0,
        width: canvas.width,
        height: canvas.height,
      });

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.name.replace(/\.docx?$/i, ".pdf");
      a.click();
      URL.revokeObjectURL(url);

    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Failed to convert Word to PDF."));
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
        icon="type"
        title={<>Drop a Word document or <span className="em">browse</span></>}
        sub="Converts .docx to PDF."
      />
    );
  }

  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <div className="panel">
        <DetailedPreview name={doc.name} data={doc.bytes} size={doc.size} onRemove={() => setDoc(null)} />
      </div>

      <Banner kind="info" title="How this works">
        This tool extracts text and images from the Word document and renders them to a PDF format. Complex formatting might not be perfectly preserved.
      </Banner>

      <div className="run-bar">
        <RunButton onClick={handleProcess} disabled={processing} busy={processing} icon="type">
          {processing ? "Converting..." : "Convert to PDF"}
        </RunButton>
        <button type="button" className="btn btn-ghost" onClick={() => setDoc(null)} disabled={processing}>
          Choose another
        </button>
      </div>

      {error && (
        <Banner kind="error" title="Couldn't convert">
          {error}
        </Banner>
      )}
    </div>
  );
}
