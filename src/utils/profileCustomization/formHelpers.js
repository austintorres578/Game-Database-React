// Pure helpers for the profile customization form.

/**
 * Builds the summary label shown on a closed dropdown button.
 * Falls back to just the base label when nothing is selected.
 *
 * @param {string}   label         - e.g. "Platforms"
 * @param {string[]} selectedItems - currently selected values
 * @returns {string}
 */
export function getDropdownPreviewText(label, selectedItems) {
  if (!selectedItems || selectedItems.length === 0) return label;
  return `${label}: ${selectedItems.join(", ")}`;
}

/**
 * Toggles an item in an array — adds it if absent, removes it if present.
 * Returns a new array without mutating the original.
 *
 * @param {string[]} arr
 * @param {string}   item
 * @returns {string[]}
 */
export function toggleArrayItem(arr, item) {
  return arr.includes(item) ? arr.filter((i) => i !== item) : [...arr, item];
}

/**
 * Same as toggleArrayItem but caps the array at `max` entries.
 * If the item is already present it is removed regardless of the cap.
 * If the item is absent and the array is already at max, the array is
 * returned unchanged.
 *
 * @param {string[]} arr
 * @param {string}   item
 * @param {number}   max
 * @returns {string[]}
 */
export function toggleArrayItemWithMax(arr, item, max) {
  if (arr.includes(item)) return arr.filter((i) => i !== item);
  if (arr.length >= max) return arr;
  return [...arr, item];
}
