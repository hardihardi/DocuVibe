"use client";

import { useState, useRef, useEffect } from "react";
import { FileDrop, RunButton } from "@/components/pdfui";
import { Banner, RangeField, Segmented } from "@/components/ui";
import { FaceDetector, FilesetResolver } from "@mediapipe/tasks-vision";

export default function BlurFaceTool() {
  const [file, setFile] = useState<File | null>(null);
  const [imgSrc, setImgSrc] = useState<string>('');
  const imgRef = useRef<HTMLImageElement>(null);
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [intensity, setIntensity] = useState(15);
  const [mode, setMode] = useState<"blur" | "censor">("blur");

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
    setError(null);

    try {
      const image = imgRef.current;

      const vision = await FilesetResolver.forVisionTasks(
        "https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.3/wasm"
      );

      const faceDetector = await FaceDetector.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath: `https://storage.googleapis.com/mediapipe-models/face_detector/blaze_face_short_range/float16/1/blaze_face_short_range.tflite`,
          delegate: "GPU"
        },
        runningMode: "IMAGE"
      });

      const detections = faceDetector.detect(image);

      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('No 2d context');

      ctx.drawImage(image, 0, 0);

      // Apply blur to each detected face bounding box
      for (const detection of detections.detections) {
          const { originX, originY, width, height } = detection.boundingBox!;

          // Add padding
          const padX = width * 0.1;
          const padY = height * 0.1;
          const x = Math.max(0, originX - padX);
          const y = Math.max(0, originY - padY);
          const w = Math.min(canvas.width - x, width + padX * 2);
          const h = Math.min(canvas.height - y, height + padY * 2);

          // Extract face
          const faceData = ctx.getImageData(x, y, w, h);

          // Create temp canvas for blurring
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = w;
          tempCanvas.height = h;
          const tempCtx = tempCanvas.getContext('2d')!;
          tempCtx.putImageData(faceData, 0, 0);


          // Draw effect
          if (mode === "blur") {
              ctx.filter = `blur(${intensity}px)`;
              ctx.drawImage(tempCanvas, x, y);
              ctx.filter = 'none'; // reset
          } else {
              ctx.fillStyle = "black";
              ctx.fillRect(x, y, w, h);
          }

      }

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, file.type));
      if (!blob) throw new Error('Canvas is empty');

      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `blurred_${file.name}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch(err: any) {
      console.error(err);
      setError(err.message || "Failed to process image.");
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
      {imgSrc && (
        <div className="flex flex-col gap-4 bg-white dark:bg-zinc-900 p-4 rounded shadow items-center">

          <img ref={imgRef} src={imgSrc} alt="Preview" style={{ maxHeight: '400px', maxWidth: '100%', objectFit: 'contain', width: 'auto' }} crossOrigin="anonymous" />

          <div className="flex flex-col gap-4 w-full max-w-sm mt-4">
              <div>
                  <label className="text-sm font-medium mb-1 block">Effect Mode</label>
                  <Segmented
                      value={mode}
                      onChange={(v: any) => setMode(v)}
                      options={[
                        { value: "blur", label: "Gaussian Blur" },
                        { value: "censor", label: "Black Censor Box" },
                      ]}
                      block
                  />
              </div>

              {mode === "blur" && (
                <div className="flex flex-col gap-1">
                  <label className="text-sm font-medium">Blur Intensity</label>
                  <RangeField value={intensity} min={2} max={50} onChange={setIntensity} />
                </div>
              )}
          </div>


          <RunButton onClick={handleProcess} disabled={processing} busy={processing} icon="shield">
            {processing ? "Detecting & Blurring..." : "Blur Faces"}
          </RunButton>
        </div>
      )}
    </div>
  );
}
