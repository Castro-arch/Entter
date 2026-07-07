'use client';

import { useEffect, useRef, useState } from 'react';

/** ~150–200ms between decode attempts — fast enough to feel instant, cheap
 * enough not to peg the CPU on a phone doing this all day at check-in. */
const DECODE_INTERVAL_MS = 180;

interface QrScannerProps {
  onDetect: (rawValue: string) => void;
  /** Pause decoding (e.g. while a result banner is showing). */
  paused?: boolean;
}

/**
 * Camera-based QR scanner using the native `BarcodeDetector` API. Renders
 * nothing if the browser doesn't support it — the check-in page falls back
 * to manual search in that case, which has to exist anyway for single-day
 * events.
 */
export default function QrScanner({ onDetect, paused = false }: QrScannerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  // Lazy-initialized once; this component is only ever mounted client-side
  // (dynamically imported with `ssr: false`), so reading `window` here is safe.
  const [supported] = useState(() => 'BarcodeDetector' in window);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!supported || paused) return;

    let stream: MediaStream | undefined;
    let intervalId: ReturnType<typeof setInterval> | undefined;
    let cancelled = false;

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: 'environment' },
        });
        if (cancelled) return;
        const video = videoRef.current!;
        video.srcObject = stream;
        await video.play();

        const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
        const canvas = canvasRef.current!;
        const ctx = canvas.getContext('2d')!;
        // Center 60% of the frame — narrows the scan window so stray codes
        // in the background don't get picked up, and it's less to decode.
        const cropFraction = 0.6;

        intervalId = setInterval(() => {
          if (video.videoWidth === 0) return;
          const sw = video.videoWidth * cropFraction;
          const sh = video.videoHeight * cropFraction;
          const sx = (video.videoWidth - sw) / 2;
          const sy = (video.videoHeight - sh) / 2;
          canvas.width = sw;
          canvas.height = sh;
          ctx.drawImage(video, sx, sy, sw, sh, 0, 0, sw, sh);

          detector
            .detect(canvas)
            .then((codes) => {
              if (codes[0]) onDetect(codes[0].rawValue);
            })
            .catch(() => {
              // Transient decode failures are expected between frames.
            });
        }, DECODE_INTERVAL_MS);
      } catch {
        setError('Camera access was denied or is unavailable.');
      }
    }

    void start();

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [supported, paused, onDetect]);

  if (supported === false || error) {
    return null;
  }

  return (
    <div className="relative mx-auto aspect-square w-full max-w-sm overflow-hidden rounded-xl border border-black/10 bg-black dark:border-white/10">
      <video
        ref={videoRef}
        muted
        playsInline
        className="h-full w-full object-cover"
      />
      <canvas ref={canvasRef} className="hidden" />
      <div className="pointer-events-none absolute inset-[20%] rounded-lg border-2 border-white/70" />
    </div>
  );
}
