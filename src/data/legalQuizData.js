export const LEGAL_QUIZ_VERSION = 3;
export const LEGAL_QUIZ_MIXED_TOTAL = 24;

export const legalQuizDecks = {
  constitutional: 'constitutional',
  scenarios: 'scenarios',
  unsafeResponses: 'unsafe-responses',
  phraseRecall: 'phrase-recall',
};

export const legalQuizQuestions = [
  {
    id: 'constitution-1st-recording',
    type: 'multipleChoice',
    deck: legalQuizDecks.constitutional,
    category: '1st-amendment',
    difficulty: 'easy',
    prompt: 'Which amendment most directly protects your right to record ICE or police in public where you are legally present?',
    choices: [
      { id: 'a', text: '1st Amendment' },
      { id: 'b', text: '4th Amendment' },
      { id: 'c', text: '5th Amendment' },
      { id: 'd', text: '14th Amendment' },
    ],
    correctChoiceId: 'a',
    explanation:
      'Recording police and ICE in public spaces is tied most directly to 1st Amendment protections for speech, press, and documenting public officials.',
    reinforcement:
      'If you are in a public place and not interfering, you can document what officers do.',
    sourceRefs: ['legal.amendment1st', 'legal.recordingYouCanRecord'],
    tags: ['rights', 'recording', '1st-amendment'],
  },
  {
    id: 'constitution-1st-assembly',
    type: 'multipleChoice',
    deck: legalQuizDecks.constitutional,
    category: '1st-amendment',
    difficulty: 'easy',
    prompt: 'Peacefully gathering in a public space to protest is most directly protected by which amendment?',
    choices: [
      { id: 'a', text: '1st Amendment' },
      { id: 'b', text: '5th Amendment' },
      { id: 'c', text: '6th Amendment' },
      { id: 'd', text: '14th Amendment' },
    ],
    correctChoiceId: 'a',
    explanation:
      'The 1st Amendment protects peaceful assembly, protest, and petitioning the government.',
    reinforcement: 'Peaceful assembly and political expression are core 1st Amendment protections.',
    sourceRefs: ['legal.rightToProtestAssemble', 'legal.protestPeacefulAssembly'],
    tags: ['rights', 'assembly', '1st-amendment'],
  },
  {
    id: 'constitution-1st-not-protected',
    type: 'multipleChoice',
    deck: legalQuizDecks.constitutional,
    category: '1st-amendment',
    difficulty: 'medium',
    prompt: 'Which kind of speech is not protected by the 1st Amendment?',
    choices: [
      { id: 'a', text: 'Criticizing the government or immigration policy' },
      { id: 'b', text: 'Carrying signs in a peaceful protest' },
      { id: 'c', text: 'True threats or incitement to imminent lawless action' },
      { id: 'd', text: 'Documenting a public encounter on your phone' },
    ],
    correctChoiceId: 'c',
    explanation:
      'Political criticism is strongly protected, but true threats and incitement to imminent lawless action are not.',
    reinforcement:
      'Protected speech is broad, but threats and incitement are outside that protection.',
    sourceRefs: ['legal.speechProtected', 'legal.speechNotProtected'],
    tags: ['rights', 'speech', '1st-amendment'],
  },
  {
    id: 'constitution-4th-searches',
    type: 'multipleChoice',
    deck: legalQuizDecks.constitutional,
    category: '4th-amendment',
    difficulty: 'easy',
    prompt: 'Which amendment protects against unreasonable searches and seizures?',
    choices: [
      { id: 'a', text: '1st Amendment' },
      { id: 'b', text: '4th Amendment' },
      { id: 'c', text: '5th Amendment' },
      { id: 'd', text: '6th Amendment' },
    ],
    correctChoiceId: 'b',
    explanation:
      'The 4th Amendment is the main constitutional protection against unreasonable searches and seizures.',
    reinforcement: '4th Amendment = search and seizure protection.',
    sourceRefs: ['legal.amendment4th', 'legal.whatThisMeansForYou'],
    tags: ['rights', 'searches', '4th-amendment'],
  },
  {
    id: 'constitution-4th-home-entry',
    type: 'multipleChoice',
    deck: legalQuizDecks.constitutional,
    category: '4th-amendment',
    difficulty: 'medium',
    prompt: 'What kind of warrant does ICE need to enter your home?',
    choices: [
      { id: 'a', text: 'An administrative warrant signed by ICE' },
      { id: 'b', text: 'Any document with an agency seal' },
      { id: 'c', text: 'A judicial warrant signed by a judge' },
      { id: 'd', text: 'No warrant if they ask loudly enough' },
    ],
    correctChoiceId: 'c',
    explanation:
      'A judge-signed judicial warrant is the key requirement for entry into a home. An administrative warrant is not enough.',
    reinforcement:
      'Administrative warrants do not authorize entry into your home.',
    sourceRefs: ['legal.fourthYourHome', 'legal.fourthAdminVsJudicial', 'scenarioData.doorStep3Script'],
    tags: ['rights', 'home', 'warrants', '4th-amendment'],
  },
  {
    id: 'constitution-4th-admin-warrant',
    type: 'multipleChoice',
    deck: legalQuizDecks.constitutional,
    category: '4th-amendment',
    difficulty: 'medium',
    prompt: 'What is true about an administrative warrant signed by ICE?',
    choices: [
      { id: 'a', text: 'It gives ICE authority to enter your home.' },
      { id: 'b', text: 'It does not authorize entry into your home.' },
      { id: 'c', text: 'It automatically forces you to answer questions.' },
      { id: 'd', text: 'It replaces your right to remain silent.' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Administrative warrants such as I-200 or I-205 are not the same as judge-signed judicial warrants and do not authorize home entry.',
    reinforcement:
      'ICE-signed administrative warrant is not enough to enter your home.',
    sourceRefs: ['legal.fourthAdminVsJudicial', 'scenarioData.doorWarrantAdminDesc'],
    tags: ['rights', 'warrants', '4th-amendment'],
  },
  {
    id: 'constitution-5th-silence',
    type: 'multipleChoice',
    deck: legalQuizDecks.constitutional,
    category: '5th-amendment',
    difficulty: 'easy',
    prompt: 'Which amendment most directly supports your right to remain silent when questioned?',
    choices: [
      { id: 'a', text: '4th Amendment' },
      { id: 'b', text: '5th Amendment' },
      { id: 'c', text: '6th Amendment' },
      { id: 'd', text: '14th Amendment' },
    ],
    correctChoiceId: 'b',
    explanation:
      'The 5th Amendment protects against self-incrimination, which is why you can refuse to answer questions.',
    reinforcement: '5th Amendment = right to remain silent.',
    sourceRefs: ['legal.amendment5th', 'legal.fifthCanStaySilent'],
    tags: ['rights', 'silence', '5th-amendment'],
  },
  {
    id: 'constitution-6th-lawyer',
    type: 'multipleChoice',
    deck: legalQuizDecks.constitutional,
    category: '6th-amendment',
    difficulty: 'easy',
    prompt: 'Which amendment is most directly tied to asking for a lawyer in criminal proceedings?',
    choices: [
      { id: 'a', text: '1st Amendment' },
      { id: 'b', text: '5th Amendment' },
      { id: 'c', text: '6th Amendment' },
      { id: 'd', text: '14th Amendment' },
    ],
    correctChoiceId: 'c',
    explanation:
      'The 6th Amendment protects the right to counsel in criminal proceedings, which is why asking for a lawyer matters before answering more questions.',
    reinforcement: '6th Amendment = right to counsel.',
    sourceRefs: ['legal.amendment6th', 'legal.sixthRightToLawyer'],
    tags: ['rights', 'lawyer', '6th-amendment'],
  },
  {
    id: 'constitution-6th-immigration-court',
    type: 'multipleChoice',
    deck: legalQuizDecks.constitutional,
    category: '6th-amendment',
    difficulty: 'medium',
    prompt: 'What is true about a free lawyer in immigration court?',
    choices: [
      { id: 'a', text: 'A free lawyer is always guaranteed in immigration court.' },
      { id: 'b', text: 'There is no guaranteed right to a free attorney in immigration court.' },
      { id: 'c', text: 'You cannot have a lawyer in immigration court.' },
      { id: 'd', text: 'Only citizens can ask for legal help there.' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Immigration court is different from a criminal prosecution. There is no guaranteed right to a free attorney in immigration court.',
    reinforcement:
      'Immigration court does not guarantee a free lawyer, so pro bono help matters.',
    sourceRefs: ['legal.sixthImmigrationCourt'],
    tags: ['rights', 'lawyer', 'immigration-court', '6th-amendment'],
  },
  {
    id: 'constitution-14th-everyone',
    type: 'multipleChoice',
    deck: legalQuizDecks.constitutional,
    category: '14th-amendment',
    difficulty: 'medium',
    prompt: 'Which amendment emphasizes that due process and equal protection apply to all persons on U.S. soil, not just citizens?',
    choices: [
      { id: 'a', text: '1st Amendment' },
      { id: 'b', text: '4th Amendment' },
      { id: 'c', text: '6th Amendment' },
      { id: 'd', text: '14th Amendment' },
    ],
    correctChoiceId: 'd',
    explanation:
      'The 14th Amendment uses the phrase “any person,” supporting due process and equal protection regardless of immigration status.',
    reinforcement: '14th Amendment = due process and equal protection for all persons.',
    sourceRefs: ['legal.amendment14th', 'legal.fourteenthAppliesToEveryone'],
    tags: ['rights', 'due-process', 'equal-protection', '14th-amendment'],
  },
  {
    id: 'constitution-admin-vs-judicial',
    type: 'multipleChoice',
    deck: legalQuizDecks.constitutional,
    category: 'warrants',
    difficulty: 'medium',
    prompt: 'Which statement is correct?',
    choices: [
      { id: 'a', text: 'An administrative warrant gives ICE full authority to enter your home.' },
      { id: 'b', text: 'A judicial warrant signed by a judge can authorize home entry.' },
      { id: 'c', text: 'Any officer request automatically becomes consent.' },
      { id: 'd', text: 'You should open the door first and ask questions later.' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Only a judicial warrant signed by a judge can authorize entry into a home. An administrative warrant does not do that.',
    reinforcement:
      'Judge-signed judicial warrant matters; administrative warrant is not enough for home entry.',
    sourceRefs: ['legal.fourthAdminVsJudicial', 'scenarioData.doorBranch3bExplanation'],
    tags: ['rights', 'warrants', 'door'],
  },
  {
    id: 'constitution-consent-phrase',
    type: 'multipleChoice',
    deck: legalQuizDecks.constitutional,
    category: '4th-amendment',
    difficulty: 'easy',
    prompt: 'Which phrase best refuses a search?',
    choices: [
      { id: 'a', text: 'You can look around if you are quick.' },
      { id: 'b', text: 'I do not consent to any searches.' },
      { id: 'c', text: 'Maybe later, after I explain things.' },
      { id: 'd', text: 'Only if I have nothing to hide.' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Non-consent should be clear, calm, and on the record. This phrasing does that directly.',
    reinforcement: 'Say it clearly: “I do not consent to any searches.”',
    sourceRefs: ['legal.fourthConsent', 'scenarioData.streetStep3Script', 'scenarioData.vehicleStep4Script'],
    tags: ['phrase', 'searches', '4th-amendment'],
  },
  {
    id: 'constitution-lawyer-phrase',
    type: 'multipleChoice',
    deck: legalQuizDecks.constitutional,
    category: '6th-amendment',
    difficulty: 'easy',
    prompt: 'Which phrase most clearly invokes counsel?',
    choices: [
      { id: 'a', text: 'Can I maybe call someone later?' },
      { id: 'b', text: 'I know my rights.' },
      { id: 'c', text: 'I want to speak to a lawyer.' },
      { id: 'd', text: 'I will explain after this is over.' },
    ],
    correctChoiceId: 'c',
    explanation:
      'Direct language is better than a vague or delayed request. A clear lawyer request leaves less room for confusion.',
    reinforcement: 'Direct is better: “I want to speak to a lawyer.”',
    sourceRefs: ['legal.fifthRequestLawyer', 'legal.sixthHowToAssert', 'scenarioData.streetStep4Script'],
    tags: ['phrase', 'lawyer', '6th-amendment'],
  },

  {
    id: 'scenario-door-first',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'door',
    difficulty: 'easy',
    prompt: 'If ICE is at your door, what is the first move?',
    choices: [
      { id: 'a', text: 'Open the door and talk calmly face-to-face.' },
      { id: 'b', text: 'Step outside and ask what they want.' },
      { id: 'c', text: 'Do not open the door.' },
      { id: 'd', text: 'Hand them your documents through the door.' },
    ],
    correctChoiceId: 'c',
    explanation:
      'The home is one of the strongest protected spaces. Keeping the door closed preserves that boundary; opening it too early gives part of that protection away.',
    reinforcement: 'At home, start with the closed door as your boundary.',
    sourceRefs: ['scenarioData.doorStep1Action', 'scenarioData.doorStep1Explanation'],
    tags: ['scenario', 'door', 'first-step'],
  },
  {
    id: 'scenario-door-warrant-request',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'door',
    difficulty: 'medium',
    prompt: 'At the door, what should you ask them to do with the warrant?',
    choices: [
      { id: 'a', text: 'Read it out loud from outside.' },
      { id: 'b', text: 'Leave it on the porch and come back later.' },
      { id: 'c', text: 'Slide it under the door or show it through a window.' },
      { id: 'd', text: 'Text a picture of it to your phone.' },
    ],
    correctChoiceId: 'c',
    explanation:
      'Ask to inspect the warrant without opening the door by having it slid under the door or shown through a window.',
    reinforcement: 'Inspect the warrant without giving up the protection of a closed door.',
    sourceRefs: ['scenarioData.doorStep3Script', 'scenarioData.doorKeyPoint2'],
    tags: ['scenario', 'door', 'warrant'],
  },
  {
    id: 'scenario-door-admin-warrant',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'door',
    difficulty: 'medium',
    prompt: 'If they show an administrative warrant like an I-200 or I-205 at your door, what should you do?',
    choices: [
      { id: 'a', text: 'Open the door because they showed official paperwork.' },
      { id: 'b', text: 'Say it is not a judicial warrant and you are not required to open the door.' },
      { id: 'c', text: 'Hand over your documents through the door right away.' },
      { id: 'd', text: 'Step outside to read it more closely.' },
    ],
    correctChoiceId: 'b',
    explanation:
      'An administrative warrant does not authorize entry into a home. The safer response is to keep the door closed and say so plainly.',
    reinforcement:
      'Administrative warrant is not the same as a judge-signed judicial warrant.',
    sourceRefs: ['scenarioData.doorBranch3bScript', 'scenarioData.doorBranch3bExplanation'],
    tags: ['scenario', 'door', 'warrant'],
  },
  {
    id: 'scenario-door-entry-without-consent',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'door',
    difficulty: 'hard',
    prompt: 'If they enter your home without consent or a valid judicial warrant, which response is best?',
    choices: [
      { id: 'a', text: 'Physically block them from moving any farther.' },
      { id: 'b', text: 'I do not consent to your presence in my home. I am not resisting, but I do not consent. I want to speak to a lawyer immediately.' },
      { id: 'c', text: 'Explain your full immigration history so they leave faster.' },
      { id: 'd', text: 'Sign whatever they hand you so you can challenge it later.' },
    ],
    correctChoiceId: 'b',
    explanation:
      'If entry happens anyway, the safest response is verbal non-consent, no physical resistance, and an immediate lawyer request.',
    reinforcement:
      'If entry happens anyway: do not physically resist, but say non-consent clearly for the record.',
    sourceRefs: ['scenarioData.doorBranch4aScript', 'scenarioData.doorBranch4aExplanation'],
    tags: ['scenario', 'door', 'entry'],
  },
  {
    id: 'scenario-street-first-question',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'street',
    difficulty: 'easy',
    prompt: 'If you are stopped on the street, what is the first question to ask?',
    choices: [
      { id: 'a', text: 'Why are you doing this to me?' },
      { id: 'b', text: 'Am I free to leave?' },
      { id: 'c', text: 'Do you know my status?' },
      { id: 'd', text: 'Can I call my family first?' },
    ],
    correctChoiceId: 'b',
    explanation:
      'That question separates a voluntary encounter from a detention. Before anything else, you need to know whether you are free to walk away.',
    reinforcement: 'Street stop first question: “Am I free to leave?”',
    sourceRefs: ['scenarioData.streetStep1Script', 'scenarioData.streetKeyPoint1'],
    tags: ['scenario', 'street', 'phrase'],
  },
  {
    id: 'scenario-street-after-detention',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'street',
    difficulty: 'medium',
    prompt: 'If they say you are not free to leave on the street, which response is best?',
    choices: [
      { id: 'a', text: 'Run away before they can do anything else.' },
      { id: 'b', text: 'Argue about every detail on the spot.' },
      { id: 'c', text: 'Ask the legal basis for detention, remain silent, and ask for a lawyer.' },
      { id: 'd', text: 'Answer a few questions to clear things up.' },
    ],
    correctChoiceId: 'c',
    explanation:
      'If you are being detained, the next steady move is simple: ask the legal basis, stop talking, and ask for a lawyer.',
    reinforcement:
      'If detained: ask the legal basis, stay silent, ask for counsel.',
    sourceRefs: ['scenarioData.streetBranch1bScript', 'scenarioData.streetStep2Script', 'scenarioData.streetStep4Script'],
    tags: ['scenario', 'street', 'detention'],
  },
  {
    id: 'scenario-street-search-anyway',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'street',
    difficulty: 'medium',
    prompt: 'If they search you anyway after you refused on the street, what should you do?',
    choices: [
      { id: 'a', text: 'Physically pull away so the refusal counts.' },
      { id: 'b', text: 'Stay silent and never mention it again.' },
      { id: 'c', text: 'Say: “I do not consent to this search. I am not resisting, but I am not consenting.”' },
      { id: 'd', text: 'Start arguing every detail of the law on the scene.' },
    ],
    correctChoiceId: 'c',
    explanation:
      'A calm verbal refusal keeps the record clear without adding physical resistance. The point is to preserve the issue without escalating the moment.',
    reinforcement:
      'Repeat non-consent clearly; do not physically resist.',
    sourceRefs: ['scenarioData.streetBranch3aScript', 'scenarioData.streetBranch3aExplanation'],
    tags: ['scenario', 'street', 'searches'],
  },
  {
    id: 'scenario-vehicle-documents',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'vehicle',
    difficulty: 'easy',
    prompt: 'During a vehicle stop, what should you provide when asked as the driver?',
    choices: [
      { id: 'a', text: 'Your full immigration history' },
      { id: 'b', text: 'Only whatever the officer guesses you have' },
      { id: 'c', text: 'Driver license and registration, while announcing before reaching' },
      { id: 'd', text: 'Your phone and unlocked apps' },
    ],
    correctChoiceId: 'c',
    explanation:
      'Provide the legally required documents and announce before reaching so the movement is clear and does not escalate the stop.',
    reinforcement:
      'Vehicle stop basics: keep hands visible, announce movement, provide license and registration.',
    sourceRefs: ['scenarioData.vehicleStep3Script', 'scenarioData.vehicleBranch2aScript'],
    tags: ['scenario', 'vehicle', 'documents'],
  },
  {
    id: 'scenario-vehicle-consent',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'vehicle',
    difficulty: 'medium',
    prompt: 'If they ask to search your vehicle, what should you do?',
    choices: [
      { id: 'a', text: 'Consent if you think the stop will end sooner' },
      { id: 'b', text: 'Say: “I do not consent to any searches of my vehicle.”' },
      { id: 'c', text: 'Stay silent but nod yes' },
      { id: 'd', text: 'Unlock everything to avoid suspicion' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Consent matters. Even if officers search anyway, a clear refusal keeps your position intact instead of surrendering it in your own words.',
    reinforcement: 'Vehicle search request: refuse consent clearly and calmly.',
    sourceRefs: ['scenarioData.vehicleBranch3aScript', 'scenarioData.vehicleWarrantAdminDesc'],
    tags: ['scenario', 'vehicle', 'searches'],
  },
  {
    id: 'scenario-vehicle-passenger',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'vehicle',
    difficulty: 'medium',
    prompt: 'If you are a passenger during a vehicle stop, which response is closest to the guidance?',
    choices: [
      { id: 'a', text: 'I must provide identification in every state no matter what.' },
      { id: 'b', text: 'Am I free to leave? I am a passenger and in most states I am not required to provide identification.' },
      { id: 'c', text: 'I should unlock the car and phone for everyone.' },
      { id: 'd', text: 'The driver has rights, but passengers do not.' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Passengers often have stronger rights than drivers and can ask whether they are free to leave.',
    reinforcement:
      'Passengers can often ask to leave and may not be required to provide ID in most states.',
    sourceRefs: ['scenarioData.vehicleBranch2bScript', 'scenarioData.vehicleBranch2bExplanation'],
    tags: ['scenario', 'vehicle', 'passenger'],
  },
  {
    id: 'scenario-workplace-silence',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'workplace',
    difficulty: 'medium',
    prompt: 'At work, which response is safest if officers begin questioning you?',
    choices: [
      { id: 'a', text: 'Run out a side door before they can talk to you.' },
      { id: 'b', text: 'I am exercising my right to remain silent. I want to speak to a lawyer.' },
      { id: 'c', text: 'I will show any documents you ask for right now.' },
      { id: 'd', text: 'My employer can answer for me, so I will too.' },
    ],
    correctChoiceId: 'b',
    explanation:
      'At work, sudden movement creates risk. Calm silence and a direct request for counsel are steadier than panic, explanation, or flight.',
    reinforcement:
      'At work: do not run, stay calm, invoke silence, ask for a lawyer.',
    sourceRefs: ['scenarioData.workplaceStep1Script', 'scenarioData.workplaceStep2Script'],
    tags: ['scenario', 'workplace', 'silence'],
  },
  {
    id: 'scenario-workplace-private-areas',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'workplace',
    difficulty: 'medium',
    prompt: 'What is true about ICE entering non-public workplace areas?',
    choices: [
      { id: 'a', text: 'They can always enter private work areas without a warrant.' },
      { id: 'b', text: 'They need a judicial warrant to enter non-public workplace areas.' },
      { id: 'c', text: 'Any manager permission automatically replaces a warrant.' },
      { id: 'd', text: 'Only a posted sign matters.' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Non-public workplace areas are treated more like home or private space, so a judicial warrant is required for entry.',
    reinforcement:
      'Non-public workplace areas keep stronger protections than public lobbies or customer areas.',
    sourceRefs: ['scenarioData.workplaceStep5Script', 'scenarioData.workplaceWarrantJudicialDesc'],
    tags: ['scenario', 'workplace', 'warrant'],
  },
  {
    id: 'scenario-border-location',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'border',
    difficulty: 'medium',
    prompt: 'What should you identify first during a border encounter?',
    choices: [
      { id: 'a', text: 'Whether the officers look calm or angry' },
      { id: 'b', text: 'Whether this is a port of entry or an internal checkpoint' },
      { id: 'c', text: 'Whether your phone battery is full' },
      { id: 'd', text: 'Whether witnesses are recording' },
    ],
    correctChoiceId: 'b',
    explanation:
      'The first question is where you are. A port of entry and an internal checkpoint are not the same place, and they do not work under the same rules.',
    reinforcement:
      'At the border, first identify what kind of checkpoint you are actually at.',
    sourceRefs: ['scenarioData.borderStep1Script', 'scenarioData.borderOverview'],
    tags: ['scenario', 'border', 'checkpoint'],
  },
  {
    id: 'scenario-border-device-search',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'border',
    difficulty: 'hard',
    prompt: 'If officers want to search your phone or device during a border-related stop, which answer is best?',
    choices: [
      { id: 'a', text: 'Unlock it immediately because devices are always outside your rights.' },
      { id: 'b', text: 'I do not consent to a search of my electronic device. I want to speak to a lawyer before any device access.' },
      { id: 'c', text: 'Delete things quickly in front of them.' },
      { id: 'd', text: 'Only refuse if you are a U.S. citizen.' },
    ],
    correctChoiceId: 'b',
    explanation:
      'A clear non-consent phrase for electronic devices preserves the issue for the record and can be paired with a lawyer request.',
    reinforcement:
      'Even where agents claim broad authority, state non-consent clearly for the record.',
    sourceRefs: ['scenarioData.borderBranch5bScript', 'scenarioData.borderBranch5bExplanation'],
    tags: ['scenario', 'border', 'devices'],
  },
  {
    id: 'scenario-border-port-entry',
    type: 'multipleChoice',
    deck: legalQuizDecks.scenarios,
    category: 'border',
    difficulty: 'medium',
    prompt: 'At an actual port of entry, which response is best?',
    choices: [
      { id: 'a', text: 'Refuse all citizenship questions immediately.' },
      { id: 'b', text: 'State your citizenship status clearly and briefly, and do not volunteer extra information.' },
      { id: 'c', text: 'Lie if you think it will get you through faster.' },
      { id: 'd', text: 'Ports of entry work exactly like internal checkpoints.' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Ports of entry are more restrictive than internal checkpoints. At the actual border, answer basic citizenship questions truthfully and briefly without volunteering extra information.',
    reinforcement:
      'Port of entry is more restrictive than an internal checkpoint.',
    sourceRefs: ['scenarioData.borderStep2Script', 'scenarioData.borderStep2Explanation'],
    tags: ['scenario', 'border', 'port-of-entry'],
  },

  {
    id: 'unsafe-door-open',
    type: 'multipleChoice',
    deck: legalQuizDecks.unsafeResponses,
    category: 'unsafe-response',
    difficulty: 'easy',
    prompt: 'Which response is the least safe?',
    choices: [
      { id: 'a', text: 'Keep the door closed and ask for a judge-signed warrant.' },
      { id: 'b', text: 'Open the door first so you can explain everything.' },
      { id: 'c', text: 'Say you do not consent to entry.' },
      { id: 'd', text: 'Request to speak to a lawyer.' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Keeping the door closed preserves one of the strongest protections of the home. Opening it too soon gives that up.',
    reinforcement: 'Do not open the door just to explain or argue.',
    sourceRefs: ['scenarioData.doorStep1Explanation', 'scenarioData.doorOverview'],
    tags: ['unsafe-response', 'door'],
  },
  {
    id: 'unsafe-street-run',
    type: 'multipleChoice',
    deck: legalQuizDecks.unsafeResponses,
    category: 'unsafe-response',
    difficulty: 'easy',
    prompt: 'Which response is the worst choice during a street stop?',
    choices: [
      { id: 'a', text: 'Ask if you are free to leave.' },
      { id: 'b', text: 'Run away when approached.' },
      { id: 'c', text: 'Remain calm and keep your hands visible.' },
      { id: 'd', text: 'Assert your right to remain silent.' },
    ],
    correctChoiceId: 'b',
    explanation:
      'Running escalates danger and can be used against you. Slow, clear rights assertions are safer.',
    reinforcement: 'Do not run. Slow down, stay calm, and use your words.',
    sourceRefs: ['scenarioData.streetKeyPoint4', 'scenarioData.streetBranch1aExplanation'],
    tags: ['unsafe-response', 'street'],
  },
  {
    id: 'unsafe-false-documents',
    type: 'multipleChoice',
    deck: legalQuizDecks.unsafeResponses,
    category: 'unsafe-response',
    difficulty: 'medium',
    prompt: 'Which answer should you avoid?',
    choices: [
      { id: 'a', text: 'I am exercising my right to remain silent.' },
      { id: 'b', text: 'I want to speak to a lawyer.' },
      { id: 'c', text: 'Here are false papers to get this over with.' },
      { id: 'd', text: 'Am I free to leave?' },
    ],
    correctChoiceId: 'c',
    explanation:
      'False documents create new danger. A short, lawful assertion of rights is steadier and safer than deception.',
    reinforcement: 'Do not lie and do not provide false documents.',
    sourceRefs: ['scenarioData.streetKeyPoint5', 'scenarioData.borderStep2Explanation'],
    tags: ['unsafe-response', 'documents'],
  },
  {
    id: 'unsafe-signing',
    type: 'multipleChoice',
    deck: legalQuizDecks.unsafeResponses,
    category: 'unsafe-response',
    difficulty: 'medium',
    prompt: 'Which response is unsafe if officers present paperwork?',
    choices: [
      { id: 'a', text: 'I will not sign any documents without my lawyer present.' },
      { id: 'b', text: 'I need my lawyer to review this first.' },
      { id: 'c', text: 'I will sign now and ask questions later.' },
      { id: 'd', text: 'I am not signing anything today.' },
    ],
    correctChoiceId: 'c',
    explanation:
      'Signing without legal review can waive important rights and appeals.',
    reinforcement: 'Do not sign anything without a lawyer present.',
    sourceRefs: ['scenarioData.doorStep6Script', 'scenarioData.streetStep6Script', 'scenarioData.vehicleStep6Script'],
    tags: ['unsafe-response', 'signing'],
  },
  {
    id: 'unsafe-consent-language',
    type: 'multipleChoice',
    deck: legalQuizDecks.unsafeResponses,
    category: 'unsafe-response',
    difficulty: 'medium',
    prompt: 'Which response weakens your position the most if someone wants to search?',
    choices: [
      { id: 'a', text: 'I do not consent to any searches.' },
      { id: 'b', text: 'I am not resisting, but I am not consenting.' },
      { id: 'c', text: 'Go ahead, I have nothing to hide.' },
      { id: 'd', text: 'I want to speak to a lawyer.' },
    ],
    correctChoiceId: 'c',
    explanation:
      'Once you consent, you undercut the protection created by a clear refusal.',
    reinforcement: 'Never talk yourself into a search to seem cooperative.',
    sourceRefs: ['legal.fourthConsent', 'scenarioData.streetBranch3aScript'],
    tags: ['unsafe-response', 'searches'],
  },
  {
    id: 'unsafe-arguing-law',
    type: 'multipleChoice',
    deck: legalQuizDecks.unsafeResponses,
    category: 'unsafe-response',
    difficulty: 'medium',
    prompt: 'Which approach goes against the safest encounter guidance?',
    choices: [
      { id: 'a', text: 'Assert your rights calmly and save the legal argument for later.' },
      { id: 'b', text: 'Use short phrases and keep repeating your rights.' },
      { id: 'c', text: 'Debate the law in detail on the scene until the officer gives up.' },
      { id: 'd', text: 'Request a lawyer and stay calm.' },
    ],
    correctChoiceId: 'c',
    explanation:
      'Short, repeatable rights assertions are safer than trying to win a legal argument in the moment.',
    reinforcement:
      'Use short rights language now; save the legal fight for court and counsel later.',
    sourceRefs: ['legal.heroScript1', 'legal.heroScript2', 'legal.heroScript3'],
    tags: ['unsafe-response', 'de-escalation'],
  },

  {
    id: 'phrase-recall-search',
    type: 'phraseRecall',
    deck: legalQuizDecks.phraseRecall,
    category: 'core-phrases',
    difficulty: 'easy',
    prompt: 'Tap the exact phrase used to refuse a search.',
    answerTokens: ['I', 'do', 'not', 'consent', 'to', 'any', 'searches.'],
    distractorTokens: ['maybe', 'later', 'if', 'quick', 'look', 'around'],
    explanation:
      'This phrase works because it is short, direct, and hard to misunderstand in a tense moment.',
    reinforcementPhrase: 'I do not consent to any searches.',
    sourceRefs: ['legal.fourthConsent', 'scenarioData.streetStep3Script', 'scenarioData.vehicleStep4Script'],
    tags: ['phrase', 'searches'],
  },
  {
    id: 'phrase-recall-leave',
    type: 'phraseRecall',
    deck: legalQuizDecks.phraseRecall,
    category: 'core-phrases',
    difficulty: 'easy',
    prompt: 'Tap the exact first street-stop question.',
    answerTokens: ['Am', 'I', 'free', 'to', 'leave?'],
    distractorTokens: ['why', 'are', 'you', 'stopping', 'me'],
    explanation:
      'This is the key first question in a public stop because it tells you whether the encounter is voluntary or a detention.',
    reinforcementPhrase: 'Am I free to leave?',
    sourceRefs: ['scenarioData.streetStep1Script', 'scenarioData.streetKeyPoint1'],
    tags: ['phrase', 'street'],
  },
  {
    id: 'phrase-recall-silence',
    type: 'phraseRecall',
    deck: legalQuizDecks.phraseRecall,
    category: 'core-phrases',
    difficulty: 'medium',
    prompt: 'Tap the exact phrase used to invoke silence in a simple, clear way.',
    answerTokens: ['I', 'am', 'exercising', 'my', 'right', 'to', 'remain', 'silent.'],
    distractorTokens: ['maybe', 'after', 'I', 'explain', 'everything'],
    explanation:
      'This wording matters because it is plain, direct, and leaves little room for someone else to reinterpret your intent.',
    reinforcementPhrase: 'I am exercising my right to remain silent.',
    sourceRefs: ['legal.fifthHowToAssert', 'scenarioData.workplaceStep2Script'],
    tags: ['phrase', 'silence'],
  },
  {
    id: 'phrase-recall-lawyer',
    type: 'phraseRecall',
    deck: legalQuizDecks.phraseRecall,
    category: 'core-phrases',
    difficulty: 'easy',
    prompt: 'Tap the exact phrase used to request a lawyer.',
    answerTokens: ['I', 'want', 'to', 'speak', 'to', 'a', 'lawyer.'],
    distractorTokens: ['maybe', 'call', 'someone', 'later', 'first'],
    explanation:
      'A short, unmistakable lawyer request is safer than vague language.',
    reinforcementPhrase: 'I want to speak to a lawyer.',
    sourceRefs: ['legal.fifthRequestLawyer', 'scenarioData.streetStep4Script', 'scenarioData.workplaceStep2Script'],
    tags: ['phrase', 'lawyer'],
  },
  {
    id: 'phrase-recall-door-script',
    type: 'phraseRecall',
    deck: legalQuizDecks.phraseRecall,
    category: 'door-phrase',
    difficulty: 'hard',
    prompt: 'Tap together the core door-rights phrase.',
    answerTokens: ['I', 'do', 'not', 'consent', 'to', 'you', 'entering', 'my', 'home.'],
    distractorTokens: ['come', 'inside', 'for', 'a', 'minute', 'please'],
    explanation:
      'At the door, direct non-consent language helps preserve the protection of the home.',
    reinforcementPhrase: 'I do not consent to you entering my home.',
    sourceRefs: ['scenarioData.doorStep4Script'],
    tags: ['phrase', 'door'],
  },
  {
    id: 'phrase-recall-no-sign',
    type: 'phraseRecall',
    deck: legalQuizDecks.phraseRecall,
    category: 'documents',
    difficulty: 'medium',
    prompt: 'Tap the exact phrase for refusing to sign paperwork.',
    answerTokens: ['I', 'will', 'not', 'sign', 'any', 'documents', 'without', 'my', 'lawyer', 'present.'],
    distractorTokens: ['after', 'this', 'later', 'maybe', 'review', 'quickly'],
    explanation:
      'Signing paperwork can waive rights in ways that are hard to undo later. This phrase creates pause before anything is signed in fear or confusion.',
    reinforcementPhrase: 'I will not sign any documents without my lawyer present.',
    sourceRefs: ['scenarioData.doorStep6Script', 'scenarioData.streetStep6Script', 'scenarioData.vehicleStep6Script'],
    tags: ['phrase', 'documents'],
  },
];

export const getLegalQuizQuestionsByDeck = (deck) =>
  legalQuizQuestions.filter((question) => question.deck === deck);

export const getLegalQuizQuestionsByTag = (tag) =>
  legalQuizQuestions.filter((question) => question.tags?.includes(tag));

export const getLegalQuizQuestionById = (id) =>
  legalQuizQuestions.find((question) => question.id === id);

export const getLegalQuizRightsTarget = (question) => {
  if (!question) return null;
  if (question.category === '1st-amendment') return '1st';
  if (question.category === '4th-amendment' || question.category === 'warrants') return '4th';
  if (question.category === '5th-amendment') return '5th';
  if (question.category === '6th-amendment') return '6th';
  if (question.category === '14th-amendment') return '14th';
  if (question.tags?.includes('1st-amendment')) return '1st';
  if (question.tags?.includes('4th-amendment')) return '4th';
  if (question.tags?.includes('5th-amendment')) return '5th';
  if (question.tags?.includes('6th-amendment')) return '6th';
  if (question.tags?.includes('14th-amendment')) return '14th';
  return null;
};

export const getLegalQuizScenarioTarget = (question) => {
  if (!question) return null;
  if (['door', 'street', 'vehicle', 'workplace', 'border'].includes(question.category)) {
    return question.category;
  }
  return question.tags?.find((tag) => ['door', 'street', 'vehicle', 'workplace', 'border'].includes(tag)) || null;
};
