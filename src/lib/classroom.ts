import type { GradeBand } from "@prisma/client";

export type StudentNavIcon =
  | "AlertCircle"
  | "BookOpen"
  | "Compass"
  | "FileText"
  | "FlaskConical"
  | "FolderKanban"
  | "Home"
  | "Newspaper"
  | "Settings"
  | "Trophy"
  | "Users";

export type StudentNavItem = {
  href: string;
  label: string;
  icon: StudentNavIcon;
};

export const fullStudentNavItems: StudentNavItem[] = [
  { href: "/", label: "Home", icon: "Home" },
  { href: "/start", label: "Start", icon: "Compass" },
  { href: "/news", label: "News", icon: "Newspaper" },
  { href: "/challenges", label: "Challenges", icon: "Trophy" },
  { href: "/teams", label: "Teams", icon: "Users" },
  { href: "/rules", label: "Rules", icon: "BookOpen" },
  { href: "/issues", label: "Issues", icon: "AlertCircle" },
  { href: "/projects", label: "Projects", icon: "FolderKanban" },
  { href: "/proposals", label: "Proposals", icon: "FileText" },
  { href: "/research", label: "Research", icon: "FlaskConical" },
  { href: "/glossary", label: "Glossary", icon: "BookOpen" }
];

export const publicNavItems: StudentNavItem[] = [
  { href: "/", label: "Home", icon: "Home" },
  { href: "/start", label: "Start", icon: "Compass" },
  { href: "/news", label: "News", icon: "Newspaper" },
  { href: "/glossary", label: "Glossary", icon: "BookOpen" }
];

export function shouldGateAdvancedStudentWork(input: {
  hasSubmittedFirstProject: boolean;
}) {
  return !input.hasSubmittedFirstProject;
}

export function shouldUseReducedStudentNav(input: {
  gradeBand: GradeBand | null | undefined;
  hasSubmittedFirstProject: boolean;
}) {
  return input.gradeBand === "GRADE_5_6" && !input.hasSubmittedFirstProject;
}

export function shouldGateYoungerTrackReferencePages(input: {
  gradeBand: GradeBand | null | undefined;
  hasSubmittedFirstProject: boolean;
}) {
  return input.gradeBand === "GRADE_5_6" && !input.hasSubmittedFirstProject;
}

export function buildStudentNavItems(input: {
  gradeBand: GradeBand | null | undefined;
  hasSubmittedFirstProject: boolean;
  currentProjectHref: string;
}) {
  if (shouldUseReducedStudentNav(input)) {
    return [
      { href: "/", label: "Home", icon: "Home" as const },
      { href: "/start", label: "Start", icon: "Compass" as const },
      {
        href: input.currentProjectHref,
        label: "Current project",
        icon: "FolderKanban" as const
      },
      { href: "/students/me", label: "My work", icon: "FolderKanban" as const },
      { href: "/news", label: "News", icon: "Newspaper" as const }
    ];
  }

  return fullStudentNavItems;
}
