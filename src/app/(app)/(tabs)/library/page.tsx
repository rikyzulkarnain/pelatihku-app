import { getExercises } from "@/features/library/action";
import LibraryView from "./_components/library-view";

export default async function LibraryPage() {
  const exercises = await getExercises();
  return <LibraryView exercises={exercises} />;
}
