import React, { useEffect, useRef, useState } from 'react';
import { ChevronRight, Download, Settings, Brain } from 'lucide-react';
import { HandWaving, SparkleIcon as Sparkle, QuestionIcon as Question } from '@phosphor-icons/react';
import { AnimatePresence, motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import Disclaimer from './Disclaimer';
import InstallHelp from './InstallHelp';
import FaqCta from './FaqCta';
import { openGuardiansManualPDF } from '../utils/guardiansManualPDF';
import { useRotatingQuote } from '../utils/quoteRotation';
import { isPinEnabled } from '../utils/pinAuth';
import { getTrustedContacts } from '../utils/backup/accessGrants';
import { useReports } from '../contexts/ReportsContext';
import { getLastKnownLocation } from '../utils/locationShare';
import { calculateDistance } from '../utils/geo';
import { Door, MapPin, User, Megaphone, Leaf, VideoCamera, Car, Shield, Eye, Buildings, ClipboardTextIcon as ClipboardText, UsersThreeIcon as UsersThree, NotePencilIcon as NotePencil, FirstAidKitIcon as FirstAidKit, PathIcon as Path, ScalesIcon as Scales, TimerIcon as Timer, IdentificationCardIcon as IdentificationCard, BookOpenTextIcon as BookOpenText, ShieldCheck } from '@phosphor-icons/react';

const aniDelay = (s) => ({ animationDelay: `${s}s` });
const LAST_HOME_ACTION_KEY = 'safeneighbor_home_last_action';
const HOME_USAGE_KEY = 'safeneighbor_home_usage';
const HOME_REVIEW_KEY = 'safeneighbor_home_review_markers';
const DAY_MS = 24 * 60 * 60 * 1000;

const readHomeUsage = () => {
  try {
    const stored = localStorage.getItem(HOME_USAGE_KEY);
    if (!stored) return { counts: {}, lastById: {} };
    const parsed = JSON.parse(stored);
    return {
      counts: parsed?.counts || {},
      lastById: parsed?.lastById || {},
    };
  } catch {
    return { counts: {}, lastById: {} };
  }
};

const writeHomeUsage = (usage) => {
  try {
    localStorage.setItem(HOME_USAGE_KEY, JSON.stringify(usage));
  } catch {}
};

const readReviewMarkers = () => {
  try {
    const stored = localStorage.getItem(HOME_REVIEW_KEY);
    if (!stored) return {};
    return JSON.parse(stored) || {};
  } catch {
    return {};
  }
};

const writeReviewMarker = (key) => {
  try {
    const next = {
      ...readReviewMarkers(),
      [key]: new Date().toISOString(),
    };
    localStorage.setItem(HOME_REVIEW_KEY, JSON.stringify(next));
  } catch {}
};

const getDaysSince = (timestamp) => {
  if (!timestamp) return null;
  const time = new Date(timestamp).getTime();
  if (Number.isNaN(time)) return null;
  return Math.floor((Date.now() - time) / DAY_MS);
};

const readLastHomeAction = () => {
  try {
    const stored = localStorage.getItem(LAST_HOME_ACTION_KEY);
    if (!stored) return null;

    const parsed = JSON.parse(stored);
    if (!parsed?.type || !parsed?.id) {
      return null;
    }

    return parsed;
  } catch {
    return null;
  }
};

const writeLastHomeAction = (action) => {
  try {
    localStorage.setItem(
      LAST_HOME_ACTION_KEY,
      JSON.stringify({
        ...action,
        updatedAt: new Date().toISOString(),
      })
    );
  } catch {}
};

const formatRelativeTimestamp = (timestamp) => {
  if (!timestamp) return null;

  const target = new Date(timestamp).getTime();
  if (Number.isNaN(target)) return null;

  const diffMs = target - Date.now();
  const diffMinutes = Math.round(diffMs / 60000);
  const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });

  if (Math.abs(diffMinutes) < 60) {
    return rtf.format(diffMinutes, 'minute');
  }

  const diffHours = Math.round(diffMinutes / 60);
  if (Math.abs(diffHours) < 24) {
    return rtf.format(diffHours, 'hour');
  }

  const diffDays = Math.round(diffHours / 24);
  return rtf.format(diffDays, 'day');
};

const iconMap = {
  door: Door,
  mapPin: MapPin,
  user: User,
  megaphone: Megaphone,
  leaf: Leaf,
  video: VideoCamera,
  car: Car,
  shield: Shield,
  eye: Eye,
  building2: Buildings,
  clipboardText: ClipboardText,
  usersThree: UsersThree,
  firstAidKit: FirstAidKit,
  scales: Scales,
};

const colorMap = {
  red: { border: 'border-red-700/30', hoverBorder: 'hover:border-red-500/30', hoverShadow: 'hover:shadow-red-500/5', iconBorder: 'group-hover:border-red-500/30', icon: 'text-red-400', titleHover: 'group-hover:text-red-100', link: 'text-red-400', gradFrom: 'group-hover:from-red-500/5', gradTo: 'group-hover:to-red-500/5' },
  emerald: { border: 'border-emerald-700/30', hoverBorder: 'hover:border-emerald-500/30', hoverShadow: 'hover:shadow-emerald-500/5', iconBorder: 'group-hover:border-emerald-500/30', icon: 'text-emerald-400', titleHover: 'group-hover:text-emerald-100', link: 'text-emerald-400', gradFrom: 'group-hover:from-emerald-500/5', gradTo: 'group-hover:to-emerald-500/5' },
  teal: { border: 'border-teal-700/30', hoverBorder: 'hover:border-teal-500/30', hoverShadow: 'hover:shadow-teal-500/5', iconBorder: 'group-hover:border-teal-500/30', icon: 'text-teal-400', titleHover: 'group-hover:text-teal-100', link: 'text-teal-400', gradFrom: 'group-hover:from-teal-500/5', gradTo: 'group-hover:to-teal-500/5' },
  amber: { border: 'border-amber-700/30', hoverBorder: 'hover:border-amber-500/30', hoverShadow: 'hover:shadow-amber-500/5', iconBorder: 'group-hover:border-amber-500/30', icon: 'text-amber-400', titleHover: 'group-hover:text-amber-100', link: 'text-amber-400', gradFrom: 'group-hover:from-amber-500/5', gradTo: 'group-hover:to-amber-500/5' },
  orange: { border: 'border-orange-700/30', hoverBorder: 'hover:border-orange-500/30', hoverShadow: 'hover:shadow-orange-500/5', iconBorder: 'group-hover:border-orange-500/30', icon: 'text-orange-400', titleHover: 'group-hover:text-orange-100', link: 'text-orange-400', gradFrom: 'group-hover:from-orange-500/5', gradTo: 'group-hover:to-orange-500/5' },
  blue: { border: 'border-slate-700/50', hoverBorder: 'hover:border-blue-500/30', hoverShadow: 'hover:shadow-blue-500/5', iconBorder: 'group-hover:border-blue-500/30', icon: 'text-blue-400', titleHover: 'group-hover:text-blue-100', link: 'text-blue-400', gradFrom: 'group-hover:from-blue-500/5', gradTo: 'group-hover:to-purple-500/5' },
  cyan: { border: 'border-cyan-700/30', hoverBorder: 'hover:border-cyan-500/30', hoverShadow: 'hover:shadow-cyan-500/5', iconBorder: 'group-hover:border-cyan-500/30', icon: 'text-cyan-400', titleHover: 'group-hover:text-cyan-100', link: 'text-cyan-400', gradFrom: 'group-hover:from-cyan-500/5', gradTo: 'group-hover:to-cyan-500/5' },
  rose: { border: 'border-rose-700/30', hoverBorder: 'hover:border-rose-500/30', hoverShadow: 'hover:shadow-rose-500/5', iconBorder: 'group-hover:border-rose-500/30', icon: 'text-rose-400', titleHover: 'group-hover:text-rose-100', link: 'text-rose-400', gradFrom: 'group-hover:from-rose-500/5', gradTo: 'group-hover:to-rose-500/5' },
  purple: { border: 'border-purple-700/30', hoverBorder: 'hover:border-purple-500/30', hoverShadow: 'hover:shadow-purple-500/5', iconBorder: 'group-hover:border-purple-500/30', icon: 'text-purple-400', titleHover: 'group-hover:text-purple-100', link: 'text-purple-400', gradFrom: 'group-hover:from-purple-500/5', gradTo: 'group-hover:to-purple-500/5' },
};

const cardButtonClassName = (borderClass, hoverBorderClass, hoverShadowClass, variant = 'standard') => {
  const variantClassName = variant === 'featured'
    ? 'rounded-[26px] p-6 sm:p-7 bg-gradient-to-br from-slate-800/95 via-slate-900/95 to-slate-950 border-white/5 shadow-[0_24px_70px_rgba(15,23,42,0.32)]'
    : 'rounded-2xl p-5 bg-gradient-to-br from-slate-800/80 to-slate-900/80';

  return `group relative w-full text-left backdrop-blur-sm border ${borderClass} ${variantClassName} transition-all duration-300 ${hoverBorderClass} hover:shadow-lg ${hoverShadowClass} hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 focus-visible:ring-white/80`;
};

const ScenarioIcon = ({ iconName, size = 28, className = '', weight = 'bold' }) => {
  const IconComponent = iconMap[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} weight={weight} className={className} />;
};

