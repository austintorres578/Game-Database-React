export function slugify(name) {
  if (!name || typeof name !== "string") return "";
  return name
    .toLowerCase()
    .trim()
    .replace(/['']/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function gamePath(id, name) {
  const s = slugify(name);
  return s ? `/game/${id}/${s}` : `/game/${id}`;
}
