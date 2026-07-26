import type { Profile } from "@/hooks/useProfile";

// Drives every "New" badge in the app (Calendar/Todo/Groceries rows) off the
// same signal as Home's What's New feed, so clearing that section clears
// the badges everywhere else too — never shown for your own items.
export function isNewItem(createdAt: string, createdBy: string, profile: Profile | null): boolean {
  if (!profile) return false;
  if (createdBy === profile.id) return false;
  return new Date(createdAt) > new Date(profile.last_seen_activity_at);
}
