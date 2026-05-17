/*
 * SERVER-ONLY: Feature flag gate.
 * Import only in API routes and server components.
 */

import { NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Checks if a specific feature is enabled for a given tenant.
 * Uses a service role client to bypass RLS for administrative feature checks.
 */
export async function checkFeatureEnabled(
  tenantId: string,
  featureKey: string
): Promise<boolean> {
  const supabaseAdmin = createAdminClient();
  
  // Validate input
  if (!tenantId || !featureKey) {
    console.error('[FEATURE GATE] Missing tenantId or featureKey');
    return false;
  }

  const { data, error } = await supabaseAdmin
    .rpc('is_feature_enabled', {
      p_tenant_id: tenantId,
      p_feature: featureKey
    });

  if (error) {
    console.error('[FEATURE GATE ERROR]', {
      tenantId,
      featureKey,
      error: error.message,
      code: error.code
    });
    return false;
  }

  const isEnabled = data === true;
  
  if (!isEnabled) {
    console.warn(`[FEATURE GATE] Feature '${featureKey}' is DISABLED for tenant '${tenantId}'`);
  }

  return isEnabled;
}

/**
 * Standard error response for disabled features.
 */
export function featureDisabledResponse(): NextResponse {
  return NextResponse.json(
    {
      error: 'This feature is not enabled for your plan.',
      code: 'FEATURE_DISABLED'
    },
    { status: 403 }
  );
}
