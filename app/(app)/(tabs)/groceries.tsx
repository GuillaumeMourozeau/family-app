import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useGroceries, type GroceryItem, type GroceryPlace } from "@/hooks/useGroceries";
import { displayPlaceName } from "@/lib/groceryPlaces";
import { GROCERY_STORE_ICONS } from "@/lib/groceryStoreIcons";
import { useProfile } from "@/hooks/useProfile";
import { isNewItem } from "@/lib/newBadge";
import { TabScreenHeader } from "@/components/TabScreenHeader";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ModalTitle } from "@/components/ModalTitle";
import { FieldLabel } from "@/components/FieldLabel";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { colors, radii, sectionColors, sectionTints, spacing } from "@/lib/theme";

export default function GroceriesScreen() {
  const { t } = useTranslation();
  const {
    items,
    places,
    defaultPlace,
    isLoading,
    addPlace,
    updatePlaceIcon,
    renamePlace,
    deletePlace,
    addItem,
    toggleItem,
    deleteItem,
    removeFromList,
    clearChecked,
    getHistoryForPlace,
  } = useGroceries();

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addingPlace, setAddingPlace] = useState<GroceryPlace | null>(null);
  const [placeItemName, setPlaceItemName] = useState("");

  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");

  const [editingPlace, setEditingPlace] = useState<GroceryPlace | null>(null);
  const [editPlaceName, setEditPlaceName] = useState("");
  const [isPickingIcon, setIsPickingIcon] = useState(false);

  const sortedPlaces = useMemo(
    () => [...places].sort((a, b) => (a.is_default ? -1 : b.is_default ? 1 : 0)),
    [places]
  );

  const grouped = useMemo(() => {
    const byPlace = new Map<string, GroceryItem[]>();
    for (const item of items) {
      const key = item.category_id ?? defaultPlace?.id ?? "";
      const list = byPlace.get(key) ?? [];
      list.push(item);
      byPlace.set(key, list);
    }
    return byPlace;
  }, [items, defaultPlace]);

  const hasChecked = items.some((i) => i.is_checked);

  function openGlobalAdd() {
    setPlaceId(defaultPlace?.id ?? null);
    setIsAdding(true);
  }

  async function handleAddItem(itemName?: string) {
    const finalName = (itemName ?? name).trim();
    if (!finalName || isSubmitting) return;
    setIsSubmitting(true);
    const result = await addItem(finalName, placeId);
    setIsSubmitting(false);
    if (result?.error) {
      Alert.alert(t("groceries.couldntAddItem"), result.error);
      return;
    }
    setName("");
    setPlaceId(defaultPlace?.id ?? null);
    setIsAdding(false);
  }

  async function handleAddToPlace(itemName?: string) {
    if (!addingPlace || isSubmitting) return;
    const finalName = (itemName ?? placeItemName).trim();
    if (!finalName) return;
    setIsSubmitting(true);
    const result = await addItem(finalName, addingPlace.id);
    setIsSubmitting(false);
    if (result?.error) {
      Alert.alert(t("groceries.couldntAddItem"), result.error);
      return;
    }
    setPlaceItemName("");
    setAddingPlace(null);
  }

  async function handleCreatePlace() {
    if (!newPlaceName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    await addPlace(newPlaceName.trim());
    setIsSubmitting(false);
    setNewPlaceName("");
    setIsAddingPlace(false);
  }

  function openEditPlace(place: GroceryPlace) {
    setAddingPlace(null);
    setEditPlaceName(displayPlaceName(place, t));
    setEditingPlace(place);
  }

  async function handleSavePlaceName() {
    if (!editingPlace || !editPlaceName.trim()) return;
    const result = await renamePlace(editingPlace.id, editPlaceName.trim());
    if (result?.error) {
      Alert.alert(t("groceries.couldntRenamePlace"), result.error);
      return;
    }
    setEditingPlace(null);
  }

  function handleSelectIcon(icon: (typeof GROCERY_STORE_ICONS)[number]) {
    if (!editingPlace) return;
    updatePlaceIcon(editingPlace.id, icon);
    setEditingPlace({ ...editingPlace, icon });
    setIsPickingIcon(false);
  }

  function handleRemoveHistoryEntry(entry: { id: string; name: string }) {
    const isStillActive = items.some((i) => i.id === entry.id);
    if (!isStillActive) {
      deleteItem(entry.id);
      return;
    }
    Alert.alert(t("groceries.removeItemTitle", { name: entry.name }), t("groceries.removeItemMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      { text: t("common.remove"), style: "destructive", onPress: () => deleteItem(entry.id) },
    ]);
  }

  function handleDeletePlace() {
    if (!editingPlace) return;
    Alert.alert(t("groceries.deletePlaceTitle"), t("groceries.deletePlaceMessage"), [
      { text: t("common.cancel"), style: "cancel" },
      {
        text: t("common.delete"),
        style: "destructive",
        onPress: async () => {
          const result = await deletePlace(editingPlace.id);
          if (result?.error) {
            Alert.alert(t("groceries.couldntDeletePlace"), result.error);
            return;
          }
          setEditingPlace(null);
        },
      },
    ]);
  }

  if (isLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TabScreenHeader
        title={t("groceries.tabTitle")}
        icon="cart"
        tint={sectionColors.groceries}
        tintBackground={sectionTints.groceries}
        actionLabel={t("groceries.addItemAction")}
        onAction={openGlobalAdd}
      />

      <FlatList
        data={sortedPlaces}
        keyExtractor={(c) => c.id}
        contentContainerStyle={styles.listContent}
        ListFooterComponent={
          <View>
            <TouchableOpacity style={styles.addPlaceRow} onPress={() => setIsAddingPlace(true)}>
              <Text style={styles.addPlaceText}>{t("groceries.addNewPlace")}</Text>
            </TouchableOpacity>
            {hasChecked && (
              <TouchableOpacity style={styles.clearRow} onPress={clearChecked}>
                <Text style={styles.clearLink}>{t("groceries.clearCheckedItems")}</Text>
              </TouchableOpacity>
            )}
          </View>
        }
        renderItem={({ item: place }) => {
          const rows = grouped.get(place.id) ?? [];
          return (
            <View style={styles.section}>
              <View style={styles.placeHeader}>
                <TouchableOpacity style={styles.placeHeaderMain} onPress={() => setAddingPlace(place)}>
                  <View style={styles.placeNameRow}>
                    <View style={styles.placeIconCircle}>
                      <Ionicons name={place.icon} size={17} color={sectionColors.groceries} />
                    </View>
                    <Text style={styles.placeName}>{displayPlaceName(place, t)}</Text>
                  </View>
                  <Text style={styles.placeAddHint}>{t("groceries.addHint")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEditPlace(place)} hitSlop={8} style={styles.editIcon}>
                  <Ionicons name="create-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {rows.length === 0 ? (
                <Text style={styles.emptyPlaceText}>{t("groceries.nothingHereYet")}</Text>
              ) : (
                rows.map((item) => (
                  <ItemRow
                    key={item.id}
                    item={item}
                    onToggle={() => toggleItem(item)}
                    onDelete={() => removeFromList(item.id)}
                  />
                ))
              )}
            </View>
          );
        }}
        ListEmptyComponent={
          items.length === 0 ? (
            <Text style={styles.emptyText}>{t("groceries.listEmpty")}</Text>
          ) : null
        }
      />

      <BottomSheetModal
        visible={!!addingPlace}
        onClose={() => setAddingPlace(null)}
        contentStyle={styles.modalContentScrollable}
      >
        <View style={styles.modalHeaderRow}>
          <ModalTitle
            icon="storefront-outline"
            tint={sectionColors.groceries}
            tintBackground={sectionTints.groceries}
            title={t("groceries.addTo", { place: addingPlace ? displayPlaceName(addingPlace, t) : "" })}
          />
          {addingPlace && (
            <TouchableOpacity onPress={() => openEditPlace(addingPlace)} hitSlop={8}>
              <Ionicons name="create-outline" size={22} color={colors.textMuted} />
            </TouchableOpacity>
          )}
        </View>
        <TextField
          placeholder={t("groceries.itemNamePlaceholder")}
          value={placeItemName}
          onChangeText={setPlaceItemName}
          autoFocus
          onSubmitEditing={() => handleAddToPlace()}
        />
        <Button
          label={t("groceries.addItem")}
          onPress={() => handleAddToPlace()}
          loading={isSubmitting}
          style={[styles.submitButton, styles.sectionButton]}
        />

        {addingPlace && getHistoryForPlace(addingPlace.id).length > 0 && (
          <>
            <FieldLabel icon="time-outline" label={t("groceries.previouslyAddedHere")} />
            <View style={styles.chipRow}>
              {getHistoryForPlace(addingPlace.id).map((entry) => (
                <Chip
                  key={entry.id}
                  label={entry.name}
                  selected={false}
                  onPress={() => handleAddToPlace(entry.name)}
                  color={sectionColors.groceries}
                />
              ))}
            </View>
          </>
        )}
      </BottomSheetModal>

      <BottomSheetModal visible={isAdding} onClose={() => setIsAdding(false)}>
        <ModalTitle icon="cart" tint={sectionColors.groceries} tintBackground={sectionTints.groceries} title={t("groceries.newItem")} />
        <TextField
          placeholder={t("groceries.itemNamePlaceholder")}
          value={name}
          onChangeText={setName}
          autoFocus
          onSubmitEditing={() => handleAddItem()}
        />

        <FieldLabel icon="storefront-outline" label={t("groceries.where")} />
        <View style={styles.chipRow}>
          {places.map((p) => (
            <Chip
              key={p.id}
              label={displayPlaceName(p, t)}
              selected={placeId === p.id}
              onPress={() => setPlaceId(p.id)}
              color={sectionColors.groceries}
            />
          ))}
        </View>

        <Button
          label={t("groceries.addItem")}
          onPress={() => handleAddItem()}
          loading={isSubmitting}
          style={[styles.submitButton, styles.sectionButton]}
        />
      </BottomSheetModal>

      <BottomSheetModal visible={isAddingPlace} onClose={() => setIsAddingPlace(false)}>
        <ModalTitle
          icon="add-circle-outline"
          tint={sectionColors.groceries}
          tintBackground={sectionTints.groceries}
          title={t("groceries.newPlace")}
        />
        <TextField
          placeholder={t("groceries.storeNamePlaceholder")}
          value={newPlaceName}
          onChangeText={setNewPlaceName}
          autoFocus
          onSubmitEditing={handleCreatePlace}
        />
        <Button
          label={t("groceries.addPlace")}
          onPress={handleCreatePlace}
          loading={isSubmitting}
          style={[styles.submitButton, styles.sectionButton]}
        />
      </BottomSheetModal>

      <BottomSheetModal
        visible={!!editingPlace}
        onClose={() => setEditingPlace(null)}
        contentStyle={styles.modalContentScrollable}
      >
        <ModalTitle
          icon="create-outline"
          tint={sectionColors.groceries}
          tintBackground={sectionTints.groceries}
          title={t("groceries.editPlace")}
        />
        <TextField placeholder={t("groceries.placeNamePlaceholder")} value={editPlaceName} onChangeText={setEditPlaceName} />

        <TouchableOpacity style={styles.changeIconRow} onPress={() => setIsPickingIcon(true)}>
          <View style={styles.placeIconCircleLarge}>
            {editingPlace && <Ionicons name={editingPlace.icon} size={22} color={sectionColors.groceries} />}
          </View>
          <Text style={styles.changeIconText}>{t("groceries.changeIcon")}</Text>
        </TouchableOpacity>

        <Button
          label={t("groceries.saveName")}
          onPress={handleSavePlaceName}
          style={[styles.submitButton, styles.sectionButton]}
        />

        {editingPlace && !editingPlace.is_default && (
          <Button label={t("groceries.deletePlace")} variant="danger" onPress={handleDeletePlace} style={styles.submitButton} />
        )}

        {editingPlace && getHistoryForPlace(editingPlace.id).length > 0 && (
          <>
            <FieldLabel icon="time-outline" label={t("groceries.previouslyAddedHere")} />
            {getHistoryForPlace(editingPlace.id).map((entry) => (
              <View key={entry.id} style={styles.historyRow}>
                <Text style={styles.historyText}>{entry.name}</Text>
                <TouchableOpacity onPress={() => handleRemoveHistoryEntry(entry)} hitSlop={8}>
                  <Text style={styles.deleteLink}>✕</Text>
                </TouchableOpacity>
              </View>
            ))}
          </>
        )}
      </BottomSheetModal>

      <BottomSheetModal
        visible={isPickingIcon}
        onClose={() => setIsPickingIcon(false)}
        contentStyle={styles.modalContentScrollable}
      >
        <ModalTitle
          icon="image-outline"
          tint={sectionColors.groceries}
          tintBackground={sectionTints.groceries}
          title={t("groceries.chooseIcon")}
        />
        <View style={styles.iconGrid}>
          {GROCERY_STORE_ICONS.map((icon) => (
            <TouchableOpacity
              key={icon}
              style={[styles.iconOption, editingPlace?.icon === icon && styles.iconOptionSelected]}
              onPress={() => handleSelectIcon(icon)}
            >
              <Ionicons name={icon} size={20} color={editingPlace?.icon === icon ? colors.white : colors.textMuted} />
            </TouchableOpacity>
          ))}
        </View>
      </BottomSheetModal>
    </View>
  );
}

