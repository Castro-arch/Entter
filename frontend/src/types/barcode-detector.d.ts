// BarcodeDetector isn't in TypeScript's bundled DOM lib yet. Minimal ambient
// types for the subset this app uses (Chrome/Edge/Android support it
// natively; unsupported browsers are feature-detected and fall back to
// manual search — see `qr-scanner.tsx`).
interface DetectedBarcode {
  rawValue: string;
}

interface BarcodeDetectorOptions {
  formats: string[];
}

declare class BarcodeDetector {
  constructor(options?: BarcodeDetectorOptions);
  detect(source: CanvasImageSource): Promise<DetectedBarcode[]>;
}

interface Window {
  BarcodeDetector: typeof BarcodeDetector;
}
