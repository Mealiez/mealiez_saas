import { UserRole } from '@/lib/auth/roles';

/*
 * Dashboard Module Configuration
 * Centralized definition of cards, roles, and feature requirements.
 */

export type CardSize = 'normal' | 'wide' | 'compact';

export type ModuleCard = {
  id: string;
  title: string;
  description: string;
  href: string;
  icon: string;

  requiredFeature: string | null;
  // null = always show regardless of feature flags
  // string = feature_key must be enabled in tenant_features

  allowedRoles: UserRole[];
  // roles that can SEE this card
  // empty array = no one sees it (disabled)

  manageRoles: UserRole[];
  // roles that see the "Manage" action
  // others see "View" action only

  badge: string | null;
  // optional badge text e.g. "New" | "Beta" | null

  size: CardSize;
};

export const MODULE_CARDS: ModuleCard[] = [
  {
    id: 'users',
    title: 'User Management',
    description: 'Invite staff, assign roles and manage your team.',
    href: '/users',
    icon: '\uD83D\uDC65',
    requiredFeature: null,
    // user management is always available
    allowedRoles: ['admin'], // ← UPDATED: owner removed
    manageRoles: ['admin'],
    badge: null,
    size: 'normal',
  },
  {
    id: 'meals',
    title: 'Meal Management',
    description: 'Plan menus, create weekly schedules and manage daily meals.',
    href: '/meals',
    icon: '\uD83C\uDF7D\uFE0F',
    requiredFeature: 'meal_management',
    allowedRoles: ['admin', 'manager', 'member'],
    manageRoles: ['admin', 'manager'],
    badge: null,
    size: 'normal',
  },
  {
    id: 'attendance',
    title: 'Attendance',
    description: 'Create QR sessions and track daily meal attendance.',
    href: '/attendance',
    icon: '\u2705',
    requiredFeature: 'attendance_tracking',
    allowedRoles: ['admin', 'manager', 'member'],
    manageRoles: ['admin', 'manager'],
    badge: null,
    size: 'normal',
  },
  {
    id: 'inventory',
    title: 'Inventory',
    description: 'Manage ingredients, stock levels and supplier orders.',
    href: '/inventory',
    icon: '\uD83D\uDCE6',
    requiredFeature: 'inventory_management',
    allowedRoles: ['admin', 'manager'],
    manageRoles: ['admin', 'manager'],
    badge: 'Beta',
    size: 'normal',
  },
  {
    id: 'reports',
    title: 'Reports',
    description: 'Analytics, attendance summaries and custom exports.',
    href: '/reports',
    icon: '\uD83D\uDCCA',
    requiredFeature: 'custom_reports',
    allowedRoles: ['admin'], // ← UPDATED: owner removed
    manageRoles: ['admin'],
    badge: null,
    size: 'normal',
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'Tenant configuration, billing and feature management.',
    href: '/settings',
    icon: '\u2699\uFE0F',
    requiredFeature: null,
    allowedRoles: ['admin'],
    // settings visible to admin only
    manageRoles: ['admin'],
    badge: null,
    size: 'normal',
  },
  {
    id: 'billing',
    title: 'Billing',
    description: 'Manage your subscription plan and payment details.',
    href: '/billing',
    icon: '\uD83D\uDCB3',
    requiredFeature: 'billing',
    allowedRoles: ['admin'], // ← UPDATED: owner removed
    manageRoles: ['admin'],
    badge: null,
    size: 'normal',
  },
  {
    id: 'branches',
    title: 'Branch Management',
    description: 'Manage multiple mess locations, assign staff and view local analytics.',
    href: '/branches',
    icon: '\uD83C\uDFE2',
    requiredFeature: 'branch_management',
    allowedRoles: ['admin'],
    manageRoles: ['admin'],
    badge: 'New',
    size: 'normal',
  },
];

export function getVisibleCards(
  userRole: UserRole,
  enabledFeatures: string[]
): ModuleCard[] {
  return MODULE_CARDS.filter((card) => {
    // Check 1: Role must be in allowedRoles
    if (!card.allowedRoles.includes(userRole)) {
      return false;
    }

    // Check 2: Feature flag must be enabled
    // (if card requires a feature)
    if (
      card.requiredFeature !== null &&
      !enabledFeatures.includes(card.requiredFeature)
    ) {
      return false;
    }

    return true;
  });
}

export function canManageCard(card: ModuleCard, userRole: UserRole): boolean {
  return card.manageRoles.includes(userRole);
}
