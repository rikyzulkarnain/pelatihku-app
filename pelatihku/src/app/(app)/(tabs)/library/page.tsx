import { getExercises } from "@/features/library/action";
import LibraryView from "./library-view";

export default async function LibraryPage() {
  const exercises = await getExercises();
  return <LibraryView exercises={exercises} />;
}
