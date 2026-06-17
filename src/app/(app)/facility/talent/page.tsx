import { Search, Sparkles, Star, MessageSquare } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { SaveCandidateButton } from "@/components/app/save-candidate-button";
import { Card, CardBody } from "@/components/ui/card";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { requireRole } from "@/lib/auth/session";

const TALENT = [
  {
    id: "1",
    name: "Tinashe Moyo",
    role: "Registered Nurse · 6 yrs",
    location: "Harare",
    skills: ["ICU", "Adult care", "BLS"],
    rating: 4.9,
    available: true,
  },
  {
    id: "2",
    name: "Rumbi Chikore",
    role: "Senior Nurse · 8 yrs",
    location: "Harare",
    skills: ["Theatre", "Orthopedics"],
    rating: 4.8,
    available: true,
  },
  {
    id: "3",
    name: "Brian Mutasa",
    role: "Clinical Officer · 4 yrs",
    location: "Bulawayo",
    skills: ["Emergency", "Triage"],
    rating: 4.6,
    available: false,
  },
  {
    id: "4",
    name: "Tendai Ncube",
    role: "Lab Scientist · 7 yrs",
    location: "Harare",
    skills: ["Hematology", "ISO 15189"],
    rating: 4.7,
    available: true,
  },
  {
    id: "5",
    name: "Linda Sibanda",
    role: "Pharmacist · 9 yrs",
    location: "Harare",
    skills: ["Stewardship", "Inpatient"],
    rating: 4.8,
    available: true,
  },
  {
    id: "6",
    name: "Farai Mhlanga",
    role: "Radiographer · 5 yrs",
    location: "Harare",
    skills: ["CT", "MRI"],
    rating: 4.5,
    available: true,
  },
];

export default async function FacilityTalentPage() {
  await requireRole(["facility"]);
  return (
    <div className="flex flex-col gap-6">
      <PageHeader
        title="Talent pool"
        description="Curated, pre-verified clinicians matching your hiring profile."
        actions={
          <Button size="sm">
            <Sparkles className="h-3.5 w-3.5" /> Run AI match
          </Button>
        }
      />

      <Card>
        <CardBody className="pt-5">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
            <div className="relative sm:col-span-2">
              <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-[color:var(--color-ink-400)]" />
              <Input
                placeholder="Search by name, profession or skill"
                className="pl-9"
              />
            </div>
            <Select defaultValue="all-prof">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-prof">All professions</SelectItem>
                <SelectItem value="nurse">Nursing</SelectItem>
                <SelectItem value="clin">Clinical</SelectItem>
                <SelectItem value="pharm">Pharmacy</SelectItem>
              </SelectContent>
            </Select>
            <Select defaultValue="all-availability">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all-availability">Any availability</SelectItem>
                <SelectItem value="now">Available now</SelectItem>
                <SelectItem value="2w">Within 2 weeks</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardBody>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {TALENT.map((t) => (
          <Card key={t.id} className="card-hover">
            <CardBody className="pt-5">
              <div className="flex items-start gap-3">
                <Avatar name={t.name} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="text-[14px] font-semibold">{t.name}</p>
                    {t.available ? (
                      <Badge tone="success" withDot>
                        Available
                      </Badge>
                    ) : (
                      <Badge tone="slate">Busy</Badge>
                    )}
                  </div>
                  <p className="text-[12.5px] text-[color:var(--color-ink-500)]">
                    {t.role} · {t.location}
                  </p>
                </div>
                <SaveCandidateButton candidateName={t.name} />
              </div>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {t.skills.map((s) => (
                  <Badge key={s} tone="slate">
                    {s}
                  </Badge>
                ))}
              </div>
              <div className="mt-4 flex items-center justify-between">
                <span className="inline-flex items-center gap-1 text-[12.5px] text-[color:var(--color-ink-500)]">
                  <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                  {t.rating} rating
                </span>
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm">
                    <MessageSquare className="h-3.5 w-3.5" /> Message
                  </Button>
                  <Button size="sm">Invite</Button>
                </div>
              </div>
            </CardBody>
          </Card>
        ))}
      </div>
    </div>
  );
}
