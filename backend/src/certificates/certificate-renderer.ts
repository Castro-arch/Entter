import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';

/** Same shape as `NamePositionDto` (credential editor) — percentages of the
 * page/artwork size, so placement survives templates of any resolution. */
export interface NamePosition {
  xPct: number;
  yPct: number;
  fontPct?: number;
  color?: string;
  align?: 'left' | 'center' | 'right';
}

const DEFAULT_FONT_PCT = 4;

function hexToRgb(hex: string) {
  const match = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex);
  if (!match) return rgb(0, 0, 0);
  const [r, g, b] = match.slice(1).map((part) => parseInt(part, 16) / 255);
  return rgb(r, g, b);
}

/**
 * Composites the attendee's name onto the certificate template's first page,
 * at the position captured by the same `%`-based editor used for credentials
 * (see `docs/ARQUITETURA_credenciamento_eventos.md` §4.4).
 */
export async function renderCertificate(
  templateBytes: ArrayBuffer,
  name: string,
  position: NamePosition,
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPages()[0];
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);

  const { width, height } = page.getSize();
  const fontSize = ((position.fontPct ?? DEFAULT_FONT_PCT) / 100) * height;
  const textWidth = font.widthOfTextAtSize(name, fontSize);

  let x = (position.xPct / 100) * width;
  if (position.align === 'center') x -= textWidth / 2;
  else if (position.align === 'right') x -= textWidth;

  // Editor coordinates are top-left origin (like the DOM/canvas); pdf-lib's
  // origin is bottom-left, so the y axis is flipped here.
  const y = height - (position.yPct / 100) * height - fontSize / 2;

  page.drawText(name, {
    x,
    y,
    size: fontSize,
    font,
    color: position.color ? hexToRgb(position.color) : rgb(0, 0, 0),
  });

  return Buffer.from(await pdfDoc.save());
}
