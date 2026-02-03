import React from 'react';
import { motion } from 'framer-motion';
import { House, User, Megaphone, VideoCamera, Car, Shield, Buildings, CaretRight, DownloadSimple, Warning, HandTap } from '@phosphor-icons/react';

// Map icon string identifiers to Phosphor components
const iconMap = {
  home: House,
  user: User,
  megaphone: Megaphone,
  video: VideoCamera,
  car: Car,
  shield: Shield,
  building2: Buildings,
};

// Helper to render scenario icon with Phosphor weight
const ScenarioIcon = ({ iconName, size = 28, className = '', weight = 'bold' }) => {
  const IconComponent = iconMap[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} weight={weight} className={className} />;
};

const Scenarios = ({ onNavigate, onSelectScenario }) => {
  const navigate = (route) => {
    if (onNavigate) onNavigate(route);
  };

  const handleScenarioClick = (scenario) => {
    if (onSelectScenario) {
      onSelectScenario(scenario);
    }
  };

  const scenarios = [
    {
      id: 'door',
      icon: 'home',
      title: 'ICE Is At My Door',
      description: 'Scripts for judicial vs administrative warrants.',
    },
    {
      id: 'street',
      icon: 'user',
      title: 'Stopped in Public',
      description: 'Exercising silence and asking if you are free to go.',
    },
    {
      id: 'protest',
      icon: 'megaphone',
      title: 'Protesting Rights',
      description: 'Best practices and legal boundaries for peaceful assembly.',
    },
    {
      id: 'recording',
      icon: 'video',
      title: 'Recording Rights',
      description: 'When and how you can legally document ICE activity.',
    },
    {
      id: 'vehicle',
      icon: 'car',
      title: 'Traffic Stop',
      description: 'Handling stops while driving a vehicle.',
    },
    {
      id: 'border',
      icon: 'shield',
      title: 'Border Crossing',
      description: 'Rights at ports of entry and internal checkpoints.',
    },
    {
      id: 'workplace',
      icon: 'building2',
      title: 'Workplace Inquiry',
      description: 'Protecting your space and coworkers.',
    }
  ];

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      {/* Header */}
      <div className="text-center mb-6 pt-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <HandTap size={36} weight="bold" className="text-blue-400" />
          <h1 className="text-3xl font-black text-white tracking-wide">Interactive Scenarios</h1>
        </div>
        <p className="text-slate-400 text-sm">
          Practice your response or get immediate help for active encounters.
        </p>
      </div>

      {/* Scenario Cards */}
      <div className="space-y-4">
        {scenarios.map((scenario) => (
          <motion.div
            key={scenario.id}
            layoutId={`scenario-card-${scenario.id}`}
            onClick={() => handleScenarioClick(scenario)}
            className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5"
            transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
          >
            <div className="flex items-start gap-4">
              <motion.div
                layoutId={`scenario-icon-${scenario.id}`}
                className="text-blue-400"
                transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
              >
                <ScenarioIcon iconName={scenario.icon} size={28} />
              </motion.div>
              <div className="flex-1">
                <motion.h2
                  layoutId={`scenario-title-${scenario.id}`}
                  className="text-lg font-semibold text-white mb-1"
                  transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
                >
                  {scenario.title}
                </motion.h2>
                <p className="text-slate-400 text-sm mb-3">
                  {scenario.description}
                </p>
                <span className="text-blue-400 text-sm font-medium inline-flex items-center gap-1 hover:text-blue-300">
                  Open Guide <CaretRight size={16} weight="bold" />
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>

      {/* Quote */}
      <div className="mt-8 text-center py-6">
        <p className="text-slate-400 italic text-sm">
          "Between stimulus and response there is a space. In that space is our power to choose our response."
        </p>
        <p className="text-slate-500 text-xs mt-2 tracking-wider">— VIKTOR FRANKL</p>
      </div>

      {/* Disclaimer */}
      <div className="mt-2 text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Warning size={16} weight="bold" className="text-amber-500" />
          <h3 className="text-amber-400 font-medium text-sm tracking-wider">DISCLAIMER</h3>
        </div>
        <p className="text-slate-400 text-xs leading-relaxed">
          This app shares general info on your rights — not legal advice.
          <br />I'm not a lawyer, and accuracy isn't guaranteed.
          <br />For legal help, talk to a licensed attorney.
          <br />Use this info at your own discretion.
        </p>
      </div>

      {/* Install PWA Button */}
      <div className="mt-8 text-center">
        <button
          onClick={() => {
            if (window.deferredPrompt) {
              window.deferredPrompt.prompt();
            } else {
              alert('To install: tap the share button in your browser and select "Add to Home Screen"');
            }
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 inline-flex items-center gap-2"
        >
          <DownloadSimple size={18} weight="bold" />
          INSTALL BROWSERLESS APP
        </button>
        <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider">
          Recommended for offline & secure use
        </p>
      </div>
    </div>
  );
};

export default Scenarios;