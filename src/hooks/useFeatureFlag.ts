import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { PLAN_FEATURES, PlanTier } from '@/lib/planFeatures';
import { getEffectiveTier } from '@/lib/license';

export function useFeatureFlag(featureKey: string): boolean {
  const settings = useLiveQuery(() => db.storeSettings.toArray());
  const planTier = getEffectiveTier(settings?.[0]) as PlanTier;
  return PLAN_FEATURES[planTier]?.[featureKey] ?? false;
}
