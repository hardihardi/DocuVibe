"use client";

import { useState, useRef, useEffect } from "react";
import { FileDrop, RunButton } from "@/components/pdfui";
import { Segmented } from "@/components/ui";

export default function ResizeImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [width, setWidth] = useState(0);
  const [height, setHeight] = useState(0);
  const [maintainAspect, setMaintainAspect] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [aspectRatio, setAspectRatio] = useState(1);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
    }
  }, [file]);

  const onImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const w = e.currentTarget.naturalWidth;
    const h = e.currentTarget.naturalHeight;
    setWidth(w);
    setHeight(h);
    setAspectRatio(w / h);
  };

  const handleWidthChange = (val: string) => {
    const w = parseInt(val) || 0;
    setWidth(w);
    if (maintainAspect && w > 0) setHeight(Math.round(w / aspectRatio));
  };

  const handleHeightChange = (val: string) => {
    const h = parseInt(val) || 0;
    setHeight(h);
    if (maintainAspect && h > 0) setWidth(Math.round(h * aspectRatio));
  };

  const handleProcess = async () => {
    if (!imgRef.current || !file || width <= 0 || height <= 0) return;
    setProcessing(true);

    try {
      const image = imgRef.current;
      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');

      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(image, 0, 0, width, height);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type));
      if (!blob) throw new Error('Canvas is empty');

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `resized_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(err) {
      console.error(err);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="stack" style={{ gap: "var(--s-5)" }}>
      <FileDrop
        accept="image/png,image/jpeg,image/webp"
        onFiles={(files) => setFile(files[0])}
        multiple={false}
      />
      {imgSrc && (
        <div className="panel">
          <img ref={imgRef} src={imgSrc} onLoad={onImageLoad} alt="Original" style={{ maxHeight: '300px', maxWidth: '100%', objectFit: 'contain' }} />


          <div className="flex flex-col gap-4 mt-4">
            <div className="w-full flex justify-center mb-2">
                <div className="w-full sm:w-auto">
                <Segmented
                  value={"custom"}
                  onChange={(val) => {
                    if (val === "custom") return;
                    const pct = parseInt(val) / 100;
                    if (imgRef.current) {
                        setWidth(Math.round(imgRef.current.naturalWidth * pct));
                        setHeight(Math.round(imgRef.current.naturalHeight * pct));
                    }
                  }}
                  options={[
                    { value: "custom", label: "Custom" },
                    { value: "25", label: "25%" },
                    { value: "50", label: "50%" },
                    { value: "75", label: "75%" },
                  ]}
                />
                </div>
            </div>

            <div className="flex flex-wrap sm:flex-nowrap gap-4 items-end w-full justify-center">
              <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                <label className="text-sm font-medium">Width (px)</label>
                <input type="number" className="border p-2 rounded w-full sm:w-24 dark:bg-zinc-800 dark:border-zinc-700" value={width} onChange={e => handleWidthChange(e.target.value)} />
              </div>
              <div className="flex items-center gap-2 mb-2 w-full sm:w-auto mt-2 sm:mt-0 justify-center">
                <input type="checkbox" id="aspect" checked={maintainAspect} onChange={e => setMaintainAspect(e.target.checked)} />
                <label htmlFor="aspect" className="text-sm">Link</label>
              </div>
              <div className="flex flex-col gap-1 flex-1 sm:flex-none">
                <label className="text-sm font-medium">Height (px)</label>
                <input type="number" className="border p-2 rounded w-full sm:w-24 dark:bg-zinc-800 dark:border-zinc-700" value={height} onChange={e => handleHeightChange(e.target.value)} />
              </div>
            </div>
          </div>


          <RunButton onClick={handleProcess} disabled={processing || width <=0 || height <=0} busy={processing} icon="crop">
            {processing ? "Resizing..." : "Resize Image"}
          </RunButton>
        </div>
      )}
    </div>
  );
}