function ItemRow({ item, onToggle, onDelete }: { item: GroceryItem; onToggle: () => void; onDelete: () => void }) {
  const { t } = useTranslation();
  const { profile } = useProfile();
  return (
    <View style={styles.row}>
      <TouchableOpacity
        style={[styles.checkbox, item.is_checked && styles.checkboxChecked]}
        onPress={onToggle}
        hitSlop={8}
      >
        {item.is_checked && <Text style={styles.checkmark}>✓</Text>}
      </TouchableOpacity>
      <TouchableOpacity style={styles.rowMain} onPress={() => router.push(`/grocery/${item.id}`)}>
        <View style={styles.rowTitleLine}>
          <Text style={[styles.rowTitle, item.is_checked && styles.rowTitleDone]}>{item.name}</Text>
          {isNewItem(item.created_at, item.created_by, profile) && <Text style={styles.newBadge}>{t("common.new")}</Text>}
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} hitSlop={8}>
        <Text style={styles.deleteLink}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: colors.background },
  center: { flex: 1, alignItems: "center", justifyContent: "center" },
  listContent: { paddingBottom: 40 },
  clearRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg, paddingBottom: spacing.sm },
  clearLink: { color: colors.danger, fontSize: 13, fontWeight: "600" },
  section: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  placeHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
  },
  placeHeaderMain: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  placeNameRow: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  placeIconCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: sectionTints.groceries,
    alignItems: "center",
    justifyContent: "center",
  },
  placeIconCircleLarge: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: sectionTints.groceries,
    alignItems: "center",
    justifyContent: "center",
  },
  placeName: { fontSize: 19, fontWeight: "800", color: sectionColors.groceries },
  placeAddHint: { fontSize: 13, fontWeight: "700", color: sectionColors.groceries },
  changeIconRow: { flexDirection: "row", alignItems: "center", gap: spacing.md, marginTop: spacing.md },
  changeIconText: { fontSize: 14, fontWeight: "700", color: sectionColors.groceries },
  iconGrid: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm, marginTop: spacing.sm },
  iconOption: {
    width: 40,
    height: 40,
    borderRadius: radii.md,
    backgroundColor: colors.surface,
    alignItems: "center",
    justifyContent: "center",
  },
  iconOptionSelected: { backgroundColor: sectionColors.groceries },
  editIcon: { paddingLeft: spacing.md },
  emptyPlaceText: { fontSize: 13, color: colors.textFaint, paddingBottom: spacing.sm },
  addPlaceRow: { paddingHorizontal: spacing.lg, paddingTop: spacing.lg },
  addPlaceText: { fontSize: 19, fontWeight: "800", color: sectionColors.groceries },
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: spacing.sm + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
    gap: spacing.md,
  },
  rowMain: { flex: 1 },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  checkboxChecked: { backgroundColor: colors.success, borderColor: colors.success },
  checkmark: { color: colors.white, fontSize: 14, fontWeight: "700" },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm },
  rowTitle: { fontSize: 16, color: colors.text },
  rowTitleDone: { textDecorationLine: "line-through", color: colors.textFaint },
  newBadge: {
    fontSize: 10,
    fontWeight: "700",
    color: colors.white,
    backgroundColor: colors.danger,
    paddingHorizontal: spacing.xs + 2,
    paddingVertical: 2,
    borderRadius: radii.sm,
  },
  deleteLink: { color: colors.textFaint, fontSize: 16, paddingHorizontal: spacing.sm },
  emptyText: { textAlign: "center", color: colors.textMuted, marginTop: 40 },
  modalContentScrollable: { maxHeight: "80%" },
  modalHeaderRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  modalTitle: { fontSize: 18, fontWeight: "700", color: colors.text, marginBottom: spacing.xs },
  label: { fontSize: 13, fontWeight: "600", color: colors.textMuted, marginTop: spacing.sm },
  chipRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  historyRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.xs + 2,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  historyText: { fontSize: 14, color: colors.text },
  submitButton: { marginTop: spacing.sm },
  sectionButton: { backgroundColor: sectionColors.groceries },
});
