import React, { useState } from 'react';
import { CaretRight, ChatCircle, Scroll, Warning, Lightbulb, Check, X, DownloadSimple } from '@phosphor-icons/react';
import { Scale } from 'lucide-react';

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

function Legal() {
  const [view, setView] = useState('chat');
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [expandedAmendments, setExpandedAmendments] = useState(new Set());
  const [selectedState, setSelectedState] = useState('california');

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage = { role: 'user', content: input };
    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      // Use Cloudflare Worker proxy to keep API key secure
      // Set REACT_APP_GEMINI_PROXY_URL in .env to your worker URL
      const proxyUrl = process.env.REACT_APP_GEMINI_PROXY_URL || '/api/gemini';
      const response = await fetch(proxyUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `You are a constitutional rights assistant helping people understand their rights during encounters with ICE and law enforcement. Provide accurate, helpful information based on US constitutional law. Be concise and actionable.

User question: ${input}`
        })
      });

      if (!response.ok) {
        throw new Error(`API error: ${response.status}`);
      }

      const data = await response.json();
      const aiResponse = data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response received';

      setMessages(prev => [...prev, { role: 'assistant', content: aiResponse }]);
    } catch (error) {
      console.error('Error calling Gemini API:', error);
      setMessages(prev => [
        ...prev,
        {
          role: 'assistant',
          content: 'Sorry, I encountered an error. Please try again.'
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="text-center mb-8">
        <div className="mb-4 flex justify-center">
          <Scale size={64} className="text-blue-400" />
        </div>
        <h1 className="text-3xl font-black text-white tracking-wide mb-2">Legal Assistant</h1>
        <p className="text-slate-400">Ask questions about your constitutional rights</p>
      </div>

      <div className="flex gap-4 mb-8 bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm p-2 rounded-2xl border border-slate-700/50">
        <button
          onClick={() => setView('chat')}
          className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-2 ${
            view === 'chat'
              ? 'bg-blue-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <ChatCircle size={16} weight="bold" /> AI Assistant
        </button>
        <button
          onClick={() => setView('constitution')}
          className={`flex-1 py-4 rounded-xl font-black uppercase tracking-widest text-sm transition-all flex items-center justify-center gap-1 ${
            view === 'constitution'
              ? 'bg-purple-600 text-white shadow-lg'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Scroll size={25} weight="bold" className="ml-3 -mr-1" /> Constitutional Foundation
        </button>
      </div>

      {view === 'chat' && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-amber-950/30 to-amber-900/20 backdrop-blur-sm border border-amber-900/50 rounded-2xl p-6">
            <div className="flex items-start gap-4">
              <Warning size={28} weight="bold" className="text-amber-500 flex-shrink-0 mt-1" />
              <div>
                <h3 className="text-amber-400 font-black text-lg uppercase mb-2">Disclaimer</h3>
                <p className="text-slate-300 text-sm leading-relaxed">
                  This AI provides general information about constitutional rights — not legal advice. 
                  For specific legal help, consult a licensed attorney.
                </p>
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm rounded-2xl border border-slate-700/50 min-h-[400px] max-h-[500px] overflow-y-auto p-6 space-y-4">
            {messages.length === 0 && (
              <div className="text-center py-12">
                <div className="mb-4 opacity-30 flex justify-center">
                  <ChatCircle size={64} weight="bold" className="text-slate-400" />
                </div>
                <p className="text-slate-500 font-bold">Ask a question about your constitutional rights</p>
                <div className="mt-8 grid gap-3">
                  <button
                    onClick={() => setInput("What is the difference between a judicial and administrative warrant?")}
                    className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl text-left text-sm text-slate-300 transition-all flex items-start gap-2"
                  >
                    <Lightbulb size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" /> What is the difference between a judicial and administrative warrant?
                  </button>
                  <button
                    onClick={() => setInput("Do I have to answer questions from ICE?")}
                    className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl text-left text-sm text-slate-300 transition-all flex items-start gap-2"
                  >
                    <Lightbulb size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" /> Do I have to answer questions from ICE?
                  </button>
                  <button
                    onClick={() => setInput("Can I record police and ICE in public?")}
                    className="bg-slate-800 hover:bg-slate-700 p-4 rounded-xl text-left text-sm text-slate-300 transition-all flex items-start gap-2"
                  >
                    <Lightbulb size={16} weight="bold" className="text-amber-400 flex-shrink-0 mt-0.5" /> Can I record police and ICE in public?
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
                      ? 'bg-blue-600 text-white'
                      : 'bg-slate-800 text-slate-100'
                  }`}
                >
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-800 text-slate-100 p-4 rounded-2xl">
                  <p className="text-sm">Thinking...</p>
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-4">
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
              placeholder="Ask about your rights..."
              className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-6 py-4 text-white focus:border-blue-600 outline-none transition-all"
              disabled={loading}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-800 disabled:text-slate-600 text-white px-8 py-4 rounded-2xl font-black uppercase tracking-wide transition-all disabled:cursor-not-allowed"
            >
              Send
            </button>
          </div>
        </div>
      )}

      {view === 'constitution' && (
        <div className="space-y-4">
          <h2 className="text-2xl font-black text-white mb-2">Constitutional Rights</h2>
          <p className="text-slate-400 text-sm mb-6">Click an amendment to explore detailed protections and court cases.</p>

          {/* 1st Amendment - Collapsible */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpandedAmendments(prev => {
                const next = new Set(prev);
                if (next.has('1st')) next.delete('1st');
                else next.add('1st');
                return next;
              })}
              className="w-full p-5 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold text-white">1st Amendment</h3>
                <p className="text-slate-400 text-sm">Right to Record</p>
              </div>
              <CaretRight
                size={24}
                weight="bold"
                className={`text-slate-400 transition-transform duration-200 ${expandedAmendments.has('1st') ? 'rotate-90' : ''}`}
              />
            </button>
            {expandedAmendments.has('1st') && (
              <div className="bg-gradient-to-br from-purple-950 to-purple-900 p-6 border-t border-purple-800">
                <div className="space-y-3">
                  <h4 className="text-white font-black mb-3">What This Means for You:</h4>
                  <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                    <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>You Can Record:</strong> You have the right to record police and ICE in public spaces.</span>
                    </p>
                  </div>
                  <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                    <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Stay at Distance:</strong> Record from a safe distance (8-10 feet). Do not interfere.</span>
                    </p>
                  </div>
                  <div className="bg-purple-950/30 p-4 rounded-xl border border-purple-800/30">
                    <p className="text-purple-100 text-sm leading-relaxed flex items-start gap-2">
                      <Check size={16} weight="bold" className="text-green-400 flex-shrink-0 mt-0.5" /> <span><strong>Document:</strong> Record badge numbers, vehicle details, time, and location.</span>
                    </p>
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-purple-800/50">
                  <p className="text-purple-300 text-xs font-bold uppercase tracking-wider mb-2">Learn More</p>
                  <a href="https://www.uscourts.gov/about-federal-courts/educational-resources/about-educational-outreach/activity-resources/what-does" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-sm underline block mb-1">
                    U.S. Courts: First Amendment Rights →
                  </a>
                  <a href="https://www.justice.gov/crt/freedom-information-act-0" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300 text-sm underline block">
                    DOJ: Civil Rights & Recording →
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* 4th Amendment - Collapsible */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpandedAmendments(prev => {
                const next = new Set(prev);
                if (next.has('4th')) next.delete('4th');
                else next.add('4th');
                return next;
              })}
              className="w-full p-5 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold text-white">4th Amendment</h3>
                <p className="text-slate-400 text-sm">Unreasonable Search & Seizure</p>
              </div>
              <CaretRight
                size={24}
                weight="bold"
                className={`text-slate-400 transition-transform duration-200 ${expandedAmendments.has('4th') ? 'rotate-90' : ''}`}
              />
            </button>
            {expandedAmendments.has('4th') && (
              <div className="bg-gradient-to-br from-red-950 to-red-900 p-6 border-t border-red-800">
                <div className="bg-red-950/50 p-4 rounded-xl border border-red-800/50 mb-4">
                  <p className="text-white italic text-sm leading-relaxed">
                    "The right of the people to be secure in their persons, houses, papers, and effects,
                    against unreasonable searches and seizures, shall not be violated..."
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-white font-black mb-3">What This Means for You:</h4>
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
                  <p className="text-red-300 text-xs font-bold uppercase tracking-wider mb-2">Learn More</p>
                  <a href="https://constitution.congress.gov/constitution/amendment-4/" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 text-sm underline block mb-1">
                    Constitution.gov: Fourth Amendment Text →
                  </a>
                  <a href="https://www.uscourts.gov/about-federal-courts/educational-resources/about-educational-outreach/activity-resources/what-does-0" target="_blank" rel="noopener noreferrer" className="text-red-400 hover:text-red-300 text-sm underline block">
                    U.S. Courts: Search & Seizure Explained →
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* 5th Amendment - Collapsible */}
          <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
            <button
              onClick={() => setExpandedAmendments(prev => {
                const next = new Set(prev);
                if (next.has('5th')) next.delete('5th');
                else next.add('5th');
                return next;
              })}
              className="w-full p-5 flex items-center justify-between hover:bg-slate-800/70 transition-colors"
            >
              <div className="flex items-center gap-4">
                <h3 className="text-xl font-bold text-white">5th Amendment</h3>
                <p className="text-slate-400 text-sm">Right to Remain Silent</p>
              </div>
              <CaretRight
                size={24}
                weight="bold"
                className={`text-slate-400 transition-transform duration-200 ${expandedAmendments.has('5th') ? 'rotate-90' : ''}`}
              />
            </button>
            {expandedAmendments.has('5th') && (
              <div className="bg-gradient-to-br from-blue-950 to-blue-900 p-6 border-t border-blue-800">
                <div className="bg-blue-950/50 p-4 rounded-xl border border-blue-800/50 mb-4">
                  <p className="text-white italic text-sm leading-relaxed">
                    "No person... shall be compelled in any criminal case to be a witness against himself..."
                  </p>
                </div>
                <div className="space-y-3">
                  <h4 className="text-white font-black mb-3">What This Means for You:</h4>
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
                  <p className="text-blue-300 text-xs font-bold uppercase tracking-wider mb-2">Learn More</p>
                  <a href="https://constitution.congress.gov/constitution/amendment-5/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline block mb-1">
                    Constitution.gov: Fifth Amendment Text →
                  </a>
                  <a href="https://www.uscourts.gov/about-federal-courts/educational-resources/about-educational-outreach/activity-resources/what-does-1" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:text-blue-300 text-sm underline block">
                    U.S. Courts: Right to Remain Silent →
                  </a>
                </div>
              </div>
            )}
          </div>

          {/* State-Specific Guides Section */}
          <div className="mt-12 pt-8 border-t border-slate-700">
            <h2 className="text-2xl font-black text-white mb-2">State-Specific Guides</h2>
            <p className="text-slate-400 text-sm mb-6">Select your state to view recording and consent laws.</p>

            {/* State Selector */}
            <div className="mb-6">
              <label className="text-slate-500 text-xs font-bold uppercase tracking-wider block mb-2">
                SELECT STATE
              </label>
              <select
                value={selectedState}
                onChange={(e) => setSelectedState(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-xl px-4 py-3 focus:border-blue-500 outline-none transition-colors"
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
            </div>

            {/* State Content Card */}
            {stateGuides[selectedState] && (
              <div className="bg-gradient-to-br from-slate-800/80 to-slate-900/80 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden">
                {/* State Header */}
                <div className="p-6 flex justify-between items-start">
                  <h3 className="text-3xl font-black text-white">{stateGuides[selectedState].name}</h3>
                  <div className="text-right">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-2">RELEVANT STATUTES</p>
                    {stateGuides[selectedState].statutes.map((statute, idx) => (
                      <p key={idx} className="text-slate-300 text-sm">{statute}</p>
                    ))}
                  </div>
                </div>

                {/* Consent Badge */}
                <div className="px-6 pb-4">
                  <span className="inline-block bg-amber-600 text-white text-xs font-bold uppercase tracking-wider px-4 py-2 rounded-full">
                    {stateGuides[selectedState].consentType}
                  </span>
                </div>

                {/* Public Recording Rights */}
                <div className="px-6 pb-6">
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">PUBLIC RECORDING RIGHTS</p>
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
                  <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">CONVERSATION RULES</p>
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
                  <p className="text-amber-400 text-xs font-bold uppercase tracking-wider mb-2">CRITICAL AWARENESS</p>
                  <p className="text-white text-sm leading-relaxed italic">
                    "{stateGuides[selectedState].criticalAwareness}"
                  </p>
                </div>

                {/* Official Resources */}
                {stateGuides[selectedState].links && (
                  <div className="px-6 pb-6">
                    <p className="text-slate-400 text-xs font-bold uppercase tracking-wider mb-3">OFFICIAL RESOURCES</p>
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

            {/* Nietzsche Quote */}
            <div className="text-center mt-10 mb-8">
              <p className="text-slate-400 italic text-sm mb-2">
                "He who has a why to live can bear almost any how."
              </p>
              <p className="text-slate-500 text-xs">— FRIEDRICH NIETZSCHE</p>
            </div>

            {/* Disclaimer */}
            <div className="text-center mb-6">
              <div className="flex items-center justify-center gap-2 mb-2">
                <Warning size={16} weight="bold" className="text-amber-500" />
                <h3 className="text-amber-400 font-medium text-xs tracking-wider">DISCLAIMER</h3>
              </div>
              <p className="text-slate-500 text-xs mb-1">
                This app shares general info on your rights — not legal advice.
              </p>
              <p className="text-slate-500 text-xs mb-1">
                I'm not a lawyer, and accuracy isn't guaranteed.
              </p>
              <p className="text-slate-500 text-xs mb-1">
                For legal help, talk to a licensed attorney.
              </p>
              <p className="text-slate-500 text-xs">
                Use this info at your own discretion.
              </p>
            </div>

            {/* Install CTA */}
            <div className="text-center">
              <button className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-500 hover:to-blue-600 text-white font-bold py-3 px-6 rounded-xl transition-all shadow-lg shadow-blue-900/30 hover:shadow-blue-900/50 flex items-center justify-center gap-2 mx-auto">
                <DownloadSimple size={18} weight="bold" />
                INSTALL BROWSERLESS APP
              </button>
              <p className="text-slate-500 text-xs mt-2 uppercase tracking-wider">
                Recommended for offline & secure use
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Legal;