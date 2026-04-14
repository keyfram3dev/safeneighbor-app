import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { CheckCircle, XCircle, X, ArrowClockwise, Scroll, Lightning, ShieldCheck, CaretRight, ArrowLeft, Bell, BellSlash, ChartBar } from '@phosphor-icons/react';
import {
  LEGAL_QUIZ_MIXED_TOTAL,
  legalQuizQuestions,
  legalQuizDecks,
  getLegalQuizRightsTarget,
  getLegalQuizScenarioTarget,
  getLegalQuizQuestionsByCategory,
  getLegalQuizQuestionsByDeck,
} from '../data/legalQuizData';
import {
  LEGAL_QUIZ_SESSION_KEY,
  LEGAL_QUIZ_RECENT_ROUND_KEY,
  readLegalQuizProgress,
  writeLegalQuizProgress,
  writeLegalQuizReturnIntent,
  clearLegalQuizReturnIntent,
} from '../utils/trainingLaunch';
import {
  isPushSupported,
  getPermissionState,
  subscribeToPush,
  getExistingSubscription,
  registerTrainingReminder,
  clearTrainingReminder,
} from '../utils/pushSubscription';

const DECK_LABELS = {
  constitutional: 'Constitution',
  scenarios: 'Scenarios',
  witnessing: 'Community Witnessing',
  signals: 'Signals',
  'unsafe-responses': 'Avoid Mistakes',
  'phrase-recall': 'Exact Phrases',
  'ice-encounters': 'ICE Encounters',
  'traffic-stops': 'Traffic Stops',
  'protest-rights': 'Protest Rights',
  'first-aid': 'First Aid',
  'de-escalation': 'De-escalation',
};

const shuffle = (items) => {
  const next = [...items];
  for (let i = next.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [next[i], next[j]] = [next[j], next[i]];
  }
  return next;
};

const readJsonStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch (error) {
    console.warn(`Failed to read ${key}`, error);
    return fallback;
  }
};

const writeJsonStorage = (key, value) => {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.warn(`Failed to write ${key}`, error);
  }
};

const getRecentRoundIds = () => readJsonStorage(LEGAL_QUIZ_RECENT_ROUND_KEY, []);

const setRecentRoundIds = (ids) => {
  writeJsonStorage(LEGAL_QUIZ_RECENT_ROUND_KEY, ids);
};

const getStoredSession = () => readJsonStorage(LEGAL_QUIZ_SESSION_KEY, null);

const storeSession = (session) => {
  writeJsonStorage(LEGAL_QUIZ_SESSION_KEY, session);
};

const clearStoredSession = () => {
  try {
    localStorage.removeItem(LEGAL_QUIZ_SESSION_KEY);
  } catch (error) {
    console.warn('Failed to clear legal quiz session', error);
  }
};

const pickQuestions = (pool, count, recentIds, { srsData = {}, lastScore = null } = {}) => {
  const now = Date.now();
  const freshPool = pool.filter((question) => !recentIds.has(question.id));

  // Partition: SRS-due questions get priority over not-yet-due
  const dueFresh = freshPool.filter((question) => {
    const srs = srsData[question.id];
    return srs && new Date(srs.dueDate).getTime() <= now;
  });
  const notDueFresh = freshPool.filter((question) => {
    const srs = srsData[question.id];
    return !srs || new Date(srs.dueDate).getTime() > now;
  });

  // Adaptive difficulty: order not-due items by difficulty preference based on recent score
  const orderByDifficulty = (items) => {
    if (!lastScore || items.length <= 1) return shuffle(items);
    const diffOrder = lastScore >= 85
      ? ['hard', 'medium', 'easy']
      : lastScore < 50
        ? ['easy', 'medium', 'hard']
        : null;
    if (!diffOrder) return shuffle(items);
    const grouped = { hard: [], medium: [], easy: [] };
    items.forEach((question) => {
      const d = question.difficulty || 'medium';
      (grouped[d] || grouped.medium).push(question);
    });
    return diffOrder.flatMap((d) => shuffle(grouped[d]));
  };

  const firstPass = [...shuffle(dueFresh), ...orderByDifficulty(notDueFresh)].slice(0, count);

  if (firstPass.length >= count) return firstPass;

  const picked = new Set(firstPass.map((question) => question.id));
  const remainder = shuffle(pool.filter((question) => !picked.has(question.id))).slice(0, count - firstPass.length);
  return [...firstPass, ...remainder];
};

const buildMixedQuiz = () => {
  const progress = getStoredProgress();
  const recentIds = new Set(getRecentRoundIds());
  const pickOpts = { srsData: progress.srsData || {}, lastScore: progress.lastScore };
  const countsByDeck = [
    [legalQuizDecks.constitutional,  4],
    [legalQuizDecks.scenarios,       4],
    [legalQuizDecks.witnessing,      2],
    [legalQuizDecks.signals,         2],
    [legalQuizDecks.unsafeResponses, 2],
    [legalQuizDecks.phraseRecall,    2],
    [legalQuizDecks.iceEncounters,   4],
    [legalQuizDecks.trafficStops,    4],
    [legalQuizDecks.protestRights,   4],
    [legalQuizDecks.deEscalation,    2],
  ];

  const mixed = shuffle(
    countsByDeck.flatMap(([deck, count]) =>
      pickQuestions(
        legalQuizQuestions.filter((question) => question.deck === deck),
        count,
        recentIds,
        pickOpts
      )
    )
  ).slice(0, LEGAL_QUIZ_MIXED_TOTAL);

  setRecentRoundIds(mixed.map((question) => question.id));
  return mixed;
};

const buildDeckQuiz = (deck, count = 12) => {
  const progress = getStoredProgress();
  const recentIds = new Set(getRecentRoundIds());
  const pickOpts = { srsData: progress.srsData || {}, lastScore: progress.lastScore };
  const pool = getLegalQuizQuestionsByDeck(deck);
  const picked = deck === legalQuizDecks.phraseRecall
    ? shuffle(pool)
    : pickQuestions(pool, Math.min(count, pool.length), recentIds, pickOpts);
  setRecentRoundIds(picked.map((question) => question.id));
  return shuffle(picked);
};

const buildFilteredQuiz = ({
  deckId = null,
  categories = [],
  tags = [],
  count = 10,
}) => {
  const progress = getStoredProgress();
  const recentIds = new Set(getRecentRoundIds());
  const pickOpts = { srsData: progress.srsData || {}, lastScore: progress.lastScore };
  const normalizedCategories = new Set(categories.filter(Boolean));
  const normalizedTags = new Set(tags.filter(Boolean));

  let pool = legalQuizQuestions.filter((question) => {
    if (deckId && question.deck !== deckId) return false;
    if (normalizedCategories.size && !normalizedCategories.has(question.category)) return false;
    if (normalizedTags.size && !question.tags?.some((tag) => normalizedTags.has(tag))) return false;
    return true;
  });

  if (!pool.length && normalizedCategories.size && deckId === legalQuizDecks.scenarios) {
    pool = categories.flatMap((category) => getLegalQuizQuestionsByCategory(category));
  }

  if (!pool.length) {
    return deckId ? buildDeckQuiz(deckId, count) : buildMixedQuiz();
  }

  const picked = pickQuestions(pool, Math.min(count, pool.length), recentIds, pickOpts);
  setRecentRoundIds(picked.map((question) => question.id));
  return shuffle(picked);
};

