"use client";

import { useState, useRef, useEffect } from "react";
import { FileDrop, RunButton } from "@/components/pdfui";
import { Segmented } from "@/components/ui";

export default function RotateImageTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [rotation, setRotation] = useState<string>("90");
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (file) {
      const reader = new FileReader();
      reader.addEventListener('load', () => setImgSrc(reader.result?.toString() || ''));
      reader.readAsDataURL(file);
    }
  }, [file]);

  const handleProcess = async () => {
    if (!imgRef.current || !file) return;
    setProcessing(true);

    try {
      const image = imgRef.current;
      const angle = parseInt(rotation);
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');

      const radians = (Math.PI / 180) * angle;
      const sin = Math.sin(radians);
      const cos = Math.cos(radians);
      const w = image.naturalWidth;
      const h = image.naturalHeight;

      canvas.width = Math.abs(w * cos) + Math.abs(h * sin);
      canvas.height = Math.abs(w * sin) + Math.abs(h * cos);

      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.rotate(radians);
      ctx.drawImage(image, -w / 2, -h / 2);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type));
      if (!blob) throw new Error('Canvas is empty');

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `rotated_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(err) {
      console.error(err);
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
      {imgSrc && (
        <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-4 rounded shadow items-center">
          <div style={{ transform: `rotate(${rotation}deg)`, transition: 'transform 0.3s ease' }}>
            <img ref={imgRef} src={imgSrc} alt="Preview" style={{ maxHeight: '300px', objectFit: 'contain' }} />
          </div>

          <div className="my-4 w-full max-w-sm">
            <Segmented
                value={rotation}
                onChange={setRotation}
                options={[
                  { value: "90", label: "90° R" },
                  { value: "180", label: "180°" },
                  { value: "270", label: "90° L" },
                ]}
                block
              />
          </div>

          <RunButton onClick={handleProcess} disabled={processing} busy={processing} icon="rotate">
            {processing ? "Rotating..." : "Rotate Image"}
          </RunButton>
        </div>
      )}
    </div>
  );
}
