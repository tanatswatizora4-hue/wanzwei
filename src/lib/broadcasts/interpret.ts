import { PROFESSION_LABELS, isCanonicalProfession } from "@/lib/professions";
import {
  EMPTY_TARGETING_CRITERIA,
  TARGETING_CRITERIA_KEYS,
  type TargetingCriteria,
} from "@/lib/broadcasts/network-types";
import {
  ImprovedCopySchema,
  TargetingCriteriaSchema,
  hasUnknownTargetingKeys,
} from "@/lib/validation/broadcasts";

const PROFESSION_ALIASES: Record<string, string> = {
  nurse: "Nurse",
  nurses: "Nurse",
  rn: "Nurse",
  "registered nurse": "Nurse",
  "registered nurses": "Nurse",
  "theatre nurse": "Nurse",
  "theater nurse": "Nurse",
  "locum nurse": "Nurse",
  midwife: "Midwife",
  midwives: "Midwife",
  pharmacist: "Pharmacist",
  pharmacists: "Pharmacist",
  doctor: "Medical Doctor (General Practitioner)",
  doctors: "Medical Doctor (General Practitioner)",
  gp: "Medical Doctor (General Practitioner)",
  "medical doctor": "Medical Doctor (General Practitioner)",
};

export function canonicalizeProfessionLabel(value: string): string | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  if (isCanonicalProfession(trimmed)) return trimmed;
  const lower = trimmed.toLowerCase();
  const exact = PROFESSION_LABELS.find((label) => label.toLowerCase() === lower);
  if (exact) return exact;
  return PROFESSION_ALIASES[lower] ?? null;
}

export function extractJsonObject(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/```$/i, "").trim();
  const parsed: unknown = JSON.parse(trimmed);
  return parsed;
}

function normalizeAiCriteria(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  const extra = hasUnknownTargetingKeys(input);
  if (extra.length > 0) {
    throw new Error(`Unsupported targeting fields: ${extra.join(", ")}`);
  }
  const professions = Array.isArray(input.professions)
    ? input.professions
        .map((item) =>
          typeof item === "string" ? canonicalizeProfessionLabel(item) : null,
        )
        .filter((item): item is string => item != null)
    : [];
  return {
    ...EMPTY_TARGETING_CRITERIA,
    ...input,
    professions,
  };
}

export function parseAiTargetingCriteria(raw: string): TargetingCriteria {
  const parsed = extractJsonObject(raw);
  const normalized = normalizeAiCriteria(parsed);
  const result = TargetingCriteriaSchema.safeParse(normalized);
  if (!result.success) {
    throw new Error("AI targeting output failed schema validation.");
  }
  return result.data;
}

export function parseAiImprovedCopy(raw: string): { title: string; message: string } {
  const parsed = extractJsonObject(raw);
  const result = ImprovedCopySchema.safeParse(parsed);
  if (!result.success) {
    throw new Error("AI copy output failed schema validation.");
  }
  return result.data;
}

export function targetingInterpretationPrompt(intent: string): string {
  const professions = PROFESSION_LABELS.map((label) => `- ${label}`).join("\n");
  return `You convert healthcare staffing targeting intent into JSON.

Return ONLY a JSON object with these keys and no others:
${TARGETING_CRITERIA_KEYS.map((key) => `- ${key}`).join("\n")}

Rules:
- professions must be chosen from this canonical list. Never invent titles.
${professions}
- verifiedOnly is true only when the user asked for verified professionals.
- locations are stored text labels such as city names. No GPS or radius.
- networkOnly is true when the user asks for their facility network, approved locums, employees, talent pool, or internal staff.
- relationshipTypes may only be: employee, approved_locum, previous_locum, contractor, talent_pool, other.
- professionalIds and excludeProfessionalIds must be UUID arrays. Use [] unless the user supplied UUIDs.
- Do not include specialty, years of experience, availability, pay, SQL, or any other key.
- Do not broaden the audience. Prefer narrower filters when unsure.
- Never send a message. Never query a database.

User intent:
${intent}`;
}

export function improveCopyPrompt(title: string, message: string): string {
  return `Rewrite this healthcare staffing advert for clarity.

Return ONLY JSON with keys title and message.
Do not invent pay, rates, dates, requirements, positions, locations, or other facts.
Do not add specialties or credentials that are not already stated.
Keep the same meaning.

Title:
${title}

Message:
${message}`;
}

export type InterpretTargetingResult =
  | { ok: true; criteria: TargetingCriteria }
  | { ok: false; error: string };

export type ImproveCopyResult =
  | { ok: true; title: string; message: string }
  | { ok: false; error: string };

export async function interpretTargetingIntent(
  intent: string,
  generateJson: (prompt: string) => Promise<string>,
): Promise<InterpretTargetingResult> {
  try {
    const raw = await generateJson(targetingInterpretationPrompt(intent));
    return { ok: true, criteria: parseAiTargetingCriteria(raw) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not interpret targeting.";
    return { ok: false, error: message };
  }
}

export async function improveBroadcastCopy(
  input: { title: string; message: string },
  generateJson: (prompt: string) => Promise<string>,
): Promise<ImproveCopyResult> {
  try {
    const raw = await generateJson(improveCopyPrompt(input.title, input.message));
    return { ok: true, ...parseAiImprovedCopy(raw) };
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not improve copy.";
    return { ok: false, error: message };
  }
}
