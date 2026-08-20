import type { Role } from "./types";

export interface NavItem {
  label: string;
  href: string;
  icon: string;
  exact?: boolean;
  badgeKey?: "applicants" | "applications" | "messages";
}

export interface NavGroup {
  title?: string;
  items: NavItem[];
}

/* ============================================================================
   SIDEBAR NAVIGATION (§4.2) — exact items, order and icons
   ========================================================================= */

export const ADMIN_NAV: NavGroup[] = [
  {
    items: [
      { label: "Dashboard", href: "/admin/dashboard", icon: "LayoutDashboard" },
      { label: "Users Management", href: "/admin/users", icon: "Users" },
      { label: "Freelancers Profile", href: "/admin/freelancers", icon: "UserCircle" },
      { label: "Companies List", href: "/admin/companies", icon: "Building" },
      { label: "Projects Monitor", href: "/admin/projects", icon: "Briefcase" },
      { label: "Moderate Reviews", href: "/admin/reviews", icon: "Star" },
      { label: "System Settings", href: "/admin/settings", icon: "Settings" },
    ],
  },
];

export const COMPANY_NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/company/dashboard", icon: "LayoutDashboard" },
      { label: "My Profile", href: "/company/profile", icon: "Building2" },
    ],
  },
  {
    title: "Hiring",
    items: [
      { label: "My Projects", href: "/company/projects", icon: "Briefcase", exact: true },
      { label: "Post New Project", href: "/company/projects/new", icon: "PlusCircle" },
      {
        label: "Review Applicants",
        href: "/company/applicants",
        icon: "ClipboardList",
        badgeKey: "applicants",
      },
      { label: "Search Freelancers", href: "/company/freelancers", icon: "Search" },
    ],
  },
  {
    title: "Delivery",
    items: [
      { label: "Project Workspace", href: "/company/workspace", icon: "LayoutGrid" },
      { label: "Freelancer Reviews", href: "/company/reviews", icon: "Star" },
    ],
  },
];

export const FREELANCER_NAV: NavGroup[] = [
  {
    title: "Overview",
    items: [
      { label: "Dashboard", href: "/freelancer/dashboard", icon: "LayoutDashboard" },
      { label: "My Profile", href: "/freelancer/profile", icon: "UserCircle" },
    ],
  },
  {
    title: "Find work",
    items: [
      { label: "Browse Projects", href: "/freelancer/projects", icon: "Search" },
      {
        label: "Track Applications",
        href: "/freelancer/applications",
        icon: "ClipboardList",
        badgeKey: "applications",
      },
    ],
  },
  {
    title: "Deliver",
    items: [
      { label: "Project Workspace", href: "/freelancer/workspace", icon: "LayoutGrid" },
      { label: "Completed Projects", href: "/freelancer/completed-projects", icon: "CheckCircle2" },
      { label: "My Certificates", href: "/freelancer/certificates", icon: "Award" },
      { label: "My Ratings & Reviews", href: "/freelancer/reviews", icon: "Star" },
    ],
  },
];

export function navForRole(role: Role): NavGroup[] {
  if (role === "ADMIN") return ADMIN_NAV;
  if (role === "COMPANY") return COMPANY_NAV;
  return FREELANCER_NAV;
}

export function homeForRole(role: Role) {
  if (role === "ADMIN") return "/admin/dashboard";
  if (role === "COMPANY") return "/company/dashboard";
  return "/freelancer/dashboard";
}

export function primaryActionForRole(role: Role): { label: string; href: string; icon: string } | null {
  if (role === "COMPANY")
    return { label: "Post New Project", href: "/company/projects/new", icon: "Plus" };
  if (role === "FREELANCER")
    return { label: "Browse Projects", href: "/freelancer/projects", icon: "Search" };
  return null;
}

/** Active state rule (§4.2): exact → equality, otherwise prefix match. */
export function isActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

/* ============================================================================
   PUBLIC NAVBAR (§4.3)
   ========================================================================= */

export const MARKETING_NAV = [
  { label: "Find Work", href: "/discover/projects" },
  { label: "Hire Talent", href: "/discover/talent" },
  { label: "Companies", href: "/discover/companies" },
  { label: "Features", href: "/features" },
  { label: "Pricing", href: "/pricing" },
  { label: "About", href: "/about" },
];

export const FOOTER_NAV: { title: string; links: { label: string; href: string }[] }[] = [
  {
    title: "For Talent",
    links: [
      { label: "Browse Projects", href: "/discover/projects" },
      { label: "Create a Profile", href: "/register?role=FREELANCER" },
      { label: "Certificates", href: "/verify" },
      { label: "Success Stories", href: "/about#stories" },
    ],
  },
  {
    title: "For Companies",
    links: [
      { label: "Post a Project", href: "/register?role=COMPANY" },
      { label: "Search Talent", href: "/discover/talent" },
      { label: "Pricing", href: "/pricing" },
      { label: "Enterprise", href: "/contact" },
    ],
  },
  {
    title: "Product",
    links: [
      { label: "Features", href: "/features" },
      { label: "Workspace", href: "/features#workspace" },
      { label: "Payments & Escrow", href: "/features#payments" },
      { label: "Verify a Certificate", href: "/verify" },
    ],
  },
  {
    title: "Company",
    links: [
      { label: "About", href: "/about" },
      { label: "Contact", href: "/contact" },
      { label: "Help Centre", href: "/help" },
      { label: "Trust & Safety", href: "/trust" },
    ],
  },
];
