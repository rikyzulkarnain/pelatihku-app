import { getNutritionData } from "@/features/nutrition/action";
import NutritionView from "./nutrition-view";

export default async function NutritionPage() {
  const data = await getNutritionData();
  return <NutritionView data={data} />;
}