const HomeCard = ({ item, variant = 'standard' }) => {
  const c = colorMap[item.accent] || colorMap.blue;
  const isFeatured = variant === 'featured';

  return (
    <button
      type="button"
      onClick={item.onClick}
      className={cardButtonClassName(c.border, c.hoverBorder, c.hoverShadow, variant)}
    >
      {isFeatured && (
        <>
          <div className={`absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-current to-transparent ${c.link} opacity-60 pointer-events-none`} />
          <div className="absolute -right-10 -top-10 h-32 w-32 rounded-full bg-white/5 blur-3xl pointer-events-none" />
        </>
      )}
      <div className={`absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 ${c.gradFrom} ${c.gradTo} ${isFeatured ? 'rounded-[26px]' : 'rounded-2xl'} transition-all duration-300 pointer-events-none`} />

      <div className={`relative flex h-full items-start ${isFeatured ? 'gap-5' : 'gap-4'}`}>
        <div className={`shrink-0 ${isFeatured ? 'p-4 rounded-2xl' : 'p-3 rounded-xl'} bg-slate-800 border border-slate-700/50 ${c.iconBorder} transition-all`}>
          {item.iconName ? <ScenarioIcon iconName={item.iconName} size={isFeatured ? 28 : 24} className={c.icon} /> : item.iconNode}
        </div>

        <div className="flex min-w-0 flex-1 flex-col self-stretch">
          <div>
            {item.badge && !isFeatured && (
              <p className={`mb-2 text-[10px] font-black uppercase tracking-[0.2em] ${c.link}`}>
                {item.badge}
              </p>
            )}
            {isFeatured && (
              <p className={`mb-2 text-[11px] font-black uppercase tracking-[0.2em] ${c.link}`}>
                Priority Guide
              </p>
            )}
            <h2 className={`${isFeatured ? 'text-xl sm:text-2xl' : 'text-lg'} font-bold text-white mb-1 ${c.titleHover} transition-colors`}>
              {item.title}
            </h2>
            <p className={`text-slate-400 ${isFeatured ? 'text-[15px] mb-4 max-w-xl' : 'text-sm mb-3'} leading-relaxed`}>
              {item.description}
            </p>
          </div>
          <span className={`${c.link} ${isFeatured ? 'text-sm px-3 py-1.5 rounded-full border border-current/20 bg-slate-950/40' : 'text-sm'} mt-auto font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all`}>
            {item.ctaLabel} <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
          </span>
        </div>
      </div>
    </button>
  );
};

