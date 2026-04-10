export const LEGAL_QUIZ_PROGRESS_KEY = 'safeneighbor_legal_quiz_progress';
export const LEGAL_QUIZ_SESSION_KEY = 'safeneighbor_legal_quiz_session';
export const LEGAL_QUIZ_RECENT_ROUND_KEY = 'safeneighbor_legal_quiz_recent_round';
export const LEGAL_QUIZ_LAUNCH_KEY = 'safeneighbor_legal_quiz_launch_intent';
export const LEGAL_QUIZ_RETURN_KEY = 'safeneighbor_legal_quiz_return_intent';

const defaultQuizProgress = {
  missedIds: [],
  reinforcementIds: [],
  lastScore: null,
  completedAt: null,
  lastReviewedByDeck: {},
  deckHistory: {},
};

export const readLegalQuizProgress = () => {
  try {
    const raw = localStorage.getItem(LEGAL_QUIZ_PROGRESS_KEY);
    return raw ? { ...defaultQuizProgress, ...JSON.parse(raw) } : defaultQuizProgress;
  } catch (error) {
    console.warn('Failed to read legal quiz progress', error);
    return defaultQuizProgress;
  }
};

export const writeLegalQuizProgress = (progress) => {
  try {
    localStorage.setItem(
      LEGAL_QUIZ_PROGRESS_KEY,
      JSON.stringify({
        ...defaultQuizProgress,
        ...progress,
      })
    );
  } catch (error) {
    console.warn('Failed to store legal quiz progress', error);
  }
};

export const writeLegalQuizLaunchIntent = (intent) => {
  try {
    localStorage.setItem(
      LEGAL_QUIZ_LAUNCH_KEY,
      JSON.stringify({
        ...intent,
        launchId: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        createdAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.warn('Failed to store legal quiz launch intent', error);
  }
};

export const consumeLegalQuizLaunchIntent = () => {
  try {
    const raw = localStorage.getItem(LEGAL_QUIZ_LAUNCH_KEY);
    if (!raw) return null;
    localStorage.removeItem(LEGAL_QUIZ_LAUNCH_KEY);
    return JSON.parse(raw);
  } catch (error) {
    console.warn('Failed to consume legal quiz launch intent', error);
    return null;
  }
};

export const readLegalQuizReturnIntent = () => {
  try {
    const raw = localStorage.getItem(LEGAL_QUIZ_RETURN_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch (error) {
    console.warn('Failed to read legal quiz return intent', error);
    return null;
  }
};

export const writeLegalQuizReturnIntent = (intent) => {
  try {
    localStorage.setItem(
      LEGAL_QUIZ_RETURN_KEY,
      JSON.stringify({
        ...intent,
        createdAt: new Date().toISOString(),
      })
    );
  } catch (error) {
    console.warn('Failed to store legal quiz return intent', error);
  }
};

export const clearLegalQuizReturnIntent = () => {
  try {
    localStorage.removeItem(LEGAL_QUIZ_RETURN_KEY);
  } catch (error) {
    console.warn('Failed to clear legal quiz return intent', error);
  }
};
