"use client";

import { useState } from "react";
import JSZip from "jszip";
import { PDFDocument, rgb } from "pdf-lib";
import { FileDrop, RunButton } from "@/components/pdfui";
import { Banner } from "@/components/ui";

export default function PowerPointToPdfTool() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);

    try {
      const arrayBuffer = await file.arrayBuffer();
      const zip = await JSZip.loadAsync(arrayBuffer);

      const pdfDoc = await PDFDocument.create();

      // Find slide files
      const slideFiles = Object.keys(zip.files).filter(f => f.startsWith('ppt/slides/slide') && f.endsWith('.xml'));

      if (slideFiles.length === 0) {
          throw new Error("No slides found or unsupported format.");
      }

      // Sort slides numerically
      slideFiles.sort((a, b) => {
          const numA = parseInt(a.replace(/\D/g, ''));
          const numB = parseInt(b.replace(/\D/g, ''));
          return numA - numB;
      });

      for (const slidePath of slideFiles) {
          const xmlData = await zip.files[slidePath].async("string");

          // Very basic text extraction
          const textMatches = xmlData.match(/<a:t>([^<]*)<\/a:t>/g);
          const texts = textMatches ? textMatches.map(t => t.replace(/<a:t>/, '').replace(/<\/a:t>/, '')) : [];

          // Create a page for this slide
          const page = pdfDoc.addPage([800, 600]); // Typical 4:3 presentation ratio

          let yOffset = 550;
          for(const text of texts) {
              if (text.trim() === '') continue;
              page.drawText(text, {
                  x: 50,
                  y: yOffset,
                  size: 20,
                  color: rgb(0, 0, 0),
              });
              yOffset -= 30;
              if (yOffset < 50) {
                   break; // Avoid falling off the page
              }
          }
      }

      const pdfBytes = await pdfDoc.save();
      const blob = new Blob([pdfBytes as unknown as BlobPart], { type: "application/pdf" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = file.name.replace(/\.pptx?$/i, ".pdf");
      a.click();
      URL.revokeObjectURL(url);

    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Failed to convert PowerPoint to PDF."));
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
          <p className="text-sm text-zinc-500">Note: This is a basic conversion that extracts text from slides. Images and formatting will be lost.</p>
          <RunButton onClick={handleProcess} disabled={processing} busy={processing} icon="type">
            {processing ? "Converting..." : "Convert to PDF"}
          </RunButton>
        </div>
      )}
    </div>
  );
}
