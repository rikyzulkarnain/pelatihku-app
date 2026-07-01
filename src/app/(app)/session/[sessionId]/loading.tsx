import { SessionSkeleton } from "@/components/common/page-skeleton";
import PhoneShell from "@/components/common/phone-shell";

export default function Loading() {
  return (
    <PhoneShell>
      <SessionSkeleton />
    </PhoneShell>
  );
}
