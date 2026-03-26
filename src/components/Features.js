// src/components/Features.js
// Features overview modal — scannable list of everything the app can do

import React from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import {
  XIcon as X, SparkleIcon as ListChecks,
  MapPinIcon as MapPin, EyeIcon as Eye, MapTrifoldIcon as MapTrifold,
  ScalesIcon as Scales, GavelIcon as Gavel,
  VideoCameraIcon as VideoCamera, LockIcon as Lock,
  CloudArrowUpIcon as CloudArrowUp, ShieldCheckIcon as ShieldCheck,
  MegaphoneIcon as Megaphone, HandPalmIcon as HandPalm,
  WarningIcon as Warning, WifiSlashIcon as WifiSlash,
  DeviceMobileIcon as DeviceMobile, BookOpenIcon as BookOpen,
  ClipboardTextIcon as ClipboardText, UsersThreeIcon as UsersThree,
  PaperPlaneTiltIcon as PaperPlaneTilt, ShareNetworkIcon as ShareNetwork,
  NotePencilIcon as NotePencil, NavigationArrowIcon as NavigationArrow,
  FirstAidKitIcon as FirstAidKit, ScalesIcon as ScalesFeature, FileTextIcon as FileText,
  IdentificationCardIcon as IdentificationCard, FireIcon as Fire, GlobeIcon as Globe,
  BellRingingIcon as BellRinging, FlagBannerIcon as FlagBanner
} from '@phosphor-icons/react';
import { Brain } from 'lucide-react';

// Category structure with icon references (labels/titles/descs filled from t() in component)
const categoryDefs = [
  {
    labelKey: 'catCommunitySafety', color: 'text-blue-400',
    items: [
      { icon: MapPin, titleKey: 'anonymousReportingTitle', descKey: 'anonymousReportingDesc' },
      { icon: Eye, titleKey: 'localActivityTitle', descKey: 'localActivityDesc' },
      { icon: Fire, titleKey: 'heatMapTitle', descKey: 'heatMapDesc' },
      { icon: MapTrifold, titleKey: 'offlineMapsTitle', descKey: 'offlineMapsDesc' },
      { icon: NavigationArrow, titleKey: 'checkMyRouteTitle', descKey: 'checkMyRouteDesc' },
      { icon: BellRinging, titleKey: 'proximityAlertsTitle', descKey: 'proximityAlertsDesc' },
      { icon: FlagBanner, titleKey: 'flagReportTitle', descKey: 'flagReportDesc' },
      { icon: Eye, titleKey: 'communityWitnessingFeatTitle', descKey: 'communityWitnessingFeatDesc' },
    ],
  },
  {
    labelKey: 'catKnowYourRights', color: 'text-amber-400',
    items: [
      { icon: Scales, titleKey: 'constitutionalTitle', descKey: 'constitutionalDesc' },
      { icon: Gavel, titleKey: 'civilDisobedienceTitle', descKey: 'civilDisobedienceDesc' },
      { icon: Brain, titleKey: 'aiLegalTitle', descKey: 'aiLegalDesc', lucide: true },
      { icon: BookOpen, titleKey: 'encounterScriptsTitle', descKey: 'encounterScriptsDesc' },
      { icon: IdentificationCard, titleKey: 'rightsByStatusTitle', descKey: 'rightsByStatusDesc' },
    ],
  },
  {
    labelKey: 'catPreparePlan', color: 'text-amber-400',
    items: [
      { icon: ClipboardText, titleKey: 'familyKitTitle', descKey: 'familyKitDesc' },
      { icon: UsersThree, titleKey: 'trustedContactTitle', descKey: 'trustedContactDesc' },
      { icon: PaperPlaneTilt, titleKey: 'sosTitle', descKey: 'sosDesc' },
      { icon: ShareNetwork, titleKey: 'shareablePlanTitle', descKey: 'shareablePlanDesc' },
      { icon: NotePencil, titleKey: 'afterLogTitle', descKey: 'afterLogDesc' },
    ],
  },
  {
    labelKey: 'catAfterEncounter', color: 'text-emerald-400',
    items: [
      { icon: FirstAidKit, titleKey: 'postEncounterTitle', descKey: 'postEncounterDesc' },
      { icon: ScalesFeature, titleKey: 'findLegalTitle', descKey: 'findLegalDesc' },
      { icon: FileText, titleKey: 'fileComplaintTitle', descKey: 'fileComplaintDesc' },
    ],
  },
  {
    labelKey: 'catRecordProtect', color: 'text-green-400',
    items: [
      { icon: VideoCamera, titleKey: 'encryptedRecordingTitle', descKey: 'encryptedRecordingDesc' },
      { icon: Lock, titleKey: 'pinDecoyTitle', descKey: 'pinDecoyDesc' },
      { icon: CloudArrowUp, titleKey: 'cloudBackupTitle', descKey: 'cloudBackupDesc' },
      { icon: ShieldCheck, titleKey: 'metadataTitle', descKey: 'metadataDesc' },
    ],
  },
  {
    labelKey: 'catEmergencyTools', color: 'text-red-400',
    items: [
      { icon: Megaphone, titleKey: 'whistleTitle', descKey: 'whistleDesc' },
      { icon: HandPalm, titleKey: 'deescGuideTitle', descKey: 'deescGuideDesc' },
      { icon: Warning, titleKey: 'emergencyButtonTitle', descKey: 'emergencyButtonDesc' },
      { icon: NotePencil, titleKey: 'realTimeLogTitle', descKey: 'realTimeLogDesc' },
      { icon: NavigationArrow, titleKey: 'liveLocationTitle', descKey: 'liveLocationDesc' },
    ],
  },
  {
    labelKey: 'catWorksEverywhere', color: 'text-violet-400',
    items: [
      { icon: WifiSlash, titleKey: 'fullyOfflineTitle', descKey: 'fullyOfflineDesc' },
      { icon: DeviceMobile, titleKey: 'installAsAppTitle', descKey: 'installAsAppDesc' },
      { icon: ShieldCheck, titleKey: 'noAccountTitle', descKey: 'noAccountDesc' },
      { icon: Globe, titleKey: 'swissHostedTitle', descKey: 'swissHostedDesc' },
    ],
  },
];

