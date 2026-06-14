"use client";

import { useState, useRef } from "react";
import { RunButton } from "@/components/pdfui";
import { Banner, RangeField } from "@/components/ui";
import html2canvas from "html2canvas";

export default function HTMLToImageTool() {
  const [htmlString, setHtmlString] = useState("<h2>Hello World</h2><p>This is a test.</p>");
  const [padding, setPadding] = useState(16);
  const [bgColor, setBgColor] = useState("#ffffff");
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
        backgroundColor: bgColor === "transparent" ? null : bgColor,
      });

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
      if (!blob) throw new Error('Canvas is empty');

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `html_snippet.png`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: unknown) {
      setError((e instanceof Error ? e.message : "Failed to convert HTML to image."));
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tool-container flex flex-col gap-6 w-full overflow-hidden">
      {error && <Banner kind="error">{error}</Banner>}


      <div className="flex flex-wrap sm:flex-nowrap gap-4 w-full">
        <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium">Background Color</label>
            <div className="flex items-center gap-2">
                <input type="color" className="h-10 w-full rounded cursor-pointer" value={bgColor === "transparent" ? "#ffffff" : bgColor} onChange={e => setBgColor(e.target.value)} disabled={bgColor === "transparent"} />
                <label className="flex items-center gap-2 whitespace-nowrap text-sm cursor-pointer ml-2">
                    <input type="checkbox" checked={bgColor === "transparent"} onChange={(e) => setBgColor(e.target.checked ? "transparent" : "#ffffff")} />
                    Transparent
                </label>
            </div>
        </div>
        <div className="flex flex-col gap-1 flex-1">
            <label className="text-sm font-medium">Padding Wrapper</label>
            <RangeField value={padding} min={0} max={100} onChange={setPadding} fmt={v => `${v}px`} />
        </div>
      </div>

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
        <div className="border rounded bg-white text-black overflow-auto relative max-w-full w-full" style={{ padding: `${padding}px`, backgroundColor: bgColor === "transparent" ? "#fff" : bgColor, backgroundImage: bgColor === "transparent" ? "conic-gradient(#ccc 25%, transparent 25%, transparent 50%, #ccc 50%, #ccc 75%, transparent 75%, transparent)" : "none", backgroundSize: "20px 20px" }}>
           <div ref={containerRef} dangerouslySetInnerHTML={{ __html: htmlString }} className="inline-block" />
        </div>
      </div>

      <RunButton onClick={handleProcess} disabled={processing || !htmlString} busy={processing} icon="img2pdf">
        {processing ? "Converting..." : "Convert to Image"}
      </RunButton>
    </div>
  );
}
