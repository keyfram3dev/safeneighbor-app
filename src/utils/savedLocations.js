// src/utils/savedLocations.js
// localStorage CRUD for user-saved alert zones (push digests + foreground alerts).

const STORAGE_KEY = 'safeneighbor_saved_locations';

function read() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function write(locations) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(locations));
}

/** Get all saved locations. */
export function getSavedLocations() {
  return read();
}

/**
 * Add a new saved location.
 * @param {{ label: string, lat: number, lng: number, radiusMiles?: number }} loc
 * @returns the created location object (with id + createdAt)
 */
export function addSavedLocation({ label, lat, lng, radiusMiles = 1 }) {
  const locations = read();
  const entry = {
    id: crypto.randomUUID ? crypto.randomUUID() : `loc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    label,
    lat,
    lng,
    radiusMiles,
    createdAt: new Date().toISOString(),
  };
  locations.push(entry);
  write(locations);
  return entry;
}

/** Remove a saved location by id. */
export function removeSavedLocation(id) {
  const locations = read().filter((l) => l.id !== id);
  write(locations);
}

/** Update fields on an existing saved location. */
export function updateSavedLocation(id, updates) {
  const locations = read().map((l) => (l.id === id ? { ...l, ...updates } : l));
  write(locations);
}
