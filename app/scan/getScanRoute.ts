export type ScanTier = "free" | "club" | "vip";

export function mapSubscriptionTier(rawValue: unknown): ScanTier {
  const value = String(rawValue ?? "").trim().toLowerCase();

  if (value === "pro") return "vip";
  if (value === "plus") return "club";
  return "free";
}

export function getScanRouteForTier(tier: ScanTier): string {
  if (tier === "vip") return "/scan/vip-member";
  if (tier === "club") return "/scan/club-member";
  return "/scan/member";
}
