// Helper to resolve service images from DB fields
// Prefers remote image_url; does NOT fallback to local assets
// If no image_url is present, return undefined so UI can skip rendering

export function resolveServiceImage(_image_key?: string, image_url?: string) {
  if (image_url) return { uri: image_url };
  return undefined;
}

export default resolveServiceImage;
