import React, { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import DOMPurify from 'dompurify';
import { CaretRight, ChatCircle, Scroll, Warning, Lightbulb, Check, X, DownloadSimple, House, Car, Briefcase, MapPin, FileText, Eye, ShieldWarning, IdentificationCard, User, CreditCard, Lifebuoy, ProhibitInset, ScalesIcon as Scales, Shield, BookOpenText, Brain, Gavel, Handshake, Megaphone, Fingerprint } from '@phosphor-icons/react';
import Disclaimer from './Disclaimer';
import InstallHelp from './InstallHelp';
import FaqCta from './FaqCta';
import { useRotatingQuote } from '../utils/quoteRotation';
import LegalDirectory from './LegalDirectory';
import CaseLawSearch from './CaseLawSearch';
import {
  STATUS_PERSONAS,
  NEVER_SIGN_WARNING,
  UNDOCUMENTED_SECTIONS,
  GREEN_CARD_SECTIONS,
  ASYLUM_SECTIONS,
  SHARED_SECTIONS,
} from '../data/immigrationRightsData';

const aniDelay = (s) => ({ animationDelay: `${s}s` });
const LEGAL_VIEW_QUERY_PARAM = 'legalTab';
const LEGAL_VIEWS = ['chat', 'constitution', 'status', 'directory'];

const normalizeLegalView = (value) => (LEGAL_VIEWS.includes(value) ? value : 'constitution');

const getInitialLegalView = () => {
  if (typeof window === 'undefined') return 'constitution';
  const params = new URLSearchParams(window.location.search);
  return normalizeLegalView(params.get(LEGAL_VIEW_QUERY_PARAM));
};

const LEGAL_TAB_STYLES = {
  chat: {
    active: 'bg-gradient-to-br from-slate-900 via-slate-900 to-cyan-950/28 text-cyan-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(203,213,225,0.1),0_10px_24px_rgba(8,47,73,0.22)]',
    idle: 'bg-gradient-to-br from-slate-900 via-slate-900/96 to-cyan-950/10 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_18px_rgba(2,6,23,0.16)]',
    hover: 'hover:from-slate-900 hover:via-slate-900 hover:to-cyan-950/18 hover:text-cyan-100 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(8,47,73,0.18)]',
    dot: 'bg-cyan-300',
  },
  constitution: {
    active: 'bg-gradient-to-br from-slate-900 via-slate-900 to-violet-950/30 text-violet-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(203,213,225,0.1),0_10px_24px_rgba(59,7,100,0.18)]',
    idle: 'bg-gradient-to-br from-slate-900 via-slate-900/96 to-violet-950/12 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_18px_rgba(2,6,23,0.16)]',
    hover: 'hover:from-slate-900 hover:via-slate-900 hover:to-violet-950/20 hover:text-violet-100 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(59,7,100,0.16)]',
    dot: 'bg-violet-300',
  },
  status: {
    active: 'bg-gradient-to-br from-slate-900 via-slate-900 to-rose-950/28 text-rose-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(203,213,225,0.1),0_10px_24px_rgba(76,5,25,0.22)]',
    idle: 'bg-gradient-to-br from-slate-900 via-slate-900/96 to-rose-950/10 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_18px_rgba(2,6,23,0.16)]',
    hover: 'hover:from-slate-900 hover:via-slate-900 hover:to-rose-950/18 hover:text-rose-100 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(76,5,25,0.18)]',
    dot: 'bg-rose-300',
  },
  directory: {
    active: 'bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950/28 text-emerald-100 shadow-[inset_0_1px_0_rgba(255,255,255,0.05),0_0_0_1px_rgba(203,213,225,0.1),0_10px_24px_rgba(6,78,59,0.18)]',
    idle: 'bg-gradient-to-br from-slate-900 via-slate-900/96 to-emerald-950/10 text-slate-300 shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_8px_18px_rgba(2,6,23,0.16)]',
    hover: 'hover:from-slate-900 hover:via-slate-900 hover:to-emerald-950/18 hover:text-emerald-100 hover:shadow-[inset_0_1px_0_rgba(255,255,255,0.04),0_10px_24px_rgba(6,78,59,0.16)]',
    dot: 'bg-emerald-300',
  },
};

const STATUS_STYLE_MAP = {
  undocumented: {
    card: 'from-slate-950 via-slate-950/98 to-rose-950/18',
    selectedCard: 'from-slate-950 via-slate-950/98 to-rose-950/30',
    border: 'border-rose-900/45',
    hoverBorder: 'hover:border-rose-500/28',
    hoverShadow: 'hover:shadow-[0_18px_42px_rgba(76,5,25,0.18)]',
    glow: 'group-hover:from-rose-500/6 group-hover:to-red-500/4',
    iconWrap: 'border-rose-500/18 bg-rose-500/10 text-rose-300',
    iconHover: 'group-hover:border-rose-500/25',
    title: 'text-rose-100',
    accent: 'text-rose-300',
    body: 'text-rose-100/78',
    badge: 'border-rose-500/20 bg-rose-500/10 text-rose-100',
    contentCard: 'from-slate-950 via-slate-950/96 to-rose-950/14',
    contentBorder: 'border-rose-900/35',
    contentGlow: 'group-hover:from-rose-500/5 group-hover:to-red-500/4',
    contentAccent: 'text-rose-300',
  },
  greenCard: {
    card: 'from-slate-950 via-slate-950/98 to-cyan-950/18',
    selectedCard: 'from-slate-950 via-slate-950/98 to-cyan-950/30',
    border: 'border-cyan-900/45',
    hoverBorder: 'hover:border-cyan-500/28',
    hoverShadow: 'hover:shadow-[0_18px_42px_rgba(8,47,73,0.18)]',
    glow: 'group-hover:from-cyan-500/5 group-hover:to-blue-500/4',
    iconWrap: 'border-cyan-500/18 bg-cyan-500/10 text-cyan-300',
    iconHover: 'group-hover:border-cyan-500/25',
    title: 'text-cyan-100',
    accent: 'text-cyan-300',
    body: 'text-cyan-100/78',
    badge: 'border-cyan-500/20 bg-cyan-500/10 text-cyan-100',
    contentCard: 'from-slate-950 via-slate-950/96 to-cyan-950/14',
    contentBorder: 'border-cyan-900/35',
    contentGlow: 'group-hover:from-cyan-500/5 group-hover:to-blue-500/4',
    contentAccent: 'text-cyan-300',
  },
  asylum: {
    card: 'from-slate-950 via-slate-950/98 to-amber-950/14',
    selectedCard: 'from-slate-950 via-slate-950/98 to-amber-950/24',
    border: 'border-amber-900/38',
    hoverBorder: 'hover:border-amber-500/24',
    hoverShadow: 'hover:shadow-[0_18px_42px_rgba(120,53,15,0.14)]',
    glow: 'group-hover:from-amber-500/5 group-hover:to-orange-500/4',
    iconWrap: 'border-amber-500/16 bg-amber-500/10 text-amber-300',
    iconHover: 'group-hover:border-amber-500/24',
    title: 'text-amber-100',
    accent: 'text-amber-300',
    body: 'text-amber-100/76',
    badge: 'border-amber-500/18 bg-amber-500/10 text-amber-100',
    contentCard: 'from-slate-950 via-slate-950/96 to-amber-950/12',
    contentBorder: 'border-amber-900/30',
    contentGlow: 'group-hover:from-amber-500/4 group-hover:to-orange-500/4',
    contentAccent: 'text-amber-300',
  },
};

const LegalSectionHeader = ({
  eyebrow,
  title,
  description,
  support,
  accent = 'text-cyan-400',
  delay = 0,
  action,
}) => (
  <div
    className="mb-5 flex flex-col gap-4 scenario-fade-in md:flex-row md:items-end md:justify-between"
    style={aniDelay(delay)}
  >
    <div>
      <p className={`mb-2 text-xs font-semibold tracking-[0.08em] ${accent}`}>{eyebrow}</p>
      <h2 className="text-[1.85rem] font-black tracking-tight text-white sm:text-[2rem]">{title}</h2>
      {description && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-300">{description}</p>}
      {support && <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-500">{support}</p>}
    </div>
    {action}
  </div>
);

// State-specific recording and consent law data
const stateGuides = {
  alabama: {
    name: 'Alabama',
    statutes: ['Ala. Code § 13A-11-30', 'Ala. Code § 13A-11-31'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot record private conversations you are NOT part of' }
    ],
    criticalAwareness: 'Alabama requires consent of at least one party to the conversation. Recording without being a participant is a Class A misdemeanor.',
    links: [
      { title: 'Alabama Legislature - Code of Alabama', url: 'http://alisondb.legislature.state.al.us/alison/codeofalabama/1975/coatoc.htm' },
      { title: 'RCFP Recording Guide - Alabama', url: 'https://www.rcfp.org/reporters-recording-guide/alabama/' }
    ]
  },
  alaska: {
    name: 'Alaska',
    statutes: ['Alaska Stat. § 42.20.300', 'Alaska Stat. § 42.20.310'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept private conversations as a third party' }
    ],
    criticalAwareness: 'Alaska law prohibits third-party interception only. Participants in a conversation may record without additional consent.',
    links: [
      { title: 'Alaska State Legislature', url: 'https://www.akleg.gov/basis/statutes.asp' },
      { title: 'RCFP Recording Guide - Alaska', url: 'https://www.rcfp.org/reporters-recording-guide/alaska/' }
    ]
  },
  arizona: {
    name: 'Arizona',
    statutes: ['Ariz. Rev. Stat. § 13-3005', 'Ariz. Rev. Stat. § 13-3012'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Intercepting without consent is a Class 5 felony' }
    ],
    criticalAwareness: 'Arizona allows one-party consent. Telephone subscribers may record calls even without being a party to the conversation.',
    links: [
      { title: 'Arizona State Legislature', url: 'https://www.azleg.gov/arstitle/' },
      { title: 'RCFP Recording Guide - Arizona', url: 'https://www.rcfp.org/reporters-recording-guide/arizona/' }
    ]
  },
  arkansas: {
    name: 'Arkansas',
    statutes: ['Ark. Code § 5-60-120', 'Ark. Code § 23-17-107'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept wire communications without consent' }
    ],
    criticalAwareness: 'Arkansas requires consent of at least one party. Intercepting phone communications without consent is a criminal offense.',
    links: [
      { title: 'Arkansas Code', url: 'https://www.arkleg.state.ar.us/Bills/Search?tbType=StatuteTOC' },
      { title: 'RCFP Recording Guide - Arkansas', url: 'https://www.rcfp.org/reporters-recording-guide/arkansas/' }
    ]
  },
  california: {
    name: 'California',
    statutes: ['CA Penal Code § 632', 'AB 748', 'PC 148(g)'],
    consentType: 'TWO-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'California AB 748 protects filming police',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations if ALL parties consent' },
      { allowed: false, text: 'Cannot secretly record private conversations' }
    ],
    criticalAwareness: 'Strong First Amendment protections. Officers in public have no expectation of privacy. CA Penal Code 148(g) prevents officers from seizing cameras without a warrant.',
    links: [
      { title: 'California Legislative Information', url: 'https://leginfo.legislature.ca.gov/' },
      { title: 'RCFP Recording Guide - California', url: 'https://www.rcfp.org/reporters-recording-guide/california/' }
    ]
  },
  colorado: {
    name: 'Colorado',
    statutes: ['Colo. Rev. Stat. § 18-9-303', 'Colo. Rev. Stat. § 18-9-304'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Eavesdropping is a Class 2 misdemeanor' }
    ],
    criticalAwareness: 'Colorado requires consent of at least one party. Illegal eavesdropping can result in up to 120 days jail and/or $750 fine.',
    links: [
      { title: 'Colorado General Assembly', url: 'https://leg.colorado.gov/colorado-revised-statutes' },
      { title: 'RCFP Recording Guide - Colorado', url: 'https://www.rcfp.org/reporters-recording-guide/colorado/' }
    ]
  },
  connecticut: {
    name: 'Connecticut',
    statutes: ['Conn. Gen. Stat. § 52-570d', 'Conn. Gen. Stat. § 53a-187'],
    consentType: 'ONE-PARTY (CRIMINAL) / TWO-PARTY (CIVIL)',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'One-party consent for criminal liability' },
      { allowed: false, text: 'Civil liability possible without all-party consent' }
    ],
    criticalAwareness: 'Connecticut has mixed rules: one-party for criminal law, but civil lawsuits possible if all parties did not consent. Treat as two-party to be safe.',
    links: [
      { title: 'Connecticut General Assembly', url: 'https://www.cga.ct.gov/current/pub/titles.htm' },
      { title: 'RCFP Recording Guide - Connecticut', url: 'https://www.rcfp.org/reporters-recording-guide/connecticut/' }
    ]
  },
  delaware: {
    name: 'Delaware',
    statutes: ['Del. Code tit. 11, § 1335', 'Del. Code tit. 11, § 2402'],
    consentType: 'TWO-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record if ALL parties consent' },
      { allowed: false, text: 'Cannot secretly record private communications' }
    ],
    criticalAwareness: 'Delaware requires all-party consent for recording private conversations. Violation is a felony offense.',
    links: [
      { title: 'Delaware Code Online', url: 'https://delcode.delaware.gov/' },
      { title: 'RCFP Recording Guide - Delaware', url: 'https://www.rcfp.org/reporters-recording-guide/delaware/' }
    ]
  },
  florida: {
    name: 'Florida',
    statutes: ['Fla. Stat. § 934.03', 'Fla. Stat. § 934.02'],
    consentType: 'TWO-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record if ALL parties consent' },
      { allowed: false, text: 'Secret recording is a third-degree felony' }
    ],
    criticalAwareness: 'Florida strictly enforces two-party consent. Violations can be felony charges. Public recordings of officials are protected by First Amendment.',
    links: [
      { title: 'Florida Legislature - Statutes', url: 'http://www.leg.state.fl.us/statutes/' },
      { title: 'RCFP Recording Guide - Florida', url: 'https://www.rcfp.org/reporters-recording-guide/florida/' }
    ]
  },
  georgia: {
    name: 'Georgia',
    statutes: ['O.C.G.A. § 16-11-62', 'O.C.G.A. § 16-11-66'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept private communications as third party' }
    ],
    criticalAwareness: 'Georgia requires consent of at least one party. Eavesdropping without consent is a felony with 1-5 years imprisonment.',
    links: [
      { title: 'Georgia General Assembly - Code', url: 'https://www.legis.ga.gov/georgia-code' },
      { title: 'RCFP Recording Guide - Georgia', url: 'https://www.rcfp.org/reporters-recording-guide/georgia/' }
    ]
  },
  hawaii: {
    name: 'Hawaii',
    statutes: ['Haw. Rev. Stat. § 711-1111', 'Haw. Rev. Stat. § 803-42'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot secretly record private conversations' }
    ],
    criticalAwareness: 'Hawaii requires consent of at least one party. Recording in a private place without consent is a misdemeanor.',
    links: [
      { title: 'Hawaii State Legislature', url: 'https://www.capitol.hawaii.gov/hrscurrent/' },
      { title: 'RCFP Recording Guide - Hawaii', url: 'https://www.rcfp.org/reporters-recording-guide/hawaii/' }
    ]
  },
  idaho: {
    name: 'Idaho',
    statutes: ['Idaho Code § 18-6702', 'Idaho Code § 18-6701'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept communications without consent' }
    ],
    criticalAwareness: 'Idaho requires consent of at least one party. Interception without consent is a felony.',
    links: [
      { title: 'Idaho Legislature - Statutes', url: 'https://legislature.idaho.gov/statutesrules/idstat/' },
      { title: 'RCFP Recording Guide - Idaho', url: 'https://www.rcfp.org/reporters-recording-guide/idaho/' }
    ]
  },
  illinois: {
    name: 'Illinois',
    statutes: ['720 ILCS 5/14-2', '720 ILCS 5/14-1'],
    consentType: 'TWO-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'Recording police in public is explicitly protected',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record if ALL parties consent' },
      { allowed: false, text: 'Cannot secretly record private conversations' }
    ],
    criticalAwareness: 'Illinois eavesdropping law was reformed in 2014. Recording police in public is now protected. Private conversation recording still requires all-party consent.',
    links: [
      { title: 'Illinois General Assembly - ILCS', url: 'https://www.ilga.gov/legislation/ilcs/ilcs.asp' },
      { title: 'RCFP Recording Guide - Illinois', url: 'https://www.rcfp.org/reporters-recording-guide/illinois/' }
    ]
  },
  indiana: {
    name: 'Indiana',
    statutes: ['Ind. Code § 35-33.5-1-5', 'Ind. Code § 35-31.5-2-176'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without being a party' }
    ],
    criticalAwareness: 'Indiana requires consent of at least one party. Note: Indiana has a 25-foot buffer zone law for recording police activity.',
    links: [
      { title: 'Indiana General Assembly', url: 'http://iga.in.gov/laws/current/ic/' },
      { title: 'RCFP Recording Guide - Indiana', url: 'https://www.rcfp.org/reporters-recording-guide/indiana/' }
    ]
  },
  iowa: {
    name: 'Iowa',
    statutes: ['Iowa Code § 727.8', 'Iowa Code § 808B.2'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without consent of a party' }
    ],
    criticalAwareness: 'Iowa requires consent of at least one party. Unauthorized interception is an aggravated misdemeanor.',
    links: [
      { title: 'Iowa Legislature - Code', url: 'https://www.legis.iowa.gov/law/iowaCode' },
      { title: 'RCFP Recording Guide - Iowa', url: 'https://www.rcfp.org/reporters-recording-guide/iowa/' }
    ]
  },
  kansas: {
    name: 'Kansas',
    statutes: ['Kan. Stat. § 21-6101', 'Kan. Stat. § 22-2514'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Kansas requires consent of at least one party. Breach of privacy through eavesdropping is a Class A misdemeanor.',
    links: [
      { title: 'Kansas Legislature - Statutes', url: 'http://www.kslegislature.org/li/b2023_24/statute/' },
      { title: 'RCFP Recording Guide - Kansas', url: 'https://www.rcfp.org/reporters-recording-guide/kansas/' }
    ]
  },
  kentucky: {
    name: 'Kentucky',
    statutes: ['Ky. Rev. Stat. § 526.010', 'Ky. Rev. Stat. § 526.020'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without consent' }
    ],
    criticalAwareness: 'Kentucky requires consent of at least one party. Eavesdropping is a Class D felony.',
    links: [
      { title: 'Kentucky Legislature - Statutes', url: 'https://legislature.ky.gov/law/statutes' },
      { title: 'RCFP Recording Guide - Kentucky', url: 'https://www.rcfp.org/reporters-recording-guide/kentucky/' }
    ]
  },
  louisiana: {
    name: 'Louisiana',
    statutes: ['La. Rev. Stat. § 15:1303', 'La. Rev. Stat. § 15:1312'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Note: Louisiana has a 25-foot buffer zone law'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Louisiana requires one-party consent. IMPORTANT: Louisiana has a 25-foot buffer zone law for recording police. Violation is a misdemeanor.',
    links: [
      { title: 'Louisiana State Legislature', url: 'https://www.legis.la.gov/legis/LawSearch.aspx' },
      { title: 'RCFP Recording Guide - Louisiana', url: 'https://www.rcfp.org/reporters-recording-guide/louisiana/' }
    ]
  },
  maine: {
    name: 'Maine',
    statutes: ['Me. Rev. Stat. tit. 15, § 709', 'Me. Rev. Stat. tit. 15, § 710'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without consent of a party' }
    ],
    criticalAwareness: 'Maine requires consent of at least one party. Violation is a Class D crime.',
    links: [
      { title: 'Maine Legislature - Statutes', url: 'https://legislature.maine.gov/statutes/' },
      { title: 'RCFP Recording Guide - Maine', url: 'https://www.rcfp.org/reporters-recording-guide/maine/' }
    ]
  },
  maryland: {
    name: 'Maryland',
    statutes: ['Md. Code, Cts. & Jud. Proc. § 10-402', 'Md. Code § 10-401'],
    consentType: 'TWO-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record if ALL parties consent' },
      { allowed: false, text: 'Cannot secretly record private conversations' }
    ],
    criticalAwareness: 'Maryland strictly enforces two-party consent. Violations can result in up to 5 years imprisonment. Public recordings are still protected.',
    links: [
      { title: 'Maryland General Assembly', url: 'https://mgaleg.maryland.gov/mgawebsite/Laws/Statutes' },
      { title: 'RCFP Recording Guide - Maryland', url: 'https://www.rcfp.org/reporters-recording-guide/maryland/' }
    ]
  },
  massachusetts: {
    name: 'Massachusetts',
    statutes: ['Mass. Gen. Laws ch. 272, § 99', 'Mass. Gen. Laws ch. 272, § 99(B)(4)'],
    consentType: 'TWO-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'Glik v. Cunniffe (2011) protects recording police',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record if ALL parties consent' },
      { allowed: false, text: 'Secret recording is strictly prohibited' }
    ],
    criticalAwareness: 'Massachusetts has strict two-party consent. Violations carry up to 5 years imprisonment. However, Glik v. Cunniffe established the right to record police in public.',
    links: [
      { title: 'Massachusetts Legislature - Laws', url: 'https://malegislature.gov/Laws/GeneralLaws' },
      { title: 'RCFP Recording Guide - Massachusetts', url: 'https://www.rcfp.org/reporters-recording-guide/massachusetts/' }
    ]
  },
  michigan: {
    name: 'Michigan',
    statutes: ['Mich. Comp. Laws § 750.539c', 'Mich. Comp. Laws § 750.539d'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot eavesdrop on private conversations' }
    ],
    criticalAwareness: 'Michigan courts have confirmed one-party consent when the recorder is a participant. Third-party eavesdropping is a felony.',
    links: [
      { title: 'Michigan Legislature - Compiled Laws', url: 'http://www.legislature.mi.gov/documents/mcl/index.html' },
      { title: 'RCFP Recording Guide - Michigan', url: 'https://www.rcfp.org/reporters-recording-guide/michigan/' }
    ]
  },
  minnesota: {
    name: 'Minnesota',
    statutes: ['Minn. Stat. § 626A.02', 'Minn. Stat. § 626A.01'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Minnesota requires consent of at least one party. Unauthorized interception is a felony.',
    links: [
      { title: 'Minnesota Legislature - Statutes', url: 'https://www.revisor.mn.gov/statutes/' },
      { title: 'RCFP Recording Guide - Minnesota', url: 'https://www.rcfp.org/reporters-recording-guide/minnesota/' }
    ]
  },
  mississippi: {
    name: 'Mississippi',
    statutes: ['Miss. Code § 41-29-531', 'Miss. Code § 41-29-501'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Mississippi requires consent of at least one party. Unauthorized interception is a felony with up to 5 years imprisonment.',
    links: [
      { title: 'Mississippi Legislature - Code', url: 'https://law.justia.com/codes/mississippi/' },
      { title: 'RCFP Recording Guide - Mississippi', url: 'https://www.rcfp.org/reporters-recording-guide/mississippi/' }
    ]
  },
  missouri: {
    name: 'Missouri',
    statutes: ['Mo. Rev. Stat. § 542.402', 'Mo. Rev. Stat. § 542.418'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record phone conversations with one-party consent' },
      { allowed: false, text: 'In-person recordings may require all-party consent' }
    ],
    criticalAwareness: 'Missouri has mixed rules: one-party for phone calls, but in-person oral conversations may require all-party consent in some circumstances.',
    links: [
      { title: 'Missouri General Assembly - Statutes', url: 'https://www.moga.mo.gov/mostatutes/Statutes.html' },
      { title: 'RCFP Recording Guide - Missouri', url: 'https://www.rcfp.org/reporters-recording-guide/missouri/' }
    ]
  },
  montana: {
    name: 'Montana',
    statutes: ['Mont. Code § 45-8-213', 'Mont. Code § 45-8-213(1)(c)'],
    consentType: 'TWO-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record if all parties are informed' },
      { allowed: false, text: 'Cannot record without all parties knowing' }
    ],
    criticalAwareness: 'Montana requires all parties to know they are being recorded. Explicit consent is not required if parties are clearly informed and do not object.',
    links: [
      { title: 'Montana Legislature - Code', url: 'https://leg.mt.gov/bills/mca/index.html' },
      { title: 'RCFP Recording Guide - Montana', url: 'https://www.rcfp.org/reporters-recording-guide/montana/' }
    ]
  },
  nebraska: {
    name: 'Nebraska',
    statutes: ['Neb. Rev. Stat. § 86-290', 'Neb. Rev. Stat. § 86-702'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Nebraska requires consent of at least one party. Unauthorized interception is a Class IV felony.',
    links: [
      { title: 'Nebraska Legislature - Statutes', url: 'https://nebraskalegislature.gov/laws/browse-statutes.php' },
      { title: 'RCFP Recording Guide - Nebraska', url: 'https://www.rcfp.org/reporters-recording-guide/nebraska/' }
    ]
  },
  nevada: {
    name: 'Nevada',
    statutes: ['Nev. Rev. Stat. § 200.620', 'Nev. Rev. Stat. § 200.650'],
    consentType: 'ONE-PARTY (IN-PERSON) / TWO-PARTY (PHONE)',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'In-person: one-party consent sufficient' },
      { allowed: false, text: 'Phone calls: all-party consent required' }
    ],
    criticalAwareness: 'Nevada has mixed rules: one-party for in-person conversations, but the Supreme Court interprets phone calls as requiring all-party consent.',
    links: [
      { title: 'Nevada Legislature - Statutes', url: 'https://www.leg.state.nv.us/NRS/' },
      { title: 'RCFP Recording Guide - Nevada', url: 'https://www.rcfp.org/reporters-recording-guide/nevada/' }
    ]
  },
  newhampshire: {
    name: 'New Hampshire',
    statutes: ['N.H. Rev. Stat. § 570-A:2', 'N.H. Rev. Stat. § 570-A:1'],
    consentType: 'TWO-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record if ALL parties consent' },
      { allowed: false, text: 'Cannot secretly record communications' }
    ],
    criticalAwareness: 'New Hampshire requires all-party consent for recording. Violation is a Class B felony. Public recordings of police are protected.',
    links: [
      { title: 'New Hampshire General Court', url: 'http://www.gencourt.state.nh.us/rsa/html/' },
      { title: 'RCFP Recording Guide - New Hampshire', url: 'https://www.rcfp.org/reporters-recording-guide/new-hampshire/' }
    ]
  },
  newjersey: {
    name: 'New Jersey',
    statutes: ['N.J. Stat. § 2A:156A-4', 'N.J. Stat. § 2A:156A-3'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'New Jersey requires consent of at least one party. Unauthorized wiretapping is a third-degree crime.',
    links: [
      { title: 'New Jersey Legislature - Statutes', url: 'https://www.njleg.state.nj.us/bill-search' },
      { title: 'RCFP Recording Guide - New Jersey', url: 'https://www.rcfp.org/reporters-recording-guide/new-jersey/' }
    ]
  },
  newmexico: {
    name: 'New Mexico',
    statutes: ['N.M. Stat. § 30-12-1', 'N.M. Stat. § 30-12-11'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'New Mexico requires consent of at least one party. Unauthorized interception is a fourth-degree felony.',
    links: [
      { title: 'New Mexico Legislature - Statutes', url: 'https://www.nmlegis.gov/Legislation/Legislation?Chamber=H&LegType=B&LegNo=0&Year=23' },
      { title: 'RCFP Recording Guide - New Mexico', url: 'https://www.rcfp.org/reporters-recording-guide/new-mexico/' }
    ]
  },
  newyork: {
    name: 'New York',
    statutes: ['N.Y. Penal Law § 250.00', 'N.Y. Penal Law § 250.05'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot eavesdrop on others without consent' }
    ],
    criticalAwareness: 'New York requires consent of at least one party. Eavesdropping is a Class E felony.',
    links: [
      { title: 'New York State Legislature', url: 'https://www.nysenate.gov/legislation/laws/PEN' },
      { title: 'RCFP Recording Guide - New York', url: 'https://www.rcfp.org/reporters-recording-guide/new-york/' }
    ]
  },
  northcarolina: {
    name: 'North Carolina',
    statutes: ['N.C. Gen. Stat. § 15A-287', 'N.C. Gen. Stat. § 15A-290'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'North Carolina requires consent of at least one party. Note: The Fourth Circuit has not yet fully recognized the right to record police.',
    links: [
      { title: 'North Carolina General Assembly', url: 'https://www.ncleg.gov/Laws/GeneralStatutes' },
      { title: 'RCFP Recording Guide - North Carolina', url: 'https://www.rcfp.org/reporters-recording-guide/north-carolina/' }
    ]
  },
  northdakota: {
    name: 'North Dakota',
    statutes: ['N.D. Cent. Code § 12.1-15-02', 'N.D. Cent. Code § 12.1-15-01'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'North Dakota requires consent of at least one party. Unauthorized interception is a Class C felony.',
    links: [
      { title: 'North Dakota Legislative Branch', url: 'https://www.ndlegis.gov/general-information/north-dakota-century-code' },
      { title: 'RCFP Recording Guide - North Dakota', url: 'https://www.rcfp.org/reporters-recording-guide/north-dakota/' }
    ]
  },
  ohio: {
    name: 'Ohio',
    statutes: ['Ohio Rev. Code § 2933.52', 'Ohio Rev. Code § 2933.521'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Ohio requires consent of at least one party. Unauthorized interception is a fourth-degree felony.',
    links: [
      { title: 'Ohio Legislature - Revised Code', url: 'https://codes.ohio.gov/ohio-revised-code' },
      { title: 'RCFP Recording Guide - Ohio', url: 'https://www.rcfp.org/reporters-recording-guide/ohio/' }
    ]
  },
  oklahoma: {
    name: 'Oklahoma',
    statutes: ['Okla. Stat. tit. 13, § 176.4', 'Okla. Stat. tit. 21, § 1202'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Oklahoma requires consent of at least one party. Unauthorized interception is a felony.',
    links: [
      { title: 'Oklahoma State Legislature', url: 'http://www.oklegislature.gov/osStatuesTitle.aspx' },
      { title: 'RCFP Recording Guide - Oklahoma', url: 'https://www.rcfp.org/reporters-recording-guide/oklahoma/' }
    ]
  },
  oregon: {
    name: 'Oregon',
    statutes: ['Or. Rev. Stat. § 165.540', 'Or. Rev. Stat. § 133.726'],
    consentType: 'TWO-PARTY (IN-PERSON) / ONE-PARTY (PHONE)',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Phone/digital: one-party consent sufficient' },
      { allowed: false, text: 'In-person conversations: all-party consent required' }
    ],
    criticalAwareness: 'Oregon has mixed rules: all-party consent for in-person oral recordings, but only one-party consent for telephone/electronic communications.',
    links: [
      { title: 'Oregon State Legislature', url: 'https://www.oregonlegislature.gov/bills_laws/Pages/ORS.aspx' },
      { title: 'RCFP Recording Guide - Oregon', url: 'https://www.rcfp.org/reporters-recording-guide/oregon/' }
    ]
  },
  pennsylvania: {
    name: 'Pennsylvania',
    statutes: ['18 Pa. C.S. § 5703', '18 Pa. C.S. § 5704'],
    consentType: 'TWO-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record if ALL parties consent' },
      { allowed: false, text: 'Cannot secretly record communications' }
    ],
    criticalAwareness: 'Pennsylvania strictly enforces two-party consent. Violations are third-degree felonies. Public recordings of officials are protected by First Amendment.',
    links: [
      { title: 'Pennsylvania General Assembly', url: 'https://www.legis.state.pa.us/cfdocs/legis/LI/Public/cons_index.cfm' },
      { title: 'RCFP Recording Guide - Pennsylvania', url: 'https://www.rcfp.org/reporters-recording-guide/pennsylvania/' }
    ]
  },
  rhodeisland: {
    name: 'Rhode Island',
    statutes: ['R.I. Gen. Laws § 11-35-21', 'R.I. Gen. Laws § 12-5.1-1'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Rhode Island requires consent of at least one party. Unauthorized interception is a felony with up to 5 years imprisonment.',
    links: [
      { title: 'Rhode Island General Assembly', url: 'http://webserver.rilin.state.ri.us/Statutes/' },
      { title: 'RCFP Recording Guide - Rhode Island', url: 'https://www.rcfp.org/reporters-recording-guide/rhode-island/' }
    ]
  },
  southcarolina: {
    name: 'South Carolina',
    statutes: ['S.C. Code § 17-30-30', 'S.C. Code § 17-30-20'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'South Carolina requires consent of at least one party. Unauthorized interception is a felony.',
    links: [
      { title: 'South Carolina Legislature - Code of Laws', url: 'https://www.scstatehouse.gov/code/statmast.php' },
      { title: 'RCFP Recording Guide - South Carolina', url: 'https://www.rcfp.org/reporters-recording-guide/south-carolina/' }
    ]
  },
  southdakota: {
    name: 'South Dakota',
    statutes: ['S.D. Codified Laws § 23A-35A-20', 'S.D. Codified Laws § 23A-35A-1'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'South Dakota requires consent of at least one party. Unauthorized interception is a Class 5 felony.',
    links: [
      { title: 'South Dakota Legislature - Codified Laws', url: 'https://sdlegislature.gov/Statutes/Codified_Laws' },
      { title: 'RCFP Recording Guide - South Dakota', url: 'https://www.rcfp.org/reporters-recording-guide/south-dakota/' }
    ]
  },
  tennessee: {
    name: 'Tennessee',
    statutes: ['Tenn. Code § 39-13-601', 'Tenn. Code § 40-6-303'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Tennessee requires consent of at least one party. Unauthorized interception is a Class D felony.',
    links: [
      { title: 'Tennessee General Assembly - Code', url: 'https://www.tn.gov/lawsandregs/tn-code.html' },
      { title: 'RCFP Recording Guide - Tennessee', url: 'https://www.rcfp.org/reporters-recording-guide/tennessee/' }
    ]
  },
  texas: {
    name: 'Texas',
    statutes: ['Tex. Penal Code § 16.02', 'Tex. Civ. Prac. & Rem. Code § 123.002'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Texas requires consent of at least one party. Unauthorized interception is a state jail felony (6 months - 2 years).',
    links: [
      { title: 'Texas Legislature - Statutes', url: 'https://statutes.capitol.texas.gov/' },
      { title: 'RCFP Recording Guide - Texas', url: 'https://www.rcfp.org/reporters-recording-guide/texas/' }
    ]
  },
  utah: {
    name: 'Utah',
    statutes: ['Utah Code § 77-23a-4', 'Utah Code § 77-23a-3'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Utah requires consent of at least one party. Unauthorized interception is a third-degree felony.',
    links: [
      { title: 'Utah State Legislature - Code', url: 'https://le.utah.gov/xcode/code.html' },
      { title: 'RCFP Recording Guide - Utah', url: 'https://www.rcfp.org/reporters-recording-guide/utah/' }
    ]
  },
  vermont: {
    name: 'Vermont',
    statutes: ['13 V.S.A. § 1051', '13 V.S.A. § 1052'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Vermont has no specific recording statute and defaults to federal one-party consent rules. You can record if you are a participant.',
    links: [
      { title: 'Vermont Legislature - Statutes', url: 'https://legislature.vermont.gov/statutes/' },
      { title: 'RCFP Recording Guide - Vermont', url: 'https://www.rcfp.org/reporters-recording-guide/vermont/' }
    ]
  },
  virginia: {
    name: 'Virginia',
    statutes: ['Va. Code § 19.2-62', 'Va. Code § 19.2-61'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Virginia requires consent of at least one party. Unauthorized interception is a Class 6 felony.',
    links: [
      { title: 'Virginia Law - Code of Virginia', url: 'https://law.lis.virginia.gov/vacode' },
      { title: 'RCFP Recording Guide - Virginia', url: 'https://www.rcfp.org/reporters-recording-guide/virginia/' }
    ]
  },
  washington: {
    name: 'Washington',
    statutes: ['Wash. Rev. Code § 9.73.030', 'Wash. Rev. Code § 9.73.050'],
    consentType: 'TWO-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record if ALL parties consent' },
      { allowed: false, text: 'Cannot secretly record private communications' }
    ],
    criticalAwareness: 'Washington requires all-party consent for private communications. Violation is a gross misdemeanor. Public recordings of officials are protected.',
    links: [
      { title: 'Washington State Legislature - RCW', url: 'https://apps.leg.wa.gov/rcw/' },
      { title: 'RCFP Recording Guide - Washington', url: 'https://www.rcfp.org/reporters-recording-guide/washington/' }
    ]
  },
  westvirginia: {
    name: 'West Virginia',
    statutes: ['W. Va. Code § 62-1D-3', 'W. Va. Code § 62-1D-12'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'West Virginia requires consent of at least one party. Unauthorized interception is a felony with up to 5 years imprisonment.',
    links: [
      { title: 'West Virginia Legislature - Code', url: 'http://www.wvlegislature.gov/wvcode/code.cfm' },
      { title: 'RCFP Recording Guide - West Virginia', url: 'https://www.rcfp.org/reporters-recording-guide/west-virginia/' }
    ]
  },
  wisconsin: {
    name: 'Wisconsin',
    statutes: ['Wis. Stat. § 968.31', 'Wis. Stat. § 968.27'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Wisconsin requires consent of at least one party. Unauthorized interception is a Class H felony.',
    links: [
      { title: 'Wisconsin State Legislature - Statutes', url: 'https://docs.legis.wisconsin.gov/statutes/statutes' },
      { title: 'RCFP Recording Guide - Wisconsin', url: 'https://www.rcfp.org/reporters-recording-guide/wisconsin/' }
    ]
  },
  wyoming: {
    name: 'Wyoming',
    statutes: ['Wyo. Stat. § 7-3-702', 'Wyo. Stat. § 7-3-601'],
    consentType: 'ONE-PARTY CONSENT',
    publicRecordingRights: [
      'You CAN record police/ICE in public spaces',
      'First Amendment protects recording public officials',
      'Keep device visible for maximum protection'
    ],
    conversationRules: [
      { allowed: true, text: 'Can record conversations you are a party to' },
      { allowed: false, text: 'Cannot intercept without party consent' }
    ],
    criticalAwareness: 'Wyoming requires consent of at least one party. Unauthorized interception is a felony with up to 5 years imprisonment.',
    links: [
      { title: 'Wyoming Legislature - Statutes', url: 'https://wyoleg.gov/StateStatutes' },
      { title: 'RCFP Recording Guide - Wyoming', url: 'https://www.rcfp.org/reporters-recording-guide/wyoming/' }
    ]
  }
};

// Rate limiting constants
const RATE_LIMIT_KEY = 'safeneighbor_ai_requests';
const MAX_REQUESTS_PER_MINUTE = 5;
const MAX_REQUESTS_PER_HOUR = 30;

// Check if user is rate limited
const checkRateLimit = () => {
  const now = Date.now();
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  let requests = stored ? JSON.parse(stored) : [];

  // Clean up old requests (older than 1 hour)
  requests = requests.filter(timestamp => now - timestamp < 60 * 60 * 1000);

  // Count requests in last minute and last hour
  const lastMinute = requests.filter(timestamp => now - timestamp < 60 * 1000).length;
  const lastHour = requests.length;

  if (lastMinute >= MAX_REQUESTS_PER_MINUTE) {
    return { limited: true, messageKey: 'legal.rateLimitMinute' };
  }
  if (lastHour >= MAX_REQUESTS_PER_HOUR) {
    return { limited: true, messageKey: 'legal.rateLimitHour' };
  }

  return { limited: false };
};

// Record a new request
const recordRequest = () => {
  const now = Date.now();
  const stored = localStorage.getItem(RATE_LIMIT_KEY);
  let requests = stored ? JSON.parse(stored) : [];

  // Clean up old requests and add new one
  requests = requests.filter(timestamp => now - timestamp < 60 * 60 * 1000);
  requests.push(now);

  localStorage.setItem(RATE_LIMIT_KEY, JSON.stringify(requests));
};

function Legal({ onOpenLegalResponse, onNavigate }) {
  const { t } = useTranslation();
  const legalQuote = useRotatingQuote('legal.nietzscheQuote', 'legal.nietzscheAuthor', 'legal');
  const [showInstallHelp, setShowInstallHelp] = useState(false);
  const [view, setView] = useState(getInitialLegalView);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedAmendments, setExpandedAmendments] = useState(new Set());
  const [selectedState, setSelectedState] = useState('california');
  const [selectedStatus, setSelectedStatus] = useState(null);
  const [expandedStatus, setExpandedStatus] = useState(new Set());
  const [neverSignExpanded, setNeverSignExpanded] = useState(false);
  const chatSectionRef = useRef(null);
  const constitutionSectionRef = useRef(null);
  const statusSectionRef = useRef(null);
  const directorySectionRef = useRef(null);
  const pendingHeroScrollRef = useRef(null);

  const scrollToLegalSection = (sectionRef, offset = 118) => {
    if (!sectionRef?.current) return false;
    const top = sectionRef.current.getBoundingClientRect().top + window.scrollY - offset;
    window.scrollTo({ top: Math.max(top, 0), behavior: 'smooth' });
    return true;
  };

  const getSectionRefForView = (targetView) => {
    if (targetView === 'chat') return chatSectionRef;
    if (targetView === 'constitution') return constitutionSectionRef;
    if (targetView === 'status') return statusSectionRef;
    if (targetView === 'directory') return directorySectionRef;
    return null;
  };

  const getScrollOffsetForView = (targetView) => {
    if (targetView === 'directory') return 122;
    if (targetView === 'status') return 74;
    return 116;
  };

  const jumpToLegalView = (targetView) => {
    const targetRef = getSectionRefForView(targetView);
    if (!targetRef) {
      setView(targetView);
      return;
    }

    if (view === targetView) {
      scrollToLegalSection(targetRef, getScrollOffsetForView(targetView));
      return;
    }

    pendingHeroScrollRef.current = targetView;
    setView(targetView);
  };

  useEffect(() => {
    if (!pendingHeroScrollRef.current || pendingHeroScrollRef.current !== view) return undefined;

    const targetView = pendingHeroScrollRef.current;
    const targetRef = getSectionRefForView(targetView);

    const frame = window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        const didScroll = scrollToLegalSection(targetRef, getScrollOffsetForView(targetView));
        if (didScroll) {
          pendingHeroScrollRef.current = null;
        }
      }, 80);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [view]);

  useEffect(() => {
    const handlePopState = () => {
      const params = new URLSearchParams(window.location.search);
      setView(normalizeLegalView(params.get(LEGAL_VIEW_QUERY_PARAM)));
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    const url = new URL(window.location.href);
    if (view === 'constitution') {
      url.searchParams.delete(LEGAL_VIEW_QUERY_PARAM);
    } else {
      url.searchParams.set(LEGAL_VIEW_QUERY_PARAM, view);
    }
    window.history.replaceState({}, '', url);
  }, [view]);

  const sendMessage = async () => {
    if (!input.trim()) return;

    // Check rate limit before sending
    const rateCheck = checkRateLimit();
    if (rateCheck.limited) {
      setMessages(prev => [...prev,
        { role: 'user', content: input },
        { role: 'assistant', content: t(rateCheck.messageKey) }
      ]);
      setInput('');
      return;
    }

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Record this request for rate limiting
      recordRequest();
      // Use Firebase Cloud Function proxy to keep Gemini API key secure
      const proxyUrl = 'https://us-central1-safeneighbor-33bb0.cloudfunctions.net/geminiProxy';
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are a constitutional rights assistant helping people understand their rights during encounters with ICE and law enforcement. Provide accurate, helpful information based on US constitutional law. Be concise and actionable. Keep responses under 200 words unless the question requires more detail.

User question: ${input}`
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || t('legal.aiNoResponse');

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: t('legal.aiError')
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-transition-in page-section-stagger mx-auto max-w-5xl px-4 pb-24 pt-3">
      {/* Hero Card */}
      <section className="page-section-item relative overflow-hidden rounded-[28px] border border-slate-800/80 bg-gradient-to-br from-slate-900 via-slate-950 to-slate-950 px-6 py-8 shadow-[0_24px_80px_rgba(2,6,23,0.45)]">
        <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-cyan-400/35 to-transparent" />
        <div className="pointer-events-none absolute -top-20 right-0 h-52 w-52 rounded-full bg-cyan-500/10 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 left-0 h-52 w-52 rounded-full bg-emerald-500/10 blur-3xl" />
        <div
          className="pointer-events-none absolute inset-0 opacity-30"
          style={{
            backgroundImage: 'linear-gradient(rgba(148,163,184,0.08) 1px, transparent 1px), linear-gradient(90deg, rgba(148,163,184,0.08) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
            maskImage: 'linear-gradient(to bottom, rgba(0,0,0,0.55), transparent 86%)',
          }}
        />

        <div className="relative grid gap-4 xl:grid-cols-[minmax(0,1.16fr)_320px] xl:items-stretch">
          <div>
            <p className="mb-3 text-[11px] font-black uppercase tracking-[0.2em] text-cyan-300/80 scenario-fade-in" style={aniDelay(0.06)}>
              {t('legal.heroEyebrow', { defaultValue: 'Legal Protection' })}
            </p>

            <div className="mb-4 flex flex-col items-center gap-3 text-center xl:flex-row xl:items-start xl:text-left scenario-rise-in" style={aniDelay(0.18)}>
              <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan-500/20 bg-cyan-500/10 text-cyan-300 shadow-[0_0_28px_rgba(34,211,238,0.14)]">
                <Scales size={30} weight="bold" />
              </div>
              <div>
                <h1 className="max-w-3xl text-[2rem] font-black tracking-tight text-white sm:text-[2.75rem]">
                  {t('legal.title')}
                </h1>
              </div>
            </div>

            <p className="max-w-3xl text-base leading-[1.6] text-slate-300 sm:text-[1.05rem] scenario-fade-in" style={aniDelay(0.32)}>
              {t('legal.subtitle')}
            </p>

            <div className="mt-6 flex flex-col gap-3 sm:flex-row xl:justify-start scenario-rise-in" style={aniDelay(0.46)}>
              <button
                onClick={onOpenLegalResponse}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-emerald-500/50 bg-gradient-to-r from-emerald-600 to-emerald-700 px-6 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-[0_12px_32px_rgba(5,150,105,0.3)] transition-all hover:from-emerald-500 hover:to-emerald-600 active:scale-[0.98]"
              >
                <Scales size={20} weight="bold" />
                {t('legalResponse.buttonLabel')}
              </button>
            </div>

            <div className="mt-6 grid gap-3 sm:grid-cols-3 scenario-rise-in" style={aniDelay(0.58)}>
              {[
                {
                  id: 'constitution',
                  icon: Scroll,
                  label: t('legal.heroQuickRights', { defaultValue: 'Start with rights' }),
                  detail: t('legal.heroQuickRightsDetail', { defaultValue: 'Start with the constitutional foundation.' }),
                  accent: 'text-violet-300 border-slate-700/60 bg-slate-900/75 hover:border-violet-400/24 hover:bg-slate-900/90',
                },
                {
                  id: 'status',
                  icon: IdentificationCard,
                  label: t('legal.heroQuickStatus', { defaultValue: 'Choose situation' }),
                  detail: t('legal.heroQuickStatusDetail', { defaultValue: 'Find the closest legal situation first.' }),
                  accent: 'text-cyan-300 border-slate-700/60 bg-slate-900/75 hover:border-cyan-400/24 hover:bg-slate-900/90',
                },
                {
                  id: 'directory',
                  icon: MapPin,
                  label: t('legal.heroQuickDirectory', { defaultValue: 'Find legal help' }),
                  detail: t('legal.heroQuickDirectoryDetail', { defaultValue: 'Search national and state-specific help.' }),
                  accent: 'text-emerald-300 border-slate-700/60 bg-slate-900/75 hover:border-emerald-400/24 hover:bg-slate-900/90',
                },
              ].map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => jumpToLegalView(item.id)}
                    className={`group rounded-2xl border px-4 py-4 text-left shadow-[0_12px_28px_rgba(2,6,23,0.12)] transition-all duration-300 hover:-translate-y-0.5 ${item.accent}`}
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-700/50 bg-slate-950/50">
                        <Icon size={18} weight="bold" />
                      </div>
                      <CaretRight size={16} weight="bold" className="text-slate-500 transition-transform duration-200 group-hover:translate-x-0.5" />
                    </div>
                    <p className="mt-3 text-[11px] font-black uppercase tracking-[0.14em] text-white">{item.label}</p>
                    <p className="mt-1 text-xs leading-relaxed text-slate-400">{item.detail}</p>
                  </button>
                );
              })}
            </div>
          </div>

          <div className="hidden xl:flex xl:flex-col xl:gap-4">
            <div className="relative flex min-h-[232px] flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/80 bg-slate-950/55 p-4 shadow-[0_14px_30px_rgba(2,6,23,0.14)] scenario-rise-in" style={aniDelay(0.3)}>
              <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />
              <div className="pointer-events-none absolute -bottom-14 right-0 h-32 w-32 rounded-full bg-cyan-500/8 blur-3xl" />
              <div className="relative flex items-start justify-between gap-3">
                <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200/60">
                  {t('legal.desktopQuoteEyebrow', { defaultValue: 'Legal perspective' })}
                </p>
                <span className="rounded-full border border-slate-700/55 bg-slate-950/70 px-2.5 py-1 text-[10px] font-bold uppercase tracking-[0.12em] text-white/65">
                  {t('legal.desktopQuoteMeta', { defaultValue: 'Grounding' })}
                </span>
              </div>
              <div className="relative mt-3 flex-1">
                <p
                  className="max-w-[28ch] text-[1.02rem] font-medium italic leading-[1.58] tracking-[0.003em] text-slate-400/72"
                  style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", "Iowan Old Style", ui-serif, Georgia, serif' }}
                >
                  “{legalQuote.quote}”
                </p>
                <div className="mt-3">
                  <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-500/85">
                    {t('legal.desktopQuoteTheme', { defaultValue: 'Clarity under pressure' })}
                  </p>
                  <p className="mt-1 text-[12px] font-semibold tracking-[0.01em] text-slate-500">
                    {legalQuote.author}
                  </p>
                </div>
              </div>
              <div className="relative mt-4 rounded-2xl border border-slate-800/80 bg-slate-950/60 p-4">
                <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">
                  {t('legal.desktopQuoteScriptsEyebrow', { defaultValue: 'Fast first phrases' })}
                </p>
                <div className="mt-3 space-y-2">
                  {[
                    t('legal.heroScript1', { defaultValue: 'I do not consent to a search.' }),
                    t('legal.heroScript2', { defaultValue: 'Am I free to leave?' }),
                    t('legal.heroScript3', { defaultValue: 'I want to speak to a lawyer.' }),
                  ].map((phrase) => (
                    <div
                      key={phrase}
                      className="rounded-xl border border-slate-700/55 bg-slate-950/70 px-3 py-2.5"
                    >
                      <p
                        className="text-[13px] italic leading-relaxed text-slate-300/92"
                        style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", "Iowan Old Style", ui-serif, Georgia, serif' }}
                      >
                        “{phrase}”
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Tab Navigation */}
      <div className="page-section-item sticky top-[84px] z-20 mt-5 overflow-x-auto rounded-[26px] border border-slate-800/80 bg-slate-950/84 p-1.5 shadow-[0_18px_44px_rgba(2,6,23,0.18)] backdrop-blur-xl sm:top-[92px] scenario-fade-in" style={aniDelay(0.14)}>
        <div className="flex min-w-max gap-1.5">
          <button
            onClick={() => setView('chat')}
            className={`group flex-1 rounded-[20px] border px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] transition-[background-color,color,transform,box-shadow,border-color] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              view === 'chat'
                ? `${LEGAL_TAB_STYLES.chat.active} border-slate-300/8`
                : `border-slate-300/10 ${LEGAL_TAB_STYLES.chat.idle} ${LEGAL_TAB_STYLES.chat.hover}`
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                view === 'chat' ? 'border-slate-300/12 bg-cyan-500/10 text-cyan-200' : 'border-slate-300/10 bg-slate-950/72 text-slate-400 group-hover:border-cyan-400/16 group-hover:text-cyan-200'
              }`}>
                <ChatCircle size={14} weight="bold" className="shrink-0" />
              </span>
              {t('legal.tabAskAi')}
              {view === 'chat' && <span className={`h-1.5 w-1.5 rounded-full ${LEGAL_TAB_STYLES.chat.dot}`} />}
            </span>
          </button>
          <button
            onClick={() => setView('constitution')}
            className={`group flex-1 rounded-[20px] border px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] transition-[background-color,color,transform,box-shadow,border-color] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-violet-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              view === 'constitution'
                ? `${LEGAL_TAB_STYLES.constitution.active} border-slate-300/8`
                : `border-slate-300/10 ${LEGAL_TAB_STYLES.constitution.idle} ${LEGAL_TAB_STYLES.constitution.hover}`
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                view === 'constitution' ? 'border-slate-300/12 bg-violet-500/10 text-violet-200' : 'border-slate-300/10 bg-slate-950/72 text-slate-400 group-hover:border-violet-400/16 group-hover:text-violet-200'
              }`}>
                <Scroll size={14} weight="bold" className="shrink-0" />
              </span>
              {t('legal.tabRights')}
              {view === 'constitution' && <span className={`h-1.5 w-1.5 rounded-full ${LEGAL_TAB_STYLES.constitution.dot}`} />}
            </span>
          </button>
          <button
            onClick={() => setView('status')}
            className={`group flex-1 rounded-[20px] border px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] transition-[background-color,color,transform,box-shadow,border-color] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rose-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              view === 'status'
                ? `${LEGAL_TAB_STYLES.status.active} border-slate-300/8`
                : `border-slate-300/10 ${LEGAL_TAB_STYLES.status.idle} ${LEGAL_TAB_STYLES.status.hover}`
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                view === 'status' ? 'border-slate-300/12 bg-rose-500/10 text-rose-200' : 'border-slate-300/10 bg-slate-950/72 text-slate-400 group-hover:border-rose-400/16 group-hover:text-rose-200'
              }`}>
                <IdentificationCard size={14} weight="bold" className="shrink-0" />
              </span>
              {t('legal.tabByStatus', { defaultValue: 'By Situation' })}
              {view === 'status' && <span className={`h-1.5 w-1.5 rounded-full ${LEGAL_TAB_STYLES.status.dot}`} />}
            </span>
          </button>
          <button
            onClick={() => setView('directory')}
            className={`group flex-1 rounded-[20px] border px-4 py-3.5 text-xs font-bold uppercase tracking-[0.12em] transition-[background-color,color,transform,box-shadow,border-color] duration-200 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-200/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
              view === 'directory'
                ? `${LEGAL_TAB_STYLES.directory.active} border-slate-300/8`
                : `border-slate-300/10 ${LEGAL_TAB_STYLES.directory.idle} ${LEGAL_TAB_STYLES.directory.hover}`
            }`}
          >
            <span className="inline-flex items-center justify-center gap-2 whitespace-nowrap">
              <span className={`inline-flex h-7 w-7 items-center justify-center rounded-full border transition-colors ${
                view === 'directory' ? 'border-slate-300/12 bg-emerald-500/10 text-emerald-200' : 'border-slate-300/10 bg-slate-950/72 text-slate-400 group-hover:border-emerald-400/16 group-hover:text-emerald-200'
              }`}>
                <MapPin size={14} weight="bold" className="shrink-0" />
              </span>
              {t('legal.tabFindHelp')}
              {view === 'directory' && <span className={`h-1.5 w-1.5 rounded-full ${LEGAL_TAB_STYLES.directory.dot}`} />}
            </span>
          </button>
        </div>
      </div>

      {view === 'chat' && (
        <div ref={chatSectionRef} className="mt-8 space-y-6 scenario-section-rise">
          <LegalSectionHeader
            eyebrow={t('legal.chatEyebrow', { defaultValue: 'Ask a focused question' })}
            title={t('legal.chatTitle', { defaultValue: 'Ai Legal Help' })}
            description={t('legal.chatSubtitle', { defaultValue: 'Keep questions concrete. Ask what officers can do, what you can say, or what documents matter in the moment.' })}
            support={t('legal.chatSupport', { defaultValue: 'This tool helps with orientation, not legal representation. Use the directory tab when you need a lawyer or hotline.' })}
            accent="text-cyan-400"
            delay={0.04}
          />

          <div className="scenario-section-item bg-gradient-to-br from-amber-950/24 to-amber-900/14 backdrop-blur-sm border border-amber-900/40 rounded-[26px] p-6 shadow-[0_16px_34px_rgba(2,6,23,0.16)]">
            <div className="flex items-start gap-4">
              <Warning size={28} weight="bold" className="text-amber-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-amber-400 font-black text-lg uppercase mb-2">{t('legal.aiDisclaimerTitle')}</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  {t('legal.aiDisclaimerText')}
                </p>
              </div>
            </div>
          </div>

          <div className="scenario-section-item bg-gradient-to-br from-slate-950/94 via-slate-950/96 to-slate-900/80 backdrop-blur-sm rounded-[28px] border border-slate-800/75 min-h-[400px] max-h-[500px] overflow-y-auto p-6 space-y-4 shadow-[0_18px_40px_rgba(2,6,23,0.18)]">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="mb-4 opacity-30 flex justify-center">
                  <ChatCircle size={64} weight="bold" className="text-slate-400" />
                </div>
                <p className="text-slate-500 font-bold">{t('legal.aiEmptyPrompt')}</p>
                <div className="mt-8 grid gap-3">
                  <button
                    onClick={() => setInput(t('legal.aiSuggestion1'))}
                    className="bg-slate-900/80 hover:bg-slate-900 p-4 rounded-[20px] border border-slate-800/80 text-start text-sm text-slate-300 transition-all flex items-start gap-2"
                  >
                    <Lightbulb size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" /> {t('legal.aiSuggestion1')}
                  </button>
                  <button
                    onClick={() => setInput(t('legal.aiSuggestion2'))}
                    className="bg-slate-900/80 hover:bg-slate-900 p-4 rounded-[20px] border border-slate-800/80 text-start text-sm text-slate-300 transition-all flex items-start gap-2"
                  >
                    <Lightbulb size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" /> {t('legal.aiSuggestion2')}
                  </button>
                  <button
                    onClick={() => setInput(t('legal.aiSuggestion3'))}
                    className="bg-slate-900/80 hover:bg-slate-900 p-4 rounded-[20px] border border-slate-800/80 text-start text-sm text-slate-300 transition-all flex items-start gap-2"
                  >
                    <Lightbulb size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" /> {t('legal.aiSuggestion3')}
                  </button>
                </div>
              </div>
            )}

            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                <div
                  className={`max-w-[80%] p-4 rounded-2xl ${
                    msg.role === 'user'
                      ? 'bg-cyan-600 text-white'
                      : 'bg-slate-900 text-slate-100 border border-slate-800/75'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-900 text-slate-100 p-4 rounded-2xl border border-slate-800/75">
                  <p className="text-sm">{t('legal.aiThinking')}</p>
                </div>
              </div>
            )}
          </div>

          <div className="scenario-section-item flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
              placeholder={t('legal.aiPlaceholder')}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-[22px] px-6 py-4 text-white focus:border-cyan-500 outline-none transition-all"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:bg-slate-800 disabled:text-slate-600 text-white px-8 py-4 rounded-[22px] font-black uppercase tracking-wide transition-all disabled:cursor-not-allowed"
            >
              {t('legal.aiSend')}
            </button>
          </div>
        </div>
      )}

      {view === 'constitution' && (
        <div ref={constitutionSectionRef} className="mt-8 space-y-4 scenario-section-rise">
          <LegalSectionHeader
            eyebrow={t('legal.constitutionalRightsEyebrow', { defaultValue: 'Foundations' })}
            title={t('legal.constitutionalRightsTitle')}
            description={t('legal.constitutionalRightsSubtitle')}
            support={t('legal.constitutionalRightsSupport', { defaultValue: 'Open the amendment or scenario that matches what is happening. Each section keeps the plain-language takeaway close to the official source.' })}
            accent="text-violet-400"
            delay={0.04}
          />

          {/* 1st Amendment - Collapsible */}
          <div className="scenario-section-item group relative bg-gradient-to-br from-slate-900 via-slate-900/96 to-purple-950/20 border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-purple-500/30 hover:shadow-lg hover:shadow-purple-500/5 hover:-translate-y-0.5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(147,51,234,0.08),transparent_48%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-2xl" />
            <button
              onClick={() => setExpandedAmendments(prev => {
                const next = new Set(prev);
                if (next.has('1st')) next.delete('1st');
                else next.add('1st');
                return next;
              })}
              className="relative w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-purple-500/20 bg-purple-500/10 text-purple-300 shrink-0">
                  <Megaphone size={20} weight="bold" />
                </div>
                <div className="text-start">
                  <h3 className="text-lg font-black text-white group-hover:text-purple-100 transition-colors">{t('legal.amendment1st')}</h3>
                  <p className="text-slate-400 text-xs hidden sm:block">{t('legal.amendment1stDesc')}</p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedAmendments.has('1st') ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <CaretRight size={20} weight="bold" className="text-slate-400 group-hover:text-purple-400 transition-colors" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expandedAmendments.has('1st') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="bg-gradient-to-br from-purple-950/60 to-purple-900/40 p-6 border-t border-purple-800/50">
                <div className="bg-purple-950/50 p-4 rounded-xl border border-purple-800/50 mb-4">
                  <p className="text-white italic text-sm leading-relaxed">
                    "Congress shall make no law... abridging the freedom of speech, or of the press; or the right of the people peaceably to assemble, and to petition the Government for a redress of grievances."
                  </p>
                </div>

                {/* Right to Record */}
                <div className="mb-6">
                  <h4 className="text-white font-black mb-3 flex items-center gap-2">
                    <span className="text-purple-400">{t('legal.recordingRights')}</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                      <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>You Can Record:</strong> You have the right to record police and ICE in public spaces where you are legally present.</span>
                      </p>
                    </div>
                    <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                      <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Stay at Distance:</strong> Record from a safe distance (8-10 feet). Do not physically interfere with officers.</span>
                      </p>
                    </div>
                    <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                      <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Document Everything:</strong> Record badge numbers, vehicle plates, time, location, and number of officers.</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Right to Protest */}
                <div className="mb-6">
                  <h4 className="text-white font-black mb-3 flex items-center gap-2">
                    <span className="text-purple-400">{t('legal.rightToProtestAssemble')}</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                      <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Peaceful Assembly:</strong> You have the right to gather peacefully in public spaces like sidewalks, parks, and plazas.</span>
                      </p>
                    </div>
                    <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                      <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Permits:</strong> Permits may be required for large gatherings but cannot be denied based on message content. Spontaneous protests in response to events are typically protected.</span>
                      </p>
                    </div>
                    <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                      <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Counter-Protests:</strong> Counter-protesters have the same rights. Police must keep groups separated but cannot favor one side's message.</span>
                      </p>
                    </div>
                    <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                      <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                        <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" /> <span><strong>Dispersal Orders:</strong> If police issue a lawful dispersal order, you must leave or risk arrest. Document the order if possible.</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Freedom of Speech */}
                <div className="mb-6">
                  <h4 className="text-white font-black mb-3 flex items-center gap-2">
                    <span className="text-purple-400">{t('legal.freedomOfSpeech')}</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                      <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Protected Speech:</strong> You can criticize the government, police, and immigration policies. Political speech receives the highest protection.</span>
                      </p>
                    </div>
                    <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                      <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Signs & Symbols:</strong> You can carry signs, wear message clothing, and display symbols. Content-based restrictions are presumptively unconstitutional.</span>
                      </p>
                    </div>
                    <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                      <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                        <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" /> <span><strong>Not Protected:</strong> True threats, incitement to imminent lawless action, and "fighting words" are not protected. Avoid language that could be construed as threats.</span>
                      </p>
                    </div>
                  </div>
                </div>

                {/* Press Freedom */}
                <div className="mb-4">
                  <h4 className="text-white font-black mb-3 flex items-center gap-2">
                    <span className="text-purple-400">{t('legal.freedomOfPress')}</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                      <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Journalist Protections:</strong> Journalists have the same access rights as the public but no special access beyond that. Press credentials don't grant extra rights but may help identify you.</span>
                      </p>
                    </div>
                    <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                      <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Anyone Can Document:</strong> In the digital age, courts recognize that anyone with a phone can act as citizen press. You don't need credentials to document newsworthy events.</span>
                      </p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 pt-4 border-t border-purple-800/50">
                  <p className="text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.officialSources')}</p>
                  <a href="https://constitution.congress.gov/constitution/amendment-1/" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-sm underline block mb-1">
                    {t('legal.link1stAmendmentText')}
                  </a>
                  <a href="https://www.uscourts.gov/about-federal-courts/educational-resources/about-educational-outreach/activity-resources/what-does" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-sm underline block mb-1">
                    {t('legal.link1stAmendmentRights')}
                  </a>
                  <a href="https://www.justice.gov/crt/addressing-police-misconduct-laws-enforced-department-justice" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-sm underline block mb-1">
                    {t('legal.linkDojMisconduct')}
                  </a>
                  <a href="https://www.aclu.org/know-your-rights/protesters-rights" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-sm underline block">
                    {t('legal.linkAcluProtesters')}
                  </a>
                </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 4th Amendment - Collapsible */}
          <div className="scenario-section-item group relative bg-gradient-to-br from-slate-900 via-slate-900/96 to-red-950/20 border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-red-500/30 hover:shadow-lg hover:shadow-red-500/5 hover:-translate-y-0.5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(239,68,68,0.08),transparent_48%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-2xl" />
            <button
              onClick={() => setExpandedAmendments(prev => {
                const next = new Set(prev);
                if (next.has('4th')) next.delete('4th');
                else next.add('4th');
                return next;
              })}
              className="relative w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-red-500/20 bg-red-500/10 text-red-300 shrink-0">
                  <House size={20} weight="bold" />
                </div>
                <div className="text-start">
                  <h3 className="text-lg font-black text-white group-hover:text-red-100 transition-colors">{t('legal.amendment4th')}</h3>
                  <p className="text-slate-400 text-xs hidden sm:block">{t('legal.amendment4thDesc')}</p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedAmendments.has('4th') ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <CaretRight size={20} weight="bold" className="text-slate-400 group-hover:text-red-400 transition-colors" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expandedAmendments.has('4th') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="bg-gradient-to-br from-red-950/60 to-red-900/40 p-6 border-t border-red-800/50">
                <div className="bg-red-950/50 p-4 rounded-xl border border-red-800/50 mb-4">
                  <p className="text-white italic text-sm leading-relaxed">
                    "The right of the people to be secure in their persons, houses, papers, and effects,
                    against unreasonable searches and seizures, shall not be violated..."
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-white font-black mb-3">{t('legal.whatThisMeansForYou')}</h4>
                  <div className="bg-red-950/30 p-4 rounded-xl border border-red-800/30">
                    <p className="text-red-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Your Home:</strong> ICE needs a judicial warrant signed by a judge to enter your home or private workplace areas.</span>
                    </p>
                  </div>
                  <div className="bg-red-950/30 p-4 rounded-xl border border-red-800/30">
                    <p className="text-red-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Administrative vs Judicial:</strong> An administrative warrant (signed by ICE) does NOT give them authority to enter your home.</span>
                    </p>
                  </div>
                  <div className="bg-red-950/30 p-4 rounded-xl border border-red-800/30">
                    <p className="text-red-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Consent:</strong> Never consent to searches. Clearly state: "I do not consent to any searches."</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-red-800/50">
                  <p className="text-red-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.learnMore')}</p>
                  <a href="https://constitution.congress.gov/constitution/amendment-4/" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 text-sm underline block mb-1">
                    {t('legal.link4thAmendmentText')}
                  </a>
                  <a href="https://www.uscourts.gov/about-federal-courts/educational-resources/about-educational-outreach/activity-resources/what-does-0" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 text-sm underline block">
                    {t('legal.link4thAmendmentRights')}
                  </a>
                </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 5th Amendment - Collapsible */}
          <div className="scenario-section-item group relative bg-gradient-to-br from-slate-900 via-slate-900/96 to-blue-950/20 border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-blue-500/30 hover:shadow-lg hover:shadow-blue-500/5 hover:-translate-y-0.5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(59,130,246,0.08),transparent_48%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-2xl" />
            <button
              onClick={() => setExpandedAmendments(prev => {
                const next = new Set(prev);
                if (next.has('5th')) next.delete('5th');
                else next.add('5th');
                return next;
              })}
              className="relative w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-blue-500/20 bg-blue-500/10 text-blue-300 shrink-0">
                  <ShieldWarning size={20} weight="bold" />
                </div>
                <div className="text-start">
                  <h3 className="text-lg font-black text-white group-hover:text-blue-100 transition-colors">{t('legal.amendment5th')}</h3>
                  <p className="text-slate-400 text-xs hidden sm:block">{t('legal.amendment5thDesc')}</p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedAmendments.has('5th') ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <CaretRight size={20} weight="bold" className="text-slate-400 group-hover:text-blue-400 transition-colors" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expandedAmendments.has('5th') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="bg-gradient-to-br from-blue-950/60 to-blue-900/40 p-6 border-t border-blue-800/50">
                <div className="bg-blue-950/50 p-4 rounded-xl border border-blue-800/50 mb-4">
                  <p className="text-white italic text-sm leading-relaxed">
                    "No person... shall be compelled in any criminal case to be a witness against himself..."
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-white font-black mb-3">{t('legal.whatThisMeansForYou')}</h4>
                  <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-800/30">
                    <p className="text-blue-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>You Can Stay Silent:</strong> You do not have to answer questions from ICE or police.</span>
                    </p>
                  </div>
                  <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-800/30">
                    <p className="text-blue-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>How to Assert:</strong> Say: "I am exercising my right to remain silent."</span>
                    </p>
                  </div>
                  <div className="bg-blue-950/30 p-4 rounded-xl border border-blue-800/30">
                    <p className="text-blue-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Request a Lawyer:</strong> Say: "I want to speak to a lawyer."</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-blue-800/50">
                  <p className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.learnMore')}</p>
                  <a href="https://constitution.congress.gov/constitution/amendment-5/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline block mb-1">
                    {t('legal.link5thAmendmentText')}
                  </a>
                  <a href="https://www.uscourts.gov/about-federal-courts/educational-resources/about-educational-outreach/activity-resources/what-does-1" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline block">
                    {t('legal.link5thAmendmentRights')}
                  </a>
                </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 6th Amendment - Collapsible */}
          <div className="scenario-section-item group relative bg-gradient-to-br from-slate-900 via-slate-900/96 to-emerald-950/20 border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-emerald-500/30 hover:shadow-lg hover:shadow-emerald-500/5 hover:-translate-y-0.5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(16,185,129,0.08),transparent_48%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-2xl" />
            <button
              onClick={() => setExpandedAmendments(prev => {
                const next = new Set(prev);
                if (next.has('6th')) next.delete('6th');
                else next.add('6th');
                return next;
              })}
              className="relative w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-emerald-500/20 bg-emerald-500/10 text-emerald-300 shrink-0">
                  <Handshake size={20} weight="bold" />
                </div>
                <div className="text-start">
                  <h3 className="text-lg font-black text-white group-hover:text-emerald-100 transition-colors">{t('legal.amendment6th')}</h3>
                  <p className="text-slate-400 text-xs hidden sm:block">{t('legal.amendment6thDesc')}</p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedAmendments.has('6th') ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <CaretRight size={20} weight="bold" className="text-slate-400 group-hover:text-emerald-400 transition-colors" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expandedAmendments.has('6th') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="bg-gradient-to-br from-emerald-950/60 to-emerald-900/40 p-6 border-t border-emerald-800/50">
                <div className="bg-emerald-950/50 p-4 rounded-xl border border-emerald-800/50 mb-4">
                  <p className="text-white italic text-sm leading-relaxed">
                    "In all criminal prosecutions, the accused shall enjoy the right... to have the Assistance of Counsel for his defence."
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-white font-black mb-3">{t('legal.whatThisMeansForYou')}</h4>
                  <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-800/30">
                    <p className="text-emerald-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Right to a Lawyer:</strong> You have the right to an attorney during any criminal proceeding, including immigration-related criminal charges.</span>
                    </p>
                  </div>
                  <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-800/30">
                    <p className="text-emerald-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>How to Assert:</strong> Say: "I want to speak to a lawyer before answering any questions."</span>
                    </p>
                  </div>
                  <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-800/30">
                    <p className="text-emerald-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Public Defender:</strong> If you cannot afford an attorney, one may be appointed for criminal charges (not civil immigration proceedings).</span>
                    </p>
                  </div>
                  <div className="bg-emerald-950/30 p-4 rounded-xl border border-emerald-800/30">
                    <p className="text-emerald-100 text-sm leading-relaxed flex items-start gap-2">
                      <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" /> <span><strong>Immigration Court:</strong> There is no guaranteed right to a free attorney in immigration court—seek pro bono legal help if needed.</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-emerald-800/50">
                  <p className="text-emerald-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.officialSources')}</p>
                  <a href="https://constitution.congress.gov/constitution/amendment-6/" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-sm underline block mb-1">
                    {t('legal.link6thAmendmentText')}
                  </a>
                  <a href="https://www.uscourts.gov/about-federal-courts/educational-resources/about-educational-outreach/activity-resources/what-does-2" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-sm underline block mb-1">
                    {t('legal.link6thAmendmentRights')}
                  </a>
                  <a href="https://www.justice.gov/eoir/legal-orientation-program" target="_blank" rel="noopener noreferrer" className="text-emerald-400 hover:text-emerald-300 text-sm underline block">
                    {t('legal.linkDojLegalOrientation')}
                  </a>
                </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* 14th Amendment - Collapsible */}
          <div className="scenario-section-item group relative bg-gradient-to-br from-slate-900 via-slate-900/96 to-amber-950/20 border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-amber-500/30 hover:shadow-lg hover:shadow-amber-500/5 hover:-translate-y-0.5">
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(245,158,11,0.08),transparent_48%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-2xl" />
            <button
              onClick={() => setExpandedAmendments(prev => {
                const next = new Set(prev);
                if (next.has('14th')) next.delete('14th');
                else next.add('14th');
                return next;
              })}
              className="relative w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-amber-500/20 bg-amber-500/10 text-amber-300 shrink-0">
                  <Gavel size={20} weight="bold" />
                </div>
                <div className="text-start">
                  <h3 className="text-lg font-black text-white group-hover:text-amber-100 transition-colors">{t('legal.amendment14th')}</h3>
                  <p className="text-slate-400 text-xs hidden sm:block">{t('legal.amendment14thDesc')}</p>
                </div>
              </div>
              <motion.div
                animate={{ rotate: expandedAmendments.has('14th') ? 90 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
              >
                <CaretRight size={20} weight="bold" className="text-slate-400 group-hover:text-amber-400 transition-colors" />
              </motion.div>
            </button>
            <AnimatePresence>
              {expandedAmendments.has('14th') && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="bg-gradient-to-br from-amber-950/60 to-amber-900/40 p-6 border-t border-amber-800/50">
                <div className="bg-amber-950/50 p-4 rounded-xl border border-amber-800/50 mb-4">
                  <p className="text-white italic text-sm leading-relaxed">
                    "...nor shall any State deprive any person of life, liberty, or property, without due process of law; nor deny to any person within its jurisdiction the equal protection of the laws."
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-white font-black mb-3">{t('legal.whyThisMattersImmigration')}</h4>
                  <div className="bg-amber-950/30 p-4 rounded-xl border border-amber-800/30">
                    <p className="text-amber-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Applies to Everyone:</strong> The Constitution says "any person"—not just citizens. These rights apply to all people on U.S. soil regardless of immigration status.</span>
                    </p>
                  </div>
                  <div className="bg-amber-950/30 p-4 rounded-xl border border-amber-800/30">
                    <p className="text-amber-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Due Process:</strong> You cannot be detained or deported without proper legal proceedings. The government must follow established procedures.</span>
                    </p>
                  </div>
                  <div className="bg-amber-950/30 p-4 rounded-xl border border-amber-800/30">
                    <p className="text-amber-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Equal Protection:</strong> The government cannot single you out based on race, ethnicity, or national origin alone.</span>
                    </p>
                  </div>
                  <div className="bg-amber-950/30 p-4 rounded-xl border border-amber-800/30">
                    <p className="text-amber-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Court Access:</strong> You have the right to appear before an immigration judge and present your case, including asylum claims.</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-amber-800/50">
                  <p className="text-amber-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.officialSources')}</p>
                  <a href="https://constitution.congress.gov/constitution/amendment-14/" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 text-sm underline block mb-1">
                    {t('legal.link14thAmendmentText')}
                  </a>
                  <a href="https://www.uscis.gov/citizenship/learn-about-citizenship/the-constitution-and-you" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 text-sm underline block mb-1">
                    {t('legal.linkUscisConstitution')}
                  </a>
                  <a href="https://www.aclu.org/know-your-rights/immigrants-rights" target="_blank" rel="noopener noreferrer" className="text-amber-400 hover:text-amber-300 text-sm underline block">
                    {t('legal.linkAcluImmigrants')}
                  </a>
                </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Civil Disobedience: Know Your Rights */}
          <div className="mt-14 pt-8 relative">
            <div className="pointer-events-none absolute -top-6 left-6 right-6 h-px bg-gradient-to-r from-transparent via-teal-400/30 to-transparent" />
            <LegalSectionHeader
              eyebrow={t('legal.civilDisobedienceEyebrow', { defaultValue: 'Civic Action' })}
              title={t('legal.civilDisobedienceTitle')}
              description={t('legal.civilDisobedienceSubtitle')}
              support={t('legal.civilDisobedienceSupport', { defaultValue: 'This section stays practical: what remains protected, where risk increases, and what to document if the encounter escalates.' })}
              accent="text-teal-400"
            />

            {/* Disclaimer */}
            <div className="bg-amber-950/30 border border-amber-900/50 rounded-2xl p-5 mb-6">
              <div className="flex items-start gap-3">
                <Warning size={22} weight="bold" className="text-amber-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-amber-200 text-sm font-bold mb-1">{t('legal.importantDisclaimer')}</p>
                  <p className="text-slate-300 text-xs leading-relaxed">
                    This section provides general legal information about your constitutional rights during acts of civil disobedience. It is not legal advice and is not encouragement to break any law. Civil disobedience by definition involves accepting legal consequences for one's actions. Always consult with an attorney before, during, and after any legal situation.
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">

            {/* History & Legal Framework */}
            <div className="group relative bg-gradient-to-br from-slate-900 via-slate-900/96 to-teal-950/20 border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5 hover:-translate-y-0.5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.08),transparent_48%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-2xl" />
              <button
                onClick={() => setExpandedAmendments(prev => {
                  const next = new Set(prev);
                  if (next.has('cd-history')) next.delete('cd-history');
                  else next.add('cd-history');
                  return next;
                })}
                className="relative w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-300 shrink-0">
                    <BookOpenText size={20} weight="bold" />
                  </div>
                  <div className="text-start">
                    <h3 className="text-lg font-black text-white group-hover:text-teal-100 transition-colors">{t('legal.historyLegalFramework')}</h3>
                    <p className="text-slate-400 text-xs hidden sm:block">{t('legal.constitutionalProtections')}</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedAmendments.has('cd-history') ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <CaretRight size={20} weight="bold" className="text-slate-400 group-hover:text-teal-400 transition-colors" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedAmendments.has('cd-history') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gradient-to-br from-teal-950/60 to-teal-900/40 p-6 border-t border-teal-800/50">

                      <div className="mb-6">
                        <h4 className="text-white font-black mb-3 flex items-center gap-2">
                          <span className="text-teal-400">{t('legal.firstAmendmentProtections')}</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Right to Assemble:</strong> The First Amendment protects the right of people to peacefully assemble. This includes marches, sit-ins, vigils, rallies, and other forms of collective expression on public property.</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Right to Petition:</strong> You have the constitutional right to petition the government for redress of grievances. This includes protests, demonstrations, and organized acts of nonviolent resistance.</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Freedom of Speech:</strong> Peaceful protest is a form of protected speech. Signs, chants, leaflets, and symbolic expression (like armbands or silent vigils) are all constitutionally protected activities.</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h4 className="text-white font-black mb-3 flex items-center gap-2">
                          <span className="text-teal-400">{t('legal.landmarkCourtCases')}</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed">
                              <strong>NAACP v. Claiborne Hardware (1982):</strong> The Supreme Court ruled that nonviolent elements of a protest (boycotts, marches, speeches) are constitutionally protected even if some participants engage in violence. Peaceful participants cannot be held liable for others' actions.
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed">
                              <strong>Edwards v. South Carolina (1963):</strong> The Court overturned the convictions of 187 Black students arrested for peacefully protesting segregation at the state capitol. Peaceful protest on public grounds is protected by the 1st and 14th Amendments.
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed">
                              <strong>Tinker v. Des Moines (1969):</strong> The Court held that wearing black armbands to protest the Vietnam War was protected symbolic speech. "Students do not shed their constitutional rights at the schoolhouse gate."
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed">
                              <strong>Cox v. Louisiana (1965):</strong> The Court ruled that peaceful picketing and parading are protected forms of expression. However, the government may impose reasonable time, place, and manner restrictions.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h4 className="text-white font-black mb-3 flex items-center gap-2">
                          <span className="text-teal-400">{t('legal.protectedVsUnprotected')}</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Generally Protected:</strong> Marching on sidewalks and public spaces, holding signs, chanting, leafleting, silent vigils, boycotts, human chains on public property, symbolic speech (armbands, flags).</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" />
                              <span><strong>May Cross Legal Lines:</strong> Blocking roads or entrances, occupying private property, refusing to disperse after lawful order, interfering with government operations. These acts may result in arrest — know the potential consequences before participating.</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h4 className="text-white font-black mb-3 flex items-center gap-2">
                          <span className="text-teal-400">{t('legal.historicalMovements')}</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed">
                              <strong>Civil Rights Movement (1950s-60s):</strong> Lunch counter sit-ins, Freedom Rides, the Montgomery Bus Boycott, and the March on Washington used nonviolent civil disobedience to challenge segregation and secure the Civil Rights Act of 1964 and Voting Rights Act of 1965.
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed">
                              <strong>Women's Suffrage (1848-1920):</strong> Suffragists organized marches, picket lines at the White House, and hunger strikes. Many were arrested and imprisoned before the 19th Amendment was ratified.
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed">
                              <strong>Labor Movement (1880s-1940s):</strong> Strikes, sit-downs, and picket lines fought for the 8-hour workday, workplace safety, and the right to organize. These actions led to the National Labor Relations Act and Fair Labor Standards Act.
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed">
                              <strong>Sanctuary Movement (1980s-present):</strong> Churches and communities have provided sanctuary to refugees and undocumented immigrants, drawing on religious and moral traditions of offering refuge to those facing persecution.
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-teal-800/50">
                        <p className="text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.officialSources')}</p>
                        <a href="https://constitution.congress.gov/constitution/amendment-1/" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-sm underline block mb-1">
                          {t('legal.link1stAmendmentText')}
                        </a>
                        <a href="https://www.aclu.org/know-your-rights/protesters-rights" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-sm underline block mb-1">
                          {t('legal.linkAcluKnowYourRights')}
                        </a>
                        <a href="https://www.oyez.org/cases/1981/81-202" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-sm underline block">
                          {t('legal.linkOyezNaacp')}
                        </a>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Your Rights If Arrested */}
            <div className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
              <button
                onClick={() => setExpandedAmendments(prev => {
                  const next = new Set(prev);
                  if (next.has('cd-arrested')) next.delete('cd-arrested');
                  else next.add('cd-arrested');
                  return next;
                })}
                className="w-full p-5 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-300 shadow-[0_0_24px_rgba(20,184,166,0.12)]">
                    <Fingerprint size={20} weight="bold" />
                  </div>
                  <h3 className="text-xl font-bold text-white group-hover:text-teal-100 transition-colors">{t('legal.yourRightsIfArrested')}</h3>
                  <p className="text-slate-400 text-sm hidden sm:block">{t('legal.whatToKnowAndDo')}</p>
                </div>
                <motion.div
                  animate={{ rotate: expandedAmendments.has('cd-arrested') ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <CaretRight size={24} weight="bold" className="text-slate-400 group-hover:text-teal-400 transition-colors" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedAmendments.has('cd-arrested') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gradient-to-br from-teal-950/60 to-teal-900/40 p-6 border-t border-teal-800/50">

                      <div className="space-y-3 mb-6">
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                            <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                            <span><strong>Right to Remain Silent:</strong> Say clearly: <em>"I am exercising my right to remain silent."</em> You do not have to answer any questions. Anything you say can and will be used against you. Silence cannot be used as evidence of guilt.</span>
                          </p>
                        </div>
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                            <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                            <span><strong>Right to an Attorney:</strong> Say clearly: <em>"I want to speak to a lawyer."</em> Once you invoke this right, police must stop questioning you. If you cannot afford an attorney, one will be appointed. Do not answer questions until your attorney is present.</span>
                          </p>
                        </div>
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                            <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                            <span><strong>Right to Know Charges:</strong> You have the right to be told what you are being charged with. Ask: <em>"What am I being charged with?"</em> You are entitled to a prompt arraignment (typically within 48-72 hours).</span>
                          </p>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h4 className="text-white font-black mb-3 flex items-center gap-2">
                          <span className="text-teal-400">{t('legal.whatHappensAtBooking')}</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed">
                              <strong>The Process:</strong> You will be fingerprinted, photographed, and your personal belongings will be inventoried. You are typically allowed at least one phone call. You may be held until arraignment or until bail is posted.
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed">
                              <strong>Bail:</strong> A judge sets bail based on the charges, flight risk, and community ties. Options include: <strong>Cash bail</strong> (pay full amount, refunded after case), <strong>bail bond</strong> (pay 10% to a bondsman, non-refundable), or <strong>OR release</strong> (released on your own recognizance, no payment required — common for minor protest-related charges).
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h4 className="text-white font-black mb-3 flex items-center gap-2">
                          <span className="text-amber-400">{t('legal.whatNotToDo')}</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Do not explain yourself:</strong> Do not try to justify your actions, tell your story, or "clear things up" with police. Save it for your attorney.</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Do not consent to searches:</strong> Say: <em>"I do not consent to a search."</em> They may search you anyway incident to arrest, but your verbal non-consent preserves your rights for court.</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Do not physically resist:</strong> Even if you believe the arrest is unlawful, do not physically resist. Resisting can add additional charges. Stay calm, comply physically, but assert your rights verbally.</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Do not sign anything</strong> without your attorney present. Do not agree to any deals, plea bargains, or statements without legal counsel.</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-teal-800/50">
                        <p className="text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.officialSources')}</p>
                        <a href="https://www.aclu.org/know-your-rights/stopped-by-police" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-sm underline block mb-1">
                          {t('legal.linkAcluStoppedByPolice')}
                        </a>
                        <a href="https://www.nlg.org/know-your-rights/" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-sm underline block">
                          {t('legal.linkNlgKnowYourRights')}
                        </a>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Common Charges at Protests */}
            <div className="group relative bg-gradient-to-br from-slate-900 via-slate-900/96 to-teal-950/20 border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5 hover:-translate-y-0.5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.08),transparent_48%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-2xl" />
              <button
                onClick={() => setExpandedAmendments(prev => {
                  const next = new Set(prev);
                  if (next.has('cd-charges')) next.delete('cd-charges');
                  else next.add('cd-charges');
                  return next;
                })}
                className="relative w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-300 shrink-0">
                    <Warning size={20} weight="bold" />
                  </div>
                  <div className="text-start">
                    <h3 className="text-lg font-black text-white group-hover:text-teal-100 transition-colors">{t('legal.commonChargesAtProtests')}</h3>
                    <p className="text-slate-400 text-xs hidden sm:block">{t('legal.knowWhatYouMayFace')}</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedAmendments.has('cd-charges') ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <CaretRight size={20} weight="bold" className="text-slate-400 group-hover:text-teal-400 transition-colors" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedAmendments.has('cd-charges') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gradient-to-br from-teal-950/60 to-teal-900/40 p-6 border-t border-teal-800/50">

                      <div className="space-y-3">
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed">
                            <strong>Trespassing:</strong> Entering or remaining on property without permission. Common during sit-ins or building occupations. Typically a misdemeanor. Penalties vary by state but often include fines of $100-$1,000 and up to 30 days in jail. Defense: you may argue the property was open to the public or that you were exercising First Amendment rights on public property.
                          </p>
                        </div>
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed">
                            <strong>Disorderly Conduct:</strong> A broad, catch-all charge often used at protests. Typically covers "disturbing the peace," "unreasonable noise," or "tumultuous behavior." This is the most common protest arrest charge. Usually a misdemeanor with fines and possible short jail time. These charges are frequently dropped or dismissed.
                          </p>
                        </div>
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed">
                            <strong>Unlawful Assembly:</strong> When authorities declare a gathering unlawful — typically when they determine it poses a "clear and present danger" of violence or property destruction. A formal dispersal order must be given before this charge applies. You must be given a reasonable opportunity to leave.
                          </p>
                        </div>
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed">
                            <strong>Failure to Disperse:</strong> Remaining after a lawful dispersal order is given. The order must be audible and clear. You must be given a reasonable amount of time to leave. If exit routes are blocked by police, this can be a defense. Document the time the order was given and whether you had a clear path to leave.
                          </p>
                        </div>
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed">
                            <strong>Obstruction / Resisting Arrest:</strong> Physically interfering with an officer or resisting a lawful arrest. Simply going limp (passive resistance) may or may not constitute resisting depending on state law. Verbal challenges to police are generally protected speech. Physical resistance always adds charges — stay calm and comply physically while asserting rights verbally.
                          </p>
                        </div>
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                            <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" />
                            <span><strong>Federal vs. State Charges:</strong> Most protest arrests are state or local charges. However, federal charges can apply on federal property (courthouses, federal buildings, national parks), when crossing state lines to incite a riot (Anti-Riot Act), or when protests target federal operations. Federal charges carry more serious penalties and are prosecuted in federal court.</span>
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-teal-800/50">
                        <p className="text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.officialSources')}</p>
                        <a href="https://www.aclu.org/know-your-rights/protesters-rights" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-sm underline block mb-1">
                          {t('legal.linkAcluProtesters')}
                        </a>
                        <a href="https://www.nlg.org/" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-sm underline block">
                          {t('legal.linkNlg')}
                        </a>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Practical Safety */}
            <div className="group relative bg-gradient-to-br from-slate-900 via-slate-900/96 to-teal-950/20 border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-teal-500/30 hover:shadow-lg hover:shadow-teal-500/5 hover:-translate-y-0.5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(20,184,166,0.08),transparent_48%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-2xl" />
              <button
                onClick={() => setExpandedAmendments(prev => {
                  const next = new Set(prev);
                  if (next.has('cd-safety')) next.delete('cd-safety');
                  else next.add('cd-safety');
                  return next;
                })}
                className="relative w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-teal-500/20 bg-teal-500/10 text-teal-300 shrink-0">
                    <Shield size={20} weight="bold" />
                  </div>
                  <div className="text-start">
                    <h3 className="text-lg font-black text-white group-hover:text-teal-100 transition-colors">{t('legal.practicalSafety')}</h3>
                    <p className="text-slate-400 text-xs hidden sm:block">{t('legal.beforeDuringAfter')}</p>
                  </div>
                </div>
                <motion.div
                  animate={{ rotate: expandedAmendments.has('cd-safety') ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <CaretRight size={20} weight="bold" className="text-slate-400 group-hover:text-teal-400 transition-colors" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedAmendments.has('cd-safety') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gradient-to-br from-teal-950/60 to-teal-900/40 p-6 border-t border-teal-800/50">

                      <div className="mb-6">
                        <h4 className="text-white font-black mb-3 flex items-center gap-2">
                          <span className="text-teal-400">{t('legal.beforeYouGo')}</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Buddy System:</strong> Never go alone. Pair up with someone you trust. Agree on a meeting point if separated. Share your plans with someone who is NOT attending.</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Legal Support Contact:</strong> Write a lawyer's phone number on your arm in permanent marker (phones can be confiscated). The National Lawyers Guild hotline: <strong>(212) 679-5100</strong>. Designate a "jail support" person who can post bail and coordinate with attorneys.</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>What to Bring:</strong> Government-issued ID, any required medications (in original containers), water, snacks, cash for bail or transportation, a charged phone with emergency contacts.</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" />
                              <span><strong>What NOT to Bring:</strong> Weapons of any kind, drugs or alcohol, valuables or jewelry, unnecessary electronics, anything you wouldn't want confiscated, contact lenses (tear gas — bring glasses instead).</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Know Local Laws:</strong> Research permit requirements, local curfew laws, and any specific ordinances. Know which areas are public property vs. private. Understand your state's specific laws on unlawful assembly and failure to disperse.</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h4 className="text-white font-black mb-3 flex items-center gap-2">
                          <span className="text-teal-400">{t('legal.duringTheAction')}</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>De-escalation:</strong> Remain calm and non-threatening. Keep hands visible. Speak in a calm, steady voice. Do not make sudden movements. Comply with lawful orders while verbally asserting your rights.</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Document Everything:</strong> Record video when safe to do so (this is your First Amendment right). Note badge numbers, agency names, vehicle numbers, and timestamps. If you witness misconduct, get contact information from other witnesses.</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Medical Awareness:</strong> Know where street medics are stationed (look for red cross symbols). If you take prescription medication, carry it with you. If tear gas is deployed: move upwind, do not rub your eyes, rinse with water or saline solution.</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mb-6">
                        <h4 className="text-white font-black mb-3 flex items-center gap-2">
                          <span className="text-teal-400">{t('legal.afterTheAction')}</span>
                        </h4>
                        <div className="space-y-3">
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Document While Fresh:</strong> Write down everything you remember as soon as possible: who was there, what happened, when and where events occurred, badge numbers, witness names, and any use of force. Details fade quickly.</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Finding Legal Support:</strong> Contact the <strong>National Lawyers Guild (NLG)</strong> at (212) 679-5100 for referrals. Local legal aid organizations often have protest-specific resources. If arrested, you qualify for a public defender if you cannot afford private counsel.</span>
                            </p>
                          </div>
                          <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                            <p className="text-teal-100 text-sm leading-relaxed flex items-start gap-2">
                              <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                              <span><strong>Filing Complaints:</strong> If you experienced police misconduct, file a complaint with the department's internal affairs division, your local civilian complaint board, and the ACLU. Photograph any injuries. Keep copies of all documentation.</span>
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-teal-800/50">
                        <p className="text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.officialSources')}</p>
                        <a href="https://www.nlg.org/know-your-rights/" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-sm underline block mb-1">
                          {t('legal.linkNlgKnowYourRightsSafety')}
                        </a>
                        <a href="https://www.aclu.org/know-your-rights/protesters-rights" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-sm underline block">
                          {t('legal.linkAcluProtesters')}
                        </a>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* The Philosophical Tradition */}
            <div className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-0.5">
              <button
                onClick={() => setExpandedAmendments(prev => {
                  const next = new Set(prev);
                  if (next.has('cd-philosophy')) next.delete('cd-philosophy');
                  else next.add('cd-philosophy');
                  return next;
                })}
                className="w-full p-5 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <h3 className="text-xl font-bold text-white group-hover:text-teal-100 transition-colors">{t('legal.philosophicalTradition')}</h3>
                  <p className="text-slate-400 text-sm hidden sm:block">{t('legal.stoicsKingsConscience')}</p>
                </div>
                <motion.div
                  animate={{ rotate: expandedAmendments.has('cd-philosophy') ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <CaretRight size={24} weight="bold" className="text-slate-400 group-hover:text-teal-400 transition-colors" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedAmendments.has('cd-philosophy') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gradient-to-br from-teal-950/60 to-teal-900/40 p-6 border-t border-teal-800/50">

                      <div className="bg-teal-950/50 p-4 rounded-xl border border-teal-800/50 mb-6">
                        <p className="text-white italic text-sm leading-relaxed">
                          {t('legal.mlkQuote')}
                        </p>
                        <p className="text-teal-400 text-xs mt-2 text-end">{t('legal.mlkAttribution')}</p>
                      </div>

                      <div className="space-y-3 mb-6">
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed">
                            <strong>Stoic Duty to Community:</strong> The Stoics taught that we are citizens of the world first, and that justice demands action — not mere observation. Marcus Aurelius wrote: <em>"That which is not good for the bee-hive, cannot be good for the bee."</em> Epictetus taught that the powers of organizing the whole are within each person. When laws harm the community, Stoic philosophy holds that conscience and duty to others may call for principled action.
                          </p>
                        </div>
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed">
                            <strong>Henry David Thoreau — "Civil Disobedience" (1849):</strong> Thoreau argued that individuals have a duty to follow their conscience over unjust laws. He went to jail rather than pay a tax supporting slavery and the Mexican-American War. His essay became the foundational text of nonviolent resistance, directly influencing Gandhi and King.
                          </p>
                        </div>
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed">
                            <strong>Martin Luther King Jr. — Letter from Birmingham Jail (1963):</strong> King distinguished between just and unjust laws: <em>"A just law is a man-made code that squares with the moral law. An unjust law is a code that is out of harmony with the moral law."</em> He argued that nonviolent direct action creates the tension necessary for change, and that those who break unjust laws must do so "openly, lovingly, and with a willingness to accept the penalty."
                          </p>
                        </div>
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed">
                            <strong>Mahatma Gandhi — Satyagraha:</strong> Gandhi's philosophy of "truth-force" or "soul-force" held that nonviolent resistance is the most powerful weapon against injustice. His principles: never harm your opponent, accept suffering without retaliation, always be truthful, and recognize the humanity in your adversary. The Salt March of 1930 demonstrated how mass civil disobedience can shift public consciousness.
                          </p>
                        </div>
                        <div className="bg-teal-950/30 p-4 rounded-xl border border-teal-800/30">
                          <p className="text-teal-100 text-sm leading-relaxed">
                            <strong>The Common Thread:</strong> From the Stoics to Thoreau to King to Gandhi, the tradition of civil disobedience rests on a shared conviction: that individuals have a moral obligation to act when laws or systems cause harm to others, and that nonviolent action — undertaken openly and with acceptance of consequences — is the most powerful force for justice.
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 pt-4 border-t border-teal-800/50">
                        <p className="text-teal-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.readPrimarySources')}</p>
                        <a href="https://www.africa.upenn.edu/Articles_Gen/Letter_Birmingham.html" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-sm underline block mb-1">
                          {t('legal.linkMlkLetter')}
                        </a>
                        <a href="https://www.gutenberg.org/files/71/71-h/71-h.htm" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-sm underline block mb-1">
                          {t('legal.linkThoreauCivilDisobedience')}
                        </a>
                        <a href="https://www.mkgandhi.org/nonviolence/phil8.htm" target="_blank" rel="noopener noreferrer" className="text-teal-400 hover:text-teal-300 text-sm underline block">
                          {t('legal.linkGandhiNonviolence')}
                        </a>
                      </div>

                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            </div>
          </div>

          {/* Know Your Rights Scenarios Section */}
          <div className="mt-12 pt-8 border-t border-slate-800/75">
            <LegalSectionHeader
              eyebrow={t('legal.commonScenariosEyebrow', { defaultValue: 'Common encounters' })}
              title={t('legal.commonScenariosTitle')}
              description={t('legal.commonScenariosSubtitle')}
              support={t('legal.commonScenariosSupport', { defaultValue: 'Use these as fast refreshers when the encounter has already started and you need the shortest safe script.' })}
              accent="text-cyan-400"
            />

            {/* At Your Door */}
            <div className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden mb-4 transition-all duration-300 hover:-translate-y-0.5">
              <button
                onClick={() => setExpandedAmendments(prev => {
                  const next = new Set(prev);
                  if (next.has('door')) next.delete('door');
                  else next.add('door');
                  return next;
                })}
                className="w-full p-5 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <House size={24} weight="bold" className="text-cyan-400" />
                  <h3 className="text-xl font-bold text-white group-hover:text-cyan-100 transition-colors">{t('legal.scenarioAtYourDoor')}</h3>
                </div>
                <motion.div
                  animate={{ rotate: expandedAmendments.has('door') ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <CaretRight size={24} weight="bold" className="text-slate-400 group-hover:text-cyan-400 transition-colors" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedAmendments.has('door') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gradient-to-br from-cyan-950 to-cyan-900 p-6 border-t border-cyan-800">
                  <div className="space-y-3">
                    <div className="bg-cyan-950/30 p-4 rounded-xl border border-cyan-800/30">
                      <p className="text-cyan-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Do NOT Open the Door:</strong> You are not required to open your door to ICE or police unless they have a valid judicial warrant.</span>
                      </p>
                    </div>
                    <div className="bg-cyan-950/30 p-4 rounded-xl border border-cyan-800/30">
                      <p className="text-cyan-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Ask for Warrant:</strong> Say: "Please slide the warrant under the door." A valid warrant must be signed by a judge, not ICE.</span>
                      </p>
                    </div>
                    <div className="bg-cyan-950/30 p-4 rounded-xl border border-cyan-800/30">
                      <p className="text-cyan-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Stay Silent:</strong> You can communicate through the door: "I am exercising my right to remain silent."</span>
                      </p>
                    </div>
                    <div className="bg-cyan-950/30 p-4 rounded-xl border border-cyan-800/30">
                      <p className="text-cyan-100 text-sm leading-relaxed flex items-start gap-2">
                        <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" /> <span><strong>Do NOT Sign Anything:</strong> Never sign documents without speaking to a lawyer first.</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-cyan-800/50">
                    <p className="text-cyan-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.officialSources')}</p>
                    <a href="https://www.ice.gov/sites/default/files/documents/Document/2017/adminWarrantvJudicialWarrant.pdf" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 text-sm underline block mb-1">
                      {t('legal.linkIceWarrants')}
                    </a>
                    <a href="https://www.aclu.org/know-your-rights/immigrants-rights" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 text-sm underline block">
                      {t('legal.linkAcluKnowYourRightsDoor')}
                    </a>
                  </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* In Public */}
            <div className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden mb-4 transition-all duration-300 hover:-translate-y-0.5">
              <button
                onClick={() => setExpandedAmendments(prev => {
                  const next = new Set(prev);
                  if (next.has('public')) next.delete('public');
                  else next.add('public');
                  return next;
                })}
                className="w-full p-5 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <MapPin size={24} weight="bold" className="text-green-400" />
                  <h3 className="text-xl font-bold text-white group-hover:text-green-100 transition-colors">{t('legal.scenarioInPublic')}</h3>
                </div>
                <motion.div
                  animate={{ rotate: expandedAmendments.has('public') ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <CaretRight size={24} weight="bold" className="text-slate-400 group-hover:text-green-400 transition-colors" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedAmendments.has('public') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gradient-to-br from-green-950 to-green-900 p-6 border-t border-green-800">
                  <div className="space-y-3">
                    <div className="bg-green-950/30 p-4 rounded-xl border border-green-800/30">
                      <p className="text-green-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Stay Calm:</strong> You have the right to remain silent. Do not run, argue, or resist.</span>
                      </p>
                    </div>
                    <div className="bg-green-950/30 p-4 rounded-xl border border-green-800/30">
                      <p className="text-green-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Ask if Free to Leave:</strong> Say: "Am I being detained, or am I free to go?" If free, walk away calmly.</span>
                      </p>
                    </div>
                    <div className="bg-green-950/30 p-4 rounded-xl border border-green-800/30">
                      <p className="text-green-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Do NOT Provide Documents:</strong> You do not have to show immigration papers or ID to ICE (except in specific border situations).</span>
                      </p>
                    </div>
                    <div className="bg-green-950/30 p-4 rounded-xl border border-green-800/30">
                      <p className="text-green-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Do NOT Lie:</strong> If you choose to speak, do not provide false information. It's better to stay silent.</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-green-800/50">
                    <p className="text-green-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.officialSources')}</p>
                    <a href="https://www.uscis.gov/about-us/find-a-uscis-office/field-offices" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 text-sm underline block mb-1">
                      {t('legal.linkUscisFieldOffices')}
                    </a>
                    <a href="https://www.nilc.org/issues/immigration-enforcement/everyone-has-certain-basic-rights/" target="_blank" rel="noopener noreferrer" className="text-green-400 hover:text-green-300 text-sm underline block">
                      {t('legal.linkNilcBasicRights')}
                    </a>
                  </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* At Work */}
            <div className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden mb-4 transition-all duration-300 hover:-translate-y-0.5">
              <button
                onClick={() => setExpandedAmendments(prev => {
                  const next = new Set(prev);
                  if (next.has('work')) next.delete('work');
                  else next.add('work');
                  return next;
                })}
                className="w-full p-5 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Briefcase size={24} weight="bold" className="text-orange-400" />
                  <h3 className="text-xl font-bold text-white group-hover:text-orange-100 transition-colors">{t('legal.scenarioAtWork')}</h3>
                </div>
                <motion.div
                  animate={{ rotate: expandedAmendments.has('work') ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <CaretRight size={24} weight="bold" className="text-slate-400 group-hover:text-orange-400 transition-colors" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedAmendments.has('work') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gradient-to-br from-orange-950 to-orange-900 p-6 border-t border-orange-800">
                  <div className="space-y-3">
                    <div className="bg-orange-950/30 p-4 rounded-xl border border-orange-800/30">
                      <p className="text-orange-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Public vs Private Areas:</strong> ICE can enter public areas (lobbies, storefronts) but needs a warrant for private work areas.</span>
                      </p>
                    </div>
                    <div className="bg-orange-950/30 p-4 rounded-xl border border-orange-800/30">
                      <p className="text-orange-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Stay Silent:</strong> You have the right not to answer questions about your immigration status at work.</span>
                      </p>
                    </div>
                    <div className="bg-orange-950/30 p-4 rounded-xl border border-orange-800/30">
                      <p className="text-orange-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>I-9 Audits:</strong> Employers must be given 3 days notice for I-9 audits. You don't have to speak during an audit.</span>
                      </p>
                    </div>
                    <div className="bg-orange-950/30 p-4 rounded-xl border border-orange-800/30">
                      <p className="text-orange-100 text-sm leading-relaxed flex items-start gap-2">
                        <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" /> <span><strong>Know Your Employer's Policy:</strong> Some employers have policies to protect workers. Ask about your workplace's policy.</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-orange-800/50">
                    <p className="text-orange-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.officialSources')}</p>
                    <a href="https://www.uscis.gov/i-9-central/i-9-central-questions-and-answers" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 text-sm underline block mb-1">
                      {t('legal.linkUscisI9')}
                    </a>
                    <a href="https://www.dol.gov/agencies/whd/immigration" target="_blank" rel="noopener noreferrer" className="text-orange-400 hover:text-orange-300 text-sm underline block">
                      {t('legal.linkDolImmigration')}
                    </a>
                  </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* In a Vehicle */}
            <div className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden mb-4 transition-all duration-300 hover:-translate-y-0.5">
              <button
                onClick={() => setExpandedAmendments(prev => {
                  const next = new Set(prev);
                  if (next.has('vehicle')) next.delete('vehicle');
                  else next.add('vehicle');
                  return next;
                })}
                className="w-full p-5 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <Car size={24} weight="bold" className="text-violet-400" />
                  <h3 className="text-xl font-bold text-white group-hover:text-violet-100 transition-colors">{t('legal.scenarioInVehicle')}</h3>
                </div>
                <motion.div
                  animate={{ rotate: expandedAmendments.has('vehicle') ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <CaretRight size={24} weight="bold" className="text-slate-400 group-hover:text-violet-400 transition-colors" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedAmendments.has('vehicle') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gradient-to-br from-violet-950 to-violet-900 p-6 border-t border-violet-800">
                  <div className="space-y-3">
                    <div className="bg-violet-950/30 p-4 rounded-xl border border-violet-800/30">
                      <p className="text-violet-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Pull Over Safely:</strong> If signaled by law enforcement, pull over to a safe location and turn off the engine.</span>
                      </p>
                    </div>
                    <div className="bg-violet-950/30 p-4 rounded-xl border border-violet-800/30">
                      <p className="text-violet-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Driver's License:</strong> Drivers must show license, registration, and proof of insurance if asked. Passengers may not be required to ID themselves (varies by state).</span>
                      </p>
                    </div>
                    <div className="bg-violet-950/30 p-4 rounded-xl border border-violet-800/30">
                      <p className="text-violet-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>No Search Without Consent:</strong> Say: "I do not consent to a search." They may still search with probable cause, but your objection is on record.</span>
                      </p>
                    </div>
                    <div className="bg-violet-950/30 p-4 rounded-xl border border-violet-800/30">
                      <p className="text-violet-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Immigration Questions:</strong> You can remain silent about immigration status during a traffic stop.</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-violet-800/50">
                    <p className="text-violet-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.officialSources')}</p>
                    <a href="https://www.uscourts.gov/about-federal-courts/educational-resources/about-educational-outreach/activity-resources/what-does-0" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 text-sm underline block mb-1">
                      {t('legal.link4thVehicleSearches')}
                    </a>
                    <a href="https://www.aclu.org/know-your-rights/stopped-by-police" target="_blank" rel="noopener noreferrer" className="text-violet-400 hover:text-violet-300 text-sm underline block">
                      {t('legal.linkAcluStoppedByPoliceDoor')}
                    </a>
                  </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* 100-Mile Border Zone */}
            <div className="group relative bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden mb-4 transition-all duration-300 hover:-translate-y-0.5">
              <button
                onClick={() => setExpandedAmendments(prev => {
                  const next = new Set(prev);
                  if (next.has('border')) next.delete('border');
                  else next.add('border');
                  return next;
                })}
                className="w-full p-5 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <ShieldWarning size={24} weight="bold" className="text-red-400" />
                  <h3 className="text-xl font-bold text-white group-hover:text-red-100 transition-colors">{t('legal.scenario100MileBorderZone')}</h3>
                </div>
                <motion.div
                  animate={{ rotate: expandedAmendments.has('border') ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <CaretRight size={24} weight="bold" className="text-slate-400 group-hover:text-red-400 transition-colors" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedAmendments.has('border') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gradient-to-br from-red-950/60 to-red-900/40 p-6 border-t border-red-800/50">
                  <div className="bg-red-950/50 p-4 rounded-xl border border-red-800/50 mb-4">
                    <p className="text-white text-sm leading-relaxed">
                      <strong>What is it?</strong> CBP claims authority to operate immigration checkpoints within 100 miles of any U.S. border (including coastlines). This area covers about 2/3 of the U.S. population.
                    </p>
                  </div>
                  <div className="space-y-3">
                    <div className="bg-red-950/30 p-4 rounded-xl border border-red-800/30">
                      <p className="text-red-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Interior Checkpoints:</strong> You may be stopped at checkpoints away from the actual border. You can remain silent about citizenship.</span>
                      </p>
                    </div>
                    <div className="bg-red-950/30 p-4 rounded-xl border border-red-800/30">
                      <p className="text-red-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>At the Actual Border:</strong> CBP has more authority at ports of entry and the immediate border. They can search belongings without a warrant.</span>
                      </p>
                    </div>
                    <div className="bg-red-950/30 p-4 rounded-xl border border-red-800/30">
                      <p className="text-red-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Your Rights Still Apply:</strong> Even in the border zone, you can refuse consent to searches beyond a brief immigration inspection.</span>
                      </p>
                    </div>
                    <div className="bg-red-950/30 p-4 rounded-xl border border-red-800/30">
                      <p className="text-red-100 text-sm leading-relaxed flex items-start gap-2">
                        <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" /> <span><strong>Electronic Devices:</strong> CBP claims authority to search phones/laptops at border crossings. Consider legal advice before travel.</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-red-800/50">
                    <p className="text-red-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.officialSources')}</p>
                    <a href="https://www.cbp.gov/border-security/along-us-borders/border-patrol-sectors" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 text-sm underline block mb-1">
                      {t('legal.linkCbpSectors')}
                    </a>
                    <a href="https://www.dhs.gov/sites/default/files/publications/privacy-pia-cbp-borderpatrolsurveillance-december2019.pdf" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 text-sm underline block mb-1">
                      {t('legal.linkDhsBorderPrivacy')}
                    </a>
                    <a href="https://www.aclu.org/know-your-rights/border-zone" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 text-sm underline block">
                      {t('legal.linkAcluBorderZone')}
                    </a>
                  </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Warrants Explained Section */}
          <div className="mt-12 pt-8 border-t border-slate-700">
            <h2 className="text-2xl font-black text-white mb-2">{t('legal.understandingWarrantsTitle')}</h2>
            <p className="text-slate-400 text-sm mb-6">{t('legal.understandingWarrantsSubtitle')}</p>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Judicial Warrant */}
              <div className="bg-gradient-to-br from-green-950/50 to-green-900/30 border border-green-800/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText size={28} weight="bold" className="text-green-400" />
                  <h3 className="text-xl font-black text-green-400">{t('legal.judicialWarrant')}</h3>
                </div>
                <div className="space-y-3">
                  <p className="text-green-100 text-sm flex items-start gap-2">
                    <Check size={14} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('legal.judicialSignedByJudge')) }} />
                  </p>
                  <p className="text-green-100 text-sm flex items-start gap-2">
                    <Check size={14} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{t('legal.judicialAuthorizesEntry')}</span>
                  </p>
                  <p className="text-green-100 text-sm flex items-start gap-2">
                    <Check size={14} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{t('legal.judicialMustName')}</span>
                  </p>
                  <p className="text-green-100 text-sm flex items-start gap-2">
                    <Check size={14} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                    <span>{t('legal.judicialDistrictCourt')}</span>
                  </p>
                </div>
                <div className="mt-4 p-3 bg-green-950/50 rounded-xl">
                  <p className="text-green-200 text-xs font-bold">{t('legal.judicialIfPresented')}</p>
                </div>
              </div>

              {/* Administrative Warrant */}
              <div className="bg-gradient-to-br from-red-950/50 to-red-900/30 border border-red-800/50 rounded-2xl p-6">
                <div className="flex items-center gap-3 mb-4">
                  <FileText size={28} weight="bold" className="text-red-400" />
                  <h3 className="text-xl font-black text-red-400">{t('legal.administrativeWarrant')}</h3>
                </div>
                <div className="space-y-3">
                  <p className="text-red-100 text-sm flex items-start gap-2">
                    <X size={14} weight="bold" className="text-red-400 flex-shrink-0 mt-0.5" />
                    <span dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(t('legal.adminSignedByIce')) }} />
                  </p>
                  <p className="text-red-100 text-sm flex items-start gap-2">
                    <X size={14} weight="bold" className="text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{t('legal.adminDoesNotAuthorize')}</span>
                  </p>
                  <p className="text-red-100 text-sm flex items-start gap-2">
                    <X size={14} weight="bold" className="text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{t('legal.adminFormNumbers')}</span>
                  </p>
                  <p className="text-red-100 text-sm flex items-start gap-2">
                    <X size={14} weight="bold" className="text-red-400 flex-shrink-0 mt-0.5" />
                    <span>{t('legal.adminDhsAtTop')}</span>
                  </p>
                </div>
                <div className="mt-4 p-3 bg-red-950/50 rounded-xl">
                  <p className="text-red-200 text-xs font-bold">{t('legal.adminIfPresented')}</p>
                </div>
              </div>
            </div>

            <div className="mt-4 bg-slate-800/50 border border-slate-700 rounded-xl p-4">
              <p className="text-slate-300 text-sm">
                <strong>{t('legal.officialReference')}</strong>{' '}
                <a href="https://www.ice.gov/sites/default/files/documents/Document/2017/adminWarrantvJudicialWarrant.pdf" target="_blank" rel="noopener noreferrer" className="text-cyan-400 hover:text-cyan-300 underline">
                  {t('legal.linkWarrantComparison')}
                </a>
              </p>
            </div>
          </div>

          {/* For Witnesses Section */}
          <div className="mt-12 pt-8 border-t border-slate-800/75">
            <LegalSectionHeader
              eyebrow={t('legal.forWitnessesEyebrow', { defaultValue: 'Witness guidance' })}
              title={t('legal.forWitnessesTitle')}
              description={t('legal.forWitnessesSubtitle')}
              support={t('legal.forWitnessesSupport', { defaultValue: 'If you are documenting an encounter, stay factual, keep distance, and preserve the recording before you share it.' })}
              accent="text-pink-400"
            />

            <div className="group relative bg-gradient-to-br from-slate-900 via-slate-900/96 to-pink-950/20 border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-pink-500/30 hover:shadow-lg hover:shadow-pink-500/5 hover:-translate-y-0.5">
              <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(236,72,153,0.08),transparent_48%)] opacity-0 transition-opacity duration-300 group-hover:opacity-100 rounded-2xl" />
              <button
                onClick={() => setExpandedAmendments(prev => {
                  const next = new Set(prev);
                  if (next.has('witness')) next.delete('witness');
                  else next.add('witness');
                  return next;
                })}
                className="relative w-full p-5 flex items-center justify-between hover:bg-slate-800/30 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-pink-500/20 bg-pink-500/10 text-pink-300 shrink-0">
                    <Eye size={20} weight="bold" />
                  </div>
                  <h3 className="text-lg font-black text-white group-hover:text-pink-100 transition-colors">{t('legal.witnessingEncounter')}</h3>
                </div>
                <motion.div
                  animate={{ rotate: expandedAmendments.has('witness') ? 90 : 0 }}
                  transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                >
                  <CaretRight size={24} weight="bold" className="text-slate-400 group-hover:text-pink-400 transition-colors" />
                </motion.div>
              </button>
              <AnimatePresence>
                {expandedAmendments.has('witness') && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    <div className="bg-gradient-to-br from-pink-950/60 to-pink-900/40 p-6 border-t border-pink-800/50">
                  <div className="space-y-3">
                    <div className="bg-pink-950/30 p-4 rounded-xl border border-pink-800/30">
                      <p className="text-pink-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>You Can Record:</strong> The First Amendment protects your right to record police and ICE in public spaces where you are legally present.</span>
                      </p>
                    </div>
                    <div className="bg-pink-950/30 p-4 rounded-xl border border-pink-800/30">
                      <p className="text-pink-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Keep Distance:</strong> Stay at least 8-10 feet away. Do not physically interfere with the encounter.</span>
                      </p>
                    </div>
                    <div className="bg-pink-950/30 p-4 rounded-xl border border-pink-800/30">
                      <p className="text-pink-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Document Details:</strong> Note badge numbers, vehicle plates, number of agents, time, and location.</span>
                      </p>
                    </div>
                    <div className="bg-pink-950/30 p-4 rounded-xl border border-pink-800/30">
                      <p className="text-pink-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>If Ordered to Stop Recording:</strong> Calmly state: "I am exercising my First Amendment right to record in public."</span>
                      </p>
                    </div>
                    <div className="bg-pink-950/30 p-4 rounded-xl border border-pink-800/30">
                      <p className="text-pink-100 text-sm leading-relaxed flex items-start gap-2">
                        <Warning size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" /> <span><strong>Do NOT Delete:</strong> If agents demand you delete footage, you do not have to comply. Deleting evidence may actually harm your legal position.</span>
                      </p>
                    </div>
                    <div className="bg-pink-950/30 p-4 rounded-xl border border-pink-800/30">
                      <p className="text-pink-100 text-sm leading-relaxed flex items-start gap-2">
                        <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Backup Immediately:</strong> Upload recordings to cloud storage as soon as safely possible.</span>
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 pt-4 border-t border-pink-800/50">
                    <p className="text-pink-300 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.officialSources')}</p>
                    <a href="https://www.justice.gov/crt/addressing-police-misconduct-laws-enforced-department-justice" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 text-sm underline block mb-1">
                      {t('legal.linkDojMisconductWitness')}
                    </a>
                    <a href="https://www.uscourts.gov/about-federal-courts/educational-resources/about-educational-outreach/activity-resources/what-does" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 text-sm underline block mb-1">
                      {t('legal.link1stAmendmentRightsWitness')}
                    </a>
                    <a href="https://www.aclu.org/know-your-rights/photographers-what-to-do-if-you-are-stopped-or-detained-for-taking-photographs" target="_blank" rel="noopener noreferrer" className="text-pink-400 hover:text-pink-300 text-sm underline block">
                      {t('legal.linkAcluPhotographers')}
                    </a>
                  </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* State-Specific Guides Section */}
          <div className="mt-14 pt-8 relative">
            <div className="pointer-events-none absolute -top-6 left-6 right-6 h-px bg-gradient-to-r from-transparent via-cyan-400/30 to-transparent" />
            <LegalSectionHeader
              eyebrow={t('legal.stateGuidesEyebrow', { defaultValue: 'By State' })}
              title={t('legal.stateGuidesTitle')}
              description={t('legal.stateGuidesSubtitle')}
              support={t('legal.stateGuidesSupport', { defaultValue: 'Recording laws vary. Use the state selector to confirm whether consent rules change when conversations happen outside public space.' })}
              accent="text-cyan-400"
            />

            {/* State Selector */}
            <div className="mb-6 relative rounded-[26px] border border-slate-800/75 bg-slate-950/72 p-5 shadow-[0_16px_34px_rgba(2,6,23,0.16)]">
              <label className="text-slate-500 text-xs font-bold uppercase tracking-[0.12em] block mb-2">
                {t('legal.selectStateLabel')}
              </label>
              <div className="relative">
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full appearance-none bg-slate-950 border border-slate-800/80 text-white rounded-[22px] px-5 py-3.5 focus-visible:ring-2 focus-visible:ring-cyan-400 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 outline-none transition-colors"
              >
                <option value="alabama">Alabama</option>
                <option value="alaska">Alaska</option>
                <option value="arizona">Arizona</option>
                <option value="arkansas">Arkansas</option>
                <option value="california">California</option>
                <option value="colorado">Colorado</option>
                <option value="connecticut">Connecticut</option>
                <option value="delaware">Delaware</option>
                <option value="florida">Florida</option>
                <option value="georgia">Georgia</option>
                <option value="hawaii">Hawaii</option>
                <option value="idaho">Idaho</option>
                <option value="illinois">Illinois</option>
                <option value="indiana">Indiana</option>
                <option value="iowa">Iowa</option>
                <option value="kansas">Kansas</option>
                <option value="kentucky">Kentucky</option>
                <option value="louisiana">Louisiana</option>
                <option value="maine">Maine</option>
                <option value="maryland">Maryland</option>
                <option value="massachusetts">Massachusetts</option>
                <option value="michigan">Michigan</option>
                <option value="minnesota">Minnesota</option>
                <option value="mississippi">Mississippi</option>
                <option value="missouri">Missouri</option>
                <option value="montana">Montana</option>
                <option value="nebraska">Nebraska</option>
                <option value="nevada">Nevada</option>
                <option value="newhampshire">New Hampshire</option>
                <option value="newjersey">New Jersey</option>
                <option value="newmexico">New Mexico</option>
                <option value="newyork">New York</option>
                <option value="northcarolina">North Carolina</option>
                <option value="northdakota">North Dakota</option>
                <option value="ohio">Ohio</option>
                <option value="oklahoma">Oklahoma</option>
                <option value="oregon">Oregon</option>
                <option value="pennsylvania">Pennsylvania</option>
                <option value="rhodeisland">Rhode Island</option>
                <option value="southcarolina">South Carolina</option>
                <option value="southdakota">South Dakota</option>
                <option value="tennessee">Tennessee</option>
                <option value="texas">Texas</option>
                <option value="utah">Utah</option>
                <option value="vermont">Vermont</option>
                <option value="virginia">Virginia</option>
                <option value="washington">Washington</option>
                <option value="westvirginia">West Virginia</option>
                <option value="wisconsin">Wisconsin</option>
                <option value="wyoming">Wyoming</option>
              </select>
              <CaretRight size={16} weight="bold" className="pointer-events-none absolute end-4 top-1/2 -translate-y-1/2 rotate-90 text-cyan-400" />
              </div>
            </div>

            {/* State Content Card */}
            {stateGuides[selectedState] && (
              <div className="bg-gradient-to-br from-slate-900 via-slate-900/96 to-cyan-950/20 border border-slate-700/50 rounded-[28px] overflow-hidden shadow-[0_16px_34px_rgba(2,6,23,0.16)]">
                {/* State Header */}
                <div className="p-6 flex justify-between items-start">
                  <h3 className="text-2xl font-black tracking-tight text-white">{stateGuides[selectedState].name}</h3>
                  <div className="text-end">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.relevantStatutes')}</p>
                    {stateGuides[selectedState].statutes.map((statute, idx) => (
                      <p key={idx} className="text-slate-300 text-sm">{statute}</p>
                    ))}
                  </div>
                </div>

                {/* Consent Badge */}
                <div className="px-6 pb-4">
                  <span className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-black uppercase tracking-[0.12em] ${
                    stateGuides[selectedState].consentType === 'ONE-PARTY CONSENT'
                      ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-300'
                      : 'border-amber-500/30 bg-amber-500/10 text-amber-300'
                  }`}>
                    <span className={`h-2 w-2 rounded-full ${
                      stateGuides[selectedState].consentType === 'ONE-PARTY CONSENT' ? 'bg-emerald-400' : 'bg-amber-400'
                    }`} />
                    {stateGuides[selectedState].consentType}
                  </span>
                </div>

                {/* Public Recording Rights */}
                <div className="px-6 pb-6">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">{t('legal.publicRecordingRightsLabel')}</p>
                  <div className="space-y-2">
                    {stateGuides[selectedState].publicRecordingRights.map((right, idx) => (
                      <p key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                        <Check size={14} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                        <span>{right}</span>
                      </p>
                    ))}
                  </div>
                </div>

                {/* Conversation Rules */}
                <div className="px-6 pb-6">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">{t('legal.conversationRulesLabel')}</p>
                  <div className="space-y-2">
                    {stateGuides[selectedState].conversationRules.map((rule, idx) => (
                      <p key={idx} className="text-slate-300 text-sm flex items-start gap-2">
                        {rule.allowed ? (
                          <Check size={14} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" />
                        ) : (
                          <X size={14} weight="bold" className="text-red-400 flex-shrink-0 mt-0.5" />
                        )}
                        <span>{rule.text}</span>
                      </p>
                    ))}
                  </div>
                </div>

                {/* Critical Awareness Box */}
                <div className="mx-6 mb-6 bg-amber-950/30 border border-amber-900/50 rounded-xl p-5">
                  <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">{t('legal.criticalAwarenessLabel')}</p>
                  <p className="text-white text-sm leading-relaxed italic">
                    "{stateGuides[selectedState].criticalAwareness}"
                  </p>
                </div>

                {/* Official Resources */}
                {stateGuides[selectedState].links && (
                  <div className="px-6 pb-6">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">{t('legal.officialResourcesLabel')}</p>
                    <div className="space-y-1">
                      {stateGuides[selectedState].links.map((link, idx) => (
                        <a
                          key={idx}
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-cyan-400 hover:text-cyan-300 text-sm underline block"
                        >
                          {link.title} →
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Case Law Search */}
            <div className="mt-6">
              <CaseLawSearch />
            </div>
          </div>
        </div>
      )}
      {view === 'status' && (
        <div ref={statusSectionRef} className="mt-8 space-y-6 scenario-section-rise">
          <LegalSectionHeader
            eyebrow={t('legal.statusEyebrow', { defaultValue: 'Guidance by situation' })}
            title={t('legal.statusTitle', { defaultValue: 'Choose the closest legal situation first' })}
            description={t('legal.statusSubtitle', { defaultValue: 'Start with the card that most closely matches your paperwork, exposure, or process.' })}
            accent="text-cyan-400"
            delay={0.04}
          />

          <div className="scenario-section-item xl:hidden">
            <div className="relative overflow-hidden rounded-2xl border border-slate-800/62 bg-slate-950/48 p-4 shadow-[0_14px_28px_rgba(2,6,23,0.14)]">
              <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200/60">
                {t('legal.statusPanelEyebrowCompact', { defaultValue: 'Use this section' })}
              </p>
              <h3 className="mt-1.5 text-[1.02rem] font-black leading-tight tracking-tight text-white">
                {t('legal.statusPanelCompactTitle', { defaultValue: 'Pick the nearest fit first.' })}
              </h3>
              <div className="mt-2.5 space-y-2">
                {[
                  t('legal.statusPanelCompactPoint1', { defaultValue: 'Start with the card that matches your status or paperwork.' }),
                  t('legal.statusPanelCompactPoint2', { defaultValue: 'If a deadline appears or things change, move to legal help next.' }),
                ].map((point) => (
                  <p key={point} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-slate-300">
                    <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-cyan-300/65 shrink-0" />
                    <span>{point}</span>
                  </p>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-6 xl:grid-cols-[minmax(0,1.16fr)_296px] xl:items-stretch">
            <div className="space-y-4">
              <div className="scenario-section-item grid grid-cols-1 gap-3 md:grid-cols-3">
                {Object.values(STATUS_PERSONAS).map(persona => {
                  const isSelected = selectedStatus === persona.id;
                  const c = STATUS_STYLE_MAP[persona.id];
                  const IconComponent = persona.id === 'undocumented' ? User : persona.id === 'greenCard' ? CreditCard : Lifebuoy;
                  return (
                    <button
                      type="button"
                      key={persona.id}
                      aria-pressed={isSelected}
                      onClick={() => {
                        setSelectedStatus(persona.id);
                        setExpandedStatus(new Set());
                      }}
                      className={`group relative text-start p-4 rounded-2xl border transition-all duration-300 active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-950 ${
                        isSelected
                          ? `bg-gradient-to-br ${c.selectedCard} border-white/18 ring-1 ring-white/6 scale-[1.02] shadow-[0_18px_42px_rgba(15,23,42,0.24)]`
                          : `bg-gradient-to-br ${c.card} border-slate-800/80 shadow-[0_12px_28px_rgba(2,6,23,0.14)] hover:border-slate-700/90 hover:-translate-y-0.5`
                      }`}
                    >
                      {!isSelected && <div className={`absolute inset-0 bg-gradient-to-br from-transparent to-transparent ${c.glow} rounded-2xl transition-all duration-300 pointer-events-none`} />}
                      <div className="relative flex items-center gap-3 mb-2">
                        <div className={`p-2 rounded-xl border bg-slate-950/70 ${isSelected ? c.iconWrap : `${c.iconWrap} ${c.iconHover}`} transition-all`}>
                          <IconComponent size={20} weight="bold" className={isSelected ? c.accent : c.accent} />
                        </div>
                        <div>
                          <p className={`text-[10px] font-black uppercase tracking-[0.14em] ${isSelected ? c.accent : 'text-slate-500'}`}>
                            {t(`legal.statusCardEyebrow.${persona.id}`, {
                              defaultValue:
                                persona.id === 'undocumented'
                                  ? 'Highest exposure'
                                  : persona.id === 'greenCard'
                                    ? 'Permanent resident'
                                    : 'Protection process',
                            })}
                          </p>
                          <h3 className={`mt-1 font-black text-sm uppercase tracking-wider ${isSelected ? c.title : 'text-slate-200'}`}>
                            {persona.label}
                          </h3>
                        </div>
                      </div>
                      <p className={`relative text-xs leading-relaxed ${isSelected ? c.body : 'text-slate-400'}`}>
                        {persona.description}
                      </p>
                      <p className={`relative mt-3 text-[11px] font-bold uppercase tracking-[0.12em] ${isSelected ? c.accent : 'text-slate-500'}`}>
                        {isSelected
                          ? t('legal.statusSelectedLabel', { defaultValue: 'Guidance shown below' })
                          : t('legal.statusOpenLabel', { defaultValue: 'Open this situation' })}
                      </p>
                    </button>
                  );
                })}
              </div>

              <div
                className="scenario-section-item group relative cursor-pointer overflow-hidden rounded-[26px] border border-red-900/60 bg-gradient-to-br from-slate-950 via-slate-950/96 to-red-950/24 transition-all duration-300 hover:-translate-y-0.5 hover:border-red-500/28 hover:shadow-[0_18px_40px_rgba(76,5,25,0.18)]"
                onClick={() => setNeverSignExpanded((prev) => !prev)}
              >
                <div className="absolute inset-0 rounded-[26px] bg-gradient-to-br from-transparent to-transparent transition-all duration-300 pointer-events-none group-hover:from-red-500/5 group-hover:to-rose-500/4" />
                <div className="relative p-5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-red-500/16 bg-red-500/10 text-red-300">
                      <ProhibitInset size={24} weight="bold" />
                    </div>
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.14em] text-red-300/80">
                        {t('legal.neverSignEyebrow', { defaultValue: 'Before you do anything else' })}
                      </p>
                      <h3 className="mt-1 text-base font-black uppercase tracking-[0.08em] text-red-100">{NEVER_SIGN_WARNING.title}</h3>
                      <p className="mt-1 text-xs leading-relaxed text-red-100/68">{NEVER_SIGN_WARNING.summary}</p>
                    </div>
                  </div>
                  <motion.div animate={{ rotate: neverSignExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                    <CaretRight size={20} weight="bold" className="text-red-300" />
                  </motion.div>
                </div>
                <AnimatePresence>
                  {neverSignExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <div className="px-5 pb-5 space-y-3 border-t border-red-900/45 pt-4">
                        {NEVER_SIGN_WARNING.forms.map((form, i) => (
                          <div key={i} className="flex items-start gap-2.5">
                            <X size={16} weight="bold" className="text-red-400 shrink-0 mt-0.5" />
                            <div>
                              <p className="text-red-100 text-sm font-bold">{form.name}</p>
                              <p className="text-red-100/60 text-xs leading-relaxed mt-0.5">{form.danger}</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="scenario-section-item">
                <Disclaimer section="legal" />
              </div>
            </div>

            <div className="scenario-section-item hidden xl:block">
              <div className="relative flex h-full flex-col justify-between overflow-hidden rounded-2xl border border-slate-800/62 bg-slate-950/48 p-3.5 shadow-[0_14px_28px_rgba(2,6,23,0.14)]">
                <div>
                  <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200/60">
                    {t('legal.statusPanelEyebrowCompact', { defaultValue: 'Use this section' })}
                  </p>
                  <h3 className="mt-1.5 text-[1.02rem] font-black leading-tight tracking-tight text-white">
                    {t('legal.statusPanelCompactTitle', { defaultValue: 'Pick the nearest fit first.' })}
                  </h3>
                  <div className="mt-2.5 space-y-2">
                    {[
                      t('legal.statusPanelCompactPoint1', { defaultValue: 'Start with the card that matches your status or paperwork.' }),
                      t('legal.statusPanelCompactPoint2', { defaultValue: 'If a deadline appears or things change, move to legal help next.' }),
                    ].map((point) => (
                      <p key={point} className="flex items-start gap-2 text-[12.5px] leading-relaxed text-slate-300">
                        <span className="mt-1.5 h-1.5 w-1.5 rounded-full bg-cyan-300/65 shrink-0" />
                        <span>{point}</span>
                      </p>
                    ))}
                  </div>
                </div>
                <div className="mt-3 overflow-hidden rounded-[18px] border border-slate-800/48 bg-slate-950/38">
                  <div className="px-3.5 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-rose-300/76">
                      {t('legal.statusPanelWatch', { defaultValue: 'Watch for' })}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-slate-300">
                      {t('legal.statusPanelCompactWatchCopy', { defaultValue: 'Any request to sign, admit facts, or waive review.' })}
                    </p>
                  </div>
                  <div className="border-t border-slate-800/46 px-3.5 py-2.5">
                    <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-300/76">
                      {t('legal.statusPanelBestMove', { defaultValue: 'Best next move' })}
                    </p>
                    <p className="mt-1 text-[12.5px] leading-relaxed text-slate-300">
                      {t('legal.statusPanelCompactBestMoveCopy', { defaultValue: 'Keep every notice and escalate quickly.' })}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* SELECTED PERSONA CONTENT */}
          <AnimatePresence mode="wait">
            {selectedStatus && (
              <motion.div
                key={selectedStatus}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25 }}
                className="space-y-3"
              >
                {(selectedStatus === 'undocumented' ? UNDOCUMENTED_SECTIONS :
                  selectedStatus === 'greenCard' ? GREEN_CARD_SECTIONS :
                  ASYLUM_SECTIONS
                ).map(section => {
                  const persona = STATUS_PERSONAS[selectedStatus];
                  const baseStyle = STATUS_STYLE_MAP[selectedStatus];
                  const c = section.urgency === 'critical'
                    ? {
                        ...baseStyle,
                        contentCard: 'from-slate-950 via-slate-950/96 to-red-950/22',
                        contentBorder: 'border-red-900/50',
                        contentGlow: 'group-hover:from-red-500/5 group-hover:to-rose-500/4',
                        contentAccent: 'text-red-300',
                        title: 'text-red-100',
                        body: 'text-red-100/72',
                      }
                    : baseStyle;
                  const isExpanded = expandedStatus.has(section.id);

                  return (
                    <div
                      key={section.id}
                      className={`group relative rounded-[24px] overflow-hidden border bg-gradient-to-br ${c.contentCard} ${c.contentBorder} transition-all duration-300 ${c.hoverBorder} ${c.hoverShadow} hover:-translate-y-0.5`}
                    >
                      <div className={`absolute inset-0 bg-gradient-to-br from-transparent to-transparent ${c.contentGlow} rounded-[24px] transition-all duration-300 pointer-events-none`} />
                      <button
                        onClick={() => setExpandedStatus(prev => {
                          const next = new Set(prev);
                          if (next.has(section.id)) next.delete(section.id);
                          else next.add(section.id);
                          return next;
                        })}
                        className="relative w-full p-4 flex items-center justify-between text-start"
                      >
                        <div className="flex items-center gap-3">
                          {section.urgency === 'critical' && <ProhibitInset size={20} weight="bold" className="text-red-400 shrink-0" />}
                          <div>
                            <p className={`text-[10px] font-black uppercase tracking-[0.12em] ${section.urgency === 'critical' ? 'text-red-300/78' : 'text-slate-500'}`}>
                              {section.urgency === 'critical'
                                ? t('legal.criticalBadge', { defaultValue: 'Critical' })
                                : persona.shortLabel}
                            </p>
                            <h3 className={`mt-1 font-black text-sm uppercase tracking-wider ${section.urgency === 'critical' ? c.title : 'text-slate-100'}`}>{section.title}</h3>
                          </div>
                          {section.urgency === 'critical' && (
                            <span className="text-[9px] font-black uppercase tracking-widest bg-red-900/60 text-red-300 px-2 py-0.5 rounded-full border border-red-700/50">{t('legal.criticalBadge')}</span>
                          )}
                        </div>
                        <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                          <CaretRight size={18} weight="bold" className={section.urgency === 'critical' ? 'text-red-300' : c.contentAccent} />
                        </motion.div>
                      </button>
                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3 }}
                            className="relative overflow-hidden"
                          >
                            <div className="px-4 pb-4 space-y-4">
                              {section.items.map((item, i) => (
                                <div key={i} className="flex items-start gap-2.5">
                                  <Check size={16} weight="bold" className={`${section.urgency === 'critical' ? 'text-red-300' : c.contentAccent} shrink-0 mt-0.5`} />
                                  <div>
                                    <p className={`${section.urgency === 'critical' ? 'text-red-100' : 'text-slate-100'} text-sm font-bold`}>{item.title}</p>
                                    <p className={`${section.urgency === 'critical' ? 'text-red-100/66' : 'text-slate-400'} text-xs leading-relaxed mt-1`}>{item.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })}
              </motion.div>
            )}
          </AnimatePresence>

          {/* EVERYONE SHOULD KNOW — always visible */}
          <div className="scenario-section-item space-y-2">
            <div className="px-1 pt-4">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-500">{t('legal.sharedStatusEyebrow', { defaultValue: 'Always relevant' })}</p>
              <h2 className="mt-1 text-sm font-black uppercase tracking-[0.12em] text-slate-300">{t('legal.everyoneShouldKnow')}</h2>
            </div>
            {SHARED_SECTIONS.map(section => {
              const isExpanded = expandedStatus.has(section.id);
              return (
                <div
                  key={section.id}
                  className="group relative bg-gradient-to-br from-slate-950 via-slate-950/96 to-slate-900/80 border border-slate-800/75 rounded-[24px] overflow-hidden transition-all duration-300 hover:border-cyan-500/24 hover:shadow-[0_18px_40px_rgba(8,47,73,0.16)] hover:-translate-y-0.5"
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-transparent to-transparent group-hover:from-cyan-500/5 group-hover:to-blue-500/4 rounded-[24px] transition-all duration-300 pointer-events-none" />
                  <button
                    onClick={() => setExpandedStatus(prev => {
                      const next = new Set(prev);
                      if (next.has(section.id)) next.delete(section.id);
                      else next.add(section.id);
                      return next;
                    })}
                    className="w-full p-4 flex items-center justify-between text-start"
                  >
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-[0.12em] text-slate-500">
                        {t('legal.sharedSectionLabel', { defaultValue: 'Every status' })}
                      </p>
                      <h3 className="mt-1 font-black text-sm uppercase tracking-wider text-slate-200">{section.title}</h3>
                    </div>
                    <motion.div animate={{ rotate: isExpanded ? 90 : 0 }} transition={{ duration: 0.2 }}>
                      <CaretRight size={18} weight="bold" className="text-slate-500" />
                    </motion.div>
                  </button>
                  <AnimatePresence>
                    {isExpanded && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        className="overflow-hidden"
                      >
                        <div className="px-4 pb-4 space-y-4">
                          {section.items.map((item, i) => (
                            <div key={i} className="flex items-start gap-2.5">
                              <Check size={16} weight="bold" className="text-blue-400 shrink-0 mt-0.5" />
                              <div>
                                <p className="text-slate-200 text-sm font-bold">{item.title}</p>
                                <p className="text-slate-400 text-xs leading-relaxed mt-1">{item.description}</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

        </div>
      )}
      {view === 'directory' && (
        <div ref={directorySectionRef} className="mt-8 scenario-fade-in" style={aniDelay(0.06)}>
          <div className="rounded-[32px] border border-slate-800/80 bg-gradient-to-br from-slate-950/94 via-slate-950/96 to-slate-900/82 p-5 shadow-[0_18px_44px_rgba(2,6,23,0.18)] sm:p-6">
            <LegalDirectory />
          </div>
        </div>
      )}

      {/* Shared Footer — Quote, FAQ, Disclaimer, Install */}
      <div className="mt-14 space-y-6">
        {/* Rotating Quote */}
        <div className="relative overflow-hidden rounded-[28px] border border-slate-800/70 bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.06),transparent_36%),linear-gradient(180deg,rgba(15,23,42,0.8),rgba(2,6,23,0.92))] px-6 py-8 text-center shadow-[0_16px_34px_rgba(2,6,23,0.16)]">
          <div className="pointer-events-none absolute inset-x-8 top-0 h-px bg-gradient-to-r from-transparent via-cyan-300/25 to-transparent" />
          <div className="pointer-events-none absolute -bottom-14 right-0 h-32 w-32 rounded-full bg-cyan-500/8 blur-3xl" />
          <p className="text-[10px] font-black uppercase tracking-[0.12em] text-cyan-200/60">
            {t('legal.footerQuoteEyebrow', { defaultValue: 'Perspective' })}
          </p>
          <p className="mt-4 text-slate-400/72 italic text-[1.02rem] font-medium leading-[1.58] mb-3 max-w-2xl mx-auto" style={{ fontFamily: '"Palatino Linotype", "Book Antiqua", "Iowan Old Style", ui-serif, Georgia, serif' }}>
            “{legalQuote.quote}”
          </p>
          <p className="text-slate-500 text-[10px] font-bold uppercase tracking-[0.12em]">
            {legalQuote.author}
          </p>
        </div>

        <FaqCta onNavigate={onNavigate} />

        <Disclaimer>
          {t('legal.disclaimerLine1')}
          <br />{t('legal.disclaimerLine2')}
          <br />{t('legal.disclaimerLine3')}
          <br />{t('legal.disclaimerLine4')}
        </Disclaimer>

        {/* Install CTA */}
        <div className="text-center pb-4">
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
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-blue-500/50 bg-gradient-to-r from-blue-600 to-blue-700 px-6 py-3.5 text-sm font-black uppercase tracking-widest text-white shadow-[0_12px_32px_rgba(30,64,175,0.3)] transition-all hover:from-blue-500 hover:to-blue-600 active:scale-[0.98]"
          >
            <DownloadSimple size={18} weight="bold" />
            {t('legal.installButton')}
          </button>
          <p className="text-slate-500 text-xs mt-2 uppercase tracking-[0.12em]">
            {t('legal.installRecommended')}
          </p>
        </div>
      </div>

      <InstallHelp isOpen={showInstallHelp} onClose={() => setShowInstallHelp(false)} />
    </div>
  );
}

export default Legal;
