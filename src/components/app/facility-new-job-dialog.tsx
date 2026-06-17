"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { createJobAction } from "@/app/(app)/facility/jobs/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Locum",
  "Contract",
  "Permanent",
] as const;

export function FacilityNewJobDialog({
  defaultLocation,
}: {
  defaultLocation: string;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);

  const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const formData = new FormData(event.currentTarget);
      const result = await createJobAction(formData);
      if (result.ok) {
        toast.success("Job posted");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Could not post job.";
      toast.error(message);
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="h-3.5 w-3.5" /> New job
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Post a new job</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <Label htmlFor="job-title">Role title</Label>
            <Input
              id="job-title"
              name="title"
              required
              placeholder="Registered Nurse — ICU"
            />
          </div>
          <div>
            <Label htmlFor="job-location">Location</Label>
            <Input
              id="job-location"
              name="location"
              defaultValue={defaultLocation}
              required
            />
          </div>
          <div>
            <Label>Type</Label>
            <Select name="type" defaultValue="Locum">
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EMPLOYMENT_TYPES.map((type) => (
                  <SelectItem key={type} value={type}>
                    {type}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="job-salary">Salary (optional)</Label>
            <Input
              id="job-salary"
              name="salary"
              placeholder="USD 25/hr"
            />
          </div>
          <div>
            <Label htmlFor="job-description">Description</Label>
            <Textarea
              id="job-description"
              name="description"
              rows={4}
              placeholder="Shift pattern, ward, requirements…"
            />
          </div>
          <div>
            <Label htmlFor="job-tags">Tags (comma-separated)</Label>
            <Input
              id="job-tags"
              name="tags"
              placeholder="ICU, Emergency, Night shift"
            />
          </div>
          <Button type="submit" disabled={pending}>
            {pending ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Posting…
              </>
            ) : (
              "Post job"
            )}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
