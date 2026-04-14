import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  House,
  User,
  Megaphone,
  VideoCamera,
  Car,
  Shield,
  Buildings,
  CaretRight,
  DownloadSimple,
  HandTap,
  ClipboardTextIcon as ClipboardText,
  UsersThreeIcon as UsersThree,
  NotePencilIcon as NotePencil,
  FirstAidKitIcon as FirstAidKit,
  IdentificationCardIcon as IdentificationCard,
  EyeIcon as Eye,
  BookOpenTextIcon as BookOpenText,
  MapPin,
  ClockCounterClockwise,
  CaretDown,
  Sparkle,
  MapTrifoldIcon as MapTrifold,
} from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import Disclaimer from './Disclaimer';
import InstallHelp from './InstallHelp';
import FaqCta from './FaqCta';
import { openGuardiansManualPDF } from '../utils/guardiansManualPDF';
import { useRotatingQuote } from '../utils/quoteRotation';

const SCENARIOS_SCROLL_KEY = 'safeneighbor_scenarios_scroll';
const SCENARIOS_LAST_OPENED_KEY = 'safeneighbor_scenarios_last_opened';
const RECENT_SCENARIOS_KEY = 'safeneighbor_recent_scenarios';

const iconMap = {
  home: House,
  user: User,
  megaphone: Megaphone,
  video: VideoCamera,
  car: Car,
  shield: Shield,
  building2: Buildings,
  clipboardText: ClipboardText,
  usersThree: UsersThree,
  mapPin: MapPin,
};

const animationDelayStyle = (delay = 0) => ({ animationDelay: `${delay}s` });
const sectionDelayStyle = (delay = 0) => ({ '--scenario-delay': `${delay}s` });

const ScenarioIcon = ({ iconName, size = 28, className = '', weight = 'bold' }) => {
  const IconComponent = iconMap[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} weight={weight} className={className} />;
};

const SectionHeader = ({ eyebrow, title, description, support, accent, delay = 0, action }) => (
  <div className="mb-4 flex flex-col gap-4 scenario-fade-in md:flex-row md:items-end md:justify-between" style={animationDelayStyle(delay)}>
    <div>
      <p className={`mb-2 text-xs font-semibold tracking-[0.08em] ${accent}`}>{eyebrow}</p>
      <h2 className="text-[1.85rem] font-black tracking-tight text-white sm:text-[2rem]">{title}</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{description}</p>
      {support && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{support}</p>}
    </div>
    {action}
  </div>
);

