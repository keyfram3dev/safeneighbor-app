import React, { useState, useEffect } from 'react';
import { ChevronRight, Download, Settings, AlertTriangle, Brain } from 'lucide-react';
import { HandWaving } from '@phosphor-icons/react';
import Welcome from './Welcome';
import { Door, MapPin, User, Megaphone, Leaf, VideoCamera, Car, Shield, Eye, Buildings } from '@phosphor-icons/react';

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
};

// Helper to render scenario icon with Phosphor weight
const ScenarioIcon = ({ iconName, size = 28, className = '', weight = 'bold' }) => {
  const IconComponent = iconMap[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} weight={weight} className={className} />;
};

const WELCOME_SHOWN_KEY = 'safeneighbor_welcome_shown';

const Home = ({ onNavigate, onNavigateToScenario, onOpenSettings }) => {
  const [showWelcome, setShowWelcome] = useState(false);

  // Check for first visit
  useEffect(() => {
    const hasSeenWelcome = localStorage.getItem(WELCOME_SHOWN_KEY);
    if (!hasSeenWelcome) {
      setShowWelcome(true);
      localStorage.setItem(WELCOME_SHOWN_KEY, 'true');
    }
  }, []);

  const handleCloseWelcome = () => {
    setShowWelcome(false);
  };

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
      id: 'de-escalation',
      dataId: 'de-escalation',
      icon: 'leaf',
      title: 'De-escalation Techniques',
      description: 'Stay calm and reduce tension during confrontational encounters.',
      route: 'scenarios'
    },
    {
      id: 'ice-at-door',
      dataId: 'door',        // ← This matches scenarioData.js key
      icon: 'door',
      title: 'ICE Is At My Door',
      description: 'Step-by-step scripts to speak through the door without opening it.',
      route: 'scenarios'
    },
    {
      id: 'community-reports',
      dataId: null,          // ← No scenario data, goes directly to reports
      icon: 'mapPin',
      title: 'Community Reports',
      description: 'View and share real-time ICE activity sightings in your area.',
      route: 'reports'       // ← Direct navigation, no scenario selection
    },
    {
      id: 'stopped-on-street',
      dataId: 'street',      // ← Matches scenarioData.js key
      icon: 'user',
      title: 'Stopped on the Street',
      description: 'Are you free to leave? How to exercise silence in public.',
      route: 'scenarios'
    },
    {
      id: 'protesting-rights',
      dataId: 'protest',     // ← Matches scenarioData.js key
      icon: 'megaphone',
      title: 'Protesting Rights',
      description: 'Know your rights while exercising your freedom to assemble.',
      route: 'scenarios'
    },
    {
      id: 'recording-rights',
      dataId: 'recording',   // ← Matches scenarioData.js key
      icon: 'video',
      title: 'Recording Rights',
      description: 'Learn when and how you can legally document ICE activity.',
      route: 'scenarios'
    },
    {
      id: 'vehicle-stops',
      dataId: 'vehicle',     // ← Matches scenarioData.js key
      icon: 'car',
      title: 'Vehicle Stops',
      description: 'Rights during ICE traffic stops. Warrant vs consent.',
      route: 'scenarios'
    },
    {
      id: 'border-crossings',
      dataId: 'border',      // ← Matches scenarioData.js key
      icon: 'shield',
      title: 'Border Crossings',
      description: 'Special rules within 100 miles of the border. Know the limits.',
      route: 'scenarios'
    },
    {
      id: 'follow-ice',
      dataId: null,          // ← No data yet, goes to scenarios list
      icon: 'eye',
      title: 'Your Right To Follow ICE',
      description: 'Legally observe and document ICE operations from a safe distance.',
      route: 'scenarios'     // Will go to list since dataId is null
    },
    {
      id: 'workplace-inquiry',
      dataId: 'workplace',   // ← Matches scenarioData.js key
      icon: 'building2',
      title: 'Workplace Inquiry',
      description: 'Know your rights if ICE enters your workplace.',
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
            <h1 className="text-4xl font-black text-white tracking-tight">Know Your Rights</h1>
          </div>
          <p className="text-slate-400 text-base max-w-md mx-auto">
            Empowerment through calm assertion and constitutional wisdom.
          </p>
        </div>

        {/* Security Settings & Welcome buttons */}
        <div className="mt-4 flex items-center justify-center gap-2">
          <button
            onClick={onOpenSettings}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-slate-800/30 hover:bg-slate-800/50 border border-slate-700/50 rounded-full text-slate-400 hover:text-white text-xs transition-all"
          >
            <Settings size={14} />
            <span>Security</span>
          </button>
          <button
            onClick={() => setShowWelcome(true)}
            className="inline-flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-blue-600/80 to-blue-500/80 hover:from-blue-500/80 hover:to-blue-400/80 border border-blue-500/50 rounded-full text-white text-xs transition-all shadow-sm shadow-blue-500/20"
          >
            <HandWaving size={14} weight="bold" />
            <span>Welcome!</span>
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
                  Open Guide <ChevronRight size={16} className="group-hover:translate-x-0.5 transition-transform" />
                </span>
              </div>
            </div>
          </div>
        ))}
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
            Constitutional Foundation
          </h2>
          <p className="text-slate-300 text-sm leading-relaxed mb-5">
            The 4th Amendment protects you against unreasonable searches. ICE needs a <strong className="text-white">Judicial Warrant</strong> signed by a judge to enter your home.
          </p>
          <button
            onClick={() => navigate('legal')}
            className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-red-900/30 hover:shadow-red-900/50"
          >
            Explore State & Federal Rights
          </button>
        </div>
      </div>

      {/* Marcus Aurelius Quote - Refined */}
      <div className="mt-10 text-center py-8 border-t border-slate-800/50">
        <p className="text-slate-400 italic text-base max-w-sm mx-auto leading-relaxed">
          "You have power over your mind - not outside events. Realize this, and you will find strength."
        </p>
        <p className="text-slate-500 text-xs mt-3 tracking-widest uppercase">— Marcus Aurelius</p>
      </div>

      {/* Disclaimer - More Subtle */}
      <div className="text-center opacity-70 hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-center gap-2 mb-2">
          <AlertTriangle size={14} className="text-amber-500/70" />
          <h3 className="text-amber-500/70 font-medium text-[10px] tracking-widest uppercase">Disclaimer</h3>
        </div>
        <p className="text-slate-500 text-[11px] leading-relaxed max-w-xs mx-auto">
          General information only — not legal advice. Consult a licensed attorney for legal help.
        </p>
      </div>

      {/* Install PWA Button - Refined */}
      <div className="mt-8 text-center">
        <button
          onClick={() => {
            if (window.deferredPrompt) {
              window.deferredPrompt.prompt();
            } else {
              alert('To install: tap the share button in your browser and select "Add to Home Screen"');
            }
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-8 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 inline-flex items-center gap-2"
        >
          <Download size={18} />
          Install App
        </button>
        <p className="text-slate-500 text-[10px] mt-2 tracking-widest uppercase">
          Offline & secure use
        </p>
      </div>

      {/* Welcome Modal */}
      {showWelcome && <Welcome onClose={handleCloseWelcome} />}
    </div>
  );
};

export default Home;
