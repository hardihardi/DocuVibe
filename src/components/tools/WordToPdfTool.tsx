"use client";

import { useState } from "react";
import mammoth from "mammoth";
import { PDFDocument } from "pdf-lib";
import html2canvas from "html2canvas";
import { FileDrop, RunButton } from "@/components/pdfui";
import { Banner } from "@/components/ui";

export default function WordToPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
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

      const doc = iframe.contentWindow?.document;
      if (!doc) throw new Error("Could not create iframe document");

      doc.open();
      doc.write(`
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
      doc.close();

      // Wait a bit for images to load if any
      await new Promise(resolve => setTimeout(resolve, 500));

      const canvas = await html2canvas(doc.body, {
          scale: 2, // higher res
          useCORS: true,
          windowWidth: 800,
          windowHeight: doc.body.scrollHeight,
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
      a.download = file.name.replace(/\.docx?$/i, ".pdf");
      a.click();
      URL.revokeObjectURL(url);

    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Failed to convert Word to PDF."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tool-container flex flex-col gap-6">
      <FileDrop
        accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        onFiles={(files) => setFile(files[0])}
        multiple={false}
      />
      {error && <Banner kind="error">{error}</Banner>}
      {file && (
        <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-4 rounded shadow">
          <p>Selected: {file.name}</p>
          <RunButton onClick={handleProcess} disabled={processing} busy={processing} icon="type">
            {processing ? "Converting..." : "Convert to PDF"}
          </RunButton>
        </div>
      )}
    </div>
  );
}
