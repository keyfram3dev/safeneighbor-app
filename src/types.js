// Verifier type definition (for multi-user verification)
export const Verifier = {
  id: '',          // Anonymous verifier ID (device-based)
  timestamp: '',   // When they verified
  distance: 0      // Distance in miles when verified
};

// ICEReport type definition
export const ICEReport = {
  id: '',
  timestamp: '',
  location: '',
  lat: 0,
  lng: 0,
  description: '',
  agents: 0,
  vehicles: 0,
  verified: false,    // Legacy field (kept for backwards compatibility)
  verifiers: []       // Array of Verifier objects for multi-user verification
};