import type { MarkerType } from '@/lib/db/types';

export interface ParsedMarker {
  type: MarkerType;
  text: string;
}

/**
 * Parses content for [pendiente: ...] and [verificar: ...] markers.
 * Returns an array of parsed markers found in the content.
 */
export function parseMarkers(content: string): ParsedMarker[] {
  const markers: ParsedMarker[] = [];
  const regex = /\[(pendiente|verificar):\s*([^\]]+)\]/gi;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(content)) !== null) {
    markers.push({
      type: match[1].toLowerCase() as MarkerType,
      text: match[2].trim(),
    });
  }

  return markers;
}

/**
 * Builds a marker string for insertion into content.
 */
export function buildMarkerString(type: MarkerType, text: string): string {
  return `[${type}: ${text}]`;
}
