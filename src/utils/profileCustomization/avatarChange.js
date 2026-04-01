export function handleAvatarChange(e) {
  return e.target.files?.[0] || null;
}
