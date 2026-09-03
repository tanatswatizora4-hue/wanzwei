"use client";

import * as React from "react";
import { Loader2, Plus } from "lucide-react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import {
  createCourseAction,
  updateCourseAction,
} from "@/app/(app)/admin/cpd/actions";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input, Label, Textarea } from "@/components/ui/input";
import type { Course } from "@/lib/types";

const CATEGORIES = [
  "Clinical",
  "Compliance",
  "Leadership",
  "Tech",
  "Wellbeing",
] as const;

const FORMATS = ["Online", "In person", "Hybrid"] as const;

function toLocalInput(iso?: string) {
  if (!iso) return "";
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function AdminCourseDialog({
  course,
}: {
  course?: Course;
}) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const isEdit = Boolean(course);

  const onSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (pending) return;
    setPending(true);
    try {
      const formData = new FormData(event.currentTarget);
      const result = isEdit
        ? await updateCourseAction(formData)
        : await createCourseAction(formData);
      if (result.ok) {
        toast.success(isEdit ? "CPD opportunity updated" : "CPD opportunity published");
        setOpen(false);
        router.refresh();
      } else {
        toast.error(result.error);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not save CPD.");
    } finally {
      setPending(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant={isEdit ? "secondary" : "primary"}>
          {isEdit ? "Edit opportunity" : (
            <>
              <Plus className="h-3.5 w-3.5" /> Add CPD opportunity
            </>
          )}
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {isEdit ? "Edit CPD opportunity" : "Publish a CPD opportunity"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="flex min-w-0 flex-col gap-3">
          {course ? <input type="hidden" name="id" value={course.id} /> : null}
          <div>
            <Label htmlFor="course-title">Title</Label>
            <Input id="course-title" name="title" required defaultValue={course?.title} />
          </div>
          <div>
            <Label htmlFor="course-provider">Provider</Label>
            <Input
              id="course-provider"
              name="provider"
              required
              defaultValue={course?.provider}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="course-category">Category</Label>
              <select
                id="course-category"
                name="category"
                defaultValue={course?.category ?? "Clinical"}
                className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
              >
                {CATEGORIES.map((category) => (
                  <option key={category} value={category}>
                    {category}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <Label htmlFor="course-format">Format</Label>
              <select
                id="course-format"
                name="format"
                defaultValue={course?.format ?? "Online"}
                className="mt-1 h-11 w-full rounded-[var(--radius-sm)] border border-[color:var(--color-border-default)] bg-white px-3 text-sm sm:h-9"
              >
                {FORMATS.map((format) => (
                  <option key={format} value={format}>
                    {format}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="course-duration">Duration</Label>
              <Input
                id="course-duration"
                name="duration"
                required
                placeholder="4 hours"
                defaultValue={course?.duration}
              />
            </div>
            <div>
              <Label htmlFor="course-credits">CPD credits</Label>
              <Input
                id="course-credits"
                name="credits"
                type="number"
                min="0"
                step="0.5"
                required
                defaultValue={course?.credits}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="course-location">Location (optional)</Label>
            <Input
              id="course-location"
              name="location"
              defaultValue={course?.location}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <Label htmlFor="course-starts">Starts (optional)</Label>
              <Input
                id="course-starts"
                name="startsAt"
                type="datetime-local"
                defaultValue={toLocalInput(course?.startsAt)}
              />
            </div>
            <div>
              <Label htmlFor="course-ends">Ends (optional)</Label>
              <Input
                id="course-ends"
                name="endsAt"
                type="datetime-local"
                defaultValue={toLocalInput(course?.endsAt)}
              />
            </div>
          </div>
          <div>
            <Label htmlFor="course-description">Description</Label>
            <Textarea
              id="course-description"
              name="description"
              rows={4}
              defaultValue={course?.description}
            />
          </div>
          <label className="inline-flex items-center gap-2 text-[13px]">
            <input
              type="checkbox"
              name="recommended"
              defaultChecked={course?.recommended === true}
            />
            Recommended
          </label>
          <Button type="submit" disabled={pending}>
            {pending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            {isEdit ? "Save" : "Publish"}
          </Button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
