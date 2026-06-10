"use client";

import { useState, useRef } from "react";
import { RunButton } from "@/components/pdfui";
import { Banner } from "@/components/ui";
import html2canvas from "html2canvas";

export default function HTMLToImageTool() {
  const [htmlString, setHtmlString] = useState("<h2>Hello World</h2><p>This is a test.</p>");
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleProcess = async () => {
    if (!containerRef.current || !htmlString) return;
    setProcessing(true);
    setError(null);
    try {
      const canvas = await html2canvas(containerRef.current, {
        useCORS: true,
        scale: 2,
        backgroundColor: null,
      });

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error('Canvas is empty');

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `html_snippet.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Failed to convert HTML to image.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tool-container flex flex-col gap-6 w-full overflow-hidden">
      {error && <Banner kind="error">{error}</Banner>}

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">HTML Snippet</label>
        <textarea
          className="border p-2 rounded dark:bg-zinc-800 dark:border-zinc-700 w-full font-mono text-sm"
          rows={6}
          value={htmlString}
          onChange={e => setHtmlString(e.target.value)}
          placeholder="<h1>Title</h1>..."
        />
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium">Preview (This will be captured)</label>
        <div className="border p-4 rounded bg-white text-black overflow-auto relative max-w-full w-full">
           <div ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlString }} className="inline-block" />
        </div>
      </div>

      <RunButton onClick={handleProcess} disabled={processing || !htmlString} busy={processing} icon="img2pdf">
        {processing ? "Converting..." : "Convert to Image"}
      </RunButton>
    </div>
  );
}