const ScenarioCard = ({
  title,
  description,
  hint,
  hintLabel,
  ctaLabel,
  accentClasses,
  iconNode,
  onClick,
  featured = false,
  highlighted = false,
  roleLabel,
  contextLabel,
  metaLabel,
  metaDetail,
  statusBadge,
}) => (
  <button
    type="button"
    onClick={onClick}
    className={`group scenario-card-shell relative w-full overflow-hidden rounded-[28px] border text-left transition-[transform,border-color,box-shadow,background-color] duration-300 hover:-translate-y-0.5 ${highlighted ? 'scenario-return-marker ring-1 ring-blue-400/40' : ''} ${featured ? 'min-h-[262px] p-6 sm:p-7' : 'min-h-[232px] p-5 sm:p-6'} ${accentClasses.card}`}
  >
    <div className={`pointer-events-none absolute inset-0 opacity-0 transition-opacity duration-300 group-hover:opacity-100 ${accentClasses.glow}`} />
    <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/25 to-transparent opacity-60" />
    <div className="relative flex h-full flex-col">
      <div className="mb-4 flex items-start justify-between gap-4">
        <div className="flex min-w-0 flex-wrap gap-2">
          {roleLabel && (
            <span className={`rounded-full border px-3 py-1 text-[11px] font-semibold ${accentClasses.kicker}`}>
              {roleLabel}
            </span>
          )}
          {contextLabel && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-semibold text-slate-200">
              {contextLabel}
            </span>
          )}
          {statusBadge && (
            <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-3 py-1 text-[11px] font-semibold text-blue-100">
              {statusBadge}
            </span>
          )}
        </div>

        <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border shadow-[0_0_0_1px_rgba(255,255,255,0.04)] ${accentClasses.iconWrap}`}>
          {iconNode}
        </div>
      </div>

      <div className="max-w-xl">
        <h3 className={`max-w-[16ch] text-[1.18rem] font-black leading-tight tracking-tight text-white ${featured ? 'sm:text-[1.34rem]' : 'sm:text-[1.2rem]'}`}>
          {title}
        </h3>
        <p className="mt-2 max-w-[36ch] text-sm leading-relaxed text-slate-300">{description}</p>
      </div>

      {(metaLabel || metaDetail) && (
        <div className="mt-4 flex flex-wrap gap-2">
          {metaLabel && (
            <span className={`rounded-full border px-3 py-1.5 text-[11px] font-semibold ${accentClasses.metaPill}`}>
              {metaLabel}
            </span>
          )}
          {metaDetail && (
            <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] font-semibold text-slate-300">
              {metaDetail}
            </span>
          )}
        </div>
      )}

      {hint && (
        <div className={`mt-4 rounded-[20px] border px-4 py-3.5 ${accentClasses.hintWrap}`}>
          <p className={`text-[11px] font-semibold tracking-[0.05em] ${accentClasses.hintLabel}`}>{hintLabel}</p>
          <p className={`mt-1.5 text-[13px] leading-relaxed ${accentClasses.hintText}`}>{hint}</p>
        </div>
      )}

      <div className={`mt-auto pt-5 text-sm font-bold ${accentClasses.cta}`}>
        <span className="inline-flex items-center gap-1.5 transition-[gap,color] duration-200 group-hover:gap-2">
          {ctaLabel}
          <CaretRight size={16} weight="bold" />
        </span>
      </div>
    </div>
  </button>
);

const readRecentScenarioIds = () => {
  try {
    return JSON.parse(localStorage.getItem(RECENT_SCENARIOS_KEY) || '[]');
  } catch (error) {
    console.warn('Failed to read recent scenarios', error);
    return [];
  }
};

const previewCardLabel = (count, t) => t('scenariosPage.mobilePreviewCount', {
  count,
  defaultValue: '{{count}} tools in this section',
});

const SCENARIOS_DESKTOP_QUOTES = [
  { quoteKey: 'sharedQuotes.epictetus2', authorKey: 'sharedQuotes.epictetus2Author', theme: 'Freedom' },
  { quoteKey: 'sharedQuotes.seneca3',    authorKey: 'sharedQuotes.seneca3Author',    theme: 'Courage' },
  { quoteKey: 'sharedQuotes.aurelius3',  authorKey: 'sharedQuotes.aurelius3Author',  theme: 'Character' },
  { quoteKey: 'sharedQuotes.frankl2',    authorKey: 'sharedQuotes.frankl2Author',    theme: 'Choice' },
  { quoteKey: 'sharedQuotes.sartre1',    authorKey: 'sharedQuotes.sartre1Author',    theme: 'Agency' },
  { quoteKey: 'sharedQuotes.camus1',     authorKey: 'sharedQuotes.camus1Author',     theme: 'Inner strength' },
  { quoteKey: 'sharedQuotes.seneca2',    authorKey: 'sharedQuotes.seneca2Author',    theme: 'Courage' },
  { quoteKey: 'sharedQuotes.frankl1',    authorKey: 'sharedQuotes.frankl1Author',    theme: 'Resilience' },
];

const Scenarios = ({ onSelectScenario, onNavigate }) => {
  const { t } = useTranslation();
  const scenariosQuote = useRotatingQuote('scenariosPage.franklQuote', 'scenariosPage.franklAuthor', 'scenarios');
  const [scenarioQuoteIndex, setScenarioQuoteIndex] = useState(0);
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [activeJump, setActiveJump] = useState('active-now');
  const [recentScenarioIds, setRecentScenarioIds] = useState(() => readRecentScenarioIds());
  const [restoredCardId, setRestoredCardId] = useState(null);
  const [mobileExpandedSections, setMobileExpandedSections] = useState({
    'prepare-ahead': false,
    'know-rights': false,
    'follow-up': false,
  });
  const sectionRefs = useRef({});

  const hintLabel = t('scenariosPage.useThisWhen', { defaultValue: 'Best For' });
  const actNowLabel = t('scenariosPage.actNowLabel', { defaultValue: 'Act now' });
  const prepareLabel = t('scenariosPage.prepareLabel', { defaultValue: 'Prepare' });
  const learnLabel = t('scenariosPage.learnLabel', { defaultValue: 'Learn' });
  const documentLabel = t('scenariosPage.documentLabel', { defaultValue: 'Document' });
  const fastScriptLabel = t('scenariosPage.fastScriptLabel', { defaultValue: 'Fast script' });
  const rightsGuideLabel = t('scenariosPage.rightsGuideLabel', { defaultValue: 'Rights guide' });
  const planningToolLabel = t('scenariosPage.planningToolLabel', { defaultValue: 'Planning tool' });
  const followUpLabel = t('scenariosPage.followUpLabel', { defaultValue: 'Follow-up guide' });
  const incidentLogLabel = t('scenariosPage.incidentLogLabel', { defaultValue: 'Incident log' });

  const handleScenarioClick = (scenario) => {
    try {
      sessionStorage.setItem(SCENARIOS_SCROLL_KEY, String(window.scrollY));
      sessionStorage.setItem(SCENARIOS_LAST_OPENED_KEY, scenario.id);
    } catch (error) {
      console.warn('Failed to preserve scenarios state', error);
    }
    onSelectScenario?.(scenario);
  };

  const activeNowCards = useMemo(() => ([
    {
      id: 'door',
      sectionId: 'active-now',
      icon: 'home',
      title: t('scenariosPage.doorTitle'),
      description: t('scenariosPage.doorDesc'),
      hint: t('scenariosPage.doorHint', { defaultValue: 'Talking through the door without opening it' }),
      ctaLabel: t('scenariosPage.openLiveGuide', { defaultValue: 'Open live guide' }),
      roleLabel: actNowLabel,
      contextLabel: t('scenariosPage.doorContext', { defaultValue: 'Door' }),
      metaLabel: fastScriptLabel,
      metaDetail: t('scenariosPage.doorMeta', { defaultValue: 'Warrants + what to say' }),
      accentClasses: {
        card: 'border-red-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-red-950/25 hover:border-red-500/40 hover:shadow-[0_22px_48px_rgba(127,29,29,0.2)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.16),transparent_48%)]',
        iconWrap: 'border-red-500/25 bg-red-500/10 text-red-300',
        kicker: 'border-red-500/18 bg-red-500/10 text-red-100',
        metaPill: 'border-red-500/18 bg-red-500/8 text-red-100',
        hintWrap: 'border-red-500/16 bg-red-500/8',
        hintLabel: 'text-red-200/90',
        hintText: 'text-red-100/90',
        cta: 'text-red-300 group-hover:text-red-200',
      },
    },
    {
      id: 'street',
      sectionId: 'active-now',
      icon: 'user',
      title: t('scenariosPage.streetTitle'),
      description: t('scenariosPage.streetDesc'),
      hint: t('scenariosPage.streetHint', { defaultValue: 'Being stopped in public' }),
      ctaLabel: t('scenariosPage.openLiveGuide', { defaultValue: 'Open live guide' }),
      roleLabel: actNowLabel,
      contextLabel: t('scenariosPage.streetContext', { defaultValue: 'Public' }),
      metaLabel: fastScriptLabel,
      metaDetail: t('scenariosPage.streetMeta', { defaultValue: 'Silence + release questions' }),
      accentClasses: {
        card: 'border-rose-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-rose-950/20 hover:border-rose-500/40 hover:shadow-[0_22px_48px_rgba(159,18,57,0.2)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(244,63,94,0.14),transparent_48%)]',
        iconWrap: 'border-rose-500/25 bg-rose-500/10 text-rose-300',
        kicker: 'border-rose-500/18 bg-rose-500/10 text-rose-100',
        metaPill: 'border-rose-500/18 bg-rose-500/8 text-rose-100',
        hintWrap: 'border-rose-500/16 bg-rose-500/8',
        hintLabel: 'text-rose-200/90',
        hintText: 'text-rose-100/90',
        cta: 'text-rose-300 group-hover:text-rose-200',
      },
    },
    {
      id: 'vehicle',
      sectionId: 'active-now',
      icon: 'car',
      title: t('scenariosPage.vehicleTitle'),
      description: t('scenariosPage.vehicleDesc'),
      hint: t('scenariosPage.vehicleHint', { defaultValue: 'A stop while driving' }),
      ctaLabel: t('scenariosPage.openLiveGuide', { defaultValue: 'Open live guide' }),
      roleLabel: actNowLabel,
      contextLabel: t('scenariosPage.vehicleContext', { defaultValue: 'Car' }),
      metaLabel: fastScriptLabel,
      metaDetail: t('scenariosPage.vehicleMeta', { defaultValue: 'Hands visible + careful replies' }),
      accentClasses: {
        card: 'border-amber-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-amber-950/20 hover:border-amber-500/40 hover:shadow-[0_22px_48px_rgba(180,83,9,0.2)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.14),transparent_48%)]',
        iconWrap: 'border-amber-500/25 bg-amber-500/10 text-amber-300',
        kicker: 'border-amber-500/18 bg-amber-500/10 text-amber-100',
        metaPill: 'border-amber-500/18 bg-amber-500/8 text-amber-100',
        hintWrap: 'border-amber-500/16 bg-amber-500/8',
        hintLabel: 'text-amber-200/90',
        hintText: 'text-amber-100/90',
        cta: 'text-amber-300 group-hover:text-amber-200',
      },
    },
    {
      id: 'workplace',
      sectionId: 'active-now',
      icon: 'building2',
      title: t('scenariosPage.workplaceTitle'),
      description: t('scenariosPage.workplaceDesc'),
      hint: t('scenariosPage.workplaceHint', { defaultValue: 'Officers arriving at work' }),
      ctaLabel: t('scenariosPage.openLiveGuide', { defaultValue: 'Open live guide' }),
      roleLabel: actNowLabel,
      contextLabel: t('scenariosPage.workplaceContext', { defaultValue: 'Work' }),
      metaLabel: fastScriptLabel,
      metaDetail: t('scenariosPage.workplaceMeta', { defaultValue: 'Nonpublic space + consent' }),
      accentClasses: {
        card: 'border-cyan-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-cyan-950/20 hover:border-cyan-500/40 hover:shadow-[0_22px_48px_rgba(8,145,178,0.2)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.14),transparent_48%)]',
        iconWrap: 'border-cyan-500/25 bg-cyan-500/10 text-cyan-300',
        kicker: 'border-cyan-500/18 bg-cyan-500/10 text-cyan-100',
        metaPill: 'border-cyan-500/18 bg-cyan-500/8 text-cyan-100',
        hintWrap: 'border-cyan-500/16 bg-cyan-500/8',
        hintLabel: 'text-cyan-200/90',
        hintText: 'text-cyan-100/90',
        cta: 'text-cyan-300 group-hover:text-cyan-200',
      },
    },
    {
      id: 'border',
      sectionId: 'active-now',
      icon: 'shield',
      title: t('scenariosPage.borderTitle'),
      description: t('scenariosPage.borderDesc'),
      hint: t('scenariosPage.borderHint', { defaultValue: 'Checkpoints and ports of entry' }),
      ctaLabel: t('scenariosPage.openLiveGuide', { defaultValue: 'Open live guide' }),
      roleLabel: actNowLabel,
      contextLabel: t('scenariosPage.borderContext', { defaultValue: 'Checkpoint' }),
      metaLabel: fastScriptLabel,
      metaDetail: t('scenariosPage.borderMeta', { defaultValue: 'Search rules + questions' }),
      accentClasses: {
        card: 'border-violet-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-violet-950/20 hover:border-violet-500/40 hover:shadow-[0_22px_48px_rgba(91,33,182,0.2)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(167,139,250,0.14),transparent_48%)]',
        iconWrap: 'border-violet-500/25 bg-violet-500/10 text-violet-300',
        kicker: 'border-violet-500/18 bg-violet-500/10 text-violet-100',
        metaPill: 'border-violet-500/18 bg-violet-500/8 text-violet-100',
        hintWrap: 'border-violet-500/16 bg-violet-500/8',
        hintLabel: 'text-violet-200/90',
        hintText: 'text-violet-100/90',
        cta: 'text-violet-300 group-hover:text-violet-200',
      },
    },
  ]), [actNowLabel, fastScriptLabel, t]);

  const prepareAheadCards = useMemo(() => ([
    {
      id: 'family-kit',
      sectionId: 'prepare-ahead',
      iconNode: <ClipboardText size={28} weight="bold" className="text-orange-300" />,
      title: t('scenariosPage.familyKitTitle'),
      description: t('scenariosPage.familyKitDesc'),
      hint: t('scenariosPage.familyKitHint', { defaultValue: 'Planning before an emergency' }),
      ctaLabel: t('scenariosPage.openPlanningTool', { defaultValue: 'Open planning tool' }),
      roleLabel: prepareLabel,
      contextLabel: t('scenariosPage.familyKitContext', { defaultValue: 'Family' }),
      metaLabel: planningToolLabel,
      metaDetail: t('scenariosPage.familyKitMeta', { defaultValue: 'Checklist + roles' }),
      accentClasses: {
        card: 'border-orange-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-orange-950/20 hover:border-orange-500/40 hover:shadow-[0_18px_44px_rgba(194,65,12,0.18)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(251,146,60,0.12),transparent_48%)]',
        iconWrap: 'border-orange-500/25 bg-orange-500/10',
        kicker: 'border-orange-500/18 bg-orange-500/10 text-orange-100',
        metaPill: 'border-orange-500/18 bg-orange-500/8 text-orange-100',
        hintWrap: 'border-orange-500/16 bg-orange-500/8',
        hintLabel: 'text-orange-200/90',
        hintText: 'text-orange-100/90',
        cta: 'text-orange-300 group-hover:text-orange-200',
      },
    },
    {
      id: 'trusted-contacts',
      sectionId: 'prepare-ahead',
      iconNode: <UsersThree size={28} weight="bold" className="text-amber-300" />,
      title: t('scenariosPage.trustedContactsTitle'),
      description: t('scenariosPage.trustedContactsDesc'),
      hint: t('scenariosPage.trustedContactsHint', { defaultValue: 'Setting up who gets alerted first' }),
      ctaLabel: t('scenariosPage.openPlanningTool', { defaultValue: 'Open planning tool' }),
      roleLabel: prepareLabel,
      contextLabel: t('scenariosPage.trustedContactsContext', { defaultValue: 'Contacts' }),
      metaLabel: planningToolLabel,
      metaDetail: t('scenariosPage.trustedContactsMeta', { defaultValue: 'Alert routing + backups' }),
      accentClasses: {
        card: 'border-amber-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-amber-950/20 hover:border-amber-500/40 hover:shadow-[0_18px_44px_rgba(180,83,9,0.18)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_48%)]',
        iconWrap: 'border-amber-500/25 bg-amber-500/10',
        kicker: 'border-amber-500/18 bg-amber-500/10 text-amber-100',
        metaPill: 'border-amber-500/18 bg-amber-500/8 text-amber-100',
        hintWrap: 'border-amber-500/16 bg-amber-500/8',
        hintLabel: 'text-amber-200/90',
        hintText: 'text-amber-100/90',
        cta: 'text-amber-300 group-hover:text-amber-200',
      },
    },
  ]), [planningToolLabel, prepareLabel, t]);

  const knowRightsCards = useMemo(() => ([
    {
      id: 'rights-card',
      sectionId: 'know-rights',
      iconNode: <IdentificationCard size={28} weight="bold" className="text-red-300" />,
      title: t('scenariosPage.rightsCardTitle'),
      description: t('scenariosPage.rightsCardDesc'),
      hint: t('scenariosPage.rightsCardHint', { defaultValue: 'Keeping a shareable rights card ready' }),
      ctaLabel: t('scenariosPage.reviewGuide', { defaultValue: 'Review guide' }),
      roleLabel: learnLabel,
      contextLabel: t('scenariosPage.rightsCardContext', { defaultValue: 'Wallet card' }),
      metaLabel: rightsGuideLabel,
      metaDetail: t('scenariosPage.rightsCardMeta', { defaultValue: 'Shareable rights summary' }),
      accentClasses: {
        card: 'border-red-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-red-950/20 hover:border-red-500/40 hover:shadow-[0_18px_44px_rgba(127,29,29,0.18)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(248,113,113,0.12),transparent_48%)]',
        iconWrap: 'border-red-500/25 bg-red-500/10',
        kicker: 'border-red-500/18 bg-red-500/10 text-red-100',
        metaPill: 'border-red-500/18 bg-red-500/8 text-red-100',
        hintWrap: 'border-red-500/16 bg-red-500/8',
        hintLabel: 'text-red-200/90',
        hintText: 'text-red-100/90',
        cta: 'text-red-300 group-hover:text-red-200',
      },
    },
    {
      id: 'recording',
      sectionId: 'know-rights',
      iconNode: <VideoCamera size={28} weight="bold" className="text-blue-300" />,
      title: t('scenariosPage.recordingTitle'),
      description: t('scenariosPage.recordingDesc'),
      hint: t('scenariosPage.recordingHint', { defaultValue: 'Knowing what you can safely document' }),
      ctaLabel: t('scenariosPage.reviewGuide', { defaultValue: 'Review guide' }),
      roleLabel: learnLabel,
      contextLabel: t('scenariosPage.recordingContext', { defaultValue: 'Recording' }),
      metaLabel: rightsGuideLabel,
      metaDetail: t('scenariosPage.recordingMeta', { defaultValue: 'Distance + interference rules' }),
      accentClasses: {
        card: 'border-blue-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-blue-950/20 hover:border-blue-500/40 hover:shadow-[0_18px_44px_rgba(30,64,175,0.18)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(96,165,250,0.12),transparent_48%)]',
        iconWrap: 'border-blue-500/25 bg-blue-500/10',
        kicker: 'border-blue-500/18 bg-blue-500/10 text-blue-100',
        metaPill: 'border-blue-500/18 bg-blue-500/8 text-blue-100',
        hintWrap: 'border-blue-500/16 bg-blue-500/8',
        hintLabel: 'text-blue-200/90',
        hintText: 'text-blue-100/90',
        cta: 'text-blue-300 group-hover:text-blue-200',
      },
    },
    {
      id: 'sensitive-locations',
      sectionId: 'know-rights',
      iconNode: <MapPin size={28} weight="bold" className="text-cyan-300" />,
      title: t('scenarioData.sensitiveTitle'),
      description: t('scenarioData.sensitiveDesc'),
      hint: t('scenariosPage.sensitiveLocationsHint', { defaultValue: 'Protected places and location rules' }),
      ctaLabel: t('scenariosPage.reviewGuide', { defaultValue: 'Review guide' }),
      roleLabel: learnLabel,
      contextLabel: t('scenariosPage.sensitiveLocationsContext', { defaultValue: 'Sensitive sites' }),
      metaLabel: rightsGuideLabel,
      metaDetail: t('scenariosPage.sensitiveLocationsMeta', { defaultValue: 'Schools + hospitals + worship' }),
      accentClasses: {
        card: 'border-cyan-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-cyan-950/20 hover:border-cyan-500/40 hover:shadow-[0_18px_44px_rgba(8,145,178,0.18)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(34,211,238,0.12),transparent_48%)]',
        iconWrap: 'border-cyan-500/25 bg-cyan-500/10',
        kicker: 'border-cyan-500/18 bg-cyan-500/10 text-cyan-100',
        metaPill: 'border-cyan-500/18 bg-cyan-500/8 text-cyan-100',
        hintWrap: 'border-cyan-500/16 bg-cyan-500/8',
        hintLabel: 'text-cyan-200/90',
        hintText: 'text-cyan-100/90',
        cta: 'text-cyan-300 group-hover:text-cyan-200',
      },
    },
    {
      id: 'protest',
      sectionId: 'know-rights',
      iconNode: <Megaphone size={28} weight="bold" className="text-fuchsia-300" />,
      title: t('scenariosPage.protestTitle'),
      description: t('scenariosPage.protestDesc'),
      hint: t('scenariosPage.protestHint', { defaultValue: 'Marches and public actions' }),
      ctaLabel: t('scenariosPage.reviewGuide', { defaultValue: 'Review guide' }),
      roleLabel: learnLabel,
      contextLabel: t('scenariosPage.protestContext', { defaultValue: 'Assembly' }),
      metaLabel: rightsGuideLabel,
      metaDetail: t('scenariosPage.protestMeta', { defaultValue: 'Speech + crowd rules' }),
      accentClasses: {
        card: 'border-fuchsia-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-fuchsia-950/20 hover:border-fuchsia-500/40 hover:shadow-[0_18px_44px_rgba(162,28,175,0.18)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(232,121,249,0.12),transparent_48%)]',
        iconWrap: 'border-fuchsia-500/25 bg-fuchsia-500/10',
        kicker: 'border-fuchsia-500/18 bg-fuchsia-500/10 text-fuchsia-100',
        metaPill: 'border-fuchsia-500/18 bg-fuchsia-500/8 text-fuchsia-100',
        hintWrap: 'border-fuchsia-500/16 bg-fuchsia-500/8',
        hintLabel: 'text-fuchsia-200/90',
        hintText: 'text-fuchsia-100/90',
        cta: 'text-fuchsia-300 group-hover:text-fuchsia-200',
      },
    },
  ]), [learnLabel, rightsGuideLabel, t]);

  const followUpCards = useMemo(() => ([
    {
      id: 'encounter-log-after',
      sectionId: 'follow-up',
      iconNode: <NotePencil size={28} weight="bold" className="text-amber-300" />,
      title: t('scenariosPage.encounterLogTitle'),
      description: t('scenariosPage.encounterLogDesc'),
      hint: t('scenariosPage.encounterLogHint', { defaultValue: 'Writing down what happened while it is fresh' }),
      ctaLabel: t('scenariosPage.openLog', { defaultValue: 'Open log' }),
      roleLabel: documentLabel,
      contextLabel: t('scenariosPage.encounterLogContext', { defaultValue: 'Afterward' }),
      metaLabel: incidentLogLabel,
      metaDetail: t('scenariosPage.encounterLogMeta', { defaultValue: 'Timeline + details' }),
      accentClasses: {
        card: 'border-amber-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-amber-950/20 hover:border-amber-500/40 hover:shadow-[0_18px_44px_rgba(180,83,9,0.18)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.12),transparent_48%)]',
        iconWrap: 'border-amber-500/25 bg-amber-500/10',
        kicker: 'border-amber-500/18 bg-amber-500/10 text-amber-100',
        metaPill: 'border-amber-500/18 bg-amber-500/8 text-amber-100',
        hintWrap: 'border-amber-500/16 bg-amber-500/8',
        hintLabel: 'text-amber-200/90',
        hintText: 'text-amber-100/90',
        cta: 'text-amber-300 group-hover:text-amber-200',
      },
    },
    {
      id: 'post-encounter',
      sectionId: 'follow-up',
      iconNode: <FirstAidKit size={28} weight="bold" className="text-emerald-300" />,
      title: t('scenariosPage.postEncounterTitle'),
      description: t('scenariosPage.postEncounterDesc'),
      hint: t('scenariosPage.postEncounterHint', { defaultValue: 'The hours and days after an encounter' }),
      ctaLabel: t('scenariosPage.openFollowUpGuide', { defaultValue: 'Open follow-up' }),
      roleLabel: documentLabel,
      contextLabel: t('scenariosPage.postEncounterContext', { defaultValue: 'Recovery' }),
      metaLabel: followUpLabel,
      metaDetail: t('scenariosPage.postEncounterMeta', { defaultValue: 'Care + legal next steps' }),
      accentClasses: {
        card: 'border-emerald-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-emerald-950/20 hover:border-emerald-500/40 hover:shadow-[0_18px_44px_rgba(5,150,105,0.18)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(52,211,153,0.12),transparent_48%)]',
        iconWrap: 'border-emerald-500/25 bg-emerald-500/10',
        kicker: 'border-emerald-500/18 bg-emerald-500/10 text-emerald-100',
        metaPill: 'border-emerald-500/18 bg-emerald-500/8 text-emerald-100',
        hintWrap: 'border-emerald-500/16 bg-emerald-500/8',
        hintLabel: 'text-emerald-200/90',
        hintText: 'text-emerald-100/90',
        cta: 'text-emerald-300 group-hover:text-emerald-200',
      },
    },
    {
      id: 'community-witnessing',
      sectionId: 'follow-up',
      iconNode: <Eye size={28} weight="bold" className="text-teal-300" />,
      title: t('scenariosPage.communityWitnessingTitle'),
      description: t('scenariosPage.communityWitnessingDesc'),
      hint: t('scenariosPage.communityWitnessingHint', { defaultValue: 'Witnesses and bystanders nearby' }),
      ctaLabel: t('scenariosPage.openFollowUpGuide', { defaultValue: 'Open follow-up' }),
      roleLabel: documentLabel,
      contextLabel: t('scenariosPage.communityWitnessingContext', { defaultValue: 'Witnessing' }),
      metaLabel: followUpLabel,
      metaDetail: t('scenariosPage.communityWitnessingMeta', { defaultValue: 'Safe documenting + support' }),
      accentClasses: {
        card: 'border-teal-700/35 bg-gradient-to-br from-slate-900 via-slate-900/96 to-teal-950/20 hover:border-teal-500/40 hover:shadow-[0_18px_44px_rgba(13,148,136,0.18)]',
        glow: 'bg-[radial-gradient(circle_at_top_right,rgba(45,212,191,0.12),transparent_48%)]',
        iconWrap: 'border-teal-500/25 bg-teal-500/10',
        kicker: 'border-teal-500/18 bg-teal-500/10 text-teal-100',
        metaPill: 'border-teal-500/18 bg-teal-500/8 text-teal-100',
        hintWrap: 'border-teal-500/16 bg-teal-500/8',
        hintLabel: 'text-teal-200/90',
        hintText: 'text-teal-100/90',
        cta: 'text-teal-300 group-hover:text-teal-200',
      },
    },
  ]), [documentLabel, followUpLabel, incidentLogLabel, t]);

  const cardCatalog = useMemo(() => ([
    ...activeNowCards.map((card) => ({
      ...card,
      iconNode: <ScenarioIcon iconName={card.icon} size={30} className={card.accentClasses.cta} />,
    })),
    ...prepareAheadCards,
    ...knowRightsCards,
    ...followUpCards,
  ]), [activeNowCards, followUpCards, knowRightsCards, prepareAheadCards]);

  const cardCatalogById = useMemo(
    () => new Map(cardCatalog.map((card) => [card.id, card])),
    [cardCatalog],
  );
  const recentScenarioCards = recentScenarioIds.map((id) => cardCatalogById.get(id)).filter(Boolean);

  const jumpItems = useMemo(() => [
    { id: 'active-now', label: t('scenariosPage.activeNowEyebrow', { defaultValue: 'Active now' }) },
    { id: 'prepare-ahead', label: t('scenariosPage.prepareAheadEyebrow', { defaultValue: 'Prepare ahead' }) },
    { id: 'know-rights', label: t('scenariosPage.knowRightsEyebrow', { defaultValue: 'Know your rights' }) },
    { id: 'follow-up', label: t('scenariosPage.afterEncounter', { defaultValue: 'After an encounter' }) },
  ], [t]);

  useEffect(() => {
    setRecentScenarioIds(readRecentScenarioIds());
  }, []);

  useEffect(() => {
    const id = setInterval(() => {
      setScenarioQuoteIndex((i) => (i + 1) % SCENARIOS_DESKTOP_QUOTES.length);
    }, 6000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    let timeoutId;
    let savedCardId = null;

    try {
      const saved = sessionStorage.getItem(SCENARIOS_SCROLL_KEY);
      if (saved) {
        const scrollTop = Number(saved);
        sessionStorage.removeItem(SCENARIOS_SCROLL_KEY);
        if (Number.isFinite(scrollTop)) {
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              window.scrollTo({ top: scrollTop, behavior: 'auto' });
            });
          });
        }
      }

      savedCardId = sessionStorage.getItem(SCENARIOS_LAST_OPENED_KEY);
      if (savedCardId) {
        sessionStorage.removeItem(SCENARIOS_LAST_OPENED_KEY);
      }
    } catch (error) {
      console.warn('Failed to restore scenarios state', error);
    }

    if (savedCardId && cardCatalogById.has(savedCardId)) {
      const restoredCard = cardCatalogById.get(savedCardId);
      setRestoredCardId(savedCardId);
      if (restoredCard.sectionId && restoredCard.sectionId !== 'active-now') {
        setMobileExpandedSections((current) => ({
          ...current,
          [restoredCard.sectionId]: true,
        }));
      }
      timeoutId = window.setTimeout(() => {
        setRestoredCardId((current) => (current === savedCardId ? null : current));
      }, 2200);
    }

    return () => {
      if (timeoutId) window.clearTimeout(timeoutId);
    };
  }, [cardCatalogById]);

  useEffect(() => {
    const updateActiveJump = () => {
      const entries = jumpItems
        .map((item) => {
          const element = sectionRefs.current[item.id];
          if (!element) return null;
          const distance = Math.abs(element.getBoundingClientRect().top - 138);
          return { id: item.id, distance };
        })
        .filter(Boolean);

      if (entries.length === 0) return;
      entries.sort((a, b) => a.distance - b.distance);
      setActiveJump(entries[0].id);
    };

    updateActiveJump();
    window.addEventListener('scroll', updateActiveJump, { passive: true });
    window.addEventListener('resize', updateActiveJump);
    return () => {
      window.removeEventListener('scroll', updateActiveJump);
      window.removeEventListener('resize', updateActiveJump);
    };
  }, [jumpItems]);

  const jumpToSection = (sectionId) => {
    const section = sectionRefs.current[sectionId];
    if (!section) return;
    if (sectionId !== 'active-now') {
      setMobileExpandedSections((current) => ({ ...current, [sectionId]: true }));
    }
    section.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const toggleMobileSection = (sectionId) => {
    setMobileExpandedSections((current) => ({
      ...current,
      [sectionId]: !current[sectionId],
    }));
  };

  const primaryRecentCard = recentScenarioCards[0] || null;
  const secondaryRecentCards = recentScenarioCards.slice(1, 4);

  const renderSection = ({ sectionId, cards, delay, colsClass, headerProps }) => {
    const isExpanded = sectionId === 'active-now' || mobileExpandedSections[sectionId];
    const previewCard = cards[0];

    return (
      <section
        key={sectionId}
        ref={(node) => { sectionRefs.current[sectionId] = node; }}
        className="page-section-item mt-10 scroll-mt-28 sm:scroll-mt-32"
      >
        <SectionHeader {...headerProps} />

        <div className="md:hidden">
          <button
            type="button"
            onClick={() => toggleMobileSection(sectionId)}
            className="inline-flex items-center gap-2 rounded-full border border-slate-700/80 bg-slate-900/80 px-4 py-2 text-sm font-semibold text-slate-200 transition-colors hover:border-slate-600 hover:text-white"
          >
            <CaretDown
              size={15}
              weight="bold"
              className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}
            />
            {isExpanded
              ? t('scenariosPage.hideSection', { defaultValue: 'Hide tools' })
              : t('scenariosPage.showSection', { count: cards.length, defaultValue: 'Show {{count}} tools' })}
          </button>

          {!isExpanded && previewCard && (
            <button
              type="button"
              onClick={() => handleScenarioClick({ id: previewCard.id, icon: previewCard.icon, title: previewCard.title })}
              className="mt-3 w-full rounded-[24px] border border-slate-800/80 bg-slate-950/68 p-4 text-left transition-[border-color,background-color,transform,box-shadow] duration-200 hover:border-slate-700 hover:bg-slate-950/84 active:scale-[0.99]"
            >
              <div className="flex items-start gap-3">
                <div className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${previewCard.accentClasses.iconWrap}`}>
                  {previewCard.iconNode}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-bold text-white">{previewCard.title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-400">{previewCard.description}</p>
                  <div className="mt-2 flex items-center justify-between gap-3">
                    <p className="text-xs font-medium text-slate-500">{previewCardLabel(cards.length, t)}</p>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-300">
                      {t('scenariosPage.openPreviewTool', { defaultValue: 'Open tool' })}
                      <CaretRight size={13} weight="bold" />
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )}
        </div>

        <div className={`${isExpanded ? 'mt-4 grid' : 'hidden'} ${colsClass} gap-4 scenario-section-rise md:mt-0 md:grid`} style={sectionDelayStyle(delay)}>
          {cards.map((card) => (
            <div key={card.id} className="scenario-section-item">
              <ScenarioCard
                featured={sectionId === 'active-now'}
                title={card.title}
                description={card.description}
                hint={card.hint}
                hintLabel={hintLabel}
                ctaLabel={card.ctaLabel}
                accentClasses={card.accentClasses}
                iconNode={card.iconNode}
                onClick={() => handleScenarioClick({ id: card.id, icon: card.icon, title: card.title })}
                highlighted={restoredCardId === card.id}
                roleLabel={card.roleLabel}
                contextLabel={card.contextLabel}
                metaLabel={card.metaLabel}
                metaDetail={card.metaDetail}
              />
            </div>
          ))}
        </div>
      </section>
    );
  };

  return (
    <div className="page-transition-in page-section-stagger mx-auto max-w-5xl px-4 pb-24 pt-3">
      <section className="page-section-item relative overflow-hidden rounded-[32px] border border-slate-800/80 bg-gradient-to-br from-slate-950 via-slate-950/95 to-slate-900/80 px-6 py-7 shadow-[0_24px_70px_-44px_rgba(15,23,42,0.92)]">
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/40 to-transparent" />
        <div className="pointer-events-none absolute -top-16 right-0 h-48 w-48 rounded-full bg-red-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-20 left-0 h-48 w-48 rounded-full bg-cyan-500/10 blur-3xl" />

        <div className="relative">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-blue-500/20 bg-blue-500/10 px-4 py-2 text-[11px] font-black uppercase tracking-[0.2em] text-blue-200 scenario-fade-in" style={animationDelayStyle(0.04)}>
            <HandTap size={14} weight="bold" className="text-blue-300" />
            {t('scenariosPage.activeNowBadge', { defaultValue: 'Start Here' })}
          </div>

          <div className="scenario-fade-in" style={animationDelayStyle(0.1)}>
            <div className="mb-4 flex flex-col items-center gap-3 text-center xl:flex-row xl:items-start xl:text-left">
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_28px_rgba(6,182,212,0.15)]">
                <MapTrifold size={30} weight="bold" />
              </div>
              <h1 className="max-w-3xl text-3xl font-black tracking-tight text-white sm:text-[2.8rem]">
                {t('scenariosPage.activeNowTitle', { defaultValue: 'Choose a Scenario' })}
              </h1>
            </div>
            <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-300 sm:text-base">
              {t('scenariosPage.activeNowDesc', { defaultValue: 'Pick the guide that matches what is happening right now. The first four cards are the fastest paths for the most common encounters.' })}
            </p>
            <p className="mt-3 inline-flex max-w-2xl items-center gap-2 rounded-full border border-slate-700/70 bg-slate-900/65 px-4 py-2 text-sm font-medium text-slate-300">
              <Sparkle size={14} weight="fill" className="text-cyan-300" />
              {t('scenariosPage.activeNowReassurance', { defaultValue: 'Start with the closest scenario. You can switch guides at any time.' })}
            </p>
          </div>
        </div>
      </section>

      <div className="page-section-item sticky top-[84px] z-20 mt-5 overflow-x-auto rounded-2xl border border-slate-800/80 bg-slate-950/84 p-1.5 backdrop-blur-xl sm:top-[92px] scenario-fade-in" style={animationDelayStyle(0.14)}>
        <div className="flex min-w-max gap-1.5">
          {jumpItems.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => jumpToSection(item.id)}
              className={`rounded-xl px-4 py-2.5 text-xs font-semibold tracking-[0.06em] transition-[background-color,color,transform,box-shadow] duration-200 active:scale-[0.98] ${
                activeJump === item.id
                  ? 'bg-blue-500/15 text-blue-100 shadow-[0_0_0_1px_rgba(96,165,250,0.16),0_10px_24px_rgba(30,64,175,0.12)]'
                  : 'text-slate-400 hover:bg-slate-800/80 hover:text-slate-100'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                {item.label}
                {activeJump === item.id && <span className="h-1.5 w-1.5 rounded-full bg-blue-300" />}
              </span>
            </button>
          ))}
        </div>
      </div>

      {primaryRecentCard && (
        <section className="page-section-item mt-6 scenario-fade-in" style={animationDelayStyle(0.18)}>
          <div className="mb-4 flex items-center gap-2">
            <ClockCounterClockwise size={18} weight="bold" className="text-slate-400" />
            <div>
              <p className="text-xs font-semibold tracking-[0.08em] text-slate-500">
                {t('scenariosPage.continueEyebrow', { defaultValue: 'Recent guides' })}
              </p>
              <p className="text-sm text-slate-300">
                {t('scenariosPage.continueTitle', { defaultValue: 'Continue where you left off' })}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.05fr)_minmax(260px,0.95fr)]">
            <button
              type="button"
              onClick={() => handleScenarioClick({ id: primaryRecentCard.id, title: primaryRecentCard.title })}
              className={`group flex w-full items-start gap-4 rounded-[28px] border border-slate-800/80 bg-slate-950/72 p-5 text-left transition-[border-color,background-color,transform,box-shadow] duration-200 hover:border-slate-700 hover:bg-slate-950/84 active:scale-[0.99] ${restoredCardId === primaryRecentCard.id ? 'scenario-return-marker ring-1 ring-blue-400/30' : ''}`}
            >
              <div className={`inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border ${primaryRecentCard.accentClasses.iconWrap}`}>
                {primaryRecentCard.iconNode}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full border border-blue-400/20 bg-blue-500/10 px-2.5 py-0.5 text-[10px] font-semibold text-blue-100">
                    {t('scenariosPage.lastOpened', { defaultValue: 'Last opened' })}
                  </span>
                  {primaryRecentCard.contextLabel && (
                    <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-2.5 py-0.5 text-[10px] font-semibold text-slate-400">
                      {primaryRecentCard.contextLabel}
                    </span>
                  )}
                </div>
                <p className="mt-3 text-base font-black text-white">{primaryRecentCard.title}</p>
                <p className="mt-1 text-sm leading-relaxed text-slate-400">
                  {primaryRecentCard.hint || primaryRecentCard.description}
                </p>
                <div className="mt-4 inline-flex items-center gap-1.5 text-sm font-bold text-slate-200 transition-[gap,color] duration-200 group-hover:gap-2 group-hover:text-white">
                  {t('scenariosPage.resumeGuide', { defaultValue: 'Resume guide' })}
                  <CaretRight size={16} weight="bold" />
                </div>
              </div>
            </button>

            <div className="rounded-[28px] border border-slate-800/80 bg-slate-950/72 p-5">
              <p className="text-xs font-semibold tracking-[0.08em] text-slate-500">
                {t('scenariosPage.otherRecent', { defaultValue: 'Opened recently' })}
              </p>
              <div className="mt-4 space-y-2.5">
                {secondaryRecentCards.length > 0 ? secondaryRecentCards.map((card) => (
                  <button
                    key={card.id}
                    type="button"
                    onClick={() => handleScenarioClick({ id: card.id, title: card.title })}
                    className={`flex w-full items-center gap-3 rounded-2xl border border-slate-800/80 bg-slate-900/70 px-4 py-3 text-left transition-[border-color,background-color,transform,box-shadow] duration-200 hover:border-slate-700 hover:bg-slate-900 active:scale-[0.99] ${restoredCardId === card.id ? 'scenario-return-marker ring-1 ring-blue-400/30' : ''}`}
                  >
                    <div className={`inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border ${card.accentClasses.iconWrap}`}>
                      {card.iconNode}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p className="truncate text-sm font-bold text-white">{card.title}</p>
                        <span className="rounded-full border border-slate-700/80 bg-slate-950/80 px-2 py-0.5 text-[10px] font-semibold text-slate-400">
                          {t('scenariosPage.recentBadge', { defaultValue: 'Recent' })}
                        </span>
                      </div>
                      <p className="mt-1 truncate text-xs text-slate-400">{card.hint}</p>
                    </div>
                  </button>
                )) : (
                  <p className="text-sm leading-relaxed text-slate-500">
                    {t('scenariosPage.recentFallback', { defaultValue: 'Your recently opened guides will show up here.' })}
                  </p>
                )}
              </div>
            </div>
          </div>
        </section>
      )}

      <section
        ref={(node) => { sectionRefs.current['active-now'] = node; }}
        className="page-section-item mt-7 scroll-mt-28 sm:scroll-mt-32"
      >
        <div className="grid gap-4 scenario-section-rise md:grid-cols-2" style={sectionDelayStyle(0.22)}>
          {activeNowCards.map((card) => (
            <div key={card.id} className="scenario-section-item">
              <ScenarioCard
                featured
                title={card.title}
                description={card.description}
                hint={card.hint}
                hintLabel={hintLabel}
                ctaLabel={card.ctaLabel}
                accentClasses={card.accentClasses}
                iconNode={<ScenarioIcon iconName={card.icon} size={30} className={card.accentClasses.cta} />}
                onClick={() => handleScenarioClick({ id: card.id, icon: card.icon, title: card.title })}
                highlighted={restoredCardId === card.id}
                roleLabel={card.roleLabel}
                contextLabel={card.contextLabel}
                metaLabel={card.metaLabel}
                metaDetail={card.metaDetail}
              />
            </div>
          ))}

          {/* Quote block — fills the empty 6th slot on desktop */}
          <div className="scenario-section-item hidden md:flex">
            <div className="relative flex h-full min-h-[212px] w-full flex-col overflow-hidden rounded-[28px] border border-slate-800/70 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.07),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.8),rgba(2,6,23,0.92))] px-6 py-5 shadow-[0_16px_34px_rgba(2,6,23,0.16)]">
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />
              <div className="pointer-events-none absolute -bottom-14 right-0 h-32 w-32 rounded-full bg-cyan-500/8 blur-3xl" />
              {/* Oversized decorative quote mark — upper right, breathing room on all sides */}
              <div className="pointer-events-none absolute top-1 right-5 select-none text-[13rem] leading-none text-cyan-200/[0.06]" style={{ fontFamily: "'Cardo', Georgia, serif", fontWeight: 400 }} aria-hidden="true">"</div>

              {/* Top label only — no counter badge */}
              <div className="relative">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-cyan-200/55">
                  Perspective
                </p>
              </div>

              {/* Quote text — large, grows to fill vertical space */}
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={scenarioQuoteIndex}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -8 }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  className="relative mt-5 flex flex-1 flex-col justify-center"
                >
                  <p
                    className="text-[1.28rem] font-medium italic leading-[1.6] tracking-[0.002em] text-slate-200/80"
                    style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", "Iowan Old Style", ui-serif, Georgia, serif' }}
                  >
                    {t(SCENARIOS_DESKTOP_QUOTES[scenarioQuoteIndex].quoteKey)}
                  </p>
                </motion.div>
              </AnimatePresence>

              {/* Bottom: attribution + dots + progress bar */}
              <div className="relative mt-5 space-y-3">
                <div className="flex items-end justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold tracking-[0.01em] text-slate-400">
                      {t(SCENARIOS_DESKTOP_QUOTES[scenarioQuoteIndex].authorKey)}
                    </p>
                    <p className="mt-0.5 text-[10px] font-bold uppercase tracking-[0.12em] text-slate-600">
                      {SCENARIOS_DESKTOP_QUOTES[scenarioQuoteIndex].theme}
                    </p>
                  </div>
                  <div className="flex items-center gap-1.5 pb-0.5">
                    {SCENARIOS_DESKTOP_QUOTES.map((_, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setScenarioQuoteIndex(idx)}
                        className={`rounded-full transition-all ${
                          idx === scenarioQuoteIndex
                            ? 'h-1.5 w-5 bg-cyan-300/60'
                            : 'h-1.5 w-1.5 bg-slate-600/70 hover:bg-slate-500'
                        }`}
                        aria-label={`Show quote ${idx + 1}`}
                      />
                    ))}
                  </div>
                </div>
                {/* Auto-advance progress bar */}
                <div className="h-px w-full overflow-hidden rounded-full bg-slate-800/80">
                  <motion.div
                    key={`prog-${scenarioQuoteIndex}`}
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 6, ease: 'linear' }}
                    className="h-full rounded-full bg-cyan-400/35"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {renderSection({
        sectionId: 'prepare-ahead',
        cards: prepareAheadCards,
        delay: 0.34,
        colsClass: 'md:grid-cols-2',
        headerProps: {
          eyebrow: t('scenariosPage.prepareAheadEyebrow', { defaultValue: 'Prepare ahead' }),
          title: t('scenariosPage.prepareAheadTitle', { defaultValue: 'Set up support before you need it' }),
          description: t('scenariosPage.prepareAheadDesc', { defaultValue: 'These tools help you get contacts, plans, and family decisions in place while things are calm.' }),
          support: t('scenariosPage.prepareAheadSupport', { defaultValue: 'Finish this work now so emergency steps are lighter later.' }),
          accent: 'text-amber-300',
          delay: 0.28,
        },
      })}

      {renderSection({
        sectionId: 'know-rights',
        cards: knowRightsCards,
        delay: 0.48,
        colsClass: 'md:grid-cols-2',
        headerProps: {
          eyebrow: t('scenariosPage.knowRightsEyebrow', { defaultValue: 'Know your rights' }),
          title: t('scenariosPage.knowRightsTitle', { defaultValue: 'Keep reference tools close' }),
          description: t('scenariosPage.knowRightsDesc', { defaultValue: 'Use these guides to check what officers can ask, where rules change, and how to document safely.' }),
          support: t('scenariosPage.knowRightsSupport', { defaultValue: 'These are best for learning the boundaries before you are under pressure.' }),
          accent: 'text-blue-300',
          delay: 0.42,
        },
      })}

      {renderSection({
        sectionId: 'follow-up',
        cards: followUpCards,
        delay: 0.62,
        colsClass: 'md:grid-cols-2 xl:grid-cols-3',
        headerProps: {
          eyebrow: t('scenariosPage.afterEncounter', { defaultValue: 'After an encounter' }),
          title: t('scenariosPage.followUpTitle', { defaultValue: 'Document Encounter and Decide whats next' }),
          description: t('scenariosPage.followUpDesc', { defaultValue: 'Use these tools after the immediate moment has passed to capture details, support witnesses, and move into follow-up care.' }),
          support: t('scenariosPage.followUpSupport', { defaultValue: 'These are for documenting, stabilizing, and planning the next step once you are safer.' }),
          accent: 'text-emerald-300',
          delay: 0.56,
        },
      })}

      <div className="page-section-item mt-10 rounded-[28px] border border-blue-700/25 bg-gradient-to-br from-slate-900 via-slate-900/96 to-blue-950/20 p-6 scenario-fade-in" style={animationDelayStyle(0.74)}>
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="inline-flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border border-blue-500/25 bg-blue-500/10">
              <BookOpenText size={28} weight="bold" className="text-blue-300" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black tracking-tight text-white">{t('guardiansManual.homeCardTitle')}</h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{t('guardiansManual.homeCardDesc')}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => openGuardiansManualPDF(t)}
            className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl border border-blue-500/25 bg-blue-600/15 px-4 py-3 text-sm font-bold text-blue-200 transition-[transform,background-color,color,border-color] duration-200 hover:border-blue-400/35 hover:bg-blue-600/25 hover:text-white active:scale-[0.98]"
          >
            <DownloadSimple size={18} weight="bold" />
            {t('guardiansManual.downloadPdf')}
          </button>
        </div>
      </div>

      <div className="page-section-item mt-8 border-t border-slate-800/80 pt-8 text-center scenario-fade-in" style={animationDelayStyle(0.8)}>
        <p className="text-sm italic text-slate-400">{scenariosQuote.quote}</p>
        <p className="mt-2 text-xs tracking-wider text-slate-500">{scenariosQuote.author}</p>
      </div>

      <div className="page-section-item mt-5 scenario-fade-in" style={animationDelayStyle(0.86)}>
        <FaqCta onNavigate={onNavigate} />
      </div>

      <div className="page-section-item mt-3 scenario-fade-in" style={animationDelayStyle(0.9)}>
        <Disclaimer>
          {t('disclaimer.line1')}
          <br />{t('disclaimer.line2')}
          <br />{t('disclaimer.line3')}
          <br />{t('disclaimer.line4')}
        </Disclaimer>
      </div>

      <div className="page-section-item mt-8 text-center scenario-fade-in" style={animationDelayStyle(0.94)}>
        <button
          onClick={() => {
            if (window.deferredPrompt) {
              window.deferredPrompt.prompt();
              window.deferredPrompt.userChoice.then((choice) => {
                if (choice.outcome === 'accepted') {
                  console.log('User accepted install');
                }
                window.deferredPrompt = null;
              });
            } else {
              setShowInstallHelp(true);
            }
          }}
          className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3 font-bold text-white shadow-lg shadow-blue-900/30 transition-all hover:from-blue-500 hover:to-blue-600 hover:shadow-blue-900/50"
        >
          <DownloadSimple size={18} weight="bold" />
          {t('emergency.installButton')}
        </button>
        <p className="mt-2 text-xs uppercase tracking-wider text-slate-500">{t('emergency.installRecommended')}</p>
      </div>

      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />
    </div>
  );
};

export default Scenarios;
