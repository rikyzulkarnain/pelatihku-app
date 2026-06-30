import PhoneShell from "@/components/common/phone-shell";
import { getSessionData } from "@/features/workout/action";
import { redirect } from "next/navigation";
import SessionView from "./session-view";

export default async function SessionPage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;
  const data = await getSessionData(sessionId);

  if (!data) redirect("/program");

  return (
    <PhoneShell>
      <SessionView data={data} />
    </PhoneShell>
  );
}