const HomeSection = ({ eyebrow, title, description, children, className = '' }) => (
  <section className={`relative mt-14 sm:mt-16 ${className}`}>
    <div className="pointer-events-none absolute -top-6 left-6 right-6 h-px bg-gradient-to-r from-transparent via-slate-700/60 to-transparent" />
    <div className="mb-5 relative overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/65 px-5 py-4 backdrop-blur-sm">
      <div className="absolute inset-y-4 left-0 w-1 rounded-full bg-gradient-to-b from-red-500 via-cyan-400 to-emerald-400" />
      <div className="absolute inset-0 bg-gradient-to-r from-white/[0.03] via-transparent to-transparent pointer-events-none" />
      <div className="absolute -right-10 top-1/2 h-24 w-24 -translate-y-1/2 rounded-full bg-slate-700/10 blur-3xl pointer-events-none" />
      <div className="relative pl-4">
        <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500 mb-2">
          {eyebrow}
        </p>
        <h2 className="text-2xl font-black text-white tracking-tight">
          {title}
        </h2>
        {description && (
          <p className="text-slate-400 text-sm mt-2 max-w-2xl leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
    <div className="space-y-3">
      {children}
    </div>
  </section>
);

const Home = ({
  onNavigate,
  onNavigateToScenario,
  onOpenSettings,
  onShowWelcome,
  onShowFeatures,
  onOpenCheckRoute,
  onOpenLegalResponse,
  onOpenCheckIn,
  onOpenEmergency,
}) => {
  const { t } = useTranslation();
  const { reports } = useReports();
  const homeQuote = useRotatingQuote('home.aureliusQuote', 'home.aureliusAuthor', 'home');
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [lastAction, setLastAction] = useState(() => readLastHomeAction());
  const [homeUsage, setHomeUsage] = useState(() => readHomeUsage());
  const [lastKnownLocation, setLastKnownLocation] = useState(null);
  const [heroTransition, setHeroTransition] = useState(null);
  const [setupState, setSetupState] = useState({
    contactsReady: false,
    pinReady: false,
    installReady: false,
    familyKitReady: false,
  });
  const [reviewMarkers, setReviewMarkers] = useState(() => readReviewMarkers());
  const heroTransitionTimeoutRef = useRef(null);

  const rememberAction = (action) => {
    writeLastHomeAction(action);
    setLastAction({
      ...action,
      updatedAt: new Date().toISOString(),
    });

    const nextUsage = {
      counts: {
        ...(homeUsage?.counts || {}),
        [action.id]: ((homeUsage?.counts || {})[action.id] || 0) + 1,
      },
      lastById: {
        ...(homeUsage?.lastById || {}),
        [action.id]: {
          type: action.type,
          updatedAt: new Date().toISOString(),
        },
      },
    };
    writeHomeUsage(nextUsage);
    setHomeUsage(nextUsage);

    if (['rights-card', 'protest', 'de-escalation', 'follow-ice', 'legal-page'].includes(action.id)) {
      writeReviewMarker('rights');
      setReviewMarkers((prev) => ({ ...prev, rights: new Date().toISOString() }));
    }

    if (action.id === 'family-kit') {
      writeReviewMarker('family-kit');
      setReviewMarkers((prev) => ({ ...prev, 'family-kit': new Date().toISOString() }));
    }

    if (action.id === 'trusted-contacts') {
      writeReviewMarker('trusted-contacts');
      setReviewMarkers((prev) => ({ ...prev, 'trusted-contacts': new Date().toISOString() }));
    }
  };

  const navigate = (route, action = null) => {
    if (action) {
      rememberAction(action);
    }
    onNavigate?.(route);
  };

  const openScenario = (id, extra = {}, action = { type: 'scenario', id }) => {
    if (action) {
      rememberAction(action);
    }
    onNavigateToScenario?.({ id, ...extra });
  };

  const openModalAction = (id, callback) => {
    rememberAction({ type: 'modal', id });
    callback?.();
  };

  const openEmergencyAction = () => {
    rememberAction({ type: 'modal', id: 'emergency' });
    onOpenEmergency?.();
  };

  const openHeroRightsAction = () => {
    if (heroTransition) return;

    setHeroTransition('rights');
    heroTransitionTimeoutRef.current = window.setTimeout(() => {
      openScenario('rights-card', { icon: 'identificationCard', title: t('scenariosPage.rightsCardTitle') });
      setHeroTransition(null);
      heroTransitionTimeoutRef.current = null;
    }, 170);
  };

  const handleInstall = () => {
    if (window.deferredPrompt) {
      window.deferredPrompt.prompt();
    } else {
      setShowInstallHelp(true);
    }
  };

  useEffect(() => {
    let cancelled = false;

    const loadSetupState = async () => {
      const contacts = await getTrustedContacts().catch(() => []);
      const location = await getLastKnownLocation().catch(() => null);
      const installReady = Boolean(
        window.matchMedia?.('(display-mode: standalone)').matches ||
        window.navigator.standalone === true
      );

      if (cancelled) {
        return;
      }

      setSetupState({
        contactsReady: contacts.length > 0,
        pinReady: isPinEnabled(),
        installReady,
        familyKitReady: Boolean(localStorage.getItem('safeneighbor_family_kit')),
      });
      setLastKnownLocation(location);
    };

    loadSetupState();
    window.addEventListener('appinstalled', loadSetupState);

    return () => {
      cancelled = true;
      window.removeEventListener('appinstalled', loadSetupState);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (heroTransitionTimeoutRef.current) {
        window.clearTimeout(heroTransitionTimeoutRef.current);
      }
    };
  }, []);

  const urgentItems = [
    { id: 'door', iconName: 'door', title: t('home.doorTitle'), description: t('home.doorDesc'), ctaLabel: t('home.openGuide'), accent: 'red', badge: t('home.badgeStepByStep'), onClick: () => openScenario('door') },
    { id: 'street', iconName: 'user', title: t('home.streetTitle'), description: t('home.streetDesc'), ctaLabel: t('home.openGuide'), accent: 'rose', badge: t('home.badgeRightsNow'), onClick: () => openScenario('street') },
    { id: 'vehicle', iconName: 'car', title: t('home.vehicleTitle'), description: t('home.vehicleDesc'), ctaLabel: t('home.openGuide'), accent: 'orange', badge: t('home.badgeTrafficStop'), onClick: () => openScenario('vehicle') },
    { id: 'border', iconName: 'shield', title: t('home.borderTitle'), description: t('home.borderDesc'), ctaLabel: t('home.openGuide'), accent: 'amber', badge: t('home.badgeHighRisk'), onClick: () => openScenario('border') },
    { id: 'legal-response', iconName: 'scales', title: t('legalResponse.buttonLabel'), description: t('legalResponse.homeCardDesc'), ctaLabel: t('home.openGuide'), accent: 'purple', badge: t('home.badgeUrgentSupport'), onClick: () => openModalAction('legal-response', onOpenLegalResponse) },
    { id: 'check-route', iconNode: <Path size={24} weight="bold" className="text-blue-400" />, title: t('home.checkRouteTitle'), description: t('home.checkRouteDesc'), ctaLabel: t('home.checkRoute'), accent: 'blue', badge: t('home.badgeMapTool'), onClick: () => openModalAction('check-route', onOpenCheckRoute) },
    { id: 'community-reports', iconName: 'mapPin', title: t('home.communityReportsTitle'), description: t('home.communityReportsDesc'), ctaLabel: t('home.communityReportsCta'), accent: 'red', badge: t('home.badgeRealtime'), onClick: () => navigate('reports', { type: 'page', id: 'reports' }) },
  ];

  const prepareItems = [
    { id: 'family-kit', iconName: 'clipboardText', title: t('home.familyKitTitle'), description: t('home.familyKitDesc'), ctaLabel: t('home.getStarted'), accent: 'orange', badge: t('home.badgePreparation'), onClick: () => openScenario('family-kit') },
    { id: 'trusted-contacts', iconName: 'usersThree', title: t('home.trustedContactsTitle'), description: t('home.trustedContactsDesc'), ctaLabel: t('home.getStarted'), accent: 'amber', badge: t('home.badgeOneTapAlerts'), onClick: () => openScenario('trusted-contacts') },
    { id: 'safety-check-in', iconNode: <Timer size={24} weight="bold" className="text-emerald-400" />, title: t('safetyCheckIn.title'), description: t('safetyCheckIn.homeCardDesc'), ctaLabel: t('safetyCheckIn.openCheckIn'), accent: 'emerald', badge: t('home.badgeAutoCheckin'), onClick: () => openModalAction('check-in', onOpenCheckIn) },
    { id: 'install-app', iconNode: <Download size={24} className="text-blue-400" />, title: t('home.installApp'), description: t('home.installAlert'), ctaLabel: t('home.installHelp'), accent: 'blue', badge: t('home.badgeOfflineAccess'), onClick: handleInstall },
  ];

  const documentItems = [
    { id: 'encounter-log', iconNode: <NotePencil size={24} weight="bold" className="text-amber-400" />, title: t('home.encounterLogTitle'), description: t('home.encounterLogDesc'), ctaLabel: t('home.openLog'), accent: 'amber', badge: t('home.badgeEvidence'), onClick: () => openScenario('encounter-log-after', { icon: 'notePencil', title: 'Encounter Log' }) },
    { id: 'community-witnessing', iconName: 'eye', title: t('communityWitnessing.title'), description: t('communityWitnessing.homeCardDesc'), ctaLabel: t('home.openGuide'), accent: 'teal', badge: t('home.badgeCommunity'), onClick: () => openScenario('community-witnessing') },
    { id: 'recording-rights', iconName: 'video', title: t('home.recordingTitle'), description: t('home.recordingDesc'), ctaLabel: t('home.openGuide'), accent: 'rose', badge: t('home.badgeKnowTheLaw'), onClick: () => openScenario('recording') },
    { id: 'guardians-manual', iconNode: <BookOpenText size={24} weight="bold" className="text-blue-400" />, title: t('guardiansManual.homeCardTitle'), description: t('guardiansManual.homeCardDesc'), ctaLabel: t('guardiansManual.downloadPdf'), accent: 'blue', badge: t('home.badgeDownloadable'), onClick: () => openGuardiansManualPDF(t) },
  ];

  const rightsItems = [
    { id: 'rights-card', iconNode: <IdentificationCard size={24} weight="bold" className="text-red-400" />, title: t('scenariosPage.rightsCardTitle'), description: t('scenariosPage.rightsCardDesc'), ctaLabel: t('home.openGuide'), accent: 'red', badge: t('home.badgeCarryWithYou'), onClick: () => openScenario('rights-card', { icon: 'identificationCard', title: t('scenariosPage.rightsCardTitle') }) },
    { id: 'protest', iconName: 'megaphone', title: t('home.protestTitle'), description: t('home.protestDesc'), ctaLabel: t('home.openGuide'), accent: 'blue', badge: t('home.badgeAssembly'), onClick: () => openScenario('protest') },
    { id: 'de-escalation', iconName: 'leaf', title: t('home.deEscalationTitle'), description: t('home.deEscalationDesc'), ctaLabel: t('home.openGuide'), accent: 'emerald', badge: t('home.badgeStayCalm'), onClick: () => openScenario('de-escalation') },
    { id: 'follow-ice', iconName: 'eye', title: t('home.followIceTitle'), description: t('home.followIceDesc'), ctaLabel: t('home.openGuide'), accent: 'cyan', badge: t('home.badgeObservation'), onClick: () => navigate('scenarios', { type: 'page', id: 'scenarios' }) },
  ];

  const utilityActions = [
    { id: 'security', label: t('home.security'), onClick: onOpenSettings, className: 'from-emerald-600/80 to-emerald-500/80 hover:from-emerald-500/80 hover:to-emerald-400/80 border-emerald-500/50 shadow-emerald-500/20', icon: <Settings size={14} /> },
    { id: 'features', label: t('home.features'), onClick: onShowFeatures, className: 'from-violet-600/80 to-violet-500/80 hover:from-violet-500/80 hover:to-violet-400/80 border-violet-500/50 shadow-violet-500/20', icon: <Sparkle size={14} weight="bold" /> },
    { id: 'welcome', label: t('home.welcomeButton'), onClick: onShowWelcome, className: 'from-blue-600/80 to-blue-500/80 hover:from-blue-500/80 hover:to-blue-400/80 border-blue-500/50 shadow-blue-500/20', icon: <HandWaving size={14} weight="bold" /> },
  ];
  const coreReasons = [
    {
      id: 'reports',
      title: t('home.coreReportsTitle'),
      description: t('home.coreReportsDesc'),
      icon: <MapPin size={20} weight="bold" className="text-red-300" />,
      className: 'border-red-500/20 bg-red-500/[0.06]',
      onClick: () => navigate('reports', { type: 'page', id: 'reports' }),
    },
    {
      id: 'rights',
      title: t('home.coreRightsTitle'),
      description: t('home.coreRightsDesc'),
      icon: <IdentificationCard size={20} weight="bold" className="text-cyan-300" />,
      className: 'border-cyan-500/20 bg-cyan-500/[0.06]',
      onClick: () => openScenario('rights-card', { icon: 'identificationCard', title: t('scenariosPage.rightsCardTitle') }),
    },
    {
      id: 'emergency',
      title: t('home.coreEmergencyTitle'),
      description: t('home.coreEmergencyDesc'),
      icon: <Scales size={20} weight="bold" className="text-amber-300" />,
      className: 'border-amber-500/20 bg-amber-500/[0.06]',
      onClick: openEmergencyAction,
    },
  ];

  const setupItems = [
    {
      id: 'contacts',
      label: t('home.setupContactsLabel'),
      status: setupState.contactsReady ? t('home.setupReady') : t('home.setupNeeded'),
      ready: setupState.contactsReady,
      onClick: () => openScenario('trusted-contacts'),
    },
    {
      id: 'pin',
      label: t('home.setupPinLabel'),
      status: setupState.pinReady ? t('home.setupReady') : t('home.setupNeeded'),
      ready: setupState.pinReady,
      onClick: () => onOpenSettings?.(),
    },
    {
      id: 'install',
      label: t('home.setupInstallLabel'),
      status: setupState.installReady ? t('home.setupReady') : t('home.setupNeeded'),
      ready: setupState.installReady,
      onClick: handleInstall,
    },
    {
      id: 'family-kit',
      label: t('home.setupFamilyKitLabel'),
      status: setupState.familyKitReady ? t('home.setupReady') : t('home.setupNeeded'),
      ready: setupState.familyKitReady,
      onClick: () => openScenario('family-kit'),
    },
  ];
  const checklistItems = [
    !setupState.contactsReady && {
      id: 'contacts',
      label: t('home.checklistContacts'),
      onClick: () => openScenario('trusted-contacts'),
    },
    !setupState.pinReady && {
      id: 'pin',
      label: t('home.checklistPin'),
      onClick: () => onOpenSettings?.(),
    },
    !setupState.installReady && {
      id: 'install',
      label: t('home.checklistInstall'),
      onClick: handleInstall,
    },
    !setupState.familyKitReady && {
      id: 'family-kit',
      label: t('home.checklistFamilyKit'),
      onClick: () => openScenario('family-kit'),
    },
  ].filter(Boolean);

  const allActionItems = [
    ...urgentItems,
    ...prepareItems,
    ...documentItems,
    ...rightsItems,
    {
      id: 'post-encounter',
      iconNode: <FirstAidKit size={24} weight="bold" className="text-emerald-400" />,
      title: t('home.postEncounterTitle'),
      description: t('home.postEncounterDesc'),
      ctaLabel: t('home.getStarted'),
      accent: 'emerald',
      onClick: () => openScenario('post-encounter', { icon: 'firstAidKit', title: 'Post-Encounter Guide' }),
    },
  ];

  const actionLookup = new Map(allActionItems.map((item) => [item.id, item]));
  const usageCounts = homeUsage?.counts || {};
  const recentReportsCount = reports.length;
  const verifiedReportsCount = reports.filter((report) => report.verified).length;
  const missingSetupCount = setupItems.filter((item) => !item.ready).length;
  const setupReadyCount = setupItems.length - missingSetupCount;
  const setupProgressPercent = Math.round((setupReadyCount / setupItems.length) * 100);
  const showSetupModule = missingSetupCount > 0;
  const isFirstTimeUser = !setupState.contactsReady && !setupState.pinReady && !setupState.installReady && !setupState.familyKitReady && !lastAction;
  const isReturningUser = Boolean(lastAction || setupReadyCount > 0);
  const isPreparedReturningUser = isReturningUser && missingSetupCount === 0;
  const latestReport = reports.reduce((latest, report) => {
    const timestamp = new Date(report.timestamp || 0).getTime();
    if (Number.isNaN(timestamp)) return latest;
    if (!latest || timestamp > latest.timestamp) {
      return { timestamp, report };
    }
    return latest;
  }, null);
  const latestReportRelative = latestReport ? formatRelativeTimestamp(latestReport.report.timestamp) : null;
  const nearbyReports = lastKnownLocation?.lat && lastKnownLocation?.lng
    ? reports
      .filter((report) => report.lat && report.lng)
      .map((report) => ({
        ...report,
        distanceMiles: calculateDistance(lastKnownLocation.lat, lastKnownLocation.lng, report.lat, report.lng),
      }))
      .filter((report) => report.distanceMiles <= 10)
      .sort((a, b) => a.distanceMiles - b.distanceMiles)
    : [];
  const nearbyReportsCount = nearbyReports.length;
  const closestNearbyReport = nearbyReports[0] || null;
  const liveActivityTone = nearbyReportsCount > 0
    ? nearbyReportsCount >= 3
      ? 'active'
      : 'watch'
    : recentReportsCount === 0
      ? 'quiet'
      : recentReportsCount >= 5
        ? 'active'
        : 'watch';
  const livePriorityCount = nearbyReportsCount || recentReportsCount;
  const livePriorityLabel = nearbyReportsCount > 0 ? t('home.liveReportsNearbyLabel') : t('home.liveReportsMapReady', { defaultValue: 'Map ready now' });
  const locationLabel = lastKnownLocation?.label || lastKnownLocation?.address || null;
  const rightsReviewAgeDays = getDaysSince(reviewMarkers.rights);
  const familyKitReviewAgeDays = getDaysSince(reviewMarkers['family-kit']);
  const contactsReviewAgeDays = getDaysSince(reviewMarkers['trusted-contacts']);
  const rightsRefreshNeeded = rightsReviewAgeDays === null || rightsReviewAgeDays >= 21;
  const familyKitRefreshNeeded = setupState.familyKitReady && (familyKitReviewAgeDays === null || familyKitReviewAgeDays >= 45);
  const contactsRefreshNeeded = setupState.contactsReady && (contactsReviewAgeDays === null || contactsReviewAgeDays >= 30);
  const nearbyCluster = nearbyReportsCount >= 3;
  const recentCluster = recentReportsCount >= 6;
  const liveAwarenessState = nearbyCluster
    ? 'nearby-cluster'
    : nearbyReportsCount > 0
      ? 'nearby'
      : recentCluster
        ? 'cluster'
        : recentReportsCount > 0
          ? 'recent'
          : 'quiet';
  const mostUsedEntries = Object.entries(usageCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);
  const frequentActions = mostUsedEntries
    .map(([id]) => actionLookup.get(id))
    .filter(Boolean);

  const rankItemsByPriority = (items, scoreMap) => {
    return [...items].sort((a, b) => {
      const scoreA = scoreMap[a.id] || 0;
      const scoreB = scoreMap[b.id] || 0;
      if (scoreA !== scoreB) return scoreB - scoreA;
      return items.findIndex((item) => item.id === a.id) - items.findIndex((item) => item.id === b.id);
    });
  };

  const dynamicUrgentItems = rankItemsByPriority(urgentItems, {
    'community-reports': liveAwarenessState === 'nearby-cluster' ? 120 : liveAwarenessState === 'nearby' ? 95 : liveAwarenessState === 'cluster' ? 82 : recentReportsCount > 0 ? 68 : 22,
    'check-route': liveAwarenessState === 'nearby-cluster' ? 105 : liveAwarenessState === 'nearby' ? 88 : 34,
    'legal-response': nearbyReportsCount > 0 ? 78 : rightsRefreshNeeded ? 64 : 44,
    door: liveAwarenessState === 'quiet' ? 74 : 52,
    street: usageCounts.street ? 46 + usageCounts.street : 28,
    vehicle: usageCounts.vehicle ? 46 + usageCounts.vehicle : 26,
    border: usageCounts.border ? 46 + usageCounts.border : 24,
  });

  const dynamicPrepareItems = rankItemsByPriority(prepareItems, {
    'trusted-contacts': !setupState.contactsReady ? 120 : contactsRefreshNeeded ? 74 : usageCounts['trusted-contacts'] || 18,
    'family-kit': !setupState.familyKitReady ? 110 : familyKitRefreshNeeded ? 72 : usageCounts['family-kit'] || 16,
    'install-app': !setupState.installReady ? 100 : 14,
    'safety-check-in': setupReadyCount === setupItems.length ? 76 : 24 + (usageCounts['safety-check-in'] || 0),
  });

  const dynamicDocumentItems = rankItemsByPriority(documentItems, {
    'encounter-log': usageCounts['encounter-log'] ? 68 + usageCounts['encounter-log'] : 42,
    'community-witnessing': nearbyReportsCount > 0 ? 74 : usageCounts['community-witnessing'] || 26,
    'recording-rights': rightsRefreshNeeded ? 70 : usageCounts['recording-rights'] || 24,
    'guardians-manual': familyKitRefreshNeeded ? 62 : usageCounts['guardians-manual'] || 18,
  });

  const dynamicRightsItems = rankItemsByPriority(rightsItems, {
    'rights-card': rightsRefreshNeeded ? 120 : usageCounts['rights-card'] || 36,
    protest: usageCounts.protest ? 60 + usageCounts.protest : 24,
    'de-escalation': usageCounts['de-escalation'] ? 58 + usageCounts['de-escalation'] : 26,
    'follow-ice': liveAwarenessState !== 'quiet' ? 66 : usageCounts['follow-ice'] || 20,
  });

  const featuredUrgentItems = dynamicUrgentItems.slice(0, 4);
  const secondaryUrgentItems = dynamicUrgentItems.slice(4);
  const leadingPrepareItemId = dynamicPrepareItems[0]?.id;
  const leadingDocumentItemId = dynamicDocumentItems[0]?.id;
  const leadingRightsItemId = dynamicRightsItems[0]?.id;

  const buildResumeAction = ({
    title,
    description,
    ctaLabel,
    accentClassName,
    icon,
    kindLabel,
    onClick,
  }) => ({
    eyebrow: t('home.resumeEyebrow'),
    title,
    description,
    ctaLabel,
    accentClassName,
    icon,
    kindLabel,
    onClick,
  });

  const resumeAction = (() => {
    if (!lastAction) return null;

    if (lastAction.type === 'modal') {
      if (lastAction.id === 'emergency') {
        return buildResumeAction({
          title: t('home.resumeEmergencyTitle'),
          description: t('home.resumeEmergencyDesc'),
          ctaLabel: t('home.resumeEmergencyCta'),
          accentClassName: 'border-red-500/20 bg-gradient-to-br from-red-500/[0.08] via-slate-950/90 to-slate-900/90',
          icon: <Question size={18} weight="bold" className="text-red-300" />,
          kindLabel: t('home.resumeKindEmergency'),
          onClick: openEmergencyAction,
        });
      }

      const modalMap = {
        'check-route': actionLookup.get('check-route'),
        'legal-response': actionLookup.get('legal-response'),
        'check-in': actionLookup.get('safety-check-in'),
      };

      const item = modalMap[lastAction.id];
      if (!item) return null;

      return buildResumeAction({
        title: item.title,
        description: item.description,
        ctaLabel: item.ctaLabel,
        accentClassName: 'border-blue-500/20 bg-gradient-to-br from-blue-500/[0.07] via-slate-950/90 to-slate-900/90',
        icon: item.iconName ? <ScenarioIcon iconName={item.iconName} size={20} className={(colorMap[item.accent] || colorMap.blue).icon} /> : item.iconNode,
        kindLabel: t('home.resumeKindTool'),
        onClick: item.onClick,
      });
    }

    if (lastAction.type === 'page') {
      if (lastAction.id === 'reports') {
        const item = actionLookup.get('community-reports');
        return item ? buildResumeAction({
          title: item.title,
          description: item.description,
          ctaLabel: item.ctaLabel,
          accentClassName: 'border-red-500/20 bg-gradient-to-br from-red-500/[0.07] via-slate-950/90 to-slate-900/90',
          icon: <ScenarioIcon iconName="mapPin" size={20} className="text-red-300" />,
          kindLabel: t('home.resumeKindReports'),
          onClick: item.onClick,
        }) : null;
      }

      if (lastAction.id === 'legal-page') {
        return buildResumeAction({
          title: t('home.resumeLegalTitle'),
          description: t('home.resumeLegalDesc'),
          ctaLabel: t('home.resumeLegalCta'),
          accentClassName: 'border-purple-500/20 bg-gradient-to-br from-purple-500/[0.07] via-slate-950/90 to-slate-900/90',
          icon: <Scales size={20} weight="bold" className="text-purple-300" />,
          kindLabel: t('home.resumeKindLegal'),
          onClick: () => navigate('legal', { type: 'page', id: 'legal-page' }),
        });
      }

      if (lastAction.id === 'scenarios') {
        return buildResumeAction({
          title: t('home.resumeScenariosTitle'),
          description: t('home.resumeScenariosDesc'),
          ctaLabel: t('home.resumeScenariosCta'),
          accentClassName: 'border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.07] via-slate-950/90 to-slate-900/90',
          icon: <BookOpenText size={20} weight="bold" className="text-cyan-300" />,
          kindLabel: t('home.resumeKindGuide'),
          onClick: () => navigate('scenarios', { type: 'page', id: 'scenarios' }),
        });
      }
    }

    if (lastAction.type === 'scenario') {
      const item = actionLookup.get(lastAction.id);
      if (!item) return null;

      return buildResumeAction({
        title: item.title,
        description: item.description,
        ctaLabel: item.ctaLabel,
        accentClassName: 'border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.06] via-slate-950/90 to-slate-900/90',
        icon: item.iconName ? <ScenarioIcon iconName={item.iconName} size={20} className={(colorMap[item.accent] || colorMap.blue).icon} /> : item.iconNode,
        kindLabel: t('home.resumeKindGuide'),
        onClick: item.onClick,
      });
    }

    return null;
  })();

  const primaryRecommendation = (() => {
    if (isFirstTimeUser) {
      return {
        eyebrow: t('home.recommendationFirstTimeEyebrow'),
        title: t('home.recommendationFirstTimeTitle'),
        description: t('home.recommendationFirstTimeDesc'),
        ctaLabel: t('home.recommendationFirstTimeCta'),
        accentClassName: 'border-blue-500/20 bg-gradient-to-br from-blue-500/[0.08] via-slate-950/90 to-slate-900/90',
        icon: <Sparkle size={20} weight="bold" className="text-blue-300" />,
        meta: t('home.recommendationFirstTimeMeta'),
        onClick: () => openScenario('trusted-contacts'),
      };
    }

    if (!setupState.contactsReady) {
      return {
        eyebrow: t('home.recommendationEyebrow'),
        title: t('home.recommendationContactsTitle'),
        description: t('home.recommendationContactsDesc'),
        ctaLabel: t('home.recommendationContactsCta'),
        accentClassName: 'border-amber-500/20 bg-gradient-to-br from-amber-500/[0.08] via-slate-950/90 to-slate-900/90',
        icon: <UsersThree size={20} weight="bold" className="text-amber-300" />,
        meta: t('home.recommendationSetupMeta', { count: missingSetupCount }),
        onClick: () => openScenario('trusted-contacts'),
      };
    }

    if (!setupState.pinReady) {
      return {
        eyebrow: t('home.recommendationEyebrow'),
        title: t('home.recommendationPinTitle'),
        description: t('home.recommendationPinDesc'),
        ctaLabel: t('home.recommendationPinCta'),
        accentClassName: 'border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.08] via-slate-950/90 to-slate-900/90',
        icon: <Shield size={20} weight="bold" className="text-emerald-300" />,
        meta: t('home.recommendationSetupMeta', { count: missingSetupCount }),
        onClick: () => onOpenSettings?.(),
      };
    }

    if (!setupState.installReady || !setupState.familyKitReady) {
      const shouldRecommendInstall = !setupState.installReady;
      return {
        eyebrow: t('home.recommendationEyebrow'),
        title: shouldRecommendInstall
          ? t('home.recommendationInstallTitle')
          : t('home.recommendationFamilyKitTitle'),
        description: shouldRecommendInstall
          ? t('home.recommendationInstallDesc')
          : t('home.recommendationFamilyKitDesc'),
        ctaLabel: shouldRecommendInstall
          ? t('home.recommendationInstallCta')
          : t('home.recommendationFamilyKitCta'),
        accentClassName: shouldRecommendInstall
          ? 'border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.08] via-slate-950/90 to-slate-900/90'
          : 'border-orange-500/20 bg-gradient-to-br from-orange-500/[0.08] via-slate-950/90 to-slate-900/90',
        icon: shouldRecommendInstall
          ? <Download size={20} className="text-cyan-300" />
          : <ClipboardText size={20} weight="bold" className="text-orange-300" />,
        meta: t('home.recommendationSetupMeta', { count: missingSetupCount }),
        onClick: shouldRecommendInstall ? handleInstall : () => openScenario('family-kit'),
      };
    }

    if (nearbyReportsCount > 0 || recentReportsCount > 0) {
      return {
        eyebrow: isPreparedReturningUser ? t('home.recommendationReturningEyebrow') : t('home.recommendationLiveEyebrow'),
        title: liveAwarenessState === 'nearby-cluster'
          ? t('home.recommendationLiveClusterTitle', { defaultValue: 'Several nearby reports are worth checking first.' })
          : t('home.recommendationLiveTitle'),
        description: nearbyReportsCount > 0
          ? t('home.recommendationNearbyDesc', {
              count: nearbyReportsCount,
              location: locationLabel || t('home.recommendationNearbyFallbackLocation'),
            })
          : latestReportRelative
            ? t('home.recommendationLiveDescWithTime', { time: latestReportRelative })
            : t('home.recommendationLiveDesc'),
        ctaLabel: t('home.recommendationLiveCta'),
        accentClassName: 'border-red-500/20 bg-gradient-to-br from-red-500/[0.08] via-slate-950/90 to-slate-900/90',
        icon: <MapPin size={20} weight="bold" className="text-red-300" />,
        meta: nearbyReportsCount > 0
          ? t('home.recommendationNearbyMeta', { count: nearbyReportsCount })
          : t('home.recommendationLiveMeta', { count: recentReportsCount }),
        onClick: () => navigate('reports', { type: 'page', id: 'reports' }),
      };
    }

    if (rightsRefreshNeeded) {
      return {
        eyebrow: t('home.recommendationReadyEyebrow'),
        title: t('home.recommendationRightsRefreshTitle', { defaultValue: 'Refresh your rights guidance before you need it.' }),
        description: t('home.recommendationRightsRefreshDesc', { defaultValue: 'Review the rights card and key encounter guidance now so the language is fresh if things move quickly later.' }),
        ctaLabel: t('home.recommendationRightsRefreshCta', { defaultValue: 'Review rights' }),
        accentClassName: 'border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.08] via-slate-950/90 to-slate-900/90',
        icon: <IdentificationCard size={20} weight="bold" className="text-cyan-300" />,
        meta: t('home.recommendationRightsRefreshMeta', {
          defaultValue: rightsReviewAgeDays === null ? 'Not reviewed yet' : `${rightsReviewAgeDays} days since last review`,
        }),
        onClick: () => openScenario('rights-card', { icon: 'identificationCard', title: t('scenariosPage.rightsCardTitle') }),
      };
    }

    if (resumeAction && isPreparedReturningUser) {
      return {
        eyebrow: t('home.recommendationReturningEyebrow'),
        title: t('home.recommendationResumeTitle'),
        description: t('home.recommendationResumeDesc'),
        ctaLabel: t('home.recommendationResumeCta'),
        accentClassName: 'border-violet-500/20 bg-gradient-to-br from-violet-500/[0.08] via-slate-950/90 to-slate-900/90',
        icon: <Brain size={20} className="text-violet-300" />,
        meta: t('home.recommendationReadyMeta'),
        onClick: resumeAction.onClick,
      };
    }

    return {
      eyebrow: isPreparedReturningUser ? t('home.recommendationReturningEyebrow') : t('home.recommendationReadyEyebrow'),
      title: t('home.recommendationReadyTitle'),
      description: t('home.recommendationReadyDesc'),
      ctaLabel: t('home.recommendationReadyCta'),
      accentClassName: 'border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.08] via-slate-950/90 to-slate-900/90',
      icon: <IdentificationCard size={20} weight="bold" className="text-cyan-300" />,
      meta: t('home.recommendationReadyMeta'),
      onClick: () => openScenario('rights-card', { icon: 'identificationCard', title: t('scenariosPage.rightsCardTitle') }),
    };
  })();

  const liveAwarenessHeadline = liveAwarenessState === 'nearby-cluster'
    ? t('home.liveReportsHeadlineNearbyCluster', { defaultValue: 'Multiple nearby reports need a closer look' })
    : liveAwarenessState === 'nearby'
      ? t('home.liveReportsHeadlineNearby', { defaultValue: 'Activity has been reported near you' })
      : liveAwarenessState === 'cluster'
        ? t('home.liveReportsHeadlineCluster', { defaultValue: 'The map is seeing a heavier reporting window' })
        : liveAwarenessState === 'recent'
          ? t('home.liveReportsHeadlineRecent', { defaultValue: 'Recent community activity is worth a check' })
          : t('home.liveReportsHeadlineQuiet', { defaultValue: 'No recent reports right now' });

  const liveAwarenessSummary = liveAwarenessState === 'nearby-cluster'
    ? t('home.liveReportsNearbyClusterSummary', {
        count: nearbyReportsCount,
        distance: closestNearbyReport ? Math.max(1, Math.round(closestNearbyReport.distanceMiles)) : 1,
        defaultValue: `${nearbyReportsCount} reports were filed within roughly ${closestNearbyReport ? Math.max(1, Math.round(closestNearbyReport.distanceMiles)) : 1} miles of your last known area.`,
      })
    : nearbyReportsCount > 0
      ? t('home.liveReportsNearbySummary', {
          count: nearbyReportsCount,
          distance: closestNearbyReport ? Math.max(1, Math.round(closestNearbyReport.distanceMiles)) : 1,
        })
      : recentCluster
        ? t('home.liveReportsClusterSummary', {
            count: recentReportsCount,
            defaultValue: `${recentReportsCount} reports came in during the last 12 hours. Check the map for patterns before you head out.`,
          })
        : recentReportsCount > 0
          ? t('home.liveReportsSummary', {
              count: recentReportsCount,
              defaultValue: recentReportsCount === 1
                ? '1 active report in the last 12 hours.'
                : `${recentReportsCount} active reports in the last 12 hours.`,
            })
          : t('home.liveReportsEmpty', {
              defaultValue: 'No new community reports in the last 12 hours. The map is still ready if something changes.',
            });

  const retentionPrompts = [
    rightsRefreshNeeded && {
      id: 'rights-refresh',
      label: t('home.retentionRightsLabel', { defaultValue: 'Rights guidance refresh' }),
      detail: t('home.retentionRightsDetail', {
        defaultValue: rightsReviewAgeDays === null ? 'Not reviewed yet' : `${rightsReviewAgeDays} days since your last review`,
      }),
      onClick: () => openScenario('rights-card', { icon: 'identificationCard', title: t('scenariosPage.rightsCardTitle') }),
    },
    contactsRefreshNeeded && {
      id: 'contacts-refresh',
      label: t('home.retentionContactsLabel', { defaultValue: 'Trusted contacts check-in' }),
      detail: t('home.retentionContactsDetail', {
        defaultValue: contactsReviewAgeDays === null ? 'Open your contact list and make sure it still looks right' : `${contactsReviewAgeDays} days since you last reviewed it`,
      }),
      onClick: () => openScenario('trusted-contacts'),
    },
    familyKitRefreshNeeded && {
      id: 'family-kit-refresh',
      label: t('home.retentionFamilyKitLabel', { defaultValue: 'Family plan refresher' }),
      detail: t('home.retentionFamilyKitDetail', {
        defaultValue: familyKitReviewAgeDays === null ? 'Review your family plan before you need it' : `${familyKitReviewAgeDays} days since your last family plan review`,
      }),
      onClick: () => openScenario('family-kit'),
    },
  ].filter(Boolean);

  const featuredQuickActions = frequentActions.filter((item) => !['community-reports', 'check-route'].includes(item.id)).slice(0, 3);
  const quietStateSupport = isPreparedReturningUser && retentionPrompts.length === 0
    ? {
        title: t('home.quietStateTitle', { defaultValue: 'You look ready right now.' }),
        detail: t('home.quietStateDetail', { defaultValue: 'No setup gaps or stale reminders are standing out. Use the map, rights guides, or your saved tools whenever you need them.' }),
        ctaLabel: t('home.quietStateCta', { defaultValue: 'Browse guides' }),
        onClick: () => navigate('scenarios', { type: 'page', id: 'scenarios' }),
      }
    : null;

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 relative page-transition-in page-section-stagger">
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      <div className="mb-10 pt-5 relative sm:mb-12 sm:pt-6 page-section-item">
        <div className="absolute inset-x-10 -top-14 h-40 bg-gradient-to-b from-blue-500/15 via-cyan-500/5 to-transparent blur-3xl pointer-events-none" />

        <div className="xl:grid xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.85fr)] xl:items-stretch xl:gap-4">
          <motion.div
            className="relative overflow-hidden rounded-[28px] border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 px-6 py-8 text-center shadow-[0_24px_80px_rgba(2,6,23,0.45)] sm:px-10 xl:text-left"
            animate={heroTransition === 'rights' ? {
              scale: [1, 1.01, 1],
              borderColor: ['rgba(30,41,59,0.8)', 'rgba(56,189,248,0.35)', 'rgba(30,41,59,0.8)'],
              boxShadow: [
                '0 24px 80px rgba(2,6,23,0.45)',
                '0 28px 90px rgba(8,47,73,0.5)',
                '0 24px 80px rgba(2,6,23,0.45)',
              ],
            } : {
              scale: 1,
              borderColor: 'rgba(30,41,59,0.8)',
              boxShadow: '0 24px 80px rgba(2,6,23,0.45)',
            }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(56,189,248,0.12),transparent_38%),linear-gradient(135deg,rgba(255,255,255,0.04),transparent_32%)] pointer-events-none" />
            <div className="absolute inset-0 opacity-30 pointer-events-none" style={{ backgroundImage: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)', backgroundSize: '24px 24px', maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 85%)' }} />
            <AnimatePresence>
              {heroTransition === 'rights' && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2, ease: 'easeOut' }}
                  className="absolute inset-0 z-10 pointer-events-none"
                >
                  <motion.div
                    initial={{ opacity: 0, x: '-55%' }}
                    animate={{ opacity: 1, x: '120%' }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.38, ease: 'easeOut' }}
                    className="absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-cyan-300/12 to-transparent blur-xl"
                  />
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-400/8 via-transparent to-red-500/8" />
                  <div className="absolute inset-x-6 bottom-6 flex justify-center xl:justify-start">
                    <div className="rounded-full border border-cyan-400/20 bg-slate-950/80 px-4 py-2 text-[11px] font-black uppercase tracking-[0.18em] text-cyan-200 shadow-[0_12px_30px_rgba(8,47,73,0.28)] backdrop-blur-md">
                      {t('home.openingRightsGuide', { defaultValue: 'Opening Rights Guide' })}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="relative">
              <p className="mb-3 text-[11px] font-black uppercase tracking-[0.22em] text-blue-300/80 scenario-fade-in" style={aniDelay(0.08)}>
                {t('home.heroEyebrow')}
              </p>
              <div className="mb-4 flex flex-col items-center justify-center gap-3 text-center xl:flex-row xl:items-start xl:justify-start xl:text-left scenario-rise-in" style={aniDelay(0.14)}>
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-blue-400/20 bg-blue-500/10 shadow-[0_0_28px_rgba(59,130,246,0.18)]">
                  <ShieldCheck size={30} weight="bold" className="text-blue-300" />
                </div>
                <h1 className="max-w-3xl text-center text-[2rem] font-black text-white sm:text-[2.9rem] xl:text-left">
                  {t('home.heroTitle')}
                </h1>
              </div>
              <p className="mx-auto max-w-2xl text-base leading-[1.6] text-slate-300 xl:mx-0 scenario-fade-in" style={aniDelay(0.22)}>
                {t('home.heroSubtitle')}
              </p>
              <p className="mx-auto mt-3 max-w-xl text-sm leading-[1.6] text-slate-400 xl:mx-0 scenario-fade-in" style={aniDelay(0.27)}>
                {t('home.heroSupport')}
              </p>
            </div>

            <div className="relative mt-5 flex flex-wrap items-center justify-center gap-2.5 xl:justify-start scenario-fade-in" style={aniDelay(0.32)}>
              <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400" />
                {t('home.reassuranceOffline')}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-cyan-300">
                <span className="h-2 w-2 rounded-full bg-cyan-400" />
                {t('home.reassurancePrivate')}
              </span>
              <span className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em] text-violet-300">
                <span className="h-2 w-2 rounded-full bg-violet-400" />
                {t('home.reassuranceNoAccount')}
              </span>
            </div>

            <div className="relative mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row xl:justify-start scenario-rise-in" style={aniDelay(0.38)}>
              <button
                onClick={openEmergencyAction}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-red-500/50 bg-gradient-to-r from-red-600 to-red-700 px-6 py-3.5 text-sm font-black uppercase tracking-widest text-white transition-all shadow-[0_12px_32px_rgba(127,29,29,0.35)] hover:from-red-500 hover:to-red-600 sm:w-auto"
              >
                <Question size={18} weight="bold" />
                <span>{t('home.emergencyCta')}</span>
              </button>
              <button
                onClick={openHeroRightsAction}
                disabled={heroTransition === 'rights'}
                className="inline-flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-700 bg-slate-900/70 px-6 py-3.5 text-sm font-bold text-white transition-all shadow-[0_10px_24px_rgba(15,23,42,0.28)] hover:bg-slate-800/80 sm:w-auto"
              >
                <motion.div
                  animate={heroTransition === 'rights' ? { scale: [1, 1.12, 1], rotate: [0, -6, 0] } : { scale: 1, rotate: 0 }}
                  transition={{ duration: 0.26, ease: 'easeOut' }}
                >
                  <IdentificationCard size={18} weight="bold" className="text-red-400" />
                </motion.div>
                <span>{t('home.rightsCta')}</span>
              </button>
            </div>
          </motion.div>

          <div className="mt-3 flex flex-col gap-3 xl:mt-0 scenario-rise-in" style={aniDelay(0.20)}>
            <div className="rounded-2xl border border-white/10 bg-slate-950/55 p-4 shadow-[0_14px_30px_rgba(2,6,23,0.14)]">
              <div className="flex items-start justify-between gap-3 sm:gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/65">
                    {primaryRecommendation.eyebrow}
                  </p>
                  <h2 className="mt-1 text-lg font-black tracking-tight text-white sm:text-xl">
                    {primaryRecommendation.title}
                  </h2>
                  <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">
                    {primaryRecommendation.description}
                  </p>
                </div>
                <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 ${primaryRecommendation.accentClassName.split(' ').slice(0, 2).join(' ')}`}>
                  {primaryRecommendation.icon}
                </div>
              </div>
              <div className="mt-3 flex flex-wrap items-center justify-between gap-3 sm:mt-4">
                <span className="rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
                  {primaryRecommendation.meta}
                </span>
                <button
                  type="button"
                  onClick={primaryRecommendation.onClick}
                  className={`inline-flex items-center gap-2 rounded-xl border px-4 py-2.5 text-sm font-bold transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${primaryRecommendation.accentClassName}`}
                >
                  {primaryRecommendation.ctaLabel}
                  <ChevronRight size={16} />
                </button>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-800/80 bg-gradient-to-r from-slate-950/85 via-slate-950/70 to-slate-900/80 px-4 py-3 shadow-[0_14px_30px_rgba(2,6,23,0.12)] sm:py-3.5">
              <p className="text-[11px] font-black uppercase tracking-[0.18em] text-slate-500">
                {t('home.trustEyebrow')}
              </p>
              <p className="mt-1 text-xs leading-relaxed text-slate-300 sm:text-sm">
                {t('home.trustIntro')}
              </p>
            </div>
          </div>
        </div>

        <div className="-mx-1 mt-2 flex snap-x gap-3 overflow-x-auto px-1 pt-2 pb-4 md:mx-0 md:mt-4 md:grid md:overflow-visible md:px-0 md:pt-0 md:pb-0 md:grid-cols-3">
          {coreReasons.map((reason) => (
            <button
              key={reason.id}
              type="button"
              onClick={reason.onClick}
              className={`min-w-[250px] snap-start rounded-2xl border px-4 py-4 text-left backdrop-blur-sm shadow-[0_12px_28px_rgba(2,6,23,0.12)] transition-all duration-300 hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 md:min-w-0 ${reason.className}`}
            >
              <div className="flex items-start gap-3">
                <div className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950/50">
                  {reason.icon}
                </div>
                <div>
                  <p className="text-sm font-black uppercase tracking-[0.18em] text-white/95">
                    {reason.title}
                  </p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-300">
                    {reason.description}
                  </p>
                  <span className="mt-3 inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[0.18em] text-white/90">
                    Open
                    <ChevronRight size={14} />
                  </span>
                </div>
              </div>
            </button>
          ))}
        </div>

        <div className={`mt-2 grid gap-3 sm:mt-4 ${showSetupModule ? 'lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.9fr)]' : ''}`}>
          {showSetupModule && (
          <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-r from-emerald-500/[0.08] via-slate-900/80 to-slate-900/70 px-4 py-4 text-left shadow-[0_14px_30px_rgba(2,6,23,0.14)]">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  {t('home.setupOverviewEyebrow')}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  {isPreparedReturningUser
                    ? t('home.setupOverviewReturningText')
                    : t('home.setupOverviewText')}
                </p>
              </div>
              <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[11px] font-black uppercase tracking-[0.18em] text-white/80">
                {setupItems.filter((item) => item.ready).length}/{setupItems.length}
              </span>
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between gap-3 text-[11px] font-bold uppercase tracking-[0.18em]">
                <span className="text-white/85">
                  {t('home.setupProgressLabel', {
                    ready: setupReadyCount,
                    total: setupItems.length,
                    defaultValue: `${setupReadyCount}/${setupItems.length} essentials complete`,
                  })}
                </span>
                <span className={`${setupReadyCount === setupItems.length ? 'text-emerald-300' : 'text-amber-300'}`}>
                  {setupReadyCount === setupItems.length
                    ? t('home.setupProgressReady', { defaultValue: 'Ready now' })
                    : t('home.setupProgressNeeded', {
                        count: missingSetupCount,
                        defaultValue: missingSetupCount === 1 ? '1 item left' : `${missingSetupCount} items left`,
                      })}
                </span>
              </div>
              <div className="mt-2 h-2 overflow-hidden rounded-full bg-slate-900/80">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-400 transition-all duration-500"
                  style={{ width: `${setupProgressPercent}%` }}
                />
              </div>
            </div>
            <div className="mt-4 grid gap-2 sm:grid-cols-2">
              {setupItems.map((item) => (
                <button
                  key={item.id}
                  type="button"
                  onClick={item.onClick}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-3 text-left transition-all hover:border-white/20 hover:bg-slate-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  <div>
                    <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-300">
                      {item.label}
                    </p>
                    <p className={`mt-1 text-xs font-black uppercase tracking-[0.16em] ${item.ready ? 'text-emerald-300' : 'text-amber-300'}`}>
                      {item.status}
                    </p>
                  </div>
                  <ChevronRight size={16} className="text-slate-500" />
                </button>
              ))}
            </div>
          </div>
          )}

          <div className="rounded-2xl border border-blue-500/20 bg-gradient-to-br from-blue-500/[0.07] via-slate-950/90 to-slate-900/90 px-4 py-4 text-left shadow-[0_14px_30px_rgba(2,6,23,0.14)]">
            <p className="text-[11px] font-black uppercase tracking-[0.18em] text-blue-300">
              {isFirstTimeUser ? t('home.startHereFirstTimeEyebrow') : t('home.startHereEyebrow')}
            </p>
            <p className="mt-1 text-sm leading-relaxed text-slate-300">
              {checklistItems.length > 0
                ? (isFirstTimeUser ? t('home.startHereFirstTimeText') : t('home.startHereText'))
                : t('home.startHereDoneText')}
            </p>
            {checklistItems.length > 0 ? (
              <div className="mt-4 space-y-2">
                {checklistItems.map((item, index) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={item.onClick}
                    className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-3 text-left transition-all hover:border-white/20 hover:bg-slate-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex h-6 w-6 items-center justify-center rounded-full border border-blue-400/30 bg-blue-500/10 text-[11px] font-black text-blue-200">
                        {index + 1}
                      </span>
                      <span className="text-sm font-medium text-white">
                        {item.label}
                      </span>
                    </span>
                    <ChevronRight size={16} className="text-slate-500" />
                  </button>
                ))}
              </div>
            ) : (
              <button
                type="button"
                onClick={() => navigate('scenarios')}
                className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-400/30 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-200 transition-all hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
              >
                {t('home.startHereDoneCta')}
                <ChevronRight size={16} />
              </button>
            )}
          </div>
        </div>

        <div className={`mt-2 grid gap-3 sm:mt-4 ${resumeAction ? 'xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.95fr)]' : ''}`}>
          <button
            type="button"
            onClick={() => navigate('reports', { type: 'page', id: 'reports' })}
            className={`rounded-2xl border px-4 py-4 text-left shadow-[0_14px_30px_rgba(2,6,23,0.14)] transition-all hover:-translate-y-0.5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              liveActivityTone === 'active'
                ? 'border-red-400/30 bg-gradient-to-br from-red-500/[0.11] via-slate-950/90 to-slate-900/90 hover:border-red-300/40 focus-visible:ring-red-200/80'
                : liveActivityTone === 'watch'
                  ? 'border-amber-400/25 bg-gradient-to-br from-amber-500/[0.08] via-slate-950/90 to-slate-900/90 hover:border-amber-300/35 focus-visible:ring-amber-200/80'
                  : 'border-cyan-500/20 bg-gradient-to-br from-cyan-500/[0.07] via-slate-950/90 to-slate-900/90 hover:border-cyan-400/30 focus-visible:ring-cyan-200/80'
            }`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-red-300">
                  {t('home.liveReportsEyebrow', { defaultValue: 'Live Community Activity' })}
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-white">
                  {liveAwarenessHeadline}
                </h3>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  {liveAwarenessSummary}
                </p>
              </div>
              <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${
                liveActivityTone === 'active'
                  ? 'border-red-500/20 bg-red-500/10'
                  : liveActivityTone === 'watch'
                    ? 'border-amber-500/20 bg-amber-500/10'
                    : 'border-cyan-500/20 bg-cyan-500/10'
              }`}>
                <MapPin
                  size={20}
                  weight="bold"
                  className={
                    liveActivityTone === 'active'
                      ? 'text-red-300'
                      : liveActivityTone === 'watch'
                        ? 'text-amber-300'
                        : 'text-cyan-300'
                  }
                />
              </div>
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-2 text-xs font-bold uppercase tracking-[0.18em]">
              <span className={`rounded-full border px-3 py-1 ${
                liveActivityTone === 'active'
                  ? 'border-red-500/20 bg-red-500/10 text-red-100'
                  : liveActivityTone === 'watch'
                    ? 'border-amber-500/20 bg-amber-500/10 text-amber-100'
                    : 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100'
              }`}>
                {liveActivityTone === 'active'
                  ? t('home.liveReportsStatusActive', { defaultValue: 'Active now' })
                  : liveActivityTone === 'watch'
                    ? t('home.liveReportsStatusWatch', { defaultValue: 'Worth checking' })
                    : t('home.liveReportsStatusQuiet', { defaultValue: 'Quiet right now' })}
              </span>
              <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-white/80">
                {livePriorityCount > 0
                  ? livePriorityLabel
                  : t('home.liveReportsStandBy', { defaultValue: 'Standing by' })}
              </span>
              {nearbyReportsCount > 0 && (
                <span className="rounded-full border border-red-500/20 bg-red-500/10 px-3 py-1 text-red-100">
                  {t('home.liveReportsNearbyMeta', { count: nearbyReportsCount })}
                </span>
              )}
              {closestNearbyReport && (
                <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-white/80">
                  {t('home.liveReportsClosest', {
                    distance: Math.max(1, Math.round(closestNearbyReport.distanceMiles)),
                    defaultValue: `Closest ${Math.max(1, Math.round(closestNearbyReport.distanceMiles))} mi away`,
                  })}
                </span>
              )}
              {latestReportRelative && (
                <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-white/80">
                  {t('home.liveReportsLatest', {
                    time: latestReportRelative,
                    defaultValue: 'Latest {{time}}',
                  })}
                </span>
              )}
              {verifiedReportsCount > 0 && (
                <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-emerald-200">
                  {t('home.liveReportsVerified', {
                    count: verifiedReportsCount,
                    defaultValue: `${verifiedReportsCount} verified`,
                  })}
                </span>
              )}
            </div>

            <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-red-200">
              {t('home.liveReportsCta', { defaultValue: 'Open Community Reports' })}
              <ChevronRight size={16} />
            </span>
          </button>

          {resumeAction && (
            <button
              type="button"
              onClick={resumeAction.onClick}
              className={`rounded-2xl border px-4 py-4 text-left shadow-[0_14px_30px_rgba(2,6,23,0.14)] transition-all hover:-translate-y-0.5 hover:border-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${resumeAction.accentClassName}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[11px] font-black uppercase tracking-[0.18em] text-white/70">
                    {resumeAction.eyebrow}
                  </p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
                      {resumeAction.kindLabel}
                    </span>
                    {lastAction?.updatedAt && (
                      <span className="rounded-full border border-white/10 bg-slate-950/50 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.18em] text-white/75">
                        {t('home.resumeLastOpened', {
                          time: formatRelativeTimestamp(lastAction.updatedAt) || t('home.resumeRecently'),
                        })}
                      </span>
                    )}
                  </div>
                  <h3 className="mt-1 text-lg font-black text-white">
                    {resumeAction.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-slate-300">
                    {resumeAction.description}
                  </p>
                </div>
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-white/10 bg-slate-950/50">
                  {resumeAction.icon}
                </div>
              </div>

              <span className="mt-4 inline-flex items-center gap-2 text-sm font-bold text-white">
                {resumeAction.ctaLabel}
                <ChevronRight size={16} />
              </span>
            </button>
          )}
        </div>

        {(featuredQuickActions.length > 0 || retentionPrompts.length > 0 || quietStateSupport) && (
          <div className={`mt-2 grid gap-3 sm:mt-4 ${(retentionPrompts.length > 0 || quietStateSupport) ? 'xl:grid-cols-[minmax(0,1fr)_minmax(300px,0.95fr)]' : ''}`}>
            {featuredQuickActions.length > 0 && (
              <div className="rounded-2xl border border-violet-500/20 bg-gradient-to-br from-violet-500/[0.06] via-slate-950/90 to-slate-900/90 px-4 py-4 shadow-[0_14px_30px_rgba(2,6,23,0.14)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-violet-300">
                  {t('home.frequentEyebrow', { defaultValue: 'Used often' })}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  {t('home.frequentIntro', { defaultValue: 'Returning users can jump back into the tools they rely on most.' })}
                </p>
                <div className="mt-4 grid gap-2 sm:grid-cols-3">
                  {featuredQuickActions.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={item.onClick}
                      className="rounded-xl border border-white/10 bg-slate-950/45 px-3 py-3 text-left transition-all hover:border-white/20 hover:bg-slate-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                      <p className="text-xs font-black uppercase tracking-[0.16em] text-white/65">
                        {t('home.frequentLabel', { defaultValue: 'Frequent' })}
                      </p>
                      <p className="mt-1 text-sm font-semibold text-white">{item.title}</p>
                      <p className="mt-2 text-[11px] font-bold uppercase tracking-[0.16em] text-violet-200">
                        {t('home.frequentUsedCount', {
                          count: usageCounts[item.id] || 0,
                          defaultValue: `${usageCounts[item.id] || 0} opens`,
                        })}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {retentionPrompts.length > 0 && (
              <div className="rounded-2xl border border-amber-500/20 bg-gradient-to-br from-amber-500/[0.06] via-slate-950/90 to-slate-900/90 px-4 py-4 shadow-[0_14px_30px_rgba(2,6,23,0.14)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-amber-300">
                  {t('home.retentionEyebrow', { defaultValue: 'Keep ready' })}
                </p>
                <p className="mt-1 text-sm leading-relaxed text-slate-300">
                  {t('home.retentionIntro', { defaultValue: 'A few small refreshes keep your plan useful when a stressful moment hits.' })}
                </p>
                <div className="mt-4 space-y-2">
                  {retentionPrompts.map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      onClick={prompt.onClick}
                      className="flex w-full items-center justify-between rounded-xl border border-white/10 bg-slate-950/45 px-3 py-3 text-left transition-all hover:border-white/20 hover:bg-slate-950/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                    >
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/85">{prompt.label}</p>
                        <p className="mt-1 text-xs leading-relaxed text-slate-400">{prompt.detail}</p>
                      </div>
                      <ChevronRight size={16} className="text-slate-500" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {quietStateSupport && retentionPrompts.length === 0 && (
              <div className="rounded-2xl border border-emerald-500/20 bg-gradient-to-br from-emerald-500/[0.06] via-slate-950/90 to-slate-900/90 px-4 py-4 shadow-[0_14px_30px_rgba(2,6,23,0.14)]">
                <p className="text-[11px] font-black uppercase tracking-[0.18em] text-emerald-300">
                  {t('home.quietStateEyebrow', { defaultValue: 'Quiet state' })}
                </p>
                <h3 className="mt-1 text-lg font-black tracking-tight text-white">{quietStateSupport.title}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{quietStateSupport.detail}</p>
                <button
                  type="button"
                  onClick={quietStateSupport.onClick}
                  className="mt-4 inline-flex items-center gap-2 rounded-xl border border-emerald-400/25 bg-emerald-500/10 px-4 py-2.5 text-sm font-bold text-emerald-100 transition-all hover:bg-emerald-500/15 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/80 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950"
                >
                  {quietStateSupport.ctaLabel}
                  <ChevronRight size={16} />
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      <HomeSection
        className="page-section-item"
        eyebrow={t('home.immediateHelpEyebrow')}
        title={t('home.immediateHelpTitle')}
        description={
          recentReportsCount > 0
            ? t('home.immediateHelpDescActive', { count: recentReportsCount })
            : t('home.immediateHelpDesc')
        }
      >
        <div className="grid gap-4 md:grid-cols-2">
          {featuredUrgentItems.map((item) => <HomeCard key={item.id} item={item} variant="featured" />)}
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          {secondaryUrgentItems.map((item) => <HomeCard key={item.id} item={item} />)}
        </div>
      </HomeSection>

      <HomeSection
        className="page-section-item"
        eyebrow={t('home.prepareEyebrow')}
        title={t('home.prepareTitle')}
        description={
          missingSetupCount > 0
            ? t('home.prepareDescSetupNeeded', { count: missingSetupCount })
            : t('home.prepareDescReady')
        }
      >
        <div className="grid gap-3 md:grid-cols-2">
          {dynamicPrepareItems.map((item) => <HomeCard key={item.id} item={item} variant={item.id === leadingPrepareItemId ? 'featured' : 'standard'} />)}
        </div>
      </HomeSection>

      <HomeSection className="page-section-item" eyebrow={t('home.documentEyebrow')} title={t('home.documentTitle')} description={t('home.documentDesc')}>
        <div className="grid gap-3 md:grid-cols-2">
          {dynamicDocumentItems.map((item) => <HomeCard key={item.id} item={item} variant={item.id === leadingDocumentItemId ? 'featured' : 'standard'} />)}
        </div>
      </HomeSection>

      <HomeSection className="page-section-item" eyebrow={t('home.rightsEyebrow')} title={t('home.rightsTitle')} description={t('home.rightsDesc')}>
        <div className="grid gap-3 md:grid-cols-2">
          {dynamicRightsItems.map((item) => <HomeCard key={item.id} item={item} variant={item.id === leadingRightsItemId ? 'featured' : 'standard'} />)}
        </div>

        <div className="mt-3 relative">
          <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-purple-600/10 to-blue-600/20 blur-2xl pointer-events-none" />

          <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 rounded-2xl p-6 overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-bl from-red-500/10 to-transparent pointer-events-none" />

            <h2 className="text-xl font-black text-white mb-3 flex items-center gap-3">
              <div className="p-2 bg-red-600/20 rounded-lg">
                <Shield size={22} weight="bold" className="text-red-400" />
              </div>
              {t('home.constitutionalTitle')}
            </h2>
            <p className="text-slate-300 text-sm leading-relaxed mb-5">
              {t('home.constitutionalDesc', { defaultValue: 'The 4th Amendment protects you against unreasonable searches. ICE needs a <1>Judicial Warrant</1> signed by a judge to enter your home.' }).split('<1>').map((part, i) => {
                if (i === 0) return part;
                const [bold, rest] = part.split('</1>');
                return <React.Fragment key={i}><strong className="text-white">{bold}</strong>{rest}</React.Fragment>;
              })}
            </p>
            <button
              onClick={() => navigate('legal', { type: 'page', id: 'legal-page' })}
              className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-red-900/30 hover:shadow-red-900/50"
            >
              {t('home.exploreRights')}
            </button>
          </div>
        </div>
      </HomeSection>

      <HomeSection className="page-section-item" eyebrow={t('home.afterEyebrow')} title={t('home.afterTitle')} description={t('home.afterDesc')}>
        <div className="space-y-3">
          <HomeCard
            variant="featured"
            item={{
              id: 'post-encounter',
              iconNode: <FirstAidKit size={24} weight="bold" className="text-emerald-400" />,
              title: t('home.postEncounterTitle'),
              description: t('home.postEncounterDesc'),
              ctaLabel: t('home.getStarted'),
              accent: 'emerald',
              onClick: () => openScenario('post-encounter', { icon: 'firstAidKit', title: 'Post-Encounter Guide' }),
            }}
          />
          <FaqCta onNavigate={onNavigate} className="mt-0 h-full" />
        </div>
      </HomeSection>

      <div className="relative mt-14 overflow-hidden rounded-[28px] border border-slate-800/70 bg-gradient-to-br from-slate-950 via-slate-950 to-slate-900/90 px-6 py-10 text-center shadow-[0_18px_54px_rgba(2,6,23,0.22)] sm:px-10 page-section-item">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(96,165,250,0.08),transparent_42%)] pointer-events-none" />
        <div className="absolute left-1/2 top-0 h-px w-36 -translate-x-1/2 bg-gradient-to-r from-transparent via-cyan-400/50 to-transparent" />
        <div className="absolute bottom-0 left-1/2 h-px w-36 -translate-x-1/2 bg-gradient-to-r from-transparent via-emerald-400/40 to-transparent" />
        <div className="relative">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
            Reflection
          </p>
          <p className="mt-4 text-slate-300 italic text-lg max-w-2xl mx-auto leading-relaxed sm:text-xl">
            {homeQuote.quote}
          </p>
          <p className="text-slate-500 text-xs mt-4 tracking-[0.24em] uppercase">{homeQuote.author}</p>
        </div>
      </div>

      <div className="mt-8 flex flex-wrap items-center justify-center gap-2 page-section-item">
        {utilityActions.map((action) => (
          <button
            key={action.id}
            onClick={action.onClick}
            className={`inline-flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r rounded-full text-white/95 text-xs transition-all shadow-[0_8px_20px_rgba(15,23,42,0.16)] border opacity-85 hover:opacity-100 ${action.className}`}
          >
            {action.icon}
            <span>{action.label}</span>
          </button>
        ))}
      </div>

      <div className="mt-8 rounded-[24px] border border-slate-800/70 bg-slate-950/65 px-4 py-5 shadow-[0_12px_32px_rgba(2,6,23,0.14)] sm:px-6 page-section-item">
        <div className="mb-3 text-center">
          <p className="text-[11px] font-black uppercase tracking-[0.2em] text-slate-500">
            Important Context
          </p>
        </div>
        <Disclaimer>
          {t('home.disclaimerText')}
        </Disclaimer>
      </div>

      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />
    </div>
  );
};

export default Home;
