import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { House, User, Megaphone, VideoCamera, Car, Shield, Buildings, CaretRight, DownloadSimple, HandTap, ClipboardTextIcon as ClipboardText, UsersThreeIcon as UsersThree, NotePencilIcon as NotePencil, FirstAidKitIcon as FirstAidKit, IdentificationCardIcon as IdentificationCard } from '@phosphor-icons/react';
import { useTranslation } from 'react-i18next';
import Disclaimer from './Disclaimer';
import InstallHelp from './InstallHelp';

// Map icon string identifiers to Phosphor components
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
};
// Helper to render scenario icon with Phosphor weight
const ScenarioIcon = ({ iconName, size = 28, className = '', weight = 'bold' }) => {
  const IconComponent = iconMap[iconName];
  if (!IconComponent) return null;
  return <IconComponent size={size} weight={weight} className={className} />;
};

const Scenarios = ({ onSelectScenario }) => {
  const { t } = useTranslation();
  const [showInstallHelp, setShowInstallHelp] = useState(false);

  const handleScenarioClick = (scenario) => {
    if (onSelectScenario) {
      onSelectScenario(scenario);
    }
  };

  const scenarios = [
    {
      id: 'door',
      icon: 'home',
      title: t('scenariosPage.doorTitle'),
      description: t('scenariosPage.doorDesc'),
    },
    {
      id: 'street',
      icon: 'user',
      title: t('scenariosPage.streetTitle'),
      description: t('scenariosPage.streetDesc'),
    },
    {
      id: 'protest',
      icon: 'megaphone',
      title: t('scenariosPage.protestTitle'),
      description: t('scenariosPage.protestDesc'),
    },
    {
      id: 'recording',
      icon: 'video',
      title: t('scenariosPage.recordingTitle'),
      description: t('scenariosPage.recordingDesc'),
    },
    {
      id: 'vehicle',
      icon: 'car',
      title: t('scenariosPage.vehicleTitle'),
      description: t('scenariosPage.vehicleDesc'),
    },
    {
      id: 'border',
      icon: 'shield',
      title: t('scenariosPage.borderTitle'),
      description: t('scenariosPage.borderDesc'),
    },
    {
      id: 'workplace',
      icon: 'building2',
      title: t('scenariosPage.workplaceTitle'),
      description: t('scenariosPage.workplaceDesc'),
    }
  ];

  return (
    <div className="max-w-4xl mx-auto pb-24 px-4">
      {/* Header */}
      <div className="text-center mb-6 pt-4">
        <div className="flex items-center justify-center gap-3 mb-4">
          <HandTap size={36} weight="bold" className="text-blue-400" />
          <h1 className="text-3xl font-black text-white tracking-wide">{t('scenariosPage.title')}</h1>
        </div>
        <p className="text-slate-400 text-sm">
          {t('scenariosPage.subtitle')}
        </p>
      </div>

      {/* Before an Encounter */}
      <div className="mb-6">
        <h3 className="text-xs font-bold text-amber-400 uppercase tracking-widest mb-4">
          {t('scenariosPage.beforeEncounter')}
        </h3>
        <div className="space-y-4">
          {/* Family Preparedness Kit */}
          <motion.div
            layoutId="scenario-card-family-kit"
            onClick={() => handleScenarioClick({ id: 'family-kit', icon: 'clipboardText', title: t('scenariosPage.familyKitTitle') })}
            className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-amber-700/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5"
            transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
          >
            <div className="flex items-start gap-4">
              <motion.div
                layoutId="scenario-icon-family-kit"
                className="text-amber-400"
                transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
              >
                <ClipboardText size={28} weight="bold" />
              </motion.div>
              <div className="flex-1">
                <motion.h2
                  layoutId="scenario-title-family-kit"
                  className="text-lg font-semibold text-white mb-1"
                  transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
                >
                  {t('scenariosPage.familyKitTitle')}
                </motion.h2>
                <p className="text-slate-400 text-sm mb-3">
                  {t('scenariosPage.familyKitDesc')}
                </p>
                <span className="text-amber-400 text-sm font-medium inline-flex items-center gap-1 hover:text-amber-300">
                  {t('scenariosPage.openGuide')} <CaretRight size={16} weight="bold" />
                </span>
              </div>
            </div>
          </motion.div>

          {/* Trusted Contact Network */}
          <motion.div
            layoutId="scenario-card-trusted-contacts"
            onClick={() => handleScenarioClick({ id: 'trusted-contacts', icon: 'usersThree', title: t('scenariosPage.trustedContactsTitle') })}
            className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-amber-700/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5"
            transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
          >
            <div className="flex items-start gap-4">
              <motion.div
                layoutId="scenario-icon-trusted-contacts"
                className="text-amber-400"
                transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
              >
                <UsersThree size={28} weight="bold" />
              </motion.div>
              <div className="flex-1">
                <motion.h2
                  layoutId="scenario-title-trusted-contacts"
                  className="text-lg font-semibold text-white mb-1"
                  transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
                >
                  {t('scenariosPage.trustedContactsTitle')}
                </motion.h2>
                <p className="text-slate-400 text-sm mb-3">
                  {t('scenariosPage.trustedContactsDesc')}
                </p>
                <span className="text-amber-400 text-sm font-medium inline-flex items-center gap-1 hover:text-amber-300">
                  {t('scenariosPage.openGuide')} <CaretRight size={16} weight="bold" />
                </span>
              </div>
            </div>
          </motion.div>

          {/* Know Your Rights Card */}
          <motion.div
            layoutId="scenario-card-rights-card"
            onClick={() => handleScenarioClick({ id: 'rights-card', icon: 'identificationCard', title: t('scenariosPage.rightsCardTitle') })}
            className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-red-700/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/5 hover:-translate-y-0.5"
            transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
          >
            <div className="flex items-start gap-4">
              <motion.div
                layoutId="scenario-icon-rights-card"
                className="text-red-400"
                transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
              >
                <IdentificationCard size={28} weight="bold" />
              </motion.div>
              <div className="flex-1">
                <motion.h2
                  layoutId="scenario-title-rights-card"
                  className="text-lg font-semibold text-white mb-1"
                  transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
                >
                  {t('scenariosPage.rightsCardTitle')}
                </motion.h2>
                <p className="text-slate-400 text-sm mb-3">
                  {t('scenariosPage.rightsCardDesc')}
                </p>
                <span className="text-red-400 text-sm font-medium inline-flex items-center gap-1 hover:text-red-300">
                  {t('scenariosPage.openGuide')} <CaretRight size={16} weight="bold" />
                </span>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Scenario Guides */}
      <h3 className="text-xs font-bold text-blue-400 uppercase tracking-widest mb-4">
        {t('scenariosPage.scenarioGuides')}
      </h3>
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
                  {t('scenariosPage.openGuide')} <CaretRight size={16} weight="bold" />
                </span>
              </div>
            </div>
          </motion.div>
        ))}

        {/* Encounter Log — after the fact */}
        <motion.div
          layoutId="scenario-card-encounter-log"
          onClick={() => handleScenarioClick({ id: 'encounter-log-after', icon: 'notePencil', title: t('scenariosPage.encounterLogTitle') })}
          className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-amber-700/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5"
          transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
        >
          <div className="flex items-start gap-4">
            <motion.div
              layoutId="scenario-icon-encounter-log"
              className="text-amber-400"
              transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
            >
              <NotePencil size={28} weight="bold" />
            </motion.div>
            <div className="flex-1">
              <motion.h2
                layoutId="scenario-title-encounter-log"
                className="text-lg font-semibold text-white mb-1"
                transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
              >
                {t('scenariosPage.encounterLogTitle')}
              </motion.h2>
              <p className="text-slate-400 text-sm mb-3">
                {t('scenariosPage.encounterLogDesc')}
              </p>
              <span className="text-amber-400 text-sm font-medium inline-flex items-center gap-1 hover:text-amber-300">
                {t('scenariosPage.openLog')} <CaretRight size={16} weight="bold" />
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* After an Encounter */}
      <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-widest mb-4 mt-6">
        {t('scenariosPage.afterEncounter')}
      </h3>
      <div className="space-y-4">
        <motion.div
          layoutId="scenario-card-post-encounter"
          onClick={() => handleScenarioClick({ id: 'post-encounter', icon: 'firstAidKit', title: t('scenariosPage.postEncounterTitle') })}
          className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-emerald-700/30 rounded-2xl p-5 cursor-pointer transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5"
          transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
        >
          <div className="flex items-start gap-4">
            <motion.div
              layoutId="scenario-icon-post-encounter"
              className="text-emerald-400"
              transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
            >
              <FirstAidKit size={28} weight="bold" />
            </motion.div>
            <div className="flex-1">
              <motion.h2
                layoutId="scenario-title-post-encounter"
                className="text-lg font-semibold text-white mb-1"
                transition={{ layout: { duration: 0.35, ease: [0.4, 0, 0.2, 1] } }}
              >
                {t('scenariosPage.postEncounterTitle')}
              </motion.h2>
              <p className="text-slate-400 text-sm mb-3">
                {t('scenariosPage.postEncounterDesc')}
              </p>
              <span className="text-emerald-400 text-sm font-medium inline-flex items-center gap-1 hover:text-emerald-300">
                {t('scenariosPage.getStarted')} <CaretRight size={16} weight="bold" />
              </span>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Quote */}
      <div className="mt-8 text-center py-6">
        <p className="text-slate-400 italic text-sm">
          {t('scenariosPage.franklQuote')}
        </p>
        <p className="text-slate-500 text-xs mt-2 tracking-wider">{t('scenariosPage.franklAuthor')}</p>
      </div>

      {/* Disclaimer */}
      <div className="mt-2">
        <Disclaimer>
          {t('disclaimer.line1')}
          <br />{t('disclaimer.line2')}
          <br />{t('disclaimer.line3')}
          <br />{t('disclaimer.line4')}
        </Disclaimer>
      </div>

      {/* Install PWA Button */}
      <div className="mt-8 text-center">
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
              alert(t('home.installAlert'));
            }
          }}
          className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 inline-flex items-center gap-2"
        >
          <DownloadSimple size={18} weight="bold" />
          {t('emergency.installButton')}
        </button>
        <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider">
          {t('emergency.installRecommended')}
        </p>
        <button
          onClick={() => setShowInstallHelp(true)}
          className="text-blue-400 hover:text-blue-300 text-xs font-semibold mt-2 transition-colors"
        >
          {t('emergency.installHelp')}
        </button>
      </div>
      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />
    </div>
  );
};

export default Scenarios;