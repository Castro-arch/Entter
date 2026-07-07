'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { Image as KonvaImage, Layer, Stage, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Alert, Button, TextField } from '@/components/ui';
import { ApiError, eventsApi, type NamePosition, type TextAlign } from '@/lib/api';

const STAGE_WIDTH = 520;
const PLACEHOLDER_HEIGHT = 300;
const DEFAULT_POSITION: Required<NamePosition> = {
  xPct: 50,
  yPct: 50,
  fontPct: 6,
  color: '#111111',
  align: 'left',
};

const clampPct = (value: number) => Math.min(100, Math.max(0, value));

interface Props {
  eventId: string;
  initialArtworkUrl: string | null;
  initialPosition: NamePosition | null;
}

/**
 * Drag-and-drop editor for where the attendee's name sits on the credential.
 * Coordinates are stored as percentages of the artwork, so the placement holds
 * regardless of the final render resolution. Browser-only (uses canvas), so it
 * must be loaded with `ssr: false`.
 */
export default function CredentialEditor({
  eventId,
  initialArtworkUrl,
  initialPosition,
}: Props) {
  const [artworkUrl, setArtworkUrl] = useState(initialArtworkUrl ?? '');
  const [loadedUrl, setLoadedUrl] = useState(initialArtworkUrl ?? '');
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [sampleName, setSampleName] = useState('Attendee Name');
  const [position, setPosition] = useState<Required<NamePosition>>({
    ...DEFAULT_POSITION,
    ...initialPosition,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!loadedUrl) return;
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.onerror = () => {
      if (cancelled) return;
      setImage(null);
      setError('Could not load that image URL.');
    };
    img.src = loadedUrl;
    return () => {
      cancelled = true;
    };
  }, [loadedUrl]);

  const stageHeight = image
    ? Math.round(STAGE_WIDTH * (image.height / image.width))
    : PLACEHOLDER_HEIGHT;
  const fontSize = (position.fontPct / 100) * stageHeight;

  function handleDragEnd(event: KonvaEventObject<DragEvent>) {
    const node = event.target;
    setSaved(false);
    setPosition((current) => ({
      ...current,
      xPct: clampPct((node.x() / STAGE_WIDTH) * 100),
      yPct: clampPct((node.y() / stageHeight) * 100),
    }));
  }

  function updatePosition<K extends keyof NamePosition>(
    key: K,
    value: Required<NamePosition>[K],
  ) {
    setSaved(false);
    setPosition((current) => ({ ...current, [key]: value }));
  }

  async function handleSave() {
    setError(null);
    setSaving(true);
    try {
      await eventsApi.updateCredential(eventId, {
        artworkUrl: loadedUrl || undefined,
        namePosition: position,
      });
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Failed to save the credential.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-end gap-2">
        <TextField
          label="Artwork image URL"
          type="url"
          className="flex-1"
          value={artworkUrl}
          onChange={(event) => setArtworkUrl(event.target.value)}
          hint="Paste a public image URL, then load it to position the name."
        />
        <Button
          type="button"
          variant="secondary"
          fullWidth={false}
          onClick={() => {
            setError(null);
            setLoadedUrl(artworkUrl.trim());
          }}
        >
          Load
        </Button>
      </div>

      {error && <Alert>{error}</Alert>}

      <div
        className="overflow-hidden rounded-xl border border-black/10 dark:border-white/10"
        style={{ width: STAGE_WIDTH, maxWidth: '100%' }}
      >
        <Stage width={STAGE_WIDTH} height={stageHeight}>
          <Layer>
            {image && (
              <KonvaImage image={image} width={STAGE_WIDTH} height={stageHeight} />
            )}
            <Text
              text={sampleName || 'Attendee Name'}
              x={(position.xPct / 100) * STAGE_WIDTH}
              y={(position.yPct / 100) * stageHeight}
              fontSize={fontSize}
              fontStyle="bold"
              fill={position.color}
              align={position.align}
              draggable
              onDragEnd={handleDragEnd}
            />
          </Layer>
        </Stage>
      </div>

      {!image && (
        <p className="text-sm text-black/50 dark:text-white/50">
          Load an artwork above to preview the name over it. You can still drag
          the sample name to set its position.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Preview name"
          value={sampleName}
          onChange={(event) => setSampleName(event.target.value)}
        />
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Alignment</span>
          <select
            className="h-11 rounded-lg border border-black/15 bg-transparent px-3 text-sm outline-none focus:border-foreground dark:border-white/20"
            value={position.align}
            onChange={(event: ChangeEvent<HTMLSelectElement>) =>
              updatePosition('align', event.target.value as TextAlign)
            }
          >
            <option value="left">Left</option>
            <option value="center">Center</option>
            <option value="right">Right</option>
          </select>
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">
            Font size ({position.fontPct}% of height)
          </span>
          <input
            type="range"
            min={2}
            max={20}
            step={0.5}
            value={position.fontPct}
            onChange={(event) =>
              updatePosition('fontPct', Number(event.target.value))
            }
            className="h-11"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-sm font-medium">Color</span>
          <input
            type="color"
            value={position.color}
            onChange={(event) => updatePosition('color', event.target.value)}
            className="h-11 w-full rounded-lg border border-black/15 bg-transparent px-1 dark:border-white/20"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" fullWidth={false} onClick={handleSave} disabled={saving}>
          {saving ? 'Saving…' : 'Save credential'}
        </Button>
        {saved && (
          <span className="text-sm text-green-600 dark:text-green-400">Saved ✓</span>
        )}
      </div>
    </div>
  );
}
