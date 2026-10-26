import { z } from "zod";

/**
 * User chart annotations. They are local study notes, not signals. Validation
 * is strict because imported annotations come from an untrusted file.
 */

export const ANNOTATION_KINDS = ["note", "support", "resistance", "swing-high", "swing-low"] as const;
export type AnnotationKind = (typeof ANNOTATION_KINDS)[number];

export const MAX_ANNOTATIONS = 100;
export const MAX_ANNOTATION_TEXT = 160;

export const annotationSchema = z
  .object({
    id: z.string().min(1).max(80).regex(/^ann-[A-Za-z0-9._-]+$/),
    kind: z.enum(ANNOTATION_KINDS),
    price: z.number().finite().positive().max(1_000_000_000),
    barIndex: z.number().int().min(0).max(1_000_000).nullable(),
    text: z.string().trim().min(1).max(MAX_ANNOTATION_TEXT),
    createdAt: z.string().datetime(),
  })
  .strict();

export type Annotation = z.infer<typeof annotationSchema>;

export interface AnnotationInput {
  kind: AnnotationKind;
  price: number;
  barIndex?: number | null;
  text: string;
}

let fallbackCounter = 0;

export function makeAnnotationId(): string {
  const globalCrypto = typeof globalThis.crypto !== "undefined" ? globalThis.crypto : undefined;
  if (globalCrypto && typeof globalCrypto.randomUUID === "function") {
    return `ann-${globalCrypto.randomUUID()}`;
  }
  fallbackCounter += 1;
  return `ann-${Date.now().toString(36)}-${fallbackCounter}`;
}

export function createAnnotation(input: AnnotationInput, now: Date = new Date(), id: string = makeAnnotationId()): Annotation {
  return annotationSchema.parse({
    id,
    kind: input.kind,
    price: input.price,
    barIndex: input.barIndex ?? null,
    text: input.text.trim(),
    createdAt: now.toISOString(),
  });
}

export function addAnnotation(list: readonly Annotation[], annotation: Annotation): Annotation[] {
  if (list.length >= MAX_ANNOTATIONS) {
    throw new Error(`Annotation limit reached (${MAX_ANNOTATIONS}). Delete one before adding another.`);
  }
  if (list.some((item) => item.id === annotation.id)) {
    throw new Error("Duplicate annotation id.");
  }
  return [...list, annotation];
}

export function removeAnnotation(list: readonly Annotation[], id: string): Annotation[] {
  return list.filter((item) => item.id !== id);
}

export function annotationLabel(kind: AnnotationKind): string {
  switch (kind) {
    case "note":
      return "Note";
    case "support":
      return "Support";
    case "resistance":
      return "Resistance";
    case "swing-high":
      return "Swing high";
    case "swing-low":
      return "Swing low";
  }
}
