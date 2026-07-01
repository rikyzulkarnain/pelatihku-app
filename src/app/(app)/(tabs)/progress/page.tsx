import { getProgressData } from "@/features/progress/action";
import ProgressView from "./_components/progress-view";

export default async function ProgressPage() {
  const data = await getProgressData();
  return <ProgressView data={data} />;
}
