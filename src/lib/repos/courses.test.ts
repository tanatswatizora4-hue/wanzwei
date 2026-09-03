import { describe, expect, it } from "vitest";

import { toCourse } from "./courses";

describe("course mapping", () => {
  it("maps catalogue rows without treating shared progress as learner state", () => {
    const now = new Date("2026-06-09T08:30:00.000Z");
    expect(
      toCourse({
        id: "11111111-1111-4111-8111-111111111111",
        title: "IPC Fundamentals",
        provider: "MOHCC",
        category: "Compliance",
        duration: "2 hours",
        credits: "2.00",
        progress: 80,
        status: "in_progress",
        cover: "/covers/ipc.jpg",
        recommended: true,
        description: "Infection prevention.",
        format: "Online",
        location: null,
        startsAt: null,
        endsAt: now,
        createdAt: now,
        updatedAt: now,
      }),
    ).toEqual({
      id: "11111111-1111-4111-8111-111111111111",
      title: "IPC Fundamentals",
      provider: "MOHCC",
      category: "Compliance",
      duration: "2 hours",
      credits: 2,
      cover: "from-violet-500 to-slate-800",
      recommended: true,
      description: "Infection prevention.",
      format: "Online",
      location: undefined,
      startsAt: undefined,
      endsAt: "2026-06-09T08:30:00.000Z",
    });
  });
});
