import { MessagesView } from "@/components/app/messages-view";
import { requireRole } from "@/lib/auth/session";
import { listFacilities } from "@/lib/repos/facilities";

export default async function FacilityMessagesPage() {
  await requireRole(["facility"]);
  const facilities = await listFacilities(4);
  const threads = [
    {
      id: "t1",
      facility: facilities[0],
      title: "Tinashe Moyo — Registered Nurse applicant",
      preview: "Reaching out about my availability for the May 19 shift.",
      time: "12m",
      unread: 2,
    },
    {
      id: "t2",
      facility: facilities[1],
      title: "Brian Mutasa — Clinical Officer",
      preview: "Following up on my application from last week.",
      time: "2h",
      unread: 0,
    },
    {
      id: "t3",
      facility: facilities[3],
      title: "Tendai Ncube — Lab Scientist",
      preview: "Available for an interview any time on Thursday.",
      time: "1d",
      unread: 1,
    },
  ].filter((thread) => thread.facility);

  return (
    <MessagesView
      threads={threads}
    />
  );
}
