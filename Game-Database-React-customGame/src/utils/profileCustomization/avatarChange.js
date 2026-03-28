export function handleAvatarChange(e) {
  return new Promise((resolve, reject) => {
    const file = e.target.files?.[0];

    if (!file) {
      resolve(null);
      return;
    }

    const reader = new FileReader();

    reader.onload = (event) => {
      resolve(event.target?.result || null);
    };

    reader.onerror = () => {
      reject(new Error("Failed to read avatar image."));
    };

    reader.readAsDataURL(file);
  });
}