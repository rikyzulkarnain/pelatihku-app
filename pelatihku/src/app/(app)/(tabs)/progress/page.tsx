import { getProgressData } from "@/features/progress/action";
import ProgressView from "./progress-view";

export default async function ProgressPage() {
  const data = await getProgressData();
  return <ProgressView data={data} />;
}
