"use client"

/*
 * CLIENT-SIDE AUTH HELPER
 * Safe to use in client components and all mobile routes.
 * Reads session from browser storage via Supabase client.
 */

import { createClient } from '@/lib/supabase/client'
import type { AuthUser } from './roles'
export type { AuthUser }
import type { Session } from '@supabase/supabase-js'

/**
 * getClientSession()
 * Reads session from browser storage. Fast and safe for mobile.
 */
export async function getClientSession() {
  const supabase = createClient()
  const { data: { session } } = await supabase.auth.getSession()
  return session
}

/**
 * getClientUser()
 * Assembles the full user profile with tenant context from browser storage and public.users.
 */
export async function getClientUser(): Promise<AuthUser | null> {
  const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;

  if (isOffline && typeof window !== 'undefined') {
    const cachedUser = localStorage.getItem('mealiez_auth_user');
    if (cachedUser) {
      try {
        return JSON.parse(cachedUser);
      } catch (e) {
        console.error('Error parsing cached user', e);
      }
    }
  }

  const session = await getClientSession().catch(() => null);
  if (!session) {
    if (typeof window !== 'undefined') {
      const cachedUser = localStorage.getItem('mealiez_auth_user');
      if (cachedUser) {
        try {
          return JSON.parse(cachedUser);
        } catch (e) {}
      }
    }
    return null;
  }

  const { user } = session;
  const tenant_id = user.app_metadata?.tenant_id as string | undefined;
  const role = user.app_metadata?.role as AuthUser['role'] | undefined;

  if (!tenant_id) return null;

  const supabase = createClient();
  const { data: profile, error } = await supabase
    .from('users')
    .select('id, full_name, is_active, role, branch_id, avatar_url')
    .eq('auth_id', user.id)
    .single();

  if (error || !profile || profile.is_active === false) {
    if (typeof window !== 'undefined') {
      const cachedUser = localStorage.getItem('mealiez_auth_user');
      if (cachedUser) {
        try {
          const parsed = JSON.parse(cachedUser);
          if (parsed.auth_id === user.id) {
            return parsed;
          }
        } catch (e) {}
      }
    }
    return null;
  }

  let finalRole = (profile.role || role || 'member') as string;
  if (finalRole === 'owner') finalRole = 'admin';

  const authUser: AuthUser = {
    id: profile.id,
    auth_id: user.id,
    tenant_id,
    role: finalRole as AuthUser['role'],
    full_name: profile.full_name,
    email: user.email!,
    is_active: profile.is_active,
    branch_id: profile.branch_id,
    avatar_url: profile.avatar_url
  };

  if (typeof window !== 'undefined') {
    localStorage.setItem('mealiez_auth_user', JSON.stringify(authUser));
  }

  return authUser;
}

/**
 * signOut()
 * Clears browser session and signs out the user.
 */
export async function signOut() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('mealiez_auth_user');
    localStorage.removeItem('mealiez_attendance_logs');
    localStorage.removeItem('mealiez_meal_requests');
    localStorage.removeItem('mealiez_meals_today');
    localStorage.removeItem('mealiez_meals_today_date');
    localStorage.removeItem('mealiez_member_qr');
    localStorage.removeItem('mealiez_active_sessions');
  }
  const supabase = createClient();
  const { error } = await supabase.auth.signOut();
  return { error };
}

/**
 * onAuthStateChange()
 * Subscribes to authentication state changes.
 */
export function onAuthStateChange(
  callback: (event: string, session: Session | null) => void
) {
  const supabase = createClient()
  const { data: { subscription } } = supabase.auth.onAuthStateChange(callback)
  return subscription
}
