import Link from "next/link";
import { Bookmark } from "lucide-react";
import { PageHeader } from "@/components/app/topbar";
import { JobRow } from "@/components/app/job-row";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Button } from "@/components/ui/button";
import { requireRole } from "@/lib/auth/session";
import { professionalJobPath } from "@/lib/jobs/paths";
import { getSavedJobsWithFacilityForUserEmail } from "@/lib/repos/jobs";

export default async function SavedJobsPage() {
  const user = await requireRole(["professional"]);
  const saved = await getSavedJobsWithFacilityForUserEmail(user.email);

  return (
    <div className="flex flex-col gap-6">
      <PageHeader title="Saved Jobs" description="Roles you've bookmarked for later." />

      <Card>
        {saved.length === 0 ? (
          <EmptyState
            icon={<Bookmark className="h-4 w-4" />}
            title="No saved jobs yet"
            description="When you bookmark a job, it'll show up here for quick access."
            action={
              <Button size="sm" asChild>
                <Link href="/professional/jobs">Browse jobs</Link>
              </Button>
            }
          />
        ) : (
          <ul className="p-2 flex flex-col">
            {saved.map(({ job, facility }) => (
              <li key={job.id}>
                <JobRow
                  job={job}
                  facility={facility}
                  href={professionalJobPath(job.id)}
                />
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
