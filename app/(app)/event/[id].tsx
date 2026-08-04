import { useEffect, useState } from "react";
import { Alert, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View } from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import DateTimePicker from "@react-native-community/datetimepicker";
import { Ionicons } from "@expo/vector-icons";
import { useEvents, type RecurrenceInput } from "@/hooks/useEvents";
import { useFamilyMembers } from "@/hooks/useFamilyMembers";
import { useProfile } from "@/hooks/useProfile";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { FieldLabel } from "@/components/FieldLabel";
import { RecurrencePicker } from "@/components/RecurrencePicker";
import { EventReminderPicker } from "@/components/EventReminderPicker";
import { ForWhoPicker } from "@/components/calendar/ForWhoPicker";
import { colors, radii, sectionColors, spacing } from "@/lib/theme";

export default function EventDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { events, updateEvent, deleteEvent } = useEvents();
  const { members } = useFamilyMembers();
  const { profile } = useProfile();

  const event = events.find((e) => e.id === id);
  const isCreator = !!event && event.created_by === profile?.id;
  const creator = event ? members.find((m) => m.id === event.created_by) : undefined;

  const [title, setTitle] = useState("");
  const [date, setDate] = useState(new Date());
  const [allDay, setAllDay] = useState(false);
  const [appliesToWholeFamily, setAppliesToWholeFamily] = useState(true);
  const [participantIds, setParticipantIds] = useState<string[]>([]);
  const [location, setLocation] = useState("");
  const [details, setDetails] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);
  const [recurrence, setRecurrence] = useState<RecurrenceInput>(null);
  const [reminderOffsets, setReminderOffsets] = useState<number[]>([]);
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setDate(new Date(event.start_at));
    setAllDay(event.all_day);
    setAppliesToWholeFamily(event.applies_to_whole_family);
    setParticipantIds(event.participant_ids);
    setLocation(event.location ?? "");
    setDetails(event.description ?? "");
    setIsPrivate(event.is_private);
    setReminderOffsets(event.reminder_offsets_minutes ?? []);
    setRecurrence(
      event.recurrence_freq
        ? {
            freq: event.recurrence_freq,
            interval: event.recurrence_interval,
            daysOfWeek: event.recurrence_days_of_week,
            endType: event.recurrence_end_type ?? "never",
            endDate: event.recurrence_end_date ? new Date(event.recurrence_end_date) : null,
            count: event.recurrence_count,
          }
        : null
    );
  }, [event?.id]);

  async function handleSave() {
    if (!event || !title.trim()) return;
    setIsSaving(true);
    await updateEvent(event.id, {
      title: title.trim(),
      startAt: date,
      allDay,
      appliesToWholeFamily,
      participantIds,
      description: details.trim() || null,
      location: location.trim() || null,
      isPrivate,
      recurrence,
      reminderOffsetsMinutes: reminderOffsets,
    });
    setIsSaving(false);
    router.back();
  }

  function handleDelete() {
    if (!event) return;
    Alert.alert("Delete event?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => {
          deleteEvent(event.id);
          router.back();
        },
      },
    ]);
  }

  if (!event) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()}>
            <Ionicons name="chevron-back" size={24} color={colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Event</Text>
          <View style={styles.headerSpacer} />
        </View>
        <View style={styles.center}>
          <Text style={styles.emptyText}>Event not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Ionicons name="chevron-back" size={24} color={colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Edit Event</Text>
        <TouchableOpacity onPress={handleDelete}>
          <Ionicons name="trash-outline" size={22} color={colors.danger} />
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        <FieldLabel icon="create-outline" label="Title" />
        <TextField placeholder="Event title" value={title} onChangeText={setTitle} />
        <Text style={styles.creatorText}>Added by {isCreator ? "you" : creator?.full_name ?? "a family member"}</Text>

        <View style={styles.switchRow}>
          <FieldLabel icon="sunny-outline" label="All day" />
          <Switch value={allDay} onValueChange={setAllDay} trackColor={{ false: colors.border, true: sectionColors.calendar }} />
        </View>

        <View style={styles.dateRow}>
          <TouchableOpacity style={styles.dateButton} onPress={() => setShowDatePicker(true)}>
            <Ionicons name="calendar-outline" size={15} color={sectionColors.calendar} />
            <Text style={styles.dateButtonText}>{date.toLocaleDateString()}</Text>
          </TouchableOpacity>
          {!allDay && (
            <TouchableOpacity style={styles.dateButton} onPress={() => setShowTimePicker(true)}>
              <Ionicons name="time-outline" size={15} color={sectionColors.calendar} />
              <Text style={styles.dateButtonText}>
                {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
              </Text>
            </TouchableOpacity>
          )}
        </View>
        {showDatePicker && (
          <DateTimePicker
            value={date}
            mode="date"
            display="default"
            onChange={(_, selected) => {
              setShowDatePicker(false);
              if (selected) {
                const next = new Date(date);
                next.setFullYear(selected.getFullYear(), selected.getMonth(), selected.getDate());
                setDate(next);
              }
            }}
          />
        )}
        {showTimePicker && (
          <DateTimePicker
            value={date}
            mode="time"
            display="default"
            onChange={(_, selected) => {
              setShowTimePicker(false);
              if (selected) {
                const next = new Date(date);
                next.setHours(selected.getHours(), selected.getMinutes());
                setDate(next);
              }
            }}
          />
        )}

        <FieldLabel icon="location-outline" label="Location" />
        <TextField placeholder="Where is it?" value={location} onChangeText={setLocation} />

        <RecurrencePicker value={recurrence} onChange={setRecurrence} tint={sectionColors.calendar} />

        <ForWhoPicker
          members={members}
          appliesToWholeFamily={appliesToWholeFamily}
          participantIds={participantIds}
          onChange={(next) => {
            setAppliesToWholeFamily(next.appliesToWholeFamily);
            setParticipantIds(next.participantIds);
          }}
        />

        <EventReminderPicker value={reminderOffsets} onChange={setReminderOffsets} tint={sectionColors.calendar} />

        {isCreator && (
          <View style={styles.switchRow}>
            <FieldLabel icon="lock-closed-outline" label="Keep it private" />
            <Switch
              value={isPrivate}
              onValueChange={setIsPrivate}
              trackColor={{ false: colors.border, true: sectionColors.calendar }}
            />
          </View>
        )}

        <FieldLabel icon="document-text-outline" label="More details" />
        <TextField
          placeholder="Notes, what to bring, etc."
          value={details}
          onChangeText={setDetails}
          multiline
          style={styles.detailsInput}
        />

        <Button label="Save" onPress={handleSave} loading={isSaving} style={styles.saveButton} />
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingTop: 56,
    paddingBottom: spacing.md,
  },
  headerTitle: { fontSize: 18, fontWeight: "800", color: colors.text },
  headerSpacer: { width: 24 },
  content: { padding: spacing.lg, paddingBottom: 40, gap: spacing.sm },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.sm },
  creatorText: { fontSize: 12, color: colors.textFaint },
  switchRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: spacing.xs },
  dateRow: { flexDirection: "row", gap: spacing.sm },
  dateButton: {
    flex: 1,
    flexDirection: "row",
    gap: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    padding: spacing.md,
    alignItems: "center",
    justifyContent: "center",
  },
  dateButtonText: { fontSize: 15, fontWeight: "600", color: colors.text },
  detailsInput: { minHeight: 90, textAlignVertical: "top" },
  saveButton: { marginTop: spacing.lg, backgroundColor: sectionColors.calendar },
  emptyText: { color: colors.textMuted },
});
