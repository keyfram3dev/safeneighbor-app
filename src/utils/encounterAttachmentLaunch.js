const ENCOUNTER_ATTACHMENT_LAUNCH_KEY = 'safeneighbor_encounter_attachment_launch';
const ENCOUNTER_ATTACHMENT_PENDING_KEY = 'safeneighbor_encounter_attachment_pending';

export const writeEncounterAttachmentLaunchIntent = (intent) => {
  try {
    localStorage.setItem(
      ENCOUNTER_ATTACHMENT_LAUNCH_KEY,
      JSON.stringify({
        ...intent,
        createdAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.warn('Failed to store encounter attachment launch intent', error);
  }
};

export const readEncounterAttachmentLaunchIntent = () => {
  try {
    const raw = localStorage.getItem(ENCOUNTER_ATTACHMENT_LAUNCH_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to read encounter attachment launch intent', error);
    return null;
  }
};

export const clearEncounterAttachmentLaunchIntent = () => {
  try {
    localStorage.removeItem(ENCOUNTER_ATTACHMENT_LAUNCH_KEY);
  } catch (error) {
    console.warn('Failed to clear encounter attachment launch intent', error);
  }
};

export const writePendingEncounterAttachmentIntent = (intent) => {
  try {
    localStorage.setItem(
      ENCOUNTER_ATTACHMENT_PENDING_KEY,
      JSON.stringify({
        ...intent,
        createdAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.warn('Failed to store pending encounter attachment intent', error);
  }
};

export const consumePendingEncounterAttachmentIntent = () => {
  try {
    const raw = localStorage.getItem(ENCOUNTER_ATTACHMENT_PENDING_KEY);
    if (!raw) return null;
    localStorage.removeItem(ENCOUNTER_ATTACHMENT_PENDING_KEY);
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to consume pending encounter attachment intent', error);
    return null;
  }
};
