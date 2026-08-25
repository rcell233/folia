import { Subscription, SubscriptionPlan } from '@/application/types';

const PRO_ACCESS_PLANS = new Set([SubscriptionPlan.Pro, SubscriptionPlan.Team]);

/**
 * Folia is distributed exclusively as a self-hosted application. Keep this
 * compatibility helper for the upstream feature gates, but never enable
 * hosted billing or plan restrictions in the Folia Web client.
 */
export function isHostedBillingEnabled(): boolean {
  return false;
}

export function hasProAccessFromPlans(plans?: SubscriptionPlan[] | null): boolean {
  if (!plans || plans.length === 0) return false;
  return plans.some((plan) => PRO_ACCESS_PLANS.has(plan));
}

export function getProAccessPlanFromSubscriptions(subscriptions?: Subscription[] | null): SubscriptionPlan {
  if (!subscriptions || subscriptions.length === 0) return SubscriptionPlan.Free;
  return subscriptions.some((subscription) => PRO_ACCESS_PLANS.has(subscription.plan))
    ? SubscriptionPlan.Pro
    : SubscriptionPlan.Free;
}