const Features = ({ onClose, isOpen = true }) => {
  const { t } = useTranslation();

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm"
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            className="bg-gradient-to-br from-slate-800/90 to-slate-900/90 backdrop-blur-sm rounded-2xl w-full max-w-md max-h-[90vh] overflow-hidden border border-slate-700/50 flex flex-col relative overscroll-contain"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-700 shrink-0">
              <div className="flex items-center gap-2">
                <ListChecks size={20} weight="bold" className="text-violet-400" />
                <h2 className="text-lg font-bold text-white">{t('features.title')}</h2>
              </div>
              <button
                onClick={onClose}
                className="p-2 text-slate-400 hover:text-white rounded-lg hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900 focus-visible:ring-white/80"
                aria-label="Close features dialog"
              >
                <X size={20} weight="bold" />
              </button>
            </div>

            {/* Scrollable Content */}
            <div className="p-5 overflow-y-auto overscroll-contain flex-1" style={{ WebkitOverflowScrolling: 'touch' }}>
              <p className="text-slate-400 text-sm mb-5">
                {t('features.description')}
              </p>

              {categoryDefs.map((category, catIdx) => (
                <div key={category.labelKey}>
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">
                    {t(`features.${category.labelKey}`)}
                  </h4>
                  <div className="space-y-2 mb-5">
                    {category.items.map((item) => {
                      const Icon = item.icon;
                      const title = t(`features.${item.titleKey}`);
                      return (
                        <div
                          key={item.titleKey}
                          className="flex items-start gap-3 bg-slate-900/50 border border-slate-700/40 rounded-xl px-3.5 py-2.5"
                        >
                          <Icon
                            size={18}
                            weight={item.lucide ? undefined : 'bold'}
                            className={`${category.color} shrink-0 mt-0.5`}
                          />
                          <div className="min-w-0">
                            <p className="text-white text-sm font-semibold leading-tight">{title}</p>
                            <p className="text-slate-400 text-xs leading-relaxed">{t(`features.${item.descKey}`)}</p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                  {catIdx < categoryDefs.length - 1 && (
                    <div className="border-t border-slate-700/50 mb-5" />
                  )}
                </div>
              ))}

              {/* Footer */}
              <div className="text-center mt-2">
                <p className="text-slate-500 text-xs uppercase tracking-widest mb-4">
                  {t('features.freeOpenSource')}
                </p>
                <button
                  onClick={onClose}
                  className="w-full bg-gradient-to-r from-red-600 to-red-700 hover:from-red-500 hover:to-red-600 text-white font-bold py-3.5 px-6 rounded-xl transition-all shadow-lg shadow-red-900/30 hover:shadow-red-900/50 active:scale-95"
                >
                  {t('features.close')}
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default Features;
