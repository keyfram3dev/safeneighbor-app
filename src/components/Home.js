import React, { useState } from 'react';
import { ChevronRight, Download, Settings, Brain } from 'lucide-react';
import { HandWaving, SparkleIcon as Sparkle } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import Disclaimer from './Disclaimer';
import InstallHelp from './InstallHelp';
import { Door, MapPin, User, Megaphone, Leaf, VideoCamera, Car, Shield, Eye, Buildings, ClipboardTextIcon as ClipboardText, UsersThreeIcon as UsersThree, NotePencilIcon as NotePencil, FirstAidKitIcon as FirstAidKit } from '@phosphor-icons/react';

// Map icon string identifiers to Phosphor components
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
};

// Helper to render scenario icon with Phosphor weight
const ScenarioIcon = ({ iconName, size = 28, className = '', weight = 'bold' }) => {
  const IconComponent = iconMap[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} weight={weight} className={className} />;
};


const Home = ({ onNavigate, onNavigateToScenario, onOpenSettings, onShowWelcome, onShowFeatures }) => {
  const { t } = useTranslation();
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  // Handle clicking a scenario card
  const handleScenarioClick = (scenario) => {
    // If it's a direct route (like 'reports'), just navigate there
    if (scenario.route === 'reports') {
      if (onNavigate) onNavigate('reports');
      return;
    }

    // If scenario has data (dataId exists), go directly to that scenario
    if (scenario.dataId && onNavigateToScenario) {
      onNavigateToScenario({ id: scenario.dataId });
    } else {
      // No dataId means data doesn't exist yet - just go to scenarios list
      if (onNavigate) onNavigate('scenarios');
    }
  };

  // Navigation for non-scenario links
  const navigate = (route) => {
    if (onNavigate) onNavigate(route);
  };

  // Each scenario needs TWO ids:
  // - id: unique key for React's list rendering
  // - dataId: matches the key in scenarioData.js that ScenarioDetail uses
  const scenarios = [
    {
      id: 'community-reports',
      dataId: null,
      icon: 'mapPin',
      title: t('home.communityReportsTitle'),
      description: t('home.communityReportsDesc'),
      route: 'reports'
    },
    {
      id: 'family-kit',
      dataId: 'family-kit',
      icon: 'clipboardText',
      title: t('home.familyKitTitle'),
      description: t('home.familyKitDesc'),
      route: 'scenarios'
    },
    {
      id: 'trusted-contacts',
      dataId: 'trusted-contacts',
      icon: 'usersThree',
      title: t('home.trustedContactsTitle'),
      description: t('home.trustedContactsDesc'),
      route: 'scenarios'
    },
    {
      id: 'de-escalation',
      dataId: 'de-escalation',
      icon: 'leaf',
      title: t('home.deEscalationTitle'),
      description: t('home.deEscalationDesc'),
      route: 'scenarios'
    },
    {
      id: 'ice-at-door',
      dataId: 'door',
      icon: 'door',
      title: t('home.doorTitle'),
      description: t('home.doorDesc'),
      route: 'scenarios'
    },
    {
      id: 'stopped-on-street',
      dataId: 'street',
      icon: 'user',
      title: t('home.streetTitle'),
      description: t('home.streetDesc'),
      route: 'scenarios'
    },
    {
      id: 'protesting-rights',
      dataId: 'protest',
      icon: 'megaphone',
      title: t('home.protestTitle'),
      description: t('home.protestDesc'),
      route: 'scenarios'
    },
    {
      id: 'recording-rights',
      dataId: 'recording',
      icon: 'video',
      title: t('home.recordingTitle'),
      description: t('home.recordingDesc'),
      route: 'scenarios'
    },
    {
      id: 'vehicle-stops',
      dataId: 'vehicle',
      icon: 'car',
      title: t('home.vehicleTitle'),
      description: t('home.vehicleDesc'),
      route: 'scenarios'
    },
    {
      id: 'border-crossings',
      dataId: 'border',
      icon: 'shield',
      title: t('home.borderTitle'),
      description: t('home.borderDesc'),
      route: 'scenarios'
    },
    {
      id: 'follow-ice',
      dataId: null,
      icon: 'eye',
      title: t('home.followIceTitle'),
      description: t('home.followIceDesc'),
      route: 'scenarios'
    },
    {
      id: 'workplace-inquiry',
      dataId: 'workplace',
      icon: 'building2',
      title: t('home.workplaceTitle'),
      description: t('home.workplaceDesc'),
      route: 'scenarios'
    }
  ];

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4 relative">
      {/* Noise texture overlay */}
      <div
        className="fixed inset-0 pointer-events-none z-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='1.2' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
        }}
      />

      {/* Header with gradient glow */}
      <div className="text-center mb-10 pt-6 relative">
        {/* Subtle glow effect */}
        <div className="absolute inset-0 -top-20 bg-gradient-to-b from-blue-600/10 via-transparent to-transparent blur-3xl pointer-events-none" />

        <div className="relative">
          <div className="flex justify-center items-center gap-3 mb-3">
            <Brain size={40} className="text-blue-400" />
            <h1 className="text-4xl font-black text-white tracking-tight">{t('home.heroTitle')}</h1>
          </div>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            {t('home.heroSubtitle')}
          </p>
        </div>

        {/* Security Settings & Welcome buttons */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-emerald-600/80 to-emerald-500/80 hover:from-emerald-500/80 hover:to-emerald-400/80 border border-emerald-500/50 rounded-full text-white text-xs transition-all shadow-sm shadow-emerald-500/20"
          >
            <Settings size={14} />
            <span>{t('home.security')}</span>
          </button>
          <button
            onClick={onShowFeatures}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-violet-600/80 to-violet-500/80 hover:from-violet-500/80 hover:to-violet-400/80 border border-violet-500/50 rounded-full text-white text-xs transition-all shadow-sm shadow-violet-500/20"
          >
            <Sparkle size={14} weight="bold" />
            <span>{t('home.features')}</span>
          </button>
          <button
            onClick={onShowWelcome}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600/80 to-blue-500/80 hover:from-blue-500/80 hover:to-blue-400/80 border border-blue-500/50 rounded-full text-white text-xs transition-all shadow-sm shadow-blue-500/20"
          >
            <HandWaving size={14} weight="bold" />
            <span>{t('home.welcomeButton')}</span>
          </button>
        </div>
      </div>

      {/* Scenario Cards - Glass Morphism Style */}
      <div className="space-y-3">
        {scenarios.map((scenario) => (
          <div
            key={scenario.id}
            onClick={() => handleScenarioClick(scenario)}
            className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5"
          >
            {/* Subtle gradient overlay on hover */}
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/0 to-purple-500/0 group-hover:from-blue-500/5 group-hover:to-purple-500/5 rounded-2xl transition-all duration-300 pointer-events-none" />

            <div className="relative flex items-start gap-4">
              {/* Icon with background */}
              <div className="p-3 bg-slate-800 rounded-xl border border-slate-700/50 group-hover:border-blue-500/30 transition-all">
                <ScenarioIcon iconName={scenario.icon} size={24} className="text-blue-400" />
              </div>

              <div className="flex-1 min-w-0">
                <h2 className="text-lg font-bold text-white mb-1 group-hover:text-blue-100 transition-colors">
                  {scenario.title}
                </h2>
                <p className="text-slate-400 text-sm leading-relaxed mb-3">
                  {scenario.description}
                </p>
                <span className="text-blue-400 text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
                  {t('home.openGuide')} <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          </div>
        ))}

      </div>

      {/* Encounter Log — standalone card below scenarios */}
      <div
        onClick={() => onNavigateToScenario && onNavigateToScenario({ id: 'encounter-log-after', icon: 'notePencil', title: 'Encounter Log' })}
        className="mt-3 group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-amber-700/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-amber-500/0 to-orange-500/0 group-hover:from-amber-500/5 group-hover:to-orange-500/5 rounded-2xl transition-all duration-300 pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="p-3 bg-slate-800 rounded-xl border border-amber-700/30 group-hover:border-amber-500/30 transition-all">
            <NotePencil size={24} weight="bold" className="text-amber-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-amber-100 transition-colors">
              {t('home.encounterLogTitle')}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-3">
              {t('home.encounterLogDesc')}
            </p>
            <span className="text-amber-400 text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              {t('home.openLog')} <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </div>

      {/* Post-Encounter Guide — standalone card */}
      <div
        onClick={() => onNavigateToScenario && onNavigateToScenario({ id: 'post-encounter', icon: 'firstAidKit', title: 'Post-Encounter Guide' })}
        className="mt-3 group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-emerald-700/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-emerald-500/0 to-green-500/0 group-hover:from-emerald-500/5 group-hover:to-green-500/5 rounded-2xl transition-all duration-300 pointer-events-none" />
        <div className="relative flex items-start gap-4">
          <div className="p-3 bg-slate-800 rounded-xl border border-emerald-700/30 group-hover:border-emerald-500/30 transition-all">
            <FirstAidKit size={24} weight="bold" className="text-emerald-400" />
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold text-white mb-1 group-hover:text-emerald-100 transition-colors">
              {t('home.postEncounterTitle')}
            </h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-3">
              {t('home.postEncounterDesc')}
            </p>
            <span className="text-emerald-400 text-sm font-semibold inline-flex items-center gap-1 group-hover:gap-2 transition-all">
              {t('home.getStarted')} <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
            </span>
          </div>
        </div>
      </div>

      {/* Constitutional Foundation - Elevated Card */}
      <div className="mt-8 relative">
        {/* Gradient glow behind */}
        <div className="absolute inset-0 bg-gradient-to-r from-red-600/20 via-purple-600/10 to-blue-600/20 blur-2xl pointer-events-none" />

        <div className="relative bg-gradient-to-br from-slate-800/90 to-slate-900/90 border border-slate-700/50 rounded-2xl p-6 overflow-hidden">
          {/* Decorative corner accent */}
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
            onClick={() => navigate('legal')}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-red-900/30 hover:shadow-red-900/50"
          >
            {t('home.exploreRights')}
          </button>
        </div>
      </div>

      {/* Marcus Aurelius Quote - Refined */}
      <div className="mt-10 text-center py-8 border-t border-slate-800/50">
        <p className="text-slate-400 italic text-base max-w-sm mx-auto leading-relaxed">
          {t('home.aureliusQuote')}
        </p>
        <p className="text-slate-500 text-xs mt-3 tracking-widest uppercase">{t('home.aureliusAuthor')}</p>
      </div>

      {/* Disclaimer */}
      <Disclaimer>
        {t('home.disclaimerText')}
      </Disclaimer>

      {/* Install PWA Button - Refined */}
      <div className="mt-8 text-center">
        <button
          onClick={() => {
            if (window.deferredPrompt) {
              window.deferredPrompt.prompt();
            } else {
              alert(t('home.installAlert'));
            }
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 inline-flex items-center gap-2"
        >
          <Download size={18} />
          {t('home.installApp')}
        </button>
        <p className="text-slate-500 text-[10px] mt-2 tracking-widest uppercase">
          {t('home.offlineSecure')}
        </p>
        <button
          onClick={() => setShowInstallHelp(true)}
          className="text-blue-400 hover:text-blue-300 text-xs font-semibold mt-2 transition-colors"
        >
          {t('home.installHelp')}
        </button>
      </div>

      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />

    </div>
  );
};

export default Home;
