import {
  LayoutDashboard,
  BarChart3,
  Users,
  QrCode,
  Dumbbell,
  UserCheck,
  CreditCard,
  Clock,
  Repeat,
  CalendarClock,
  CalendarX2,
  Package,
  Landmark,
  Apple,
  ClipboardList,
  Settings,
  ShieldCheck,
  Briefcase,
  CalendarDays,
  FileSpreadsheet,
  type LucideIcon,
} from "lucide-react";

export type SidebarNavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  /** Hidden from non-owners (financial/reporting pages). */
  ownerOnly?: boolean;
  /** Hidden from Staff; visible to Owner and Admin. */
  ownerOrAdminOnly?: boolean;
  /** Hidden unless role can log payments. */
  requiresLogPayments?: boolean;
};

export type SidebarNavSection = {
  id: string;
  label: string;
  items: SidebarNavItem[];
};

export const SIDEBAR_FOOTER_ITEM: SidebarNavItem = {
  href: "/settings",
  label: "Settings",
  icon: Settings,
};

export const SIDEBAR_SECTIONS: SidebarNavSection[] = [
  {
    id: "overview",
    label: "Overview",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      {
        href: "/analytics",
        label: "Analytics",
        icon: BarChart3,
        ownerOnly: true,
      },
    ],
  },
  {
    id: "members",
    label: "Members",
    items: [
      { href: "/members", label: "All Members", icon: Users },
      { href: "/members/register-qr", label: "Register (QR)", icon: QrCode },
      { href: "/members/pt", label: "PT Members", icon: Dumbbell },
      { href: "/members/visitors", label: "Visitors", icon: UserCheck },
    ],
  },
  {
    id: "finance",
    label: "Finance",
    items: [
      {
        href: "/payments",
        label: "Payments",
        icon: CreditCard,
        requiresLogPayments: true,
      },
      { href: "/finance/pending-dues", label: "Pending Dues", icon: Clock, requiresLogPayments: true },
      {
        href: "/finance/subscriptions",
        label: "Subscriptions",
        icon: Repeat,
      },
      {
        href: "/renewals",
        label: "Upcoming Renewals",
        icon: CalendarClock,
      },
      {
        href: "/expired",
        label: "Expired Memberships",
        icon: CalendarX2,
      },
      { href: "/packages", label: "Packages", icon: Package },
      {
        href: "/finance/accounts",
        label: "Accounts & Finance",
        icon: Landmark,
        ownerOnly: true,
      },
    ],
  },
  {
    id: "programmes",
    label: "Programmes",
    items: [
      { href: "/programmes/diet", label: "Diet Plans", icon: Apple },
      {
        href: "/programmes/workout",
        label: "Workout Plans",
        icon: ClipboardList,
      },
    ],
  },
  {
    id: "operations",
    label: "Operations",
    items: [
      {
        href: "/operations/admins",
        label: "Admins",
        icon: ShieldCheck,
        ownerOnly: true,
      },
      {
        href: "/operations/employees",
        label: "Employees",
        icon: Briefcase,
        ownerOrAdminOnly: true,
      },
      {
        href: "/operations/events",
        label: "Events",
        icon: CalendarDays,
      },
      {
        href: "/operations/reports",
        label: "Reports",
        icon: FileSpreadsheet,
        ownerOrAdminOnly: true,
      },
    ],
  },
];

export function isNavItemVisible(
  item: SidebarNavItem,
  isOwner: boolean,
  canLogPayments: boolean,
  isOwnerOrAdmin: boolean,
): boolean {
  if (item.ownerOnly && !isOwner) return false;
  if (item.ownerOrAdminOnly && !isOwnerOrAdmin) return false;
  if (item.requiresLogPayments && !canLogPayments) return false;
  return true;
}

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname === href || pathname.startsWith(`${href}/`);
}

/** Prefer the longest matching href so /members/pt highlights PT Members, not All Members. */
export function getActiveNavHref(
  pathname: string,
  items: SidebarNavItem[],
): string | null {
  const match = items
    .filter((item) => isNavItemActive(pathname, item.href))
    .sort((a, b) => b.href.length - a.href.length)[0];
  return match?.href ?? null;
}
