import { CrmProvider } from "./_components/CrmProvider";
import CrmNav from "./_components/CrmNav";
import ClubPanel from "./_components/ClubPanel";
import PersonPanel from "./_components/PersonPanel";

export const metadata = {
  title: "CRM — Sideline Pro",
  robots: { index: false, follow: false },
};

// /admin/layout.tsx has already checked the session and the allowlist.
export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <CrmProvider>
      <div className="-mt-4">
        <CrmNav />
        <div className="mt-6">{children}</div>
      </div>
      <ClubPanel />
      <PersonPanel />
    </CrmProvider>
  );
}