const drillConfigs = [
  {
    id: 'starter',
    title: 'Mixed practice round',
    description: 'A fuller round across rights, scenarios, witnessing, signals, mistakes, and core phrases. The order shifts so memory has to arrive fresh.',
    accent: 'border-cyan-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-cyan-950/18',
    getQuestions: () => buildMixedQuiz(),
  },
  {
    id: 'constitutional',
    title: 'Constitution sprint',
    description: 'Return to the constitutional ground beneath speech, search, silence, counsel, and due process.',
    accent: 'border-violet-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-violet-950/18',
    getQuestions: () => buildDeckQuiz(legalQuizDecks.constitutional, 12),
  },
  {
    id: 'scenarios',
    title: 'Scenario practice',
    description: 'Rehearse the language that matters at the door, on the street, in a vehicle, at work, and near checkpoints.',
    accent: 'border-sky-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-sky-950/18',
    getQuestions: () => buildDeckQuiz(legalQuizDecks.scenarios, 12),
  },
  {
    id: 'phrases',
    title: 'Fast phrases',
    description: 'Keep the short lines close enough that they still arrive intact when the room gets loud.',
    accent: 'border-emerald-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-emerald-950/18',
    getQuestions: () => buildDeckQuiz(legalQuizDecks.phraseRecall),
  },
  {
    id: 'witnessing',
    title: 'Witness response',
    description: 'Practice distance, documentation, and witness language that keeps the record steadier than the moment around it.',
    accent: 'border-teal-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-teal-950/18',
    getQuestions: () => buildDeckQuiz(legalQuizDecks.witnessing, 10),
  },
  {
    id: 'signals',
    title: 'Signals drill',
    description: 'Rehearse alert ladders, visible backup, and the quiet move from attention into orientation.',
    accent: 'border-blue-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-blue-950/18',
    getQuestions: () => buildDeckQuiz(legalQuizDecks.signals, 10),
  },
  {
    id: 'ice-encounters',
    title: 'ICE encounters',
    description: 'Know your rights before, during, and after an ICE encounter — at the door, on the street, at work, and in detention.',
    accent: 'border-orange-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-orange-950/18',
    getQuestions: () => buildDeckQuiz(legalQuizDecks.iceEncounters, 10),
  },
  {
    id: 'traffic-stops',
    title: 'Traffic stops',
    description: 'What to say, what to hand over, and what to refuse during a vehicle stop as a driver or passenger.',
    accent: 'border-yellow-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-yellow-950/18',
    getQuestions: () => buildDeckQuiz(legalQuizDecks.trafficStops, 10),
  },
  {
    id: 'protest-rights',
    title: 'Protest rights',
    description: 'Permits, dispersal orders, recording police, arrests, and how to prepare before you hit the street.',
    accent: 'border-purple-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-purple-950/18',
    getQuestions: () => buildDeckQuiz(legalQuizDecks.protestRights, 10),
  },
  {
    id: 'first-aid',
    title: 'First aid',
    description: 'Bleeding, shock, heat, seizures, overdose, tear gas exposure, and when to call 911.',
    accent: 'border-rose-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-rose-950/18',
    getQuestions: () => buildDeckQuiz(legalQuizDecks.firstAid, 10),
  },
  {
    id: 'de-escalation',
    title: 'De-escalation',
    description: 'Language, body posture, active listening, bystander tactics, and when leaving is the right call.',
    accent: 'border-teal-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-teal-950/18',
    getQuestions: () => buildDeckQuiz(legalQuizDecks.deEscalation, 10),
  },
];

const getStoredProgress = () => {
  return readLegalQuizProgress();
};

const storeProgress = (progress) => {
  writeLegalQuizProgress(progress);
};

