import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '@/lib/db';
import { PLAN_FEATURES, PlanTier } from '@/lib/planFeatures';

export function useFeatureFlag(featureKey: string): boolean {
  const settings = useLiveQuery(() => db.storeSettings.toArray());
  const planTier = (settings?.[0]?.planTier ?? 'LITE') as PlanTier;
  return PLAN_FEATURES[planTier]?.[featureKey] ?? false;
}
