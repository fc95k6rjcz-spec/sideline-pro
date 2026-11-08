import type { Metadata } from "next";
import InterviewChecklist from "./InterviewChecklist";
export const metadata: Metadata = { title: "Filming checklist · SidelinePro", robots: { index: false, follow: false } };
export default function Ad1Page() { return <InterviewChecklist />; }
