// Utility functions for normalizing, deduplicating, sorting, and displaying
// store/purchase links on the Game Page (combining RAWG + ITAD data).

/**
 * Infers a human-readable store name from a store URL.
 * Used when RAWG returns a generic "Store" label.
 */
export function inferStoreNameFromUrl(url) {
  if (!url) return "Store";
  const u = String(url).toLowerCase();

  if (u.includes("store.steampowered.com")) return "Steam";
  if (u.includes("gog.com")) return "GOG";
  if (u.includes("epicgames.com/store")) return "Epic Games Store";
  if (u.includes("store.playstation.com")) return "PlayStation Store";
  if (u.includes("xbox.com") || u.includes("microsoft.com/store"))
    return "Microsoft Store";
  if (u.includes("nintendo.com")) return "Nintendo eShop";
  if (u.includes("humblebundle.com")) return "Humble Bundle";
  if (u.includes("itch.io")) return "itch.io";
  if (u.includes("greenmangaming.com")) return "Green Man Gaming";
  if (u.includes("ea.com") || u.includes("origin.com")) return "EA";
  if (u.includes("store.ubi.com") || u.includes("ubisoft.com"))
    return "Ubisoft Store";
  if (u.includes("battle.net")) return "Battle.net";
  if (u.includes("apps.apple.com")) return "App Store";
  if (u.includes("play.google.com")) return "Google Play";
  if (u.includes("galaxystore.samsung.com")) return "Galaxy Store";
  if (u.includes("amazon.com/appstore")) return "Amazon Appstore";

  // Fallback: use hostname
  try {
    const host = new URL(url).hostname.replace(/^www\./, "");
    const parts = host.split(".");
    const base = parts[0] === "store" ? parts[1] : parts[0];
    return base ? base.charAt(0).toUpperCase() + base.slice(1) : "Store";
  } catch {
    return "Store";
  }
}

/**
 * Deduplicates a RAWG store list by URL and sorts by a priority order
 * (Steam first, then GOG, Epic, etc.).
 */
export function normalizeAndSortStores(list) {
  const seen = new Set();
  const deduped = (Array.isArray(list) ? list : [])
    .filter((x) => x?.url)
    .filter((x) => {
      const url = String(x.url);
      if (seen.has(url)) return false;
      seen.add(url);
      return true;
    });

  const priority = {
    Steam: 1,
    GOG: 2,
    "Epic Games Store": 3,
    "PlayStation Store": 4,
    "Microsoft Store": 5,
    "Nintendo eShop": 6,
    "Humble Bundle": 7,
    "Green Man Gaming": 8,
    "itch.io": 9,
    EA: 10,
    "Ubisoft Store": 11,
    "Battle.net": 12,
    "App Store": 13,
    "Google Play": 14,
    "Galaxy Store": 15,
    "Amazon Appstore": 16,
  };

  return deduped.sort((a, b) => {
    const pa = priority[a.storeName] ?? 999;
    const pb = priority[b.storeName] ?? 999;
    if (pa !== pb) return pa - pb;
    return String(a.storeName || "").localeCompare(String(b.storeName || ""));
  });
}

/**
 * Removes duplicate entries from an ITAD offer list, keeping the first
 * occurrence of each URL.
 */
export function dedupeByUrl(list) {
  const seen = new Set();
  return (Array.isArray(list) ? list : [])
    .filter((x) => x?.url)
    .filter((x) => {
      const u = String(x.url);
      if (seen.has(u)) return false;
      seen.add(u);
      return true;
    });
}

/**
 * Extracts a human-readable display label from a store object.
 * Handles both RAWG and ITAD store shapes.
 */
export function getStoreLabel(item) {
  if (item?.storeName) return item.storeName;

  return (
    item?.shop?.name ||
    item?.shopName ||
    item?.shop ||
    item?.store ||
    item?.name ||
    item?.title ||
    "Store"
  );
}

/**
 * Pulls a numeric price out of a store item, handling both flat numbers
 * (RAWG-ish / already-normalized) and ITAD's nested { amount, currency } shape.
 * Falls back to the regular (non-sale) price when there's no deal price.
 */
export function getStorePrice(item) {
  const toNumber = (v) => {
    if (v == null) return NaN;
    if (typeof v === "number") return v;
    if (typeof v === "string") return Number(v);
    // ITAD nested shape: { amount, currency } (also tolerate amountInt)
    if (typeof v === "object") {
      if (Number.isFinite(Number(v.amount))) return Number(v.amount);
      if (Number.isFinite(Number(v.amountInt))) return Number(v.amountInt) / 100;
    }
    return NaN;
  };

  // Prefer the current/deal price, then fall back to the regular price.
  const candidates = [
    item?.price,
    item?.deal?.price,
    item?.current,
    item?.regular,
    item?.deal?.regular,
    item?.regularPrice,
  ];

  for (const c of candidates) {
    const n = toNumber(c);
    if (Number.isFinite(n)) return n;
  }
  return NaN;
}

/** True when the item has an active discount. */
export function getStoreCut(item) {
  const cut = Number(item?.cut ?? item?.deal?.cut);
  return Number.isFinite(cut) ? cut : 0;
}

/**
 * Returns a formatted price element when the store item has a valid price,
 * or null if no price is available.
 */
export function renderStorePrice(item) {
  const price = getStorePrice(item);

  if (!Number.isFinite(price)) return null;

  const cut = getStoreCut(item);

  const regularRaw =
    item?.regular ?? item?.deal?.regular ?? item?.regularPrice ?? null;
  const regular = (() => {
    if (regularRaw == null) return NaN;
    if (typeof regularRaw === "number") return regularRaw;
    if (typeof regularRaw === "object" && Number.isFinite(Number(regularRaw.amount)))
      return Number(regularRaw.amount);
    return Number(regularRaw);
  })();

  const showRegular = cut > 0 && Number.isFinite(regular) && regular > price;

  return (
    <span className="store-pill-price">
      {showRegular && (
        <span className="store-pill-price--was">${regular.toFixed(2)}</span>
      )}
      <span className="store-pill-price--now">${price.toFixed(2)}</span>
    </span>
  );
}

/**
 * Sorts a list of store items cheapest-first. Stores with no price are
 * pushed to the end, then sorted alphabetically by label.
 */
export function sortStoresByPrice(list) {
  return [...(Array.isArray(list) ? list : [])].sort((a, b) => {
    const aPrice = getStorePrice(a);
    const bPrice = getStorePrice(b);

    const aHasPrice = Number.isFinite(aPrice);
    const bHasPrice = Number.isFinite(bPrice);

    if (aHasPrice && bHasPrice) return aPrice - bPrice;
    if (aHasPrice && !bHasPrice) return -1;
    if (!aHasPrice && bHasPrice) return 1;

    return String(getStoreLabel(a)).localeCompare(String(getStoreLabel(b)));
  });
}

/**
 * Removes duplicate storefronts from a combined ITAD + RAWG list by label.
 * ITAD entries win since they appear first in the combined list.
 */
export function dedupeCombinedStores(list) {
  const seenLabels = new Set();

  return (Array.isArray(list) ? list : []).filter((item) => {
    const label = String(getStoreLabel(item)).trim().toLowerCase();
    const normalizedLabel = label || "store";

    if (seenLabels.has(normalizedLabel)) return false;
    seenLabels.add(normalizedLabel);
    return true;
  });
}
