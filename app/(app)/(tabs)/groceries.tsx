import { useMemo, useState } from "react";
import { ActivityIndicator, Alert, FlatList, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useTranslation } from "react-i18next";
import { useGroceries, byCategoryThenName, type GroceryHistoryEntry, type GroceryItem, type GroceryPlace } from "@/hooks/useGroceries";
import { useCollapsedSections } from "@/hooks/useCollapsedSections";
import { displayPlaceName } from "@/lib/groceryPlaces";
import { GROCERY_STORE_ICONS, DEFAULT_GROCERY_STORE_ICON } from "@/lib/groceryStoreIcons";
import {
  GROCERY_ITEM_CATEGORY_ICONS,
  DEFAULT_GROCERY_ITEM_CATEGORY,
  isGroceryItemCategory,
  type GroceryItemCategory,
} from "@/lib/groceryItemCategories";
import { useProfile } from "@/hooks/useProfile";
import { isNewItem } from "@/lib/newBadge";
import { TabScreenHeader } from "@/components/TabScreenHeader";
import { GroceryStoreIcon } from "@/components/GroceryStoreIcon";
import { BottomSheetModal } from "@/components/BottomSheetModal";
import { ModalTitle } from "@/components/ModalTitle";
import { FieldLabel } from "@/components/FieldLabel";
import { Chip } from "@/components/Chip";
import { Button } from "@/components/Button";
import { TextField } from "@/components/TextField";
import { ReorderableList } from "@/components/ReorderableList";
import { GroceryItemCategoryPicker } from "@/components/GroceryItemCategoryPicker";
import { MultiGroceryItemEditor, emptyGroceryRow, type MultiGroceryRow } from "@/components/MultiGroceryItemEditor";
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
    reorderPlaces,
    renamePlace,
    deletePlace,
    addItem,
    toggleItem,
    deleteItem,
    removeFromList,
    clearChecked,
    getHistoryForPlace,
  } = useGroceries();
  const { isCollapsed, toggle: toggleCollapsed } = useCollapsedSections("groceries");
  const [isReordering, setIsReordering] = useState(false);
  const [reorderScrollEnabled, setReorderScrollEnabled] = useState(true);

  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState("");
  const [itemCategory, setItemCategory] = useState<GroceryItemCategory>(DEFAULT_GROCERY_ITEM_CATEGORY);
  const [placeId, setPlaceId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [addingPlace, setAddingPlace] = useState<GroceryPlace | null>(null);
  const [placeItemRows, setPlaceItemRows] = useState<MultiGroceryRow[]>([emptyGroceryRow()]);
  const [categoryFilter, setCategoryFilter] = useState<GroceryItemCategory | null>(null);
  const [selectedHistoryIds, setSelectedHistoryIds] = useState<Set<string>>(new Set());

  const [isAddingPlace, setIsAddingPlace] = useState(false);
  const [newPlaceName, setNewPlaceName] = useState("");
  const [newPlaceIcon, setNewPlaceIcon] = useState<string>(DEFAULT_GROCERY_STORE_ICON);

  const [editingPlace, setEditingPlace] = useState<GroceryPlace | null>(null);
  const [editPlaceName, setEditPlaceName] = useState("");
  const [pickingIconFor, setPickingIconFor] = useState<"new" | "edit" | null>(null);

  const sortedPlaces = useMemo(
    () =>
      [...places].sort((a, b) => {
        if (a.is_default) return 1;
        if (b.is_default) return -1;
        return a.sort_order - b.sort_order;
      }),
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
    for (const list of byPlace.values()) {
      list.sort((a, b) => byCategoryThenName({ name: a.name, category: a.item_category }, { name: b.name, category: b.item_category }));
    }
    return byPlace;
  }, [items, defaultPlace]);

  const hasChecked = items.some((i) => i.is_checked);

  function openGlobalAdd() {
    setPlaceId(defaultPlace?.id ?? null);
    setItemCategory(DEFAULT_GROCERY_ITEM_CATEGORY);
    setIsAdding(true);
  }

  async function handleAddItem() {
    const finalName = name.trim();
    if (!finalName || isSubmitting) return;
    setIsSubmitting(true);
    const result = await addItem(finalName, placeId, { itemCategory });
    setIsSubmitting(false);
    if (result?.error) {
      Alert.alert(t("groceries.couldntAddItem"), result.error);
      return;
    }
    setName("");
    setPlaceId(defaultPlace?.id ?? null);
    setIsAdding(false);
  }

  function openAddToPlace(place: GroceryPlace) {
    setPlaceItemRows([emptyGroceryRow()]);
    setCategoryFilter(null);
    setSelectedHistoryIds(new Set());
    setAddingPlace(place);
  }

  // Tapping a "previously added here" suggestion just toggles its selected
  // state — nothing is added until "Add selected" is pressed, so the user
  // can tap through several suggestions in one pass instead of the sheet
  // closing after the first one.
  function toggleHistorySelection(entry: GroceryHistoryEntry) {
    setSelectedHistoryIds((prev) => {
      const next = new Set(prev);
      if (next.has(entry.id)) next.delete(entry.id);
      else next.add(entry.id);
      return next;
    });
  }

  async function handleAddSelectedHistoryEntries() {
    if (!addingPlace || isSubmitting || selectedHistoryIds.size === 0) return;
    const entries = getHistoryForPlace(addingPlace.id).filter((entry) => selectedHistoryIds.has(entry.id));
    setIsSubmitting(true);
    for (const entry of entries) {
      const result = await addItem(entry.name, addingPlace.id, { itemCategory: entry.itemCategory });
      if (result?.error) {
        setIsSubmitting(false);
        Alert.alert(t("groceries.couldntAddItem"), result.error);
        return;
      }
    }
    setIsSubmitting(false);
    setSelectedHistoryIds(new Set());
    setAddingPlace(null);
  }

  async function handleSubmitPlaceRows() {
    if (!addingPlace || isSubmitting) return;
    const validRows = placeItemRows.filter((row) => row.name.trim());
    if (validRows.length === 0) return;
    setIsSubmitting(true);
    for (const row of validRows) {
      const result = await addItem(row.name.trim(), addingPlace.id, { itemCategory: row.itemCategory });
      if (result?.error) {
        setIsSubmitting(false);
        Alert.alert(t("groceries.couldntAddItem"), result.error);
        return;
      }
    }
    setIsSubmitting(false);
    setPlaceItemRows([emptyGroceryRow()]);
    setAddingPlace(null);
  }

  function openAddPlace() {
    setNewPlaceName("");
    setNewPlaceIcon(DEFAULT_GROCERY_STORE_ICON);
    setIsAddingPlace(true);
  }

  async function handleCreatePlace() {
    if (!newPlaceName.trim() || isSubmitting) return;
    setIsSubmitting(true);
    await addPlace(newPlaceName.trim(), newPlaceIcon);
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

  function handleSelectIcon(icon: string) {
    if (pickingIconFor === "new") {
      setNewPlaceIcon(icon);
    } else if (pickingIconFor === "edit" && editingPlace) {
      updatePlaceIcon(editingPlace.id, icon);
      setEditingPlace({ ...editingPlace, icon });
    }
    setPickingIconFor(null);
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
            <TouchableOpacity style={styles.addPlaceRow} onPress={openAddPlace}>
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
          const collapsed = isCollapsed(place.id);
          return (
            <View style={styles.section}>
              <View style={styles.placeHeader}>
                <TouchableOpacity
                  style={styles.placeNameRow}
                  onPress={() => toggleCollapsed(place.id)}
                  onLongPress={() => setIsReordering(true)}
                >
                  <Ionicons
                    name={collapsed ? "chevron-forward" : "chevron-down"}
                    size={16}
                    color={colors.textFaint}
                  />
                  <View style={styles.placeIconCircle}>
                    <GroceryStoreIcon icon={place.icon} size={17} color={sectionColors.groceries} />
                  </View>
                  <Text style={styles.placeName}>{displayPlaceName(place, t)}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openAddToPlace(place)} hitSlop={8}>
                  <Text style={styles.placeAddHint}>{t("groceries.addHint")}</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => openEditPlace(place)} hitSlop={8} style={styles.editIcon}>
                  <Ionicons name="create-outline" size={20} color={colors.textMuted} />
                </TouchableOpacity>
              </View>
              {!collapsed &&
                (rows.length === 0 ? (
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
                ))}
            </View>
          );
        }}
        ListEmptyComponent={
          items.length === 0 ? (
            <Text style={styles.emptyText}>{t("groceries.listEmpty")}</Text>
          ) : null
        }
      />

      <BottomSheetModal visible={!!addingPlace} onClose={() => setAddingPlace(null)}>
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
        <MultiGroceryItemEditor value={placeItemRows} onChange={setPlaceItemRows} tint={sectionColors.groceries} />
        <Button
          label={t("groceries.addItem")}
          onPress={handleSubmitPlaceRows}
          loading={isSubmitting}
          style={[styles.submitButton, styles.sectionButton]}
        />

        {addingPlace && getHistoryForPlace(addingPlace.id).length > 0 && (
          <PreviouslyAddedSection
            entries={getHistoryForPlace(addingPlace.id)}
            categoryFilter={categoryFilter}
            onSelectCategoryFilter={setCategoryFilter}
            selectedIds={selectedHistoryIds}
            onToggleEntry={toggleHistorySelection}
          />
        )}

        {selectedHistoryIds.size > 0 && (
          <Button
            label={t("groceries.addSelectedItems", { count: selectedHistoryIds.size })}
            onPress={handleAddSelectedHistoryEntries}
            loading={isSubmitting}
            style={[styles.submitButton, styles.sectionButton]}
          />
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
        <GroceryItemCategoryPicker value={itemCategory} onChange={setItemCategory} tint={sectionColors.groceries} />

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

        <TouchableOpacity style={styles.changeIconRow} onPress={() => setPickingIconFor("new")}>
          <View style={styles.placeIconCircleLarge}>
            <GroceryStoreIcon icon={newPlaceIcon} size={22} color={sectionColors.groceries} />
          </View>
          <Text style={styles.changeIconText}>{t("groceries.changeIcon")}</Text>
        </TouchableOpacity>

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

        <TouchableOpacity style={styles.changeIconRow} onPress={() => setPickingIconFor("edit")}>
          <View style={styles.placeIconCircleLarge}>
            {editingPlace && <GroceryStoreIcon icon={editingPlace.icon} size={22} color={sectionColors.groceries} />}
          </View>
          <Text style={styles.changeIconText}>{t("groceries.changeIcon")}</Text>
        </TouchableOpacity>

        <Button
          label={t("groceries.saveName")}
          onPress={handleSavePlaceName}
          style={[styles.submitButton, styles.sectionButton]}
        />

        {editingPlace && places.length > 1 && (
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
        visible={pickingIconFor !== null}
        onClose={() => setPickingIconFor(null)}
        contentStyle={styles.modalContentScrollable}
      >
        <ModalTitle
          icon="image-outline"
          tint={sectionColors.groceries}
          tintBackground={sectionTints.groceries}
          title={t("groceries.chooseIcon")}
        />
        <View style={styles.iconGrid}>
          {GROCERY_STORE_ICONS.map((icon) => {
            const currentIcon = pickingIconFor === "new" ? newPlaceIcon : editingPlace?.icon;
            return (
              <TouchableOpacity
                key={icon}
                style={[styles.iconOption, currentIcon === icon && styles.iconOptionSelected]}
                onPress={() => handleSelectIcon(icon)}
              >
                <GroceryStoreIcon icon={icon} size={20} color={currentIcon === icon ? colors.white : colors.textMuted} />
              </TouchableOpacity>
            );
          })}
        </View>
      </BottomSheetModal>

      <BottomSheetModal
        visible={isReordering}
        onClose={() => setIsReordering(false)}
        scrollEnabled={reorderScrollEnabled}
      >
        <ModalTitle
          icon="swap-vertical"
          tint={sectionColors.groceries}
          tintBackground={sectionTints.groceries}
          title={t("groceries.reorderStores")}
        />
        <Text style={styles.reorderHint}>{t("groceries.reorderHint")}</Text>
        <ReorderableList
          data={[...places].filter((p) => !p.is_default).sort((a, b) => a.sort_order - b.sort_order)}
          keyExtractor={(p) => p.id}
          rowHeight={52}
          onReorderStart={() => setReorderScrollEnabled(false)}
          onReorderEnd={(newOrder) => {
            setReorderScrollEnabled(true);
            reorderPlaces(newOrder.map((p) => p.id));
          }}
          renderRow={(place, isActive) => (
            <View style={[styles.reorderRow, isActive && styles.reorderRowActive]}>
              <View style={styles.placeIconCircle}>
                <GroceryStoreIcon icon={place.icon} size={17} color={sectionColors.groceries} />
              </View>
              <Text style={styles.placeName}>{displayPlaceName(place, t)}</Text>
              <Ionicons name="reorder-three" size={20} color={colors.textFaint} />
            </View>
          )}
        />
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
        <View style={styles.rowContentLine}>
          <View style={styles.rowTitleLine}>
            <Text style={[styles.rowTitle, item.is_checked && styles.rowTitleDone]} numberOfLines={1}>
              {item.name}
            </Text>
            {isNewItem(item.created_at, item.created_by, profile) && <Text style={styles.newBadge}>{t("common.new")}</Text>}
          </View>
          <View style={styles.rowCategoryTag}>
            <GroceryStoreIcon
              icon={GROCERY_ITEM_CATEGORY_ICONS[item.item_category as GroceryItemCategory] ?? GROCERY_ITEM_CATEGORY_ICONS.other}
              size={10}
              color={colors.textFaint}
            />
            <Text style={styles.rowCategoryText}>
              {t(`groceries.itemCategories.${isGroceryItemCategory(item.item_category) ? item.item_category : "other"}`)}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
      <TouchableOpacity onPress={onDelete} hitSlop={8}>
        <Text style={styles.deleteLink}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

// Category chips (the "sorter") are deliberately a different shape/weight
// than the item rows below them — a category is a broader, more important
// choice than any one item, so it shouldn't look like just another item.
function PreviouslyAddedSection({
  entries,
  categoryFilter,
  onSelectCategoryFilter,
  selectedIds,
  onToggleEntry,
}: {
  entries: GroceryHistoryEntry[];
  categoryFilter: GroceryItemCategory | null;
  onSelectCategoryFilter: (category: GroceryItemCategory | null) => void;
  selectedIds: Set<string>;
  onToggleEntry: (entry: GroceryHistoryEntry) => void;
}) {
  const { t } = useTranslation();
  const categories = Array.from(new Set(entries.map((e) => e.itemCategory))).sort((a, b) => a.localeCompare(b));
  const filtered = entries.filter((entry) => !categoryFilter || entry.itemCategory === categoryFilter);

  return (
    <View>
      <FieldLabel icon="time-outline" label={t("groceries.previouslyAddedHere")} />

      <FieldLabel icon="funnel-outline" label={t("groceries.sortByCategory")} />
      <View style={styles.categoryFilterRow}>
        <TouchableOpacity
          style={[styles.categoryFilterChip, categoryFilter === null && styles.categoryFilterChipSelected]}
          onPress={() => onSelectCategoryFilter(null)}
        >
          <Text style={[styles.categoryFilterText, categoryFilter === null && styles.categoryFilterTextSelected]}>
            {t("groceries.allCategories")}
          </Text>
        </TouchableOpacity>
        {categories.map((cat) => {
          const selected = categoryFilter === cat;
          return (
            <TouchableOpacity
              key={cat}
              style={[styles.categoryFilterChip, selected && styles.categoryFilterChipSelected]}
              onPress={() => onSelectCategoryFilter(cat as GroceryItemCategory)}
            >
              <GroceryStoreIcon
                icon={GROCERY_ITEM_CATEGORY_ICONS[cat as GroceryItemCategory] ?? GROCERY_ITEM_CATEGORY_ICONS.other}
                size={14}
                color={selected ? colors.white : sectionColors.groceries}
              />
              <Text style={[styles.categoryFilterText, selected && styles.categoryFilterTextSelected]}>
                {t(`groceries.itemCategories.${cat}`)}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <View style={styles.suggestionList}>
        {filtered.map((entry) => {
          const selected = selectedIds.has(entry.id);
          return (
            <TouchableOpacity
              key={entry.id}
              style={[styles.suggestionRow, selected && styles.suggestionRowSelected]}
              onPress={() => onToggleEntry(entry)}
            >
              <Ionicons
                name={selected ? "checkmark-circle" : "ellipse-outline"}
                size={18}
                color={selected ? sectionColors.groceries : colors.textFaint}
              />
              <Text style={styles.suggestionName} numberOfLines={1}>
                {entry.name}
              </Text>
              <View style={styles.rowCategoryTag}>
                <GroceryStoreIcon
                  icon={GROCERY_ITEM_CATEGORY_ICONS[entry.itemCategory as GroceryItemCategory] ?? GROCERY_ITEM_CATEGORY_ICONS.other}
                  size={10}
                  color={colors.textFaint}
                />
                <Text style={styles.rowCategoryText}>
                  {t(`groceries.itemCategories.${isGroceryItemCategory(entry.itemCategory) ? entry.itemCategory : "other"}`)}
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </View>
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
  placeNameRow: { flex: 1, flexDirection: "row", alignItems: "center", gap: spacing.sm },
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
  placeName: { fontSize: 19, fontWeight: "800", color: sectionColors.groceries, flexShrink: 1 },
  placeAddHint: { fontSize: 13, fontWeight: "700", color: sectionColors.groceries, marginLeft: spacing.sm },
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
  reorderHint: { fontSize: 13, color: colors.textMuted, marginBottom: spacing.sm },
  reorderRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.sm,
    height: 52,
    backgroundColor: colors.white,
  },
  reorderRowActive: { backgroundColor: sectionTints.groceries, borderRadius: radii.md },
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
  rowContentLine: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: spacing.sm },
  rowTitleLine: { flexDirection: "row", alignItems: "center", gap: spacing.sm, flexShrink: 1 },
  rowTitle: { fontSize: 16, color: colors.text, flexShrink: 1 },
  rowTitleDone: { textDecorationLine: "line-through", color: colors.textFaint },
  rowCategoryTag: { flexDirection: "row", alignItems: "center", gap: 3, flexShrink: 0 },
  rowCategoryText: { fontSize: 11, color: colors.textFaint, fontWeight: "600" },
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
  categoryFilterRow: { flexDirection: "row", flexWrap: "wrap", gap: spacing.sm },
  categoryFilterChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radii.lg,
    borderWidth: 1.5,
    borderColor: sectionColors.groceries,
    backgroundColor: colors.white,
  },
  categoryFilterChipSelected: { backgroundColor: sectionColors.groceries },
  categoryFilterText: { fontSize: 14, fontWeight: "800", color: sectionColors.groceries },
  categoryFilterTextSelected: { color: colors.white },
  suggestionList: { marginTop: spacing.xs },
  suggestionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingVertical: spacing.sm + 2,
    paddingHorizontal: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.borderLight,
  },
  suggestionRowSelected: { backgroundColor: sectionTints.groceries, borderRadius: radii.md, borderBottomColor: "transparent" },
  suggestionName: { flex: 1, fontSize: 15, color: colors.text },
  submitButton: { marginTop: spacing.sm },
  sectionButton: { backgroundColor: sectionColors.groceries },
});
