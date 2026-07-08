'use client';

import { useEffect, useState, type ChangeEvent } from 'react';
import { Image as KonvaImage, Layer, Stage, Text } from 'react-konva';
import type { KonvaEventObject } from 'konva/lib/Node';
import { Alert, Button, FileDropzone, SelectField, TextField } from '@/components/dash-ui';
import { ApiError, eventsApi, uploadsApi, type NamePosition, type TextAlign } from '@/lib/api';

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
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [sampleName, setSampleName] = useState('Nome do Participante');
  const [position, setPosition] = useState<Required<NamePosition>>({
    ...DEFAULT_POSITION,
    ...initialPosition,
  });
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (!artworkUrl) return;
    let cancelled = false;
    const img = new window.Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      if (!cancelled) setImage(img);
    };
    img.onerror = () => {
      if (cancelled) return;
      setImage(null);
      setError('Não foi possível carregar essa imagem.');
    };
    img.src = artworkUrl;
    return () => {
      cancelled = true;
    };
  }, [artworkUrl]);

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
        artworkUrl: artworkUrl || undefined,
        namePosition: position,
      });
      setSaved(true);
    } catch (err) {
      setError(
        err instanceof ApiError ? err.message : 'Não foi possível salvar a credencial.',
      );
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-4">
      <FileDropzone
        label="Arte da credencial"
        accept="image/png,image/jpeg,image/webp"
        acceptHint="PNG, JPG ou WEBP"
        maxSizeBytes={8 * 1024 * 1024}
        currentUrl={artworkUrl || null}
        previewAsImage
        onUpload={(file) => uploadsApi.credentialArtwork(file)}
        onUploaded={(url) => {
          setError(null);
          setSaved(false);
          setArtworkUrl(url);
        }}
        onRemove={() => {
          setSaved(false);
          setArtworkUrl('');
          setImage(null);
        }}
      />

      {error && <Alert>{error}</Alert>}

      <div
        className="overflow-hidden rounded-[14px] border border-white/10 bg-[#1C1B1F]"
        style={{ width: STAGE_WIDTH, maxWidth: '100%' }}
      >
        <Stage width={STAGE_WIDTH} height={stageHeight}>
          <Layer>
            {image && (
              <KonvaImage image={image} width={STAGE_WIDTH} height={stageHeight} />
            )}
            <Text
              text={sampleName || 'Nome do Participante'}
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
        <p className="text-sm text-[#8E8A84]">
          Carregue uma arte acima para pré-visualizar o nome sobre ela. Você já
          pode arrastar o nome de exemplo para definir a posição.
        </p>
      )}

      <div className="grid grid-cols-2 gap-4">
        <TextField
          label="Nome de exemplo"
          value={sampleName}
          onChange={(event) => setSampleName(event.target.value)}
        />
        <SelectField
          label="Alinhamento"
          value={position.align}
          onChange={(event: ChangeEvent<HTMLSelectElement>) =>
            updatePosition('align', event.target.value as TextAlign)
          }
        >
          <option value="left">Esquerda</option>
          <option value="center">Centro</option>
          <option value="right">Direita</option>
        </SelectField>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-[#F5F2EE]">
            Tamanho da fonte ({position.fontPct}% da altura)
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
            className="h-11 accent-[#F0561D]"
          />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="text-[13px] font-semibold text-[#F5F2EE]">Cor</span>
          <input
            type="color"
            value={position.color}
            onChange={(event) => updatePosition('color', event.target.value)}
            className="h-11 w-full rounded-[10px] border border-white/10 bg-[#1C1B1F] px-1"
          />
        </label>
      </div>

      <div className="flex items-center gap-3">
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? 'Salvando…' : 'Salvar credencial'}
        </Button>
        {saved && <span className="text-sm text-[#9BC98E]">Salvo ✓</span>}
      </div>
    </div>
  );
}
