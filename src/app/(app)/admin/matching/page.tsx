import { Sparkles, Plus } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import {
  AddMatchingCardButton,
  MatchingColumnMenu,
} from "@/components/app/matching-column-actions";
import { Card } from "@/components/ui/card";
import { Avatar, FacilityLogo } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { mvpSurfaceUnavailable } from "@/lib/nav/mvp-unavailable";
import { listFacilities } from "@/lib/repos/facilities";
import type { Facility } from "@/lib/types";

type Stage = "Candidates" | "Suggested" | "Contacted" | "Matched";

type Card = {
  id: string;
  candidate: string;
  role: string;
  facilityIndex: number;
  score: number;
  experience: string;
};

const COLUMNS: { stage: Stage; tone: string; cards: Card[] }[] = [
  {
    stage: "Candidates",
    tone: "bg-slate-100 text-slate-700",
    cards: [
      {
        id: "c1",
        candidate: "Tinashe Moyo",
        role: "Registered Nurse",
        facilityIndex: 0,
        score: 92,
        experience: "6 yrs",
      },
      {
        id: "c2",
        candidate: "Brian Mutasa",
        role: "Clinical Officer",
        facilityIndex: 1,
        score: 81,
        experience: "4 yrs",
      },
      {
        id: "c3",
        candidate: "Linda Sibanda",
        role: "Pharmacist",
        facilityIndex: 2,
        score: 88,
        experience: "9 yrs",
      },
    ],
  },
  {
    stage: "Suggested",
    tone: "bg-sky-100 text-sky-700",
    cards: [
      {
        id: "c4",
        candidate: "Tendai Ncube",
        role: "Lab Scientist",
        facilityIndex: 3,
        score: 95,
        experience: "7 yrs",
      },
      {
        id: "c5",
        candidate: "Farai Mhlanga",
        role: "Radiographer",
        facilityIndex: 4,
        score: 87,
        experience: "5 yrs",
      },
    ],
  },
  {
    stage: "Contacted",
    tone: "bg-amber-100 text-amber-700",
    cards: [
      {
        id: "c6",
        candidate: "Chipo Marufu",
        role: "Pharmacy Tech",
        facilityIndex: 2,
        score: 84,
        experience: "3 yrs",
      },
      {
        id: "c7",
        candidate: "Rumbi Chikore",
        role: "Senior Nurse",
        facilityIndex: 0,
        score: 90,
        experience: "8 yrs",
      },
    ],
  },
  {
    stage: "Matched",
    tone: "bg-violet-100 text-violet-700",
    cards: [
      {
        id: "c8",
        candidate: "Kuda Chari",
        role: "Physiotherapist",
        facilityIndex: 5,
        score: 96,
        experience: "5 yrs",
      },
    ],
  },
];

export default async function AdminMatchingPage() {
  mvpSurfaceUnavailable();
  const facilities = await listFacilities(10);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Matching workflow"
        description="Move candidates from sourcing to placement. AI suggestions ranked by fit."
        actions={
          <>
            <Button variant="secondary" size="sm">
              <Sparkles className="h-3.5 w-3.5" /> Run AI batch
            </Button>
            <Button size="sm">
              <Plus className="h-3.5 w-3.5" /> Add candidate
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 gap-3 lg:grid-cols-4">
        {COLUMNS.map((col) => (
          <div key={col.stage} className="flex flex-col gap-3">
            <div className="flex items-center justify-between">
              <div className="inline-flex items-center gap-2">
                <span
                  className={`inline-flex h-6 items-center rounded-full px-2 text-[11px] font-semibold ${col.tone}`}
                >
                  {col.stage}
                </span>
                <span className="text-[12px] text-[color:var(--color-ink-400)]">
                  {col.cards.length}
                </span>
              </div>
              <MatchingColumnMenu stage={col.stage} />
            </div>

            <div className="flex flex-col gap-2.5 min-h-[120px]">
              {col.cards.map((c) => (
                <MatchingCard key={c.id} card={c} facilities={facilities} />
              ))}
              <AddMatchingCardButton stage={col.stage} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function MatchingCard({
  card,
  facilities,
}: {
  card: Card;
  facilities: Facility[];
}) {
  const facility = facilities[card.facilityIndex];
  return (
    <Card className="card-hover p-3.5 cursor-grab active:cursor-grabbing">
      <div className="flex items-start gap-2.5">
        <Avatar name={card.candidate} size={32} />
        <div className="min-w-0 flex-1">
          <p className="text-[13px] font-semibold truncate">
            {card.candidate}
          </p>
          <p className="text-[11.5px] text-[color:var(--color-ink-500)] truncate">
            {card.role} · {card.experience}
          </p>
        </div>
      </div>
      <div className="mt-2.5 flex items-center gap-2">
        {facility ? (
          <FacilityLogo
            initials={facility.initials}
            gradient={facility.logoColor}
            size={22}
          />
        ) : null}
        <p className="text-[11.5px] text-[color:var(--color-ink-500)] truncate flex-1">
          {facility?.name ?? "Facility pending"}
        </p>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <Badge tone="brand">
          <Sparkles className="h-3 w-3" /> {card.score}% match
        </Badge>
        <Button variant="ghost" size="sm">
          View
        </Button>
      </div>
    </Card>
  );
}
