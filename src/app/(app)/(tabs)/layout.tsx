import BottomNav from "@/components/common/bottom-nav";
import PhoneShell from "@/components/common/phone-shell";

export default function TabsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PhoneShell nav={<BottomNav />}>{children}</PhoneShell>;
}
