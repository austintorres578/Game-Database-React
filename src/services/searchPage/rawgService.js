// RAWG API service for the search page.
// Proxies all requests through our own backend instead of calling
// RapidAPI directly, so no API key is ever exposed client-side.

import { BACKEND_BASE } from "../../constants/apiConfig";

export function buildRawgFetchBase(pageSize) {
  return `${BACKEND_BASE}/api/rawg/games?search_precise=true&page_size=${pageSize}&`;
}

export async function fetchRawgGames(link) {
  const res = await fetch(link, { method: "GET" });
  if (!res.ok) {
    const err = new Error(`RAWG request failed: HTTP ${res.status} ${res.statusText}`);
    err.status = res.status;
    throw err;
  }
  const data = await res.json();
  return {
    count: data.count || 0,
    results: data.results || [],
    next: data.next || "",
    previous: data.previous || "",
  };
}

export async function fetchRawgPlatforms() {
  const res = await fetch(`${BACKEND_BASE}/api/rawg/platforms`, { method: "GET" });
  if (!res.ok) {
    const err = new Error(`RAWG platforms request failed: HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function fetchRawgGenres() {
  const res = await fetch(`${BACKEND_BASE}/api/rawg/genres`, { method: "GET" });
  if (!res.ok) {
    const err = new Error(`RAWG genres request failed: HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}

export async function searchRawgGenres(query) {
  if (!query.trim()) return [];
  const res = await fetch(
    `${BACKEND_BASE}/api/rawg/genres/search?q=${encodeURIComponent(query)}`,
    { method: "GET" }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function searchRawgTags(query) {
  if (!query.trim()) return [];
  const res = await fetch(
    `${BACKEND_BASE}/api/rawg/tags/search?q=${encodeURIComponent(query)}`,
    { method: "GET" }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function autocompleteRawgGames(query) {
  if (!query.trim() || query.trim().length < 2) return [];
  const res = await fetch(
    `${BACKEND_BASE}/api/rawg/autocomplete?q=${encodeURIComponent(query)}`,
    { method: "GET" }
  );
  if (!res.ok) return [];
  return res.json();
}

export async function fetchRawgTags() {
  const res = await fetch(`${BACKEND_BASE}/api/rawg/tags`, { method: "GET" });
  if (!res.ok) {
    const err = new Error(`RAWG tags request failed: HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  return res.json();
}
