"use client";

import { useState } from "react";
import * as pdfjsLib from "pdfjs-dist";
import { FileDrop } from "@/components/pdfui";
import { Banner, Segmented } from "@/components/ui";
import { RunButton } from "@/components/pdfui";

export default function PDFToHTMLTool() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mode, setMode] = useState<"text" | "images">("text");

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
      const numPages = pdf.numPages;

      let htmlContent = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>${file.name.replace(/\.pdf$/i, "")}</title>
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
      a.download = file.name.replace(/\.pdf$/i, ".html");
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Failed to process PDF."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tool-container flex flex-col gap-6">
      <FileDrop
        accept="application/pdf"
        onFiles={(files) => setFile(files[0])}
        multiple={false}
      />
      {error && <Banner kind="error">{error}</Banner>}
      {file && (
        <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-4 rounded shadow">

          <p>Selected: {file.name}</p>
          <div className="flex flex-col gap-1 w-full max-w-sm mb-2">
            <label className="text-sm font-medium">Extraction Mode</label>
            <Segmented
              value={mode}
              onChange={(v) => setMode(v)}
              options={[
                { value: "text", label: "Text Only (Semantic)" },
                { value: "images", label: "High Fidelity (Images)" },
              ]}
              block
            />
          </div>

          <RunButton onClick={handleProcess} disabled={processing} busy={processing} icon="type">
            {processing ? "Converting..." : "Convert to HTML"}
          </RunButton>
        </div>
      )}
    </div>
  );
}
