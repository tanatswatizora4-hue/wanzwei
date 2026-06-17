import type { Facility, Job } from "@/lib/types";

export const marketingFacilities: Facility[] = [
  {
    id: "sample-cure",
    name: "Cure Hospital Harare",
    type: "Hospital",
    location: "Harare",
    verified: true,
    rating: 4.8,
    openRoles: 12,
    logoColor: "from-rose-400 to-pink-500",
    initials: "CH",
  },
  {
    id: "sample-pari",
    name: "Parirenyatwa Group",
    type: "Hospital",
    location: "Harare",
    verified: true,
    rating: 4.6,
    openRoles: 28,
    logoColor: "from-emerald-400 to-teal-500",
    initials: "PG",
  },
  {
    id: "sample-path",
    name: "PathCare Zimbabwe",
    type: "Laboratory",
    location: "Harare",
    verified: true,
    rating: 4.7,
    openRoles: 9,
    logoColor: "from-orange-400 to-red-500",
    initials: "PC",
  },
];

export const marketingJobs: Job[] = [
  {
    id: "sample-rn",
    title: "Registered Nurse",
    facilityId: "sample-cure",
    location: "Harare",
    type: "Full-time",
    postedAt: "2026-05-12T06:00:00.000Z",
    status: "Open",
    applicants: 12,
    description: "Acute and outpatient nursing role at a verified hospital.",
    tags: ["Acute Care", "Shift Work"],
  },
  {
    id: "sample-clinical",
    title: "Clinical Officer",
    facilityId: "sample-pari",
    location: "Harare",
    type: "Contract",
    postedAt: "2026-05-11T08:00:00.000Z",
    status: "Open",
    applicants: 18,
    description: "Outpatient clinical cover with a multidisciplinary team.",
    tags: ["Primary Care"],
  },
  {
    id: "sample-lab",
    title: "Lab Scientist",
    facilityId: "sample-path",
    location: "Harare",
    type: "Locum",
    postedAt: "2026-05-10T08:00:00.000Z",
    status: "Open",
    applicants: 7,
    description: "Diagnostic lab role supporting high-throughput testing.",
    tags: ["Diagnostics"],
  },
];

export const marketingFacilityById = Object.fromEntries(
  marketingFacilities.map((facility) => [facility.id, facility]),
);
