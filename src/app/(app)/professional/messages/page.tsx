import { MessagesView } from "@/components/app/messages-view";
import { requireRole } from "@/lib/auth/session";
import { listFacilities } from "@/lib/repos/facilities";

export default async function ProfessionalMessagesPage() {
  await requireRole(["professional"]);
  const facilities = await listFacilities(4);
  const threads = [
    {
      id: "t1",
      facility: facilities[0],
      title: "Registered Nurse — Cure Hospital",
      preview: "Hi Tinashe — we're excited about your application. Could you…",
      time: "12m",
      unread: 2,
    },
    {
      id: "t2",
      facility: facilities[1],
      title: "Clinical Officer interview prep",
      preview: "Here's the schedule for Thursday and a few prep notes.",
      time: "2h",
      unread: 0,
    },
    {
      id: "t3",
      facility: facilities[3],
      title: "Lab Scientist role at PathCare",
      preview: "Thanks for your application. The team will review it shortly.",
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
