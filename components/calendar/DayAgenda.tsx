import { StyleSheet, Text, View } from "react-native";
import type { Occurrence } from "@/lib/recurrence";
import type { CalendarEvent } from "@/hooks/useEvents";
import type { FamilyMember } from "@/hooks/useFamilyMembers";
import type { HolidayMarker } from "@/lib/holidayMarkers";
import { EventRow } from "@/components/calendar/EventRow";
import { colors, radii, spacing } from "@/lib/theme";

type Props = {
  date: Date;
  occurrences: Occurrence<CalendarEvent>[];
  members: FamilyMember[];
  holiday?: HolidayMarker;
  onDeleteEvent: (id: string) => void;
};

export function DayAgenda({ date, occurrences, members, holiday, onDeleteEvent }: Props) {
  return (
    <View>
      <Text style={styles.heading}>
        {date.toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" })}
      </Text>
      {holiday && (
        <View style={[styles.holidayBanner, { backgroundColor: `${holiday.color}22` }]}>
          <View style={[styles.holidayDot, { backgroundColor: holiday.color }]} />
          <Text style={[styles.holidayText, { color: holiday.color }]}>{holiday.name}</Text>
        </View>
      )}
      {occurrences.length === 0 ? (
        <Text style={styles.emptyText}>No events</Text>
      ) : (
        occurrences.map((occ) => (
          <EventRow
            key={occ.key}
            event={occ.event}
            startAt={occ.startAt}
            members={members}
            onDelete={() => onDeleteEvent(occ.event.id)}
          />
        ))
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  heading: {
    fontSize: 15,
    fontWeight: "700",
    color: colors.text,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
  },
  holidayBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm - 2,
    borderRadius: radii.md,
  },
  holidayDot: { width: 8, height: 8, borderRadius: radii.pill },
  holidayText: { fontSize: 13, fontWeight: "700" },
  emptyText: { fontSize: 14, color: colors.textFaint, paddingHorizontal: spacing.lg, paddingBottom: spacing.lg },
});
