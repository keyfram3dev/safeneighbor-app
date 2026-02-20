// src/utils/locationShare.js
// Location acquisition, reverse geocoding, SMS/email message building,
// and Firestore live location streaming for emergency sharing

import { doc, setDoc, updateDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase';
import { encryptLocationData } from './locationEncryption';

const LOCATION_STORAGE_KEY = 'safeneighbor_last_known_location';

// ── Platform Detection ──────────────────────────────────────

const isIOS = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) ||
  (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);

// ── Location Acquisition ──────────────────────────────────────

export const acquireLocation = () => {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) {
      reject(new Error('Geolocation not supported'));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: Date.now(),
        };
        saveLastKnownLocation(loc);
        resolve(loc);
      },
      (error) => reject(error),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  });
};

// ── Reverse Geocoding (shared — extracted from CommunityReports.js) ──

export const reverseGeocode = async (lat, lng, retryCount = 0) => {
  const MAX_RETRIES = 1;
  const TIMEOUT_MS = 10000;

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), TIMEOUT_MS);

    const url = `https://nominatim.openstreetmap.org/reverse?lat=${lat}&lon=${lng}&format=json&addressdetails=1`;

    const response = await fetch(url, {
      signal: controller.signal,
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      if (retryCount < MAX_RETRIES) {
        await new Promise((r) => setTimeout(r, 1500));
        return reverseGeocode(lat, lng, retryCount + 1);
      }
      return { address: null, city: '', state: '' };
    }

    const data = await response.json();

    if (data.error) {
      return { address: null, city: '', state: '' };
    }

    const addr = data.address || {};
    const street = addr.road || addr.pedestrian || addr.footway || '';
    const number = addr.house_number || '';
    const area = addr.neighbourhood || addr.suburb || addr.city || addr.town || '';

    const city = addr.city || addr.town || addr.village || addr.suburb || area || '';
    const state = addr.state || '';

    let address;
    if (street && area) {
      address = `~ ${number ? number + ' ' : ''}${street}, ${area}`;
    } else if (street) {
      address = `~ ${number ? number + ' ' : ''}${street}`;
    } else if (data.display_name) {
      address = `~ ${data.display_name.split(',').slice(0, 2).join(',').trim()}`;
    } else {
      address = null;
    }

    // Nominatim returns lat/lon of the matched address (typically on/near a road)
    const snappedLat = data.lat ? parseFloat(data.lat) : null;
    const snappedLng = data.lon ? parseFloat(data.lon) : null;

    return { address, city, state, snappedLat, snappedLng };
  } catch (error) {
    if (retryCount < MAX_RETRIES) {
      await new Promise((r) => setTimeout(r, 1500));
      return reverseGeocode(lat, lng, retryCount + 1);
    }

    return { address: null, city: '', state: '', snappedLat: null, snappedLng: null };
  }
};

// ── Message Building ──────────────────────────────────────────

export const buildLocationMessage = (userName, lat, lng, address, shareId = null, keyString = null) => {
  const mapsLink = `https://maps.google.com/maps?q=${lat},${lng}`;
  const name = userName || 'your contact';
  const addrLine = address ? `\nAddress: ${address}` : '';
  let liveLine = '';
  if (shareId) {
    let liveUrl = `https://safeneighbor-33bb0.web.app/?live=${shareId}`;
    if (keyString) liveUrl += `#key=${keyString}`;
    liveLine = `\n\nLIVE TRACKING: ${liveUrl}`;
  }
  return (
    `EMERGENCY from ${name}: I am sharing my location with you right now.` +
    liveLine +
    `\n\nLocation: ${mapsLink}${addrLine}` +
    `\nCoordinates: ${lat.toFixed(6)}, ${lng.toFixed(6)}` +
    `\nTime: ${new Date().toLocaleString()}` +
    `\n\nIf you do not hear from me, please contact my attorney immediately.`
  );
};

export const buildLocationSmsUri = (contacts, message) => {
  const phoneNumbers = contacts.filter((c) => c.phone).map((c) => c.phone);
  const ios = isIOS();
  const separator = ios ? ';' : ',';
  const bodyPrefix = ios ? '&body=' : '?body=';
  return `sms:${phoneNumbers.join(separator)}${bodyPrefix}${encodeURIComponent(message)}`;
};

export const buildLocationMailtoUri = (contacts, message) => {
  const emails = contacts.filter((c) => c.email).map((c) => c.email);
  return `mailto:${emails.join(',')}?subject=${encodeURIComponent('EMERGENCY — Location Alert')}&body=${encodeURIComponent(message)}`;
};

// ── localStorage Persistence ──────────────────────────────────

export const saveLastKnownLocation = (location) => {
  try {
    localStorage.setItem(LOCATION_STORAGE_KEY, JSON.stringify(location));
  } catch {}
};

export const getLastKnownLocation = () => {
  try {
    const stored = localStorage.getItem(LOCATION_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
};

export const clearLastKnownLocation = () => {
  try {
    localStorage.removeItem(LOCATION_STORAGE_KEY);
  } catch {}
};

// ── Share ID Generation ──────────────────────────────────────

export const generateShareId = (length = 20) => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  const array = new Uint8Array(length);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => chars[b % chars.length]).join('');
};

// ── Firestore Live Location ──────────────────────────────────

export const createLiveLocationDoc = async (shareId, lat, lng, accuracy, address, userName, encryptionKey = null) => {
  const now = new Date().toISOString();
  if (encryptionKey) {
    const encrypted = await encryptLocationData(encryptionKey, {
      lat, lng, accuracy: accuracy || null, address: address || null, userName: userName || 'Someone',
    });
    await setDoc(doc(db, 'liveLocations', shareId), {
      encryptedData: encrypted,
      updatedAt: now,
      createdAt: now,
      active: true,
    });
  } else {
    await setDoc(doc(db, 'liveLocations', shareId), {
      lat, lng, accuracy: accuracy || null, address: address || null,
      updatedAt: now, createdAt: now, active: true, userName: userName || 'Someone',
    });
  }
};

export const updateLiveLocation = async (shareId, lat, lng, accuracy, address, encryptionKey = null) => {
  if (encryptionKey) {
    const encrypted = await encryptLocationData(encryptionKey, {
      lat, lng, accuracy: accuracy || null, address: address || null,
    });
    await updateDoc(doc(db, 'liveLocations', shareId), {
      encryptedData: encrypted,
      updatedAt: new Date().toISOString(),
    });
  } else {
    await updateDoc(doc(db, 'liveLocations', shareId), {
      lat, lng, accuracy: accuracy || null, address: address || null,
      updatedAt: new Date().toISOString(),
    });
  }
};

export const stopLiveLocation = async (shareId) => {
  await updateDoc(doc(db, 'liveLocations', shareId), {
    active: false,
    updatedAt: new Date().toISOString(),
  });
};

export const subscribeLiveLocation = (shareId, callback) => {
  return onSnapshot(doc(db, 'liveLocations', shareId), (snapshot) => {
    if (snapshot.exists()) {
      callback({ id: snapshot.id, ...snapshot.data() });
    } else {
      callback(null);
    }
  });
};
