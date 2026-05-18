import { SettingsSubnav } from "@/components/settings-subnav";

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex w-full flex-1 flex-col">
      <SettingsSubnav />
      {children}
    </div>
  );
}