const PhraseRecall = ({ question, answer, setAnswer, submitted, isCorrect }) => {
  const pool = useMemo(
    () => shuffle([
      ...question.answerTokens.map((token, index) => ({ id: `a-${index}-${token}`, text: token, kind: 'answer' })),
      ...question.distractorTokens.map((token, index) => ({ id: `d-${index}-${token}`, text: token, kind: 'distractor' })),
    ]),
    [question]
  );

  const answerIds = answer.map((token) => token.id);

  const handleTokenTap = (token) => {
    if (submitted) return;
    const existingIndex = answer.findIndex((item) => item.id === token.id);
    if (existingIndex >= 0) {
      const next = [...answer];
      next.splice(existingIndex, 1);
      setAnswer(next);
      return;
    }
    setAnswer([...answer, token]);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-[22px] border border-slate-800/80 bg-slate-950/72 p-4">
        <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300/80">Build the phrase</p>
        <div className="mt-3 min-h-[88px] rounded-[18px] border border-slate-700/70 bg-slate-900/80 px-4 py-3">
          {answer.length ? (
            <div className="flex flex-wrap gap-2">
              {answer.map((token) => (
                <button
                  key={token.id}
                  type="button"
                  onClick={() => handleTokenTap(token)}
                  className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                    submitted
                      ? isCorrect
                        ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-100'
                        : 'border-rose-500/40 bg-rose-500/15 text-rose-100'
                      : 'border-cyan-500/30 bg-cyan-500/10 text-cyan-100 hover:border-cyan-400/50'
                  }`}
                >
                  {token.text}
                </button>
              ))}
            </div>
          ) : (
            <p className="text-sm text-slate-500">Tap the words in order.</p>
          )}
        </div>
      </div>

      {!submitted && (
        <div className="rounded-[22px] border border-slate-800/80 bg-slate-950/55 p-4">
          <p className="mb-3 text-[11px] font-black uppercase tracking-[0.18em] text-slate-400">Word bank</p>
          <div className="flex flex-wrap gap-2">
            {pool.map((token) => (
              <button
                key={token.id}
                type="button"
                onClick={() => handleTokenTap(token)}
                className={`rounded-full border px-3 py-1.5 text-sm font-semibold transition-colors ${
                  answerIds.includes(token.id)
                    ? 'border-slate-700/80 bg-slate-900 text-slate-500'
                    : 'border-slate-700/70 bg-slate-900/90 text-slate-200 hover:border-slate-500/80'
                }`}
              >
                {token.text}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

function LegalQuiz({ isOpen, onClose, onJumpToRights, onOpenScenarios, launchIntent = null }) {
  const prefersReducedMotion = useReducedMotion();
  const [mode, setMode] = useState('intro');
  const [questions, setQuestions] = useState([]);
  const [index, setIndex] = useState(0);
  const [selectedChoiceId, setSelectedChoiceId] = useState(null);
  const [phraseAnswer, setPhraseAnswer] = useState([]);
  const [confidenceLevel, setConfidenceLevel] = useState(null);
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState([]);
  const [progress, setProgress] = useState(() => getStoredProgress());
  const [appliedLaunchId, setAppliedLaunchId] = useState(null);
  const [remindersEnabled, setRemindersEnabled] = useState(() => localStorage.getItem('safeneighbor_training_reminders') === 'on');
  const [reminderLoading, setReminderLoading] = useState(false);
  const [reminderStatus, setReminderStatus] = useState(null); // 'success' | 'error' | null

  useEffect(() => {
    if (!isOpen) return;
    setProgress(getStoredProgress());
    const session = getStoredSession();

    if (session?.questionIds?.length) {
      const restoredQuestions = session.questionIds
        .map((id) => legalQuizQuestions.find((question) => question.id === id))
        .filter(Boolean);

      if (restoredQuestions.length) {
        setQuestions(restoredQuestions);
        setIndex(Math.min(session.index || 0, Math.max(restoredQuestions.length - 1, 0)));
        setSelectedChoiceId(session.selectedChoiceId || null);
        setPhraseAnswer(session.phraseAnswer || []);
        setConfidenceLevel(session.confidenceLevel || null);
        setSubmitted(Boolean(session.submitted));
        setResults(session.results || []);
        setMode('quiz');
        return;
      }
    }

    setMode('intro');
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isOpen]);

  const currentQuestion = questions[index];
  const totalQuestions = questions.length;

  const phraseAttempt = phraseAnswer.map((token) => token.text).join(' ').replace(/\s([?.!,])/g, '$1');
  const expectedPhrase = currentQuestion?.answerTokens?.join(' ');
  const isCurrentCorrect = currentQuestion?.type === 'phraseRecall'
    ? phraseAttempt.trim() === expectedPhrase?.trim()
    : selectedChoiceId === currentQuestion?.correctChoiceId;

  const resetSessionState = useCallback((nextQuestions) => {
    clearLegalQuizReturnIntent();
    setQuestions(nextQuestions);
    setIndex(0);
    setSelectedChoiceId(null);
    setPhraseAnswer([]);
    setConfidenceLevel(null);
    setSubmitted(false);
    setResults([]);
    setMode('quiz');
  }, []);

  const startStarterQuiz = useCallback(() => {
    resetSessionState(buildMixedQuiz());
  }, [resetSessionState]);

  const startConfiguredQuiz = useCallback((configId) => {
    const config = drillConfigs.find((item) => item.id === configId);
    if (!config) {
      startStarterQuiz();
      return;
    }
    resetSessionState(config.getQuestions());
  }, [resetSessionState, startStarterQuiz]);

  const startFilteredQuiz = useCallback((filters) => {
    resetSessionState(buildFilteredQuiz(filters || {}));
  }, [resetSessionState]);

  const startMissedQuiz = useCallback(() => {
    const reviewIds = Array.from(new Set([...(progress.missedIds || []), ...(progress.reinforcementIds || [])]));
    const missedQuestions = reviewIds
      .map((id) => legalQuizQuestions.find((question) => question.id === id))
      .filter(Boolean);

    if (!missedQuestions.length) {
      startStarterQuiz();
      return;
    }

    resetSessionState(missedQuestions);
  }, [progress.missedIds, progress.reinforcementIds, resetSessionState, startStarterQuiz]);

  useEffect(() => {
    if (!isOpen || !launchIntent?.launchId || launchIntent.launchId === appliedLaunchId) return;
    setAppliedLaunchId(launchIntent.launchId);

    if (launchIntent.mode === 'resume') {
      return;
    }

    clearStoredSession();

    if (launchIntent.mode === 'review') {
      startMissedQuiz();
      return;
    }

    if (launchIntent.mode === 'deck' && launchIntent.deckId) {
      startConfiguredQuiz(launchIntent.deckId);
      return;
    }

    if (launchIntent.mode === 'filtered') {
      startFilteredQuiz(launchIntent);
      return;
    }

    if (launchIntent.mode === 'intro') {
      setMode('intro');
      return;
    }

    startStarterQuiz();
  }, [appliedLaunchId, isOpen, launchIntent, startConfiguredQuiz, startFilteredQuiz, startMissedQuiz, startStarterQuiz]);

  const rememberQuizReturn = useCallback((destination) => {
    if (!currentQuestion) return;
    writeLegalQuizReturnIntent({
      questionId: currentQuestion.id,
      destination,
      prompt: currentQuestion.prompt,
      deck: currentQuestion.deck,
      category: currentQuestion.category,
    });
  }, [currentQuestion]);

  const handleOpenRightsReview = useCallback(() => {
    const amendmentId = getLegalQuizRightsTarget(currentQuestion);
    if (!amendmentId) return;
    rememberQuizReturn({
      type: 'rights',
      amendmentId,
      label: 'Return to quiz',
    });
    onJumpToRights?.(amendmentId);
  }, [currentQuestion, onJumpToRights, rememberQuizReturn]);

  const handleOpenScenarioGuide = useCallback(() => {
    const scenarioId = getLegalQuizScenarioTarget(currentQuestion);
    if (!scenarioId) return;
    rememberQuizReturn({
      type: 'scenario',
      scenarioId,
      label: 'Return to quiz',
    });
    onOpenScenarios?.(scenarioId);
  }, [currentQuestion, onOpenScenarios, rememberQuizReturn]);

  useEffect(() => {
    if (!isOpen || mode !== 'quiz' || !questions.length) return;

    storeSession({
      questionIds: questions.map((question) => question.id),
      index,
      selectedChoiceId,
      phraseAnswer,
      confidenceLevel,
      submitted,
      results,
      savedAt: Date.now(),
    });
  }, [confidenceLevel, index, isOpen, mode, phraseAnswer, questions, results, selectedChoiceId, submitted]);

  const handleSubmit = () => {
    if (!currentQuestion) return;
    if (currentQuestion.type === 'multipleChoice' && !selectedChoiceId) return;
    if (currentQuestion.type === 'phraseRecall' && !phraseAnswer.length) return;
    setSubmitted(true);
  };

  const finalizeQuiz = (nextResults) => {
    const completedAt = new Date().toISOString();
    const now = Date.now();
    const missedIds = nextResults.filter((result) => !result.correct).map((result) => result.id);
    const reinforcementIds = nextResults
      .filter((result) => !result.correct || result.confidence === 'unsure')
      .map((result) => result.id);
    const score = Math.round((nextResults.filter((result) => result.correct).length / nextResults.length) * 100);
    const deckStats = nextResults.reduce((acc, result) => {
      acc[result.deck] = acc[result.deck] || { total: 0, correct: 0, reinforcement: 0, steady: 0 };
      acc[result.deck].total += 1;
      if (result.correct) acc[result.deck].correct += 1;
      if (result.correct && result.confidence === 'steady') acc[result.deck].steady += 1;
      if (!result.correct || result.confidence === 'unsure') acc[result.deck].reinforcement += 1;
      return acc;
    }, {});

    // SRS (SM-2 simplified) + per-question attempt logging
    const updatedSrsData = { ...(progress.srsData || {}) };
    const updatedQuestionHistory = { ...(progress.questionHistory || {}) };
    for (const result of nextResults) {
      const prev = updatedSrsData[result.id] || { interval: 1, easeFactor: 2.5, repetitions: 0 };
      let { interval, easeFactor, repetitions } = prev;
      if (!result.correct) {
        // Wrong: reset interval, reduce ease
        interval = 1;
        easeFactor = Math.max(1.3, easeFactor - 0.2);
        repetitions = 0;
      } else if (result.confidence === 'steady') {
        // Correct + confident: advance interval (SM-2 schedule)
        if (repetitions === 0) interval = 1;
        else if (repetitions === 1) interval = 4;
        else interval = Math.round(interval * easeFactor);
        easeFactor = Math.min(3.0, easeFactor + 0.1);
        repetitions += 1;
      } else {
        // Correct but unsure: shorten interval, don't advance ease
        interval = Math.max(1, Math.round(interval * 0.6));
        repetitions = Math.max(0, repetitions - 1);
      }
      const dueDate = new Date(now + interval * 24 * 60 * 60 * 1000).toISOString();
      updatedSrsData[result.id] = { interval, easeFactor, repetitions, dueDate };

      const prevHistory = updatedQuestionHistory[result.id] || { attempts: 0, correct: 0 };
      updatedQuestionHistory[result.id] = {
        attempts: prevHistory.attempts + 1,
        correct: prevHistory.correct + (result.correct ? 1 : 0),
        lastResult: result.correct ? 'correct' : 'incorrect',
        lastConfidence: result.confidence,
        lastAttemptedAt: completedAt,
      };
    }

    const nextProgress = {
      ...progress,
      missedIds,
      reinforcementIds,
      lastScore: score,
      completedAt,
      lastReviewedByDeck: {
        ...(progress.lastReviewedByDeck || {}),
        ...Object.fromEntries(Object.keys(deckStats).map((deck) => [deck, completedAt])),
      },
      deckHistory: {
        ...(progress.deckHistory || {}),
        ...Object.fromEntries(
          Object.entries(deckStats).map(([deck, stats]) => [
            deck,
            {
              completedAt,
              lastScore: Math.round((stats.correct / stats.total) * 100),
              correct: stats.correct,
              total: stats.total,
              steady: stats.steady,
              needsReinforcement: stats.reinforcement,
            },
          ])
        ),
      },
      srsData: updatedSrsData,
      questionHistory: updatedQuestionHistory,
    };
    setProgress(nextProgress);
    storeProgress(nextProgress);
    clearLegalQuizReturnIntent();
    clearStoredSession();
    setMode('results');
  };

  const handleNext = () => {
    const result = {
      id: currentQuestion.id,
      correct: isCurrentCorrect,
      deck: currentQuestion.deck,
      confidence: confidenceLevel || 'unsure',
    };
    const nextResults = [...results, result];
    setResults(nextResults);

    if (index === questions.length - 1) {
      finalizeQuiz(nextResults);
      return;
    }

    setIndex(index + 1);
    setSelectedChoiceId(null);
    setPhraseAnswer([]);
    setConfidenceLevel(null);
    setSubmitted(false);
  };

  const correctCount = results.filter((result) => result.correct).length;
  const score = results.length ? Math.round((correctCount / results.length) * 100) : progress.lastScore || 0;
  const reinforcementQuestions = results
    .filter((result) => !result.correct || result.confidence === 'unsure')
    .map((result) => legalQuizQuestions.find((question) => question.id === result.id))
    .filter(Boolean);
  const reinforcementCount = reinforcementQuestions.length;

  const recommendations = useMemo(() => {
    const missedDecks = new Set(reinforcementQuestions.map((question) => question.deck));
    const missedTags = new Set(reinforcementQuestions.flatMap((question) => question.tags || []));
    const next = [];
    const firstRightsTarget = reinforcementQuestions.map((question) => getLegalQuizRightsTarget(question)).find(Boolean);
    const firstScenarioTarget = reinforcementQuestions.map((question) => getLegalQuizScenarioTarget(question)).find(Boolean);

    if (missedDecks.has(legalQuizDecks.constitutional)) {
      next.push({
        id: 'rights',
        eyebrow: 'Review rights',
        title: 'Revisit the constitutional protections section',
        description: 'Go back through the amendment cards and refresh the exact protections tied to search, silence, counsel, recording, and due process.',
        actionLabel: 'Open Rights',
        onClick: () => onJumpToRights?.(firstRightsTarget),
      });
    }

    if (missedDecks.has(legalQuizDecks.scenarios) || missedTags.has('scenario')) {
      next.push({
        id: 'scenarios',
        eyebrow: 'Scenario practice',
        title: 'Run the live encounter guides again',
        description: 'Return to the full encounter walkthroughs and rehearse the language that belongs at the door, on the street, in vehicles, at work, or at checkpoints.',
        actionLabel: 'Open Scenarios',
        onClick: () => onOpenScenarios?.(firstScenarioTarget),
      });
    }

    if (missedDecks.has(legalQuizDecks.witnessing) || missedTags.has('witness')) {
      next.push({
        id: 'witnessing',
        eyebrow: 'Witness practice',
        title: 'Return to witness posture and documentation drills',
        description: 'Go back through witness distance, observation, and response language until the role feels steadier under pressure.',
        actionLabel: 'Drill Witnessing',
        onClick: () => startConfiguredQuiz('witnessing'),
      });
    }

    if (missedDecks.has(legalQuizDecks.signals) || missedTags.has('signals')) {
      next.push({
        id: 'signals',
        eyebrow: 'Signals practice',
        title: 'Run the shared signal ladder again',
        description: 'Revisit the alert patterns, visible backup, and de-escalation sequence until the system feels teachable in a sentence.',
        actionLabel: 'Drill Signals',
        onClick: () => startConfiguredQuiz('signals'),
      });
    }

    if (missedDecks.has(legalQuizDecks.phraseRecall) || missedTags.has('phrase')) {
      next.push({
        id: 'phrases',
        eyebrow: 'Exact wording',
        title: 'Drill the fast phrases again',
        description: 'Repeat the short, direct lines until they come back without strain and without improvisation.',
        actionLabel: 'Drill Fast Phrases',
        onClick: () => startConfiguredQuiz('phrases'),
      });
    }

    const staleDeckOrder = [
      legalQuizDecks.scenarios,
      legalQuizDecks.witnessing,
      legalQuizDecks.signals,
      legalQuizDecks.constitutional,
      legalQuizDecks.phraseRecall,
    ];
    const staleDeck = staleDeckOrder.find((deck) => {
      const completedAt = progress?.lastReviewedByDeck?.[deck];
      if (!completedAt) return true;
      const age = Math.floor((Date.now() - new Date(completedAt).getTime()) / (24 * 60 * 60 * 1000));
      return age >= (deck === legalQuizDecks.phraseRecall ? 7 : 14);
    });

    if (!next.length && staleDeck === legalQuizDecks.scenarios) {
      next.push({
        id: 'stale-scenarios',
        eyebrow: 'Keep it warm',
        title: 'Return to scenario language before it drifts',
        description: 'A calm pass through door, street, vehicle, work, and checkpoint responses keeps the first sentences easier to reach later.',
        actionLabel: 'Open Scenario Drill',
        onClick: () => startConfiguredQuiz('scenarios'),
      });
    }

    if (!next.length && staleDeck === legalQuizDecks.witnessing) {
      next.push({
        id: 'stale-witness',
        eyebrow: 'Keep it warm',
        title: 'Refresh witness posture and documentation',
        description: 'Witnessing is strongest when distance, language, and observation feel settled before the moment begins.',
        actionLabel: 'Open Witness Drill',
        onClick: () => startConfiguredQuiz('witnessing'),
      });
    }

    if (!next.length && staleDeck === legalQuizDecks.signals) {
      next.push({
        id: 'stale-signals',
        eyebrow: 'Keep it warm',
        title: 'Rehearse the shared signal ladder again',
        description: 'A signal system is easier to trust when the group can still say what each pattern means without hesitation.',
        actionLabel: 'Open Signals Drill',
        onClick: () => startConfiguredQuiz('signals'),
      });
    }

    if (!next.length && staleDeck === legalQuizDecks.phraseRecall) {
      next.push({
        id: 'stale-phrases',
        eyebrow: 'Keep it warm',
        title: 'Return to the shortest phrases',
        description: 'The smallest lines are often the first ones pressure tries to erase. Bring them back before that happens.',
        actionLabel: 'Drill Fast Phrases',
        onClick: () => startConfiguredQuiz('phrases'),
      });
    }

    if (!next.length) {
      next.push({
        id: 'keep-going',
        eyebrow: 'Keep it warm',
        title: 'Take another mixed round to keep the language fresh',
        description: 'A second pass lets the same protections settle deeper, so they return faster when pressure arrives.',
        actionLabel: 'Start Another Round',
        onClick: startStarterQuiz,
      });
    }

    return next.slice(0, 3);
  }, [onJumpToRights, onOpenScenarios, progress, reinforcementQuestions, startConfiguredQuiz, startStarterQuiz]);

  // ── SRS / Mastery stats (computed from current progress) ──
  const deckMastery = useMemo(() => {
    const srsData = progress.srsData || {};
    const map = {};
    legalQuizQuestions.forEach((q) => {
      if (!map[q.deck]) map[q.deck] = { mastered: 0, total: 0 };
      map[q.deck].total++;
      if ((srsData[q.id]?.repetitions || 0) >= 5) map[q.deck].mastered++;
    });
    return map;
  }, [progress]);

  const srsNow = Date.now();
  const srsValues = Object.values(progress.srsData || {});
  const srsDueNow = srsValues.filter((s) => s.dueDate && new Date(s.dueDate).getTime() <= srsNow).length;
  const srsDueSoon = srsValues.filter((s) => {
    const t = s.dueDate ? new Date(s.dueDate).getTime() : 0;
    return t > srsNow && t <= srsNow + 3 * 24 * 60 * 60 * 1000;
  }).length;
  const historyValues = Object.values(progress.questionHistory || {});
  const totalStudied = historyValues.length;
  const totalAttempts = historyValues.reduce((sum, h) => sum + (h.attempts || 0), 0);
  const totalCorrect = historyValues.reduce((sum, h) => sum + (h.correct || 0), 0);
  const overallAccuracy = totalAttempts > 0 ? Math.round((totalCorrect / totalAttempts) * 100) : null;
  const allFutureDueDates = srsValues
    .map((s) => (s.dueDate ? new Date(s.dueDate).getTime() : 0))
    .filter((t) => t > srsNow)
    .sort((a, b) => a - b);
  const nextReviewMs = allFutureDueDates[0] || null;
  const nextReviewLabel = nextReviewMs
    ? Math.floor((nextReviewMs - srsNow) / (24 * 60 * 60 * 1000)) === 0
      ? 'Today'
      : Math.floor((nextReviewMs - srsNow) / (24 * 60 * 60 * 1000)) === 1
        ? 'Tomorrow'
        : `In ${Math.floor((nextReviewMs - srsNow) / (24 * 60 * 60 * 1000))} days`
    : srsDueNow > 0
      ? 'Due now'
      : null;

  // Compute next review ISO string for reminder registration (min 6 hours from now)
  const computeNextReviewAt = useCallback((srsData) => {
    const vals = Object.values(srsData || {});
    const earliest = vals
      .map((s) => (s.dueDate ? new Date(s.dueDate).getTime() : 0))
      .filter((t) => t > 0)
      .sort((a, b) => a - b)[0];
    const minTime = Date.now() + 6 * 60 * 60 * 1000; // at least 6h from now
    return new Date(Math.max(earliest || minTime, minTime)).toISOString();
  }, []);

  const handleToggleReminders = useCallback(async () => {
    if (!isPushSupported()) {
      setReminderStatus('error');
      return;
    }

    if (remindersEnabled) {
      localStorage.setItem('safeneighbor_training_reminders', 'off');
      setRemindersEnabled(false);
      setReminderStatus(null);
      try {
        const sub = await getExistingSubscription();
        if (sub) clearTrainingReminder(sub);
      } catch {}
      return;
    }

    setReminderLoading(true);
    setReminderStatus(null);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setReminderStatus('error');
        setReminderLoading(false);
        return;
      }
      const sub = await subscribeToPush();
      if (!sub) throw new Error('No subscription');
      const nextReviewAt = computeNextReviewAt(progress.srsData);
      await registerTrainingReminder(sub, nextReviewAt);
      localStorage.setItem('safeneighbor_training_reminders', 'on');
      setRemindersEnabled(true);
      setReminderStatus('success');
    } catch {
      setReminderStatus('error');
    }
    setReminderLoading(false);
  }, [computeNextReviewAt, progress.srsData, remindersEnabled]);

  // When quiz finishes, sync next review time to server if reminders are on
  useEffect(() => {
    if (mode !== 'results' || !remindersEnabled) return;
    const srsData = progress.srsData;
    if (!srsData || !Object.keys(srsData).length) return;
    getExistingSubscription().then((sub) => {
      if (!sub) return;
      const nextReviewAt = computeNextReviewAt(srsData);
      registerTrainingReminder(sub, nextReviewAt).catch(() => {});
    });
  }, [mode, remindersEnabled, progress.srsData, computeNextReviewAt]);

  const handleBackToDrills = () => {
    setMode('intro');
  };

  const modalTransition = prefersReducedMotion
    ? { duration: 0.01 }
    : { duration: 0.28, ease: [0.22, 1, 0.36, 1] };

  const staggerContainer = prefersReducedMotion
    ? {}
    : {
        hidden: {},
        show: {
          transition: {
            staggerChildren: 0.06,
            delayChildren: 0.02,
          },
        },
      };

  const staggerItem = prefersReducedMotion
    ? {}
    : {
        hidden: { opacity: 0, y: 10 },
        show: {
          opacity: 1,
          y: 0,
          transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1] },
        },
      };

  const answerTap = prefersReducedMotion ? undefined : { scale: 0.995 };
  const answerHover = prefersReducedMotion ? undefined : { y: -2 };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        className="fixed inset-0 z-[120] flex items-center justify-center bg-slate-950/78 px-4 py-6 backdrop-blur-md"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, y: 22, scale: 0.982 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: 14, scale: 0.985 }}
          transition={modalTransition}
          className="relative flex max-h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-[30px] border border-slate-700/70 bg-gradient-to-br from-slate-950 via-slate-950/98 to-cyan-950/10 shadow-[0_32px_90px_rgba(2,6,23,0.55)]"
        >
          <div className="pointer-events-none absolute inset-x-10 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/35 to-transparent" />
          <div className="pointer-events-none absolute -right-12 top-0 h-44 w-44 rounded-full bg-cyan-500/10 blur-3xl" />

          <div className="flex items-center justify-between border-b border-slate-800/80 px-5 py-4 sm:px-6">
            <div className="flex items-center gap-3">
              <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_24px_rgba(34,211,238,0.14)]">
                <ShieldCheck size={24} weight="bold" />
              </div>
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300/80">Practice under pressure</p>
                <h2 className="text-xl font-black tracking-tight text-white sm:text-2xl">Rights & Response Quiz</h2>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {mode !== 'intro' && (
                <button
                  type="button"
                  onClick={handleBackToDrills}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/80 px-4 py-2.5 text-sm font-black uppercase tracking-[0.14em] text-slate-200 transition-colors hover:border-slate-500/70 hover:text-white"
                >
                  <ArrowLeft size={16} weight="bold" />
                  Back To Drills
                </button>
              )}
              <button
                type="button"
                onClick={onClose}
                className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-900/80 text-slate-300 transition-colors hover:border-slate-500/70 hover:text-white"
                aria-label="Close legal quiz"
              >
                <X size={24} weight="bold" />
              </button>
            </div>
          </div>

          <div className="overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 sm:py-6">
            {mode === 'intro' && (
              <motion.div
                variants={staggerContainer}
                initial="hidden"
                animate="show"
                className="grid gap-5 lg:grid-cols-[minmax(0,1.1fr)_320px]"
              >
                <motion.div variants={staggerContainer} className="space-y-5">
                  <motion.div variants={staggerItem} className="rounded-[26px] border border-slate-800/80 bg-slate-950/65 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300/80">What this trains</p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight text-white">What steadies the mind in pressure is usually something practiced before pressure arrived</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                      These drills are a place to return to rights, phrases, and encounter choices before urgency asks too much of memory. The goal is not speed for its own sake. It is steadiness, so the right sentence is still there when the room narrows.
                    </p>
                  </motion.div>

                  <motion.div variants={staggerContainer} className="grid gap-3 sm:grid-cols-2">
                    <motion.div variants={staggerItem} className="rounded-[22px] border border-violet-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-violet-950/18 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-violet-300">Constitution</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">Return to the constitutional ground beneath speech, search, silence, counsel, and due process.</p>
                    </motion.div>
                    <motion.div variants={staggerItem} className="rounded-[22px] border border-cyan-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-cyan-950/18 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-300">Scenario drills</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">Rehearse the sentences that matter at the door, on the street, in a vehicle, at work, or near checkpoints.</p>
                    </motion.div>
                    <motion.div variants={staggerItem} className="rounded-[22px] border border-rose-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-rose-950/18 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-rose-300">Avoid mistakes</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">Notice the sentence that gives too much away before it leaves your mouth.</p>
                    </motion.div>
                    <motion.div variants={staggerItem} className="rounded-[22px] border border-emerald-900/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-emerald-950/18 p-4">
                      <p className="text-[11px] font-black uppercase tracking-[0.16em] text-emerald-300">Exact phrases</p>
                      <p className="mt-2 text-sm leading-relaxed text-slate-300">Build the words in order until they feel closer to instinct than improvisation.</p>
                    </motion.div>
                  </motion.div>

                  <motion.div variants={staggerItem} className="space-y-3">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">Choose a drill</p>
                    <motion.div variants={staggerContainer} className="grid gap-3 sm:grid-cols-2">
                      {drillConfigs.map((config) => (
                        <motion.button
                          variants={staggerItem}
                          key={config.id}
                          type="button"
                          onClick={() => startConfiguredQuiz(config.id)}
                          whileHover={answerHover}
                          whileTap={answerTap}
                          className={`rounded-[22px] border p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-slate-500/70 ${config.accent}`}
                        >
                          <p className="text-sm font-black uppercase tracking-[0.14em] text-white">{config.title}</p>
                          <p className="mt-2 text-sm leading-relaxed text-slate-300">{config.description}</p>
                          <p className="mt-3 text-xs font-semibold text-cyan-300">Open drill</p>
                        </motion.button>
                      ))}
                    </motion.div>
                  </motion.div>

                  <motion.div variants={staggerItem} className="flex flex-col gap-3 sm:flex-row">
                    <motion.button
                      type="button"
                      onClick={startStarterQuiz}
                      whileHover={answerHover}
                      whileTap={answerTap}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_16px_34px_rgba(37,99,235,0.3)] transition-all hover:from-cyan-400 hover:to-blue-400 active:scale-[0.98]"
                    >
                      <Lightning size={18} weight="bold" />
                        Begin Mixed Practice
                    </motion.button>
                    <motion.button
                      type="button"
                      onClick={startMissedQuiz}
                      whileHover={answerHover}
                      whileTap={answerTap}
                      className="inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/80 px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-slate-100 transition-colors hover:border-slate-500/70 hover:text-white active:scale-[0.98]"
                    >
                      <ArrowClockwise size={18} weight="bold" />
                        Return To Reinforcement
                    </motion.button>
                  </motion.div>
                </motion.div>

                <motion.div variants={staggerContainer} className="space-y-4">
                  <motion.div variants={staggerItem} className="rounded-[26px] border border-slate-800/80 bg-slate-950/60 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Current session</p>
                    <div className="mt-4 space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Questions</span>
                        <span className="font-bold text-white">{LEGAL_QUIZ_MIXED_TOTAL}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Incorrect answers saved</span>
                        <span className="font-bold text-white">{progress.missedIds?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Needs reinforcement</span>
                        <span className="font-bold text-white">{progress.reinforcementIds?.length || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Last score</span>
                        <span className="font-bold text-white">{progress.lastScore ?? 'Not yet'}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-slate-400">Total quiz items</span>
                        <span className="font-bold text-white">{legalQuizQuestions.length}</span>
                      </div>
                    </div>
                  </motion.div>

                  <motion.div variants={staggerItem} className="rounded-[26px] border border-slate-800/80 bg-slate-950/60 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Fast first phrases</p>
                    <div className="mt-3 space-y-2">
                      {[
                        'I do not consent to any searches.',
                        'Am I free to leave?',
                        'I want to speak to a lawyer.',
                      ].map((phrase) => (
                        <div key={phrase} className="rounded-2xl border border-slate-700/70 bg-slate-900/90 px-3 py-2.5">
                          <p className="text-sm italic text-slate-200">“{phrase}”</p>
                        </div>
                      ))}
                    </div>
                    <button
                      type="button"
                      onClick={() => onJumpToRights?.('1st')}
                      className="mt-4 inline-flex items-center gap-2 text-sm font-semibold text-cyan-300 transition-colors hover:text-cyan-200"
                    >
                      <Scroll size={16} weight="bold" />
                      Jump to Rights section
                    </button>
                  </motion.div>
                </motion.div>
              </motion.div>
            )}

            {mode === 'quiz' && currentQuestion && (
              <div className="space-y-5">
                <div className="flex flex-col gap-3 rounded-[26px] border border-slate-800/80 bg-slate-950/60 p-5 sm:flex-row sm:items-end sm:justify-between">
                  <div>
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-cyan-300/80">
                      {DECK_LABELS[currentQuestion.deck] || 'Practice'}
                    </p>
                    <h3 className="mt-2 text-2xl font-black tracking-tight text-white">
                      Question {index + 1} of {totalQuestions}
                    </h3>
                    <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{currentQuestion.prompt}</p>
                  </div>
                  <div className="w-full max-w-[240px]">
                    <div className="mb-2 flex items-center justify-between text-xs font-bold uppercase tracking-[0.14em] text-slate-500">
                      <span>Progress</span>
                      <span>{Math.round(((index) / totalQuestions) * 100)}%</span>
                    </div>
                    <div className="h-2 rounded-full bg-slate-800">
                      <div
                        className="h-2 rounded-full bg-gradient-to-r from-cyan-400 to-blue-500 transition-[width] duration-300"
                        style={{ width: `${(index / totalQuestions) * 100}%` }}
                      />
                    </div>
                  </div>
                </div>

                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={currentQuestion.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -8 }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="space-y-5"
                  >
                    {currentQuestion.type === 'multipleChoice' ? (
                      <div className="grid gap-3">
                        {currentQuestion.choices.map((choice) => {
                          const isSelected = selectedChoiceId === choice.id;
                          const isCorrectChoice = submitted && currentQuestion.correctChoiceId === choice.id;
                          const isWrongSelected = submitted && isSelected && currentQuestion.correctChoiceId !== choice.id;
                          return (
                            <motion.button
                              key={choice.id}
                              type="button"
                              onClick={() => !submitted && setSelectedChoiceId(choice.id)}
                              whileHover={submitted ? undefined : answerHover}
                              whileTap={submitted ? undefined : answerTap}
                              className={`rounded-[22px] border px-4 py-4 text-left transition-all duration-200 ${
                                isCorrectChoice
                                  ? 'border-emerald-400/60 bg-[linear-gradient(135deg,rgba(16,185,129,0.22),rgba(6,95,70,0.14))] shadow-[0_22px_54px_rgba(16,185,129,0.16),inset_0_1px_0_rgba(255,255,255,0.08)] backdrop-blur-sm'
                                  : isWrongSelected
                                    ? 'border-rose-500/45 bg-rose-500/12'
                                    : isSelected
                                      ? 'border-cyan-500/45 bg-cyan-500/10'
                                      : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-600/70 hover:bg-slate-950/75'
                              }`}
                            >
                              <div className="flex items-start gap-3">
                                <div className={`mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-black uppercase ${
                                  isCorrectChoice
                                    ? 'border-emerald-300/60 bg-emerald-300/14 text-emerald-50 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]'
                                    : isWrongSelected
                                      ? 'border-rose-500/45 bg-rose-500/15 text-rose-100'
                                      : isSelected
                                        ? 'border-cyan-500/45 bg-cyan-500/15 text-cyan-100'
                                        : 'border-slate-700/80 bg-slate-900 text-slate-400'
                                }`}>
                                  {choice.id}
                                </div>
                                <p className="text-sm leading-relaxed text-slate-100">{choice.text}</p>
                              </div>
                            </motion.button>
                          );
                        })}
                      </div>
                    ) : (
                      <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={prefersReducedMotion ? { opacity: 0 } : { opacity: 0, y: -8 }}
                        transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                      >
                        <PhraseRecall
                          question={currentQuestion}
                          answer={phraseAnswer}
                          setAnswer={setPhraseAnswer}
                          submitted={submitted}
                          isCorrect={isCurrentCorrect}
                        />
                      </motion.div>
                    )}

                    {submitted && (
                      <motion.div
                        initial={prefersReducedMotion ? false : { opacity: 0, y: 12, scale: 0.99 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
                        className={`rounded-[24px] border p-5 ${
                        isCurrentCorrect
                          ? 'border-emerald-500/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-emerald-950/16'
                          : 'border-rose-500/35 bg-gradient-to-br from-slate-950 via-slate-950/98 to-rose-950/16'
                      }`}
                      >
                        <div className="flex items-start gap-3">
                          <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${
                            isCurrentCorrect
                              ? 'border-emerald-500/35 bg-emerald-500/12 text-emerald-300'
                              : 'border-rose-500/35 bg-rose-500/12 text-rose-300'
                          }`}>
                            {isCurrentCorrect ? <CheckCircle size={22} weight="fill" /> : <XCircle size={22} weight="fill" />}
                          </div>
                          <div className="flex-1">
                            <p className={`text-[11px] font-black uppercase tracking-[0.16em] ${
                              isCurrentCorrect ? 'text-emerald-300' : 'text-rose-300'
                            }`}>
                              {isCurrentCorrect ? 'Correct' : 'Review this one'}
                            </p>
                            <p className="mt-2 text-sm leading-relaxed text-slate-200">{currentQuestion.explanation}</p>
                            {(currentQuestion.reinforcementPhrase || currentQuestion.reinforcement) && (
                              <div className="mt-3 rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3">
                                <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">Remember</p>
                                <p className="mt-1 text-sm text-slate-100">
                                  {currentQuestion.reinforcementPhrase || currentQuestion.reinforcement}
                                </p>
                              </div>
                            )}
                            <div className="mt-4 rounded-2xl border border-slate-700/70 bg-slate-950/70 px-4 py-3">
                              <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-500">How did that feel?</p>
                              <p className="mt-1 text-sm leading-relaxed text-slate-300">
                                A correct answer that still felt shaky should come back sooner than one that felt settled.
                              </p>
                              <div className="mt-3 flex flex-col gap-2 sm:flex-row">
                                <button
                                  type="button"
                                  onClick={() => setConfidenceLevel('steady')}
                                  className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-colors ${
                                    confidenceLevel === 'steady'
                                      ? 'border-emerald-400/45 bg-emerald-500/14 text-emerald-100'
                                      : 'border-slate-700/70 bg-slate-900/80 text-slate-200 hover:border-emerald-400/30 hover:text-white'
                                  }`}
                                >
                                  <CheckCircle size={16} weight="fill" />
                                  Felt steady
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfidenceLevel('unsure')}
                                  className={`inline-flex items-center justify-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-bold transition-colors ${
                                    confidenceLevel === 'unsure'
                                      ? 'border-amber-400/45 bg-amber-500/14 text-amber-100'
                                      : 'border-slate-700/70 bg-slate-900/80 text-slate-200 hover:border-amber-400/30 hover:text-white'
                                  }`}
                                >
                                  <Lightning size={16} weight="fill" />
                                  Needs reinforcement
                                </button>
                              </div>
                            </div>
                            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
                              {getLegalQuizRightsTarget(currentQuestion) && (
                                <button
                                  type="button"
                                  onClick={handleOpenRightsReview}
                                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-violet-500/25 bg-violet-500/10 px-4 py-2.5 text-sm font-bold text-violet-100 transition-colors hover:border-violet-400/40 hover:bg-violet-500/15"
                                >
                                  <Scroll size={16} weight="bold" />
                                  Review Rights
                                </button>
                              )}
                              {getLegalQuizScenarioTarget(currentQuestion) && (
                                <button
                                  type="button"
                                  onClick={handleOpenScenarioGuide}
                                  className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/25 bg-cyan-500/10 px-4 py-2.5 text-sm font-bold text-cyan-100 transition-colors hover:border-cyan-400/40 hover:bg-cyan-500/15"
                                >
                                  <CaretRight size={16} weight="bold" />
                                  Open Scenario Guide
                                </button>
                              )}
                            </div>
                            {getLegalQuizScenarioTarget(currentQuestion) && (
                              <p className="mt-2 text-xs leading-relaxed text-slate-500">
                                Opening a guide keeps this round waiting where you left it. Use the return path in that section to come back to the next question.
                              </p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </motion.div>
                </AnimatePresence>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-900/80 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-slate-200 transition-colors hover:border-slate-500/70 hover:text-white"
                  >
                    Close
                  </button>
                  {!submitted ? (
                    <button
                      type="button"
                      onClick={handleSubmit}
                      disabled={currentQuestion.type === 'multipleChoice' ? !selectedChoiceId : !phraseAnswer.length}
                      className="inline-flex items-center justify-center rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition-all hover:from-cyan-400 hover:to-blue-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
                    >
                      Check Answer
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={handleNext}
                      disabled={!confidenceLevel}
                      className="inline-flex items-center justify-center rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition-all hover:from-cyan-400 hover:to-blue-400 active:scale-[0.98] disabled:cursor-not-allowed disabled:border-slate-700 disabled:bg-slate-800 disabled:text-slate-500 disabled:shadow-none"
                    >
                      {index === totalQuestions - 1 ? 'See Results' : 'Next Question'}
                    </button>
                  )}
                </div>
              </div>
            )}

            {mode === 'results' && (
              <div className="grid gap-5 lg:grid-cols-[minmax(0,1.08fr)_320px]">
                <div className="space-y-5">
                  <div className="rounded-[26px] border border-slate-800/80 bg-slate-950/65 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.18em] text-cyan-300/80">Session complete</p>
                    <h3 className="mt-2 text-3xl font-black tracking-tight text-white">{score}% ready</h3>
                    <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300">
                      You answered {correctCount} of {results.length} correctly. {reinforcementCount > 0 ? `${reinforcementCount} item${reinforcementCount === 1 ? ' still needs' : 's still need'} reinforcement before it is truly settled.` : 'What matters most is not a flawless first pass. It is whether the right language is easier to reach the next time pressure rises.'}
                    </p>
                  </div>

                  <div className="grid gap-3 sm:grid-cols-3">
                    {Object.entries(
                      results.reduce((acc, result) => {
                        acc[result.deck] = acc[result.deck] || { total: 0, correct: 0, reinforcement: 0 };
                        acc[result.deck].total += 1;
                        if (result.correct) acc[result.deck].correct += 1;
                        if (!result.correct || result.confidence === 'unsure') acc[result.deck].reinforcement += 1;
                        return acc;
                      }, {})
                    ).map(([deck, stats]) => (
                      <div key={deck} className="rounded-[22px] border border-slate-800/80 bg-slate-950/60 p-4">
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">{DECK_LABELS[deck] || deck}</p>
                        <p className="mt-2 text-xl font-black text-white">{stats.correct}/{stats.total}</p>
                        <p className={`mt-1 text-xs font-semibold ${stats.reinforcement > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                          {stats.reinforcement > 0 ? `${stats.reinforcement} need reinforcement` : 'Felt steady'}
                        </p>
                        {deckMastery[deck] && (
                          <p className={`mt-1 text-xs ${deckMastery[deck].mastered === deckMastery[deck].total ? 'text-emerald-400' : 'text-slate-600'}`}>
                            {deckMastery[deck].mastered}/{deckMastery[deck].total} mastered
                          </p>
                        )}
                      </div>
                    ))}
                  </div>

                  <div className="rounded-[26px] border border-slate-800/80 bg-slate-950/60 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Fast phrases to keep warm</p>
                    <div className="mt-3 space-y-2">
                      {[
                        'I do not consent to any searches.',
                        'Am I free to leave?',
                        'I am exercising my right to remain silent.',
                        'I want to speak to a lawyer.',
                      ].map((phrase) => (
                        <div key={phrase} className="rounded-2xl border border-slate-700/70 bg-slate-900/90 px-4 py-3">
                          <p className="text-sm text-slate-100">“{phrase}”</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-[26px] border border-slate-800/80 bg-slate-950/60 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Recommended next moves</p>
                    <div className="mt-3 space-y-3">
                      {recommendations.map((recommendation) => (
                        <div key={recommendation.id} className="rounded-[22px] border border-slate-700/70 bg-slate-900/85 p-4">
                          <p className="text-[11px] font-black uppercase tracking-[0.14em] text-cyan-300/85">{recommendation.eyebrow}</p>
                          <p className="mt-2 text-lg font-black tracking-tight text-white">{recommendation.title}</p>
                          <p className="mt-2 text-sm leading-relaxed text-slate-300">{recommendation.description}</p>
                          <button
                            type="button"
                            onClick={recommendation.onClick}
                            className="mt-3 inline-flex items-center gap-2 text-sm font-bold text-cyan-300 transition-colors hover:text-cyan-200"
                          >
                            {recommendation.actionLabel}
                            <CaretRight size={15} weight="bold" />
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="rounded-[26px] border border-slate-800/80 bg-slate-950/60 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Next step</p>
                    <div className="mt-4 flex flex-col gap-3">
                      <button
                        type="button"
                        onClick={startMissedQuiz}
                        className="inline-flex items-center justify-center gap-2 rounded-2xl border border-cyan-500/40 bg-gradient-to-r from-cyan-500 to-blue-500 px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-white shadow-[0_16px_34px_rgba(37,99,235,0.28)] transition-all hover:from-cyan-400 hover:to-blue-400 active:scale-[0.98]"
                      >
                        <ArrowClockwise size={18} weight="bold" />
                        Review Reinforcement
                      </button>
                      <button
                        type="button"
                        onClick={startStarterQuiz}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-900/80 px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-slate-100 transition-colors hover:border-slate-500/70 hover:text-white"
                      >
                        Start New Mixed Quiz
                      </button>
                      <button
                        type="button"
                        onClick={() => startConfiguredQuiz('phrases')}
                        className="inline-flex items-center justify-center rounded-2xl border border-slate-700/70 bg-slate-900/80 px-5 py-3.5 text-sm font-black uppercase tracking-[0.14em] text-slate-100 transition-colors hover:border-slate-500/70 hover:text-white"
                      >
                        Drill Fast Phrases
                      </button>
                    </div>
                  </div>

                  {(totalStudied > 0 || srsDueNow > 0) && (
                    <div className="rounded-[26px] border border-slate-800/80 bg-slate-950/60 p-5">
                      <div className="flex items-center gap-2">
                        <ChartBar size={15} weight="bold" className="text-cyan-400" />
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Your progress</p>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {overallAccuracy !== null && (
                          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 px-3 py-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">All-time accuracy</p>
                            <p className={`mt-1 text-lg font-black ${overallAccuracy >= 80 ? 'text-emerald-300' : overallAccuracy >= 60 ? 'text-amber-300' : 'text-rose-300'}`}>{overallAccuracy}%</p>
                          </div>
                        )}
                        {totalStudied > 0 && (
                          <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 px-3 py-2.5">
                            <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Questions practiced</p>
                            <p className="mt-1 text-lg font-black text-white">{totalStudied}</p>
                          </div>
                        )}
                        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Due for review</p>
                          <p className={`mt-1 text-lg font-black ${srsDueNow > 0 ? 'text-amber-300' : 'text-emerald-300'}`}>
                            {srsDueNow > 0 ? srsDueNow : '—'}
                          </p>
                        </div>
                        <div className="rounded-2xl border border-slate-700/70 bg-slate-900/80 px-3 py-2.5">
                          <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500">Next review</p>
                          <p className={`mt-1 text-sm font-black ${srsDueNow > 0 ? 'text-amber-300' : 'text-slate-200'}`}>
                            {nextReviewLabel || '—'}
                          </p>
                        </div>
                      </div>
                      {srsDueSoon > 0 && (
                        <p className="mt-3 text-xs text-slate-400">
                          {srsDueSoon} more question{srsDueSoon === 1 ? '' : 's'} coming up in the next 3 days.
                        </p>
                      )}
                    </div>
                  )}

                  {isPushSupported() && getPermissionState() !== 'denied' && (
                    <div className="rounded-[26px] border border-slate-800/80 bg-slate-950/60 p-5">
                      <div className="flex items-center gap-2">
                        <Bell size={15} weight="bold" className="text-cyan-400" />
                        <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Review reminders</p>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-400">
                        {remindersEnabled
                          ? 'You\'ll receive a push notification when questions are scheduled for review.'
                          : 'Get notified when spaced-repetition questions come due so reviews stay on schedule.'}
                      </p>
                      {reminderStatus === 'success' && (
                        <p className="mt-2 text-xs font-semibold text-emerald-400">Reminder set. You\'ll hear from us when review is due.</p>
                      )}
                      {reminderStatus === 'error' && (
                        <p className="mt-2 text-xs font-semibold text-rose-400">
                          {getPermissionState() === 'denied' ? 'Notification permission is blocked in your browser.' : 'Could not enable reminders. Check notification permissions.'}
                        </p>
                      )}
                      <button
                        type="button"
                        onClick={handleToggleReminders}
                        disabled={reminderLoading}
                        className={`mt-3 inline-flex items-center gap-2 rounded-2xl border px-4 py-2.5 text-sm font-black uppercase tracking-[0.12em] transition-colors disabled:opacity-50 ${
                          remindersEnabled
                            ? 'border-slate-600/70 bg-slate-800/80 text-slate-300 hover:border-slate-500/70 hover:text-white'
                            : 'border-cyan-500/40 bg-cyan-500/10 text-cyan-300 hover:border-cyan-400/50 hover:bg-cyan-500/15'
                        }`}
                      >
                        {remindersEnabled ? <BellSlash size={15} weight="bold" /> : <Bell size={15} weight="bold" />}
                        {reminderLoading ? 'Enabling…' : remindersEnabled ? 'Disable reminders' : 'Enable reminders'}
                      </button>
                    </div>
                  )}

                  <div className="rounded-[26px] border border-slate-800/80 bg-slate-950/60 p-5">
                    <p className="text-[11px] font-black uppercase tracking-[0.16em] text-slate-400">Needs more repetition</p>
                    {reinforcementQuestions.length ? (
                      <div className="mt-3 space-y-2">
                        {reinforcementQuestions.slice(0, 5).map((question) => (
                          <div key={question.id} className="rounded-2xl border border-slate-700/70 bg-slate-900/85 px-4 py-3">
                            <p className="text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                              {DECK_LABELS[question.deck] || question.deck}
                            </p>
                            <p className="mt-1 text-sm leading-relaxed text-slate-200">{question.prompt}</p>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="mt-3 text-sm leading-relaxed text-slate-300">This round landed cleanly and felt steady. Start another mixed round to keep the language and decisions close at hand.</p>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}

export default LegalQuiz;
