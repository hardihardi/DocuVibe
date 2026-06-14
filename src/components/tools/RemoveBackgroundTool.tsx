"use client";

import { useState, useEffect } from "react";
import { FileDrop, RunButton } from "@/components/pdfui";
import { removeBackground } from "@imgly/background-removal";
import { Banner, Icon, Segmented } from "@/components/ui";

export default function RemoveBackgroundTool() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const [originalUrl, setOriginalUrl] = useState<string | null>(null);
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"original" | "removed">("removed");
  const [bgColor, setBgColor] = useState<string>("transparent");

  const processImage = async (imgFile: File) => {
    setProcessing(true);
    setError(null);
    try {
      const blob = await removeBackground(imgFile);
      const url = URL.createObjectURL(blob);
      setProcessedUrl(url);
      setViewMode("removed");
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : "Failed to remove background.");
    } finally {
      setProcessing(false);
    }
  };


  // We use handleFileChange to avoid setStates in useEffect
  const handleFileChange = (files: File[]) => {
    const newFile = files[0];
    if (newFile) {
        setFile(newFile);
        const url = URL.createObjectURL(newFile);
        setOriginalUrl(url);
        setProcessedUrl(null);
        setError(null);
        setViewMode("removed");
        processImage(newFile);
    }
  }

  useEffect(() => {
     return () => {
         if (originalUrl) URL.revokeObjectURL(originalUrl);
         if (processedUrl) URL.revokeObjectURL(processedUrl);
     }
  }, [originalUrl, processedUrl])






  const handleDownload = async () => {
    if (!processedUrl || !file) return;

    let downloadUrl = processedUrl;

    // If a background color is selected, we need to draw it to a canvas first
    if (bgColor !== "transparent") {
      try {
          const img = new Image();
          img.crossOrigin = "anonymous";
          await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = processedUrl;
          });

          const canvas = document.createElement("canvas");
          canvas.width = img.width;
          canvas.height = img.height;
          const ctx = canvas.getContext("2d");
          if (ctx) {
              ctx.fillStyle = bgColor;
              ctx.fillRect(0, 0, canvas.width, canvas.height);
              ctx.drawImage(img, 0, 0);

              const blob = await new Promise<Blob | null>(res => canvas.toBlob(res, "image/png"));
              if (blob) {
                  downloadUrl = URL.createObjectURL(blob);
              }
          }
      } catch(e) {
          console.error("Failed to apply background color for download", e);
      }
    }

    const a = document.createElement("a");
    a.href = downloadUrl;
    a.download = `nobg_${file.name.replace(/\.[^/.]+$/, ".png")}`;
    a.click();

    if (downloadUrl !== processedUrl) {
        URL.revokeObjectURL(downloadUrl);
    }
  };


  const currentImg = viewMode === "original" ? originalUrl : (processedUrl || originalUrl);

  return (
    <div className="tool-container flex flex-col gap-6 w-full max-w-4xl mx-auto">
      {!file && (
        <FileDrop
          accept="image/png,image/jpeg,image/webp"
          onFiles={handleFileChange}
          multiple={false}
        />
      )}

      {error && <Banner kind="error">{error}</Banner>}

      {file && originalUrl && (
        <div className="flex flex-col gap-6 bg-zinc-50 dark:bg-zinc-900 rounded-xl overflow-hidden shadow-sm border border-zinc-200 dark:border-zinc-800">

          {/* Top Toolbar */}
          <div className="flex flex-wrap justify-between items-center p-4 gap-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
             <button
                onClick={() => setFile(null)}
                className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                title="Close and upload new"
             >
                <Icon name="x" size={20} />
             </button>

             <div className="w-full sm:w-64 order-last sm:order-none flex justify-center">
                <Segmented
                  value={viewMode}
                  onChange={setViewMode}
                  options={[
                    { value: "original", label: "Original" },
                    { value: "removed", label: "Removed BG" },
                  ]}
                  block
                />
             </div>

             <div className="flex gap-2">
                <button className="flex items-center justify-center w-10 h-10 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors" title="Undo">
                    <Icon name="undo" size={20} />
                </button>
             </div>
          </div>

          {/* Image Preview Area */}
          <div className="relative w-full flex justify-center items-center bg-zinc-100 dark:bg-zinc-800 min-h-[400px] overflow-hidden p-4">
             {/* Checkerboard background for transparency visibility */}
             <div className="absolute inset-0 z-0" style={{ backgroundColor: viewMode === "removed" && bgColor !== "transparent" ? bgColor : "transparent",
                 backgroundImage: 'conic-gradient(#ccc 25%, transparent 25%, transparent 50%, #ccc 50%, #ccc 75%, transparent 75%, transparent)',
                 backgroundSize: '20px 20px',
                 backgroundPosition: '0 0, 10px 10px',
                 opacity: viewMode === "removed" ? 0.3 : 0,
                 transition: 'opacity 0.2s ease'
             }}></div>

             {processing ? (
                <div className="z-10 flex flex-col items-center gap-4 bg-white/90 dark:bg-zinc-900/90 p-6 rounded-2xl shadow-lg backdrop-blur-sm">
                   <div className="w-8 h-8 border-4 border-brand-500 border-t-transparent rounded-full animate-spin"></div>
                   <p className="font-medium text-zinc-700 dark:text-zinc-200">Extracting subject...</p>
                </div>
             ) : (
                <img
                   src={currentImg || ''}
                   alt="Preview"
                   className="z-10 max-h-[60vh] max-w-full object-contain rounded drop-shadow-md transition-all duration-300"
                />
             )}
          </div>


          {/* Bottom Action Bar */}
          <div className="p-4 bg-white dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800 flex flex-col sm:flex-row justify-between items-center gap-4">
            <div className="flex items-center gap-3 w-full sm:w-auto">
               <label className="text-sm font-medium text-zinc-500 whitespace-nowrap">New Background:</label>
               <div className="flex gap-2">
                 <button onClick={() => setBgColor("transparent")} className={`w-8 h-8 rounded-full border-2 ${bgColor === "transparent" ? "border-brand-500" : "border-zinc-300 dark:border-zinc-700"} flex items-center justify-center`} style={{ backgroundImage: 'conic-gradient(#ccc 25%, transparent 25%, transparent 50%, #ccc 50%, #ccc 75%, transparent 75%, transparent)', backgroundSize: '10px 10px' }} title="Transparent"></button>
                 <button onClick={() => setBgColor("#ffffff")} className={`w-8 h-8 rounded-full border-2 bg-white ${bgColor === "#ffffff" ? "border-brand-500" : "border-zinc-300 dark:border-zinc-700"}`} title="White"></button>
                 <button onClick={() => setBgColor("#000000")} className={`w-8 h-8 rounded-full border-2 bg-black ${bgColor === "#000000" ? "border-brand-500" : "border-zinc-300 dark:border-zinc-700"}`} title="Black"></button>
                 <div className="relative">
                     <input type="color" value={bgColor === "transparent" ? "#ff0000" : bgColor} onChange={(e) => setBgColor(e.target.value)} className="opacity-0 absolute inset-0 w-full h-full cursor-pointer" title="Custom Color" />
                     <div className={`w-8 h-8 rounded-full border-2 ${bgColor !== "transparent" && bgColor !== "#ffffff" && bgColor !== "#000000" ? "border-brand-500" : "border-zinc-300 dark:border-zinc-700"}`} style={{ backgroundColor: bgColor === "transparent" ? "#ff0000" : bgColor }}></div>
                 </div>
               </div>
            </div>

            <RunButton

                onClick={handleDownload}
                disabled={processing || !processedUrl}
                icon="download"
            >
                Download HD Image
            </RunButton>
          </div>
        </div>
      )}
    </div>
  );
}
