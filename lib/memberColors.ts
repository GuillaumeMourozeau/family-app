import { colors } from "@/lib/theme";

// Selectable in settings, and used as the hash-fallback palette for members
// who haven't picked a custom color yet.
export const MEMBER_COLOR_PALETTE = [
  colors.purple,
  colors.blue,
  colors.gold,
  colors.green,
  colors.primary,
  colors.primaryDark,
];

// Used for "whole family" events and "unassigned" to-dos — deliberately not
// part of the member palette, so it never gets confused with a real person.
export const NEUTRAL_COLOR = "#000000";

// Hashes the member's id so the same person always gets the same fallback
// color on every device, regardless of fetch order (profiles query has no
// ORDER BY), until they pick a custom one.
function hashColor(memberId: string): string {
  let hash = 0;
  for (let i = 0; i < memberId.length; i++) {
    hash = (hash * 31 + memberId.charCodeAt(i)) & 0xffffffff;
  }
  const index = Math.abs(hash) % MEMBER_COLOR_PALETTE.length;
  return MEMBER_COLOR_PALETTE[index];
}

export function getMemberColor(member: { id: string; color?: string | null }): string {
  return member.color || hashColor(member.id);
}

export function getMemberColorById(memberId: string, members: { id: string; color?: string | null }[]): string {
  const member = members.find((m) => m.id === memberId);
  return member ? getMemberColor(member) : hashColor(memberId);
}

// Whole-family events get the neutral color; events tied to specific members
// get each participant's color (deduped, capped for display).
export function getEventDotColors(
  event: { applies_to_whole_family: boolean; participant_ids: string[] },
  members: { id: string; color?: string | null }[],
  maxDots = 3
): string[] {
  if (event.applies_to_whole_family) return [NEUTRAL_COLOR];
  const unique = Array.from(new Set(event.participant_ids.map((id) => getMemberColorById(id, members))));
  return unique.slice(0, maxDots);
}

export function getTodoAssigneeColor(
  assignedTo: string | null,
  members: { id: string; color?: string | null }[]
): string {
  return assignedTo ? getMemberColorById(assignedTo, members) : NEUTRAL_COLOR;
}
