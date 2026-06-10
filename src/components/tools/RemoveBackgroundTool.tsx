"use client";

import { useState } from "react";
import { FileDrop, RunButton } from "@/components/pdfui";
import { removeBackground } from "@imgly/background-removal";
import { Banner } from "@/components/ui";

export default function RemoveBackgroundTool() {
  const [file, setFile] = useState<File | null>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleProcess = async () => {
    if (!file) return;
    setProcessing(true);
    setError(null);
    try {
      const blob = await removeBackground(file);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `nobg_${file.name.replace(/\.[^/.]+$/, ".png")}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e: any) {
      setError(e.message || "Failed to remove background.");
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="tool-container flex flex-col gap-6">
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        onFiles={(files) => setFile(files[0])}
        multiple={false}
      />
      {error && <Banner kind="error">{error}</Banner>}
      {file && (
        <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-4 rounded shadow">
          <p>Selected: {file.name}</p>
          <RunButton onClick={handleProcess} disabled={processing} busy={processing} icon="img2pdf">
            {processing ? "Removing Background..." : "Remove Background"}
          </RunButton>
        </div>
      )}
    </div>
  );
}
