import { z } from "zod";

export type ProfessionCategoryId =
  | "direct_patient_care"
  | "laboratory_and_diagnostic"
  | "public_health"
  | "pharmaceutical_supply_chain"
  | "allied_health"
  | "health_management"
  | "research_academic"
  | "emerging_digital_health";

export type ProfessionCategory = {
  id: ProfessionCategoryId;
  label: string;
  professions: readonly string[];
};

/**
 * Canonical professional titles for signup, onboarding, profile, and
 * emergency role selection. Keep this as the only profession option list.
 */
export const PROFESSION_CATEGORIES: readonly ProfessionCategory[] = [
  {
    id: "direct_patient_care",
    label: "Direct patient care",
    professions: [
      "Medical Doctor (General Practitioner)",
      "Specialist Physician",
      "Dentist",
      "Pharmacist",
      "Nurse",
      "Midwife",
      "Clinical Officer",
      "Physiotherapist",
      "Occupational Therapist",
      "Speech and Language Therapist",
      "Optometrist",
      "Ophthalmologist",
      "Psychologist",
      "Psychiatrist",
      "Dietitian/Nutritionist",
      "Radiographer",
      "Sonographer",
      "Anesthetist",
      "Nurse Anesthetist",
    ],
  },
  {
    id: "laboratory_and_diagnostic",
    label: "Laboratory and diagnostic",
    professions: [
      "Medical Laboratory Scientist",
      "Medical Laboratory Technician",
      "Pathologist",
      "Cytotechnologist",
      "Phlebotomist",
      "Radiology Technologist",
    ],
  },
  {
    id: "public_health",
    label: "Public health",
    professions: [
      "Public Health Specialist",
      "Epidemiologist",
      "Health Promotion Officer",
      "Environmental Health Practitioner",
      "Disease Surveillance Officer",
      "Health Information Officer",
      "Community Health Worker",
      "Health Educator",
    ],
  },
  {
    id: "pharmaceutical_supply_chain",
    label: "Pharmaceutical / supply chain",
    professions: [
      "Pharmacy Technician",
      "Pharmaceutical Scientist",
      "Medicines Logistics Officer",
      "Supply Chain Specialist",
      "Procurement and Supply Officer",
      "Warehouse Pharmacist",
      "Regulatory Affairs Specialist",
      "Quality Assurance Pharmacist",
    ],
  },
  {
    id: "allied_health",
    label: "Allied health",
    professions: [
      "Audiologist",
      "Prosthetist and Orthotist",
      "Respiratory Therapist",
      "Emergency Medical Technician (EMT)",
      "Paramedic",
      "Rehabilitation Therapist",
    ],
  },
  {
    id: "health_management",
    label: "Health management / administration",
    professions: [
      "Health Services Manager",
      "Hospital Administrator",
      "Health Program Manager",
      "Health Economist",
      "Health Policy Analyst",
      "Health Informatics Specialist",
      "Monitoring and Evaluation Officer",
    ],
  },
  {
    id: "research_academic",
    label: "Research / academic",
    professions: [
      "Medical Research Scientist",
      "Clinical Research Associate",
      "Biostatistician",
      "Lecturer in Health Sciences",
      "Research Pharmacist",
    ],
  },
  {
    id: "emerging_digital_health",
    label: "Emerging / digital health",
    professions: [
      "Digital Health Specialist",
      "Telemedicine Coordinator",
      "Health Data Analyst",
      "Artificial Intelligence in Healthcare Specialist",
      "Global Health Specialist",
    ],
  },
];

export const PROFESSION_LABELS: readonly string[] =
  PROFESSION_CATEGORIES.flatMap((category) => category.professions);

export const PROFESSION_COUNT = PROFESSION_LABELS.length;

const PROFESSION_SET = new Set(PROFESSION_LABELS);

/**
 * UI titles that currently map onto existing HPA auto-verify families.
 * Keep this list in lockstep with PROFESSION_FAMILIES in match.ts.
 * Do not add titles that the practitioner_registry cannot match.
 */
export const HPA_AUTO_VERIFY_PROFESSIONS = [
  "Pharmacist",
  "Pharmacy Technician",
  "Nurse",
  "Midwife",
] as const;

const HPA_AUTO_VERIFY_SET = new Set<string>(HPA_AUTO_VERIFY_PROFESSIONS);

export function isCanonicalProfession(value: string): boolean {
  return PROFESSION_SET.has(value.trim());
}

/**
 * True only when the existing HPA matcher has a compatible family for this
 * title. Unknown or adjacent titles (Warehouse Pharmacist, Dentist, etc.)
 * never auto-verify.
 */
export function professionSupportsHpaAutoVerify(value: string): boolean {
  return HPA_AUTO_VERIFY_SET.has(value.trim());
}

export function hpaAutoVerifyProfessionLabels(): string[] {
  return PROFESSION_LABELS.filter((label) =>
    professionSupportsHpaAutoVerify(label),
  );
}

export const CanonicalProfessionSchema = z
  .string()
  .trim()
  .min(1, "Profession is required")
  .refine((value) => isCanonicalProfession(value), {
    message: "Select a profession from the list.",
  });
