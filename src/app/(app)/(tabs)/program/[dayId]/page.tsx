import { getDayDetail, getOverrideHistory } from "@/features/program/override";
import { format } from "date-fns";
import { redirect } from "next/navigation";
import DayManager from "../_components/day-manager";

// Halaman kelola satu hari program: ganti latihan (custom / rekomendasi AI)
// secara SEMENTARA per tanggal + riwayat penggantian.
export default async function ProgramDayPage({
  params,
}: {
  params: Promise<{ dayId: string }>;
}) {
  const { dayId } = await params;
  const today = format(new Date(), "yyyy-MM-dd");
  const [detail, history] = await Promise.all([
    getDayDetail(dayId, today),
    getOverrideHistory(dayId),
  ]);

  if (!detail) redirect("/program");

  return <DayManager initialDetail={detail} initialHistory={history} />;
}
