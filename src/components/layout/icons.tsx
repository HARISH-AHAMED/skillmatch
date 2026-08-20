import {
  Archive,
  Award,
  Briefcase,
  Building,
  Building2,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  Plus,
  PlusCircle,
  Search,
  Settings,
  Sparkles,
  Star,
  UserCircle,
  Users,
  type LucideIcon,
} from "lucide-react";

export const ICONS: Record<string, LucideIcon> = {
  Archive,
  Award,
  Briefcase,
  Building,
  Building2,
  CalendarClock,
  CheckCircle2,
  CheckSquare,
  ClipboardList,
  LayoutDashboard,
  LayoutGrid,
  MessageSquare,
  Plus,
  PlusCircle,
  Search,
  Settings,
  Sparkles,
  Star,
  UserCircle,
  Users,
};

export function icon(name: string): LucideIcon {
  return ICONS[name] ?? LayoutDashboard;
}

/**
 * Renders a nav icon by name. Defined once at module scope so no component is
 * ever created during render.
 */
export function NavIcon({ name, className }: { name: string; className?: string }) {
  const Icon = ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} />;
}
