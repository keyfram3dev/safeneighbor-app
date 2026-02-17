/**
 * Immigration rights content organized by immigration status.
 * Used by the "BY STATUS" tab in the Legal section.
 *
 * Each persona has collapsible sections with items containing
 * a title and description. The `shared` key holds content
 * visible regardless of which persona is selected.
 */

export const STATUS_PERSONAS = {
  undocumented: {
    id: 'undocumented',
    label: 'I Am Undocumented',
    shortLabel: 'Undocumented',
    color: 'red',
    description: 'Rights and protections that apply even without legal immigration status',
  },
  greenCard: {
    id: 'greenCard',
    label: 'I Have a Green Card',
    shortLabel: 'Green Card',
    color: 'emerald',
    description: 'How to protect your permanent resident status and know your stronger rights',
  },
  asylum: {
    id: 'asylum',
    label: "I'm Seeking Asylum",
    shortLabel: 'Asylum',
    color: 'amber',
    description: 'The asylum process, your rights, deadlines, and protections',
  },
};

// ─── "NEVER SIGN" WARNING ───────────────────────────────────────────
export const NEVER_SIGN_WARNING = {
  title: 'Never Sign Anything Without an Attorney',
  summary: 'ICE agents may pressure you to sign forms that waive your rights. Signing can result in immediate deportation with no hearing before a judge.',
  forms: [
    {
      name: 'Voluntary Departure (Form I-275)',
      danger: 'Agreeing to leave the US "voluntarily." Waives your right to a hearing before an immigration judge. Creates a formal departure record that can bar re-entry for years. Once signed, extremely difficult to reverse.',
    },
    {
      name: 'Stipulated Removal Order',
      danger: 'Agreeing to be deported without a hearing. You give up your right to present your case, apply for relief (asylum, cancellation of removal), or appeal. Treated the same as a deportation order.',
    },
    {
      name: 'Notice and Right of Review (Form I-826)',
      danger: 'Can waive your right to review of an expedited removal order. If you have a fear of returning to your country, you MUST express that fear — do not sign this form without understanding it fully.',
    },
    {
      name: 'Any Document in a Language You Don\'t Understand',
      danger: 'You have the right to an interpreter. Never sign a document you cannot read. Ask for a translation and for an attorney to review it. Saying "I don\'t understand" is not a waiver of your rights.',
    },
  ],
};

// ─── UNDOCUMENTED ───────────────────────────────────────────────────
export const UNDOCUMENTED_SECTIONS = [
  {
    id: 'undoc-never-sign',
    title: 'What NOT to Sign',
    urgency: 'critical',
    items: [
      {
        title: 'Voluntary Departure (Form I-275)',
        description: 'This form makes you agree to leave the US "voluntarily." It waives your right to appear before an immigration judge. Once signed, you may be barred from re-entering the US for years. ICE agents may present this as the "easy option" — it is not. Always ask for an attorney first.',
      },
      {
        title: 'Stipulated Removal Order',
        description: 'By signing, you agree to be deported without a hearing. You give up the right to present your case, apply for asylum or other relief, and appeal. This has the same legal effect as a deportation order issued by a judge.',
      },
      {
        title: 'Form I-826 (Notice and Right of Review)',
        description: 'This form can waive your right to have an expedited removal order reviewed. If you fear persecution or torture in your home country, you must tell the officer — signing this form could prevent you from making an asylum claim.',
      },
      {
        title: 'Documents in a Language You Don\'t Understand',
        description: 'You have the right to an interpreter for any legal proceeding or document. Never sign anything you cannot read. Politely say: "I do not understand this document. I want to speak with an attorney before signing anything."',
      },
    ],
  },
  {
    id: 'undoc-workplace',
    title: 'Workplace Rights',
    items: [
      {
        title: 'Fair Labor Standards Act (FLSA)',
        description: 'Federal law requires employers to pay minimum wage and overtime regardless of immigration status. If your employer withholds wages, threatens to call ICE, or pays below minimum wage, they are breaking the law — not you. You can file a wage complaint with the Department of Labor without providing immigration status.',
      },
      {
        title: 'OSHA Workplace Safety',
        description: 'You have the right to a safe workplace under the Occupational Safety and Health Act. You can file anonymous safety complaints with OSHA without revealing your immigration status. Employers cannot retaliate against you for reporting unsafe conditions.',
      },
      {
        title: 'Right to Organize (NLRA)',
        description: 'The National Labor Relations Act protects your right to join or form a union, bargain collectively, and discuss working conditions with coworkers — regardless of immigration status. Employers cannot threaten deportation to prevent organizing.',
      },
      {
        title: 'Workers\' Compensation',
        description: 'In most states, you are entitled to workers\' compensation benefits if injured on the job, regardless of immigration status. Report workplace injuries immediately. Your employer cannot use your status to deny a valid claim.',
      },
      {
        title: 'During a Workplace Raid',
        description: 'Do NOT run — this can be used against you. Remain calm and stay at your workstation. You have the right to remain silent. Do not show documents without an attorney present. Ask: "Am I free to leave?" If yes, walk away calmly. If agents enter private work areas (back offices, kitchens), ask if they have a judicial warrant signed by a judge.',
      },
    ],
  },
  {
    id: 'undoc-public-charge',
    title: 'Public Benefits & "Public Charge"',
    items: [
      {
        title: 'Safe to Use — No Public Charge Impact',
        description: 'These benefits will NOT count against you in any immigration application: Emergency Medicaid, SNAP/food stamps for your US citizen children, WIC (Women Infants Children), school lunch programs, CHIP (children\'s health insurance), community health centers, domestic violence shelters and services, disaster relief (FEMA), homeless shelters, and Earned Income Tax Credit (EITC).',
      },
      {
        title: 'Could Affect a Future Public Charge Determination',
        description: 'These programs may be considered if you apply for a green card or visa adjustment: cash welfare (TANF), Supplemental Security Income (SSI), and long-term institutionalized Medicaid (not emergency Medicaid). Important: Using these for your US citizen children generally does NOT count against you — only benefits received for yourself.',
      },
      {
        title: 'The "Public Charge" Rule Explained',
        description: 'Public charge is a test used when applying for certain green cards or visas. It looks at whether you are likely to become primarily dependent on government cash assistance. It does NOT apply to asylum seekers, refugees, VAWA self-petitioners, T or U visa holders, or those applying for citizenship. Many people avoid benefits they\'re entitled to out of fear — consult an immigration attorney about your specific situation.',
      },
    ],
  },
  {
    id: 'undoc-education',
    title: 'Education Rights',
    items: [
      {
        title: 'Plyler v. Doe (1982) — Children\'s Right to School',
        description: 'The Supreme Court ruled that all children have a constitutional right to K-12 public education regardless of immigration status. Schools CANNOT ask about immigration status as a condition of enrollment. Schools cannot require Social Security numbers — they must provide an alternative ID method. If a school refuses to enroll your child, contact your state\'s Department of Education.',
      },
      {
        title: 'FERPA Protections',
        description: 'The Family Educational Rights and Privacy Act (FERPA) prohibits schools from releasing student records to outside parties — including ICE — without a judicial warrant or written parent consent. An administrative warrant from ICE is NOT sufficient. Schools should have policies refusing to share student information with immigration authorities.',
      },
      {
        title: 'Higher Education',
        description: 'Many states allow undocumented students to pay in-state tuition rates at public colleges and universities. Some states and private institutions offer financial aid regardless of immigration status. Check your state\'s specific policies. Federal financial aid (FAFSA) requires a Social Security number, but state and institutional aid may not.',
      },
    ],
  },
  {
    id: 'undoc-healthcare',
    title: 'Healthcare Rights',
    items: [
      {
        title: 'Emergency Rooms Must Treat You (EMTALA)',
        description: 'Under the Emergency Medical Treatment & Labor Act (EMTALA), hospital emergency rooms MUST provide stabilizing treatment to anyone with an emergency medical condition — regardless of immigration status, insurance, or ability to pay. This is federal law. Hospitals cannot turn you away or ask about immigration status before providing emergency care.',
      },
      {
        title: 'Community Health Centers (FQHCs)',
        description: 'Federally Qualified Health Centers serve everyone regardless of immigration status or insurance. They offer primary care, dental, mental health, and prescriptions on a sliding-scale fee based on income. Find one near you at findahealthcenter.hrsa.gov.',
      },
      {
        title: 'Emergency Medicaid',
        description: 'Available in all states for emergency medical conditions regardless of immigration status. Covers emergency room visits, labor and delivery, and life-threatening conditions. You do not need to provide a Social Security number. Apply through your state\'s Medicaid office or at the hospital.',
      },
      {
        title: 'Medication Assistance',
        description: 'Most pharmaceutical companies offer Patient Assistance Programs (PAPs) that provide free or reduced-cost medications. These programs do not check immigration status. Ask your doctor or clinic about available programs. NeedyMeds.org and RxAssist.org list available programs by medication.',
      },
    ],
  },
  {
    id: 'undoc-taxes',
    title: 'Tax Rights & ITIN',
    items: [
      {
        title: 'Individual Taxpayer Identification Number (ITIN)',
        description: 'You can apply for an ITIN from the IRS to file federal taxes even without a Social Security number. Apply using Form W-7. The IRS does NOT share taxpayer information with immigration authorities — this is protected by federal law (IRC Section 6103).',
      },
      {
        title: 'Why Filing Taxes Helps',
        description: 'Filing taxes demonstrates good moral character and continuous presence in the US — both important factors in future immigration cases like cancellation of removal, asylum, or adjustment of status. Tax records also serve as evidence of employment for wage theft claims.',
      },
      {
        title: 'Tax Credits You May Qualify For',
        description: 'ITIN filers may qualify for the Child Tax Credit (for qualifying children with SSNs), the American Opportunity Tax Credit (education), and state-level tax credits. You may also be able to claim dependents. Consult a tax preparer experienced with ITIN filing.',
      },
    ],
  },
];

// ─── GREEN CARD HOLDER ──────────────────────────────────────────────
export const GREEN_CARD_SECTIONS = [
  {
    id: 'gc-stronger-rights',
    title: 'Your Stronger Rights',
    items: [
      {
        title: 'Right to a Hearing Before a Judge',
        description: 'Unlike some undocumented individuals who may face expedited removal, lawful permanent residents (LPRs) CANNOT be deported without a hearing before an immigration judge. You have the right to present evidence, call witnesses, and be represented by an attorney.',
      },
      {
        title: 'Right to a Bond Hearing',
        description: 'If detained by ICE, you are generally entitled to a bond hearing where a judge determines whether you can be released while your case is pending. Bond amounts typically range from $1,500 to $25,000 depending on flight risk and danger assessment.',
      },
      {
        title: 'Cancellation of Removal',
        description: 'If you have been a lawful permanent resident for at least 5 years AND have resided continuously in the US for at least 7 years, you may be eligible for cancellation of removal — even if you have a deportable conviction. This is a powerful defense that can keep you in the US with your green card.',
      },
      {
        title: 'Right to Naturalize',
        description: 'Once you become a US citizen through naturalization, you cannot be deported for prior conduct (with very narrow exceptions for fraud during the naturalization process). Citizenship provides the strongest protection against removal.',
      },
    ],
  },
  {
    id: 'gc-criminal',
    title: 'Criminal Conviction Dangers',
    items: [
      {
        title: 'Aggravated Felonies',
        description: 'Immigration law defines "aggravated felony" more broadly than criminal law. Offenses that are misdemeanors in state court — such as shoplifting over $200, certain fraud offenses, or some drug possession charges — can be classified as aggravated felonies for immigration purposes. An aggravated felony conviction makes you deportable, bars most forms of relief, and can result in mandatory detention.',
      },
      {
        title: 'Crimes of Moral Turpitude (CIMT)',
        description: 'Crimes involving dishonesty, fraud, or intent to harm — such as theft, assault, DUI with injury, or domestic violence — are considered CIMTs. One CIMT within 5 years of admission or two CIMTs at any time can make you deportable. Some exceptions exist for petty offenses (max sentence under 1 year and sentence imposed under 6 months).',
      },
      {
        title: 'Drug Offenses',
        description: 'Any drug conviction (except a single offense of simple possession of 30g or less of marijuana) can make you deportable. This includes marijuana offenses in states where it is legal — cannabis remains illegal under federal law, which controls immigration. Even a marijuana-related arrest without conviction can cause problems at the border.',
      },
      {
        title: 'DUI and Domestic Violence',
        description: 'A single DUI generally does not trigger deportation unless it involves injury, a controlled substance, or is a felony. However, multiple DUIs or DUI with aggravating factors can be problematic. Domestic violence, stalking, child abuse, and violating a protection order are all specific grounds for deportation — even a first offense.',
      },
    ],
  },
  {
    id: 'gc-padilla',
    title: 'Padilla v. Kentucky — Your Right to Know',
    items: [
      {
        title: 'What This Case Means for You',
        description: 'In Padilla v. Kentucky (2010), the Supreme Court ruled that criminal defense attorneys MUST advise their clients about the immigration consequences of a guilty plea. If your criminal lawyer did not tell you that a plea could result in deportation, this may be grounds to withdraw the plea and reopen your case.',
      },
      {
        title: 'Before Accepting Any Plea Deal',
        description: 'ALWAYS consult an immigration attorney before accepting a plea deal in criminal court — even for minor offenses. What seems like a good deal in criminal court (probation instead of jail) can trigger automatic deportation in immigration court. A slightly different charge or sentence can mean the difference between keeping and losing your green card.',
      },
      {
        title: 'If You Already Took a Plea',
        description: 'If you accepted a plea deal without being informed of immigration consequences, contact an immigration attorney immediately. You may be able to file a post-conviction motion to vacate the plea under Padilla. Time limits apply, so act quickly. This applies even to old convictions.',
      },
    ],
  },
  {
    id: 'gc-travel',
    title: 'Travel Warnings',
    items: [
      {
        title: '6-Month Rule',
        description: 'If you are outside the US for more than 6 months continuously, immigration authorities may presume you have abandoned your permanent resident status. You will need to prove you maintained ties to the US (home, job, family, taxes filed). Carry evidence of US ties when returning.',
      },
      {
        title: '1-Year Rule',
        description: 'If you are outside the US for more than 1 year without a re-entry permit, your green card is considered abandoned. You will likely be denied entry and may need to apply for a returning resident visa (SB-1) at a US consulate — which is discretionary and not guaranteed.',
      },
      {
        title: 'Re-Entry Permit',
        description: 'If you plan to be outside the US for more than 6 months, apply for a re-entry permit (Form I-131) BEFORE you leave. This protects your status for up to 2 years. You must be physically in the US when you file and when biometrics are taken.',
      },
      {
        title: 'If Questioned at Re-Entry',
        description: 'CBP officers may question you about the length and purpose of your trip. Carry proof of US ties: mortgage/lease, employment letter, tax returns, family relationships. If they suggest you abandoned residence, do NOT sign Form I-407 (Record of Abandonment) — this voluntarily surrenders your green card. Ask to speak with an attorney.',
      },
    ],
  },
  {
    id: 'gc-maintain',
    title: 'Maintaining Your Status',
    items: [
      {
        title: 'Address Changes (AR-11)',
        description: 'You must notify USCIS of any address change within 10 days by filing Form AR-11 (available online at uscis.gov). Failure to report an address change is technically a misdemeanor and can complicate future immigration applications including naturalization.',
      },
      {
        title: 'Selective Service Registration',
        description: 'Males aged 18-25 must register with the Selective Service System, regardless of immigration status. Failure to register can prevent naturalization. You can register at sss.gov. If you are past 25 and did not register, you may need to show your failure was not knowing and willful.',
      },
      {
        title: 'Conditional vs. Permanent Green Card',
        description: 'If you received your green card through marriage and have been married for less than 2 years, your card is "conditional" (valid for 2 years). You must file Form I-751 to remove conditions within the 90-day window before it expires. If divorced, you may still file with a waiver. Missing this deadline can result in losing your status.',
      },
      {
        title: 'Renewing Your Green Card',
        description: 'Green cards expire every 10 years (2 years for conditional). File Form I-90 to renew. An expired green card does not mean your status has expired — your permanent resident status remains valid. However, an expired card makes travel and employment verification difficult. File for renewal 6 months before expiration.',
      },
    ],
  },
  {
    id: 'gc-citizenship',
    title: 'Path to Citizenship',
    items: [
      {
        title: 'Naturalization Eligibility',
        description: 'You can generally apply for US citizenship after 5 years as a permanent resident (3 years if married to a US citizen). You must have been physically present in the US for at least half that time, demonstrate good moral character, pass a civics and English test, and take an oath of allegiance.',
      },
      {
        title: 'Benefits of Naturalizing',
        description: 'US citizens cannot be deported (except in extremely rare fraud cases). Citizens can vote, serve on juries, hold federal jobs, petition for family members with shorter wait times, and travel freely without risk to their status. Given the current enforcement climate, naturalization provides the strongest possible protection.',
      },
      {
        title: 'The Process',
        description: 'File Form N-400 with USCIS. You will be scheduled for a biometrics appointment, then an interview where you take the civics and English tests. If approved, you attend a naturalization ceremony and take the Oath of Allegiance. The process typically takes 8-14 months but varies by location. Many organizations offer free citizenship preparation classes.',
      },
    ],
  },
];

// ─── ASYLUM SEEKER ──────────────────────────────────────────────────
export const ASYLUM_SECTIONS = [
  {
    id: 'asylum-right',
    title: 'Your Right to Apply',
    items: [
      {
        title: 'Asylum Is Your Legal Right',
        description: 'You have the right to apply for asylum in the United States regardless of how you entered the country — whether at a port of entry, between ports of entry, or by overstaying a visa. This right is established under US law (INA § 208) and international law (1951 Refugee Convention). Entering without authorization does not bar you from asylum.',
      },
      {
        title: 'Who Qualifies',
        description: 'To qualify for asylum, you must demonstrate that you have been persecuted or have a well-founded fear of persecution based on at least one of five protected grounds: race, religion, nationality, political opinion, or membership in a particular social group. You do not need to prove it is certain you will be harmed — a reasonable possibility is sufficient.',
      },
      {
        title: 'Express Your Fear Immediately',
        description: 'If you are apprehended by immigration authorities, tell them immediately: "I am afraid to return to my country. I want to apply for asylum." These words trigger legal protections. Do not sign any documents agreeing to leave the US. You have the right to a credible fear interview before being removed.',
      },
    ],
  },
  {
    id: 'asylum-credible-fear',
    title: 'Credible Fear Interview',
    items: [
      {
        title: 'What Is a Credible Fear Interview?',
        description: 'If you are in expedited removal proceedings and express a fear of returning to your country, you will be referred for a credible fear interview with an asylum officer. This is your chance to explain why you are afraid to return. The standard is "significant possibility" that you could establish eligibility for asylum — it is meant to be a low bar.',
      },
      {
        title: 'Your Rights During the Interview',
        description: 'You have the right to an interpreter in your language (provided free by the government). You can bring an attorney or representative (but one will not be provided). You can present evidence, documents, and witness statements. You can request a review by an immigration judge if the asylum officer gives a negative determination.',
      },
      {
        title: 'How to Prepare',
        description: 'Be ready to explain: Who harmed you or who you fear? What did they do or threaten to do? Why were you targeted? Did you report it to authorities in your country? Why can\'t your government protect you? Bring any evidence you have: police reports, medical records, photos of injuries, threatening messages, news articles about conditions in your country.',
      },
      {
        title: 'If You Receive a Negative Determination',
        description: 'You have the right to request review by an immigration judge. This review must happen quickly (usually within days). The judge makes an independent determination. If the judge also finds no credible fear, you may be subject to removal, but can still consult with an attorney about other options.',
      },
    ],
  },
  {
    id: 'asylum-deadline',
    title: 'One-Year Filing Deadline',
    items: [
      {
        title: 'The General Rule',
        description: 'You must file your asylum application (Form I-589) within ONE YEAR of your last arrival in the United States. This deadline is strictly enforced. Missing it can bar you from asylum even if you have a strong case. File as early as possible — do not wait until the last month.',
      },
      {
        title: 'Exceptions to the Deadline',
        description: 'You may still file after one year if you can show: changed circumstances that materially affect your eligibility (new persecution, changed country conditions, change in your situation), or extraordinary circumstances that caused the delay (serious illness, mental/physical disability, legal disability such as being a minor, ineffective assistance of a prior attorney, or maintaining lawful status until a reasonable period before filing).',
      },
      {
        title: 'Even If You Missed the Deadline',
        description: 'You may still be eligible for Withholding of Removal or protection under the Convention Against Torture (CAT) — neither has a one-year deadline. These provide less protection than asylum (no path to green card, no family petition rights) but prevent you from being returned to danger. Consult an attorney immediately.',
      },
    ],
  },
  {
    id: 'asylum-grounds',
    title: 'Persecution Grounds',
    items: [
      {
        title: 'Race, Religion & Nationality',
        description: 'Persecution based on your race, ethnicity, religion, or nationality is a recognized ground for asylum. This includes discrimination that rises to the level of persecution: physical harm, imprisonment, severe economic deprivation, or denial of fundamental rights because of who you are.',
      },
      {
        title: 'Political Opinion',
        description: 'If you have been targeted for your political beliefs, activism, or even for your perceived political opinion (what the persecutor thinks you believe), you may qualify. This includes opposition to corruption, refusal to participate in government abuses, labor organizing, and journalism critical of the government.',
      },
      {
        title: 'Particular Social Group',
        description: 'This is the broadest and most evolving ground. Groups that have been recognized include: LGBTQ+ individuals, women fleeing domestic violence (in some circuits), former gang members who left or refused recruitment, members of certain families or clans, and people with certain disabilities. The group must be defined by an immutable or fundamental characteristic.',
      },
      {
        title: 'Gender-Based & Domestic Violence Claims',
        description: 'Women and others fleeing severe domestic violence, forced marriage, female genital mutilation, honor-based violence, or sexual violence may have asylum claims based on particular social group or political opinion. These cases require careful legal framing — work with an attorney experienced in gender-based asylum claims.',
      },
    ],
  },
  {
    id: 'asylum-alternatives',
    title: 'Alternative Protections',
    items: [
      {
        title: 'Withholding of Removal',
        description: 'A higher bar than asylum (must show persecution is "more likely than not") but has NO one-year filing deadline and fewer bars to eligibility. If granted, you cannot be removed to the country where you face persecution. You can receive work authorization. However, you cannot adjust to permanent resident status, travel outside the US, or petition for family members.',
      },
      {
        title: 'Convention Against Torture (CAT)',
        description: 'If you can show it is "more likely than not" that you would be tortured by or with the acquiescence of the government in your country, you qualify for CAT protection. There is NO one-year deadline, NO bars (even criminal history does not disqualify you), and it cannot be revoked. This is often the last line of defense for people with criminal records or who missed the asylum deadline.',
      },
      {
        title: 'Temporary Protected Status (TPS)',
        description: 'If your country has been designated for TPS due to armed conflict, natural disaster, or other extraordinary conditions, you may be eligible for temporary protection and work authorization. TPS designations are country-specific and have their own registration deadlines. Check uscis.gov for current designated countries.',
      },
    ],
  },
  {
    id: 'asylum-work',
    title: 'Work Authorization',
    items: [
      {
        title: 'Employment Authorization Document (EAD)',
        description: 'You can apply for work authorization (Form I-765) after your asylum application has been pending for 180 days without a decision. The EAD allows you to work legally in the US while your case is pending. It is typically valid for 2 years and renewable.',
      },
      {
        title: 'While Waiting for Your EAD',
        description: 'During the waiting period, connect with refugee resettlement agencies and immigrant assistance organizations that may provide emergency financial assistance, housing support, and other services. Some states and localities have programs specifically for asylum seekers awaiting work authorization.',
      },
      {
        title: 'If Asylum Is Granted',
        description: 'Once granted asylum, you can work immediately without an EAD (though getting one helps with employer verification). After one year, you can apply for a green card (Form I-485). Your spouse and unmarried children under 21 may also be included in your asylum grant or apply to join you.',
      },
    ],
  },
  {
    id: 'asylum-never-sign',
    title: 'What NOT to Do',
    urgency: 'critical',
    items: [
      {
        title: 'Never Sign Voluntary Departure',
        description: 'Signing voluntary departure waives your right to an asylum hearing. Even if an officer says it will be "easier," it removes your ability to present your case to a judge. Always say: "I want to see an immigration judge. I am afraid to return to my country."',
      },
      {
        title: 'Never Withdraw Your Asylum Application',
        description: 'Do not withdraw your asylum application without an attorney\'s advice. Withdrawal is treated as abandonment of your claim and can bar you from future applications. If an officer pressures you to withdraw, say: "I do not wish to withdraw my application. I want to speak with an attorney."',
      },
      {
        title: 'NEVER Miss a Court Date',
        description: 'If you miss an immigration court hearing, the judge will order you deported in absentia — meaning without you present and with no opportunity to present your case. If your address changes, file Form EOIR-33 with the immigration court AND Form AR-11 with USCIS immediately. Set multiple reminders for every court date.',
      },
      {
        title: 'Do Not Provide False Information',
        description: 'Providing false information on your asylum application or during your interview can permanently bar you from asylum and other immigration benefits. If you made a mistake on a form, tell your attorney so it can be corrected. Honest mistakes can be explained — intentional fraud cannot.',
      },
    ],
  },
];

// ─── EVERYONE SHOULD KNOW ───────────────────────────────────────────
export const SHARED_SECTIONS = [
  {
    id: 'shared-healthcare',
    title: 'Healthcare Rights',
    items: [
      {
        title: 'Emergency Rooms Must Treat You (EMTALA)',
        description: 'Under federal law, hospital emergency rooms must provide stabilizing treatment to ANYONE with an emergency medical condition — regardless of immigration status, insurance, or ability to pay. Hospitals cannot ask about immigration status before providing emergency care and cannot turn you away.',
      },
      {
        title: 'Community Health Centers',
        description: 'Federally Qualified Health Centers (FQHCs) serve everyone regardless of status or insurance. They offer primary care, dental, mental health, and prescriptions on a sliding-scale fee. Find one at findahealthcenter.hrsa.gov.',
      },
      {
        title: 'Mental Health Support',
        description: 'SAMHSA National Helpline: 1-800-662-4357 (free, confidential, 24/7, available in English and Spanish). Crisis Text Line: Text HOME to 741741. 988 Suicide & Crisis Lifeline: Call or text 988. These services are available to everyone regardless of immigration status.',
      },
    ],
  },
  {
    id: 'shared-education',
    title: 'Education Rights',
    items: [
      {
        title: 'Every Child Has a Right to School',
        description: 'Under Plyler v. Doe (1982), all children have a constitutional right to K-12 public education regardless of immigration status. Schools cannot ask about immigration status, cannot require Social Security numbers for enrollment, and cannot deny enrollment based on a parent\'s status.',
      },
      {
        title: 'Schools Cannot Share Records with ICE',
        description: 'FERPA (Family Educational Rights and Privacy Act) prohibits schools from releasing student records to immigration authorities without a judicial warrant signed by a judge or written parent consent. An administrative ICE warrant is NOT sufficient.',
      },
    ],
  },
  {
    id: 'shared-taxes',
    title: 'Tax Rights',
    items: [
      {
        title: 'File Taxes with an ITIN',
        description: 'You can file federal taxes using an Individual Taxpayer Identification Number (ITIN) even without a Social Security number. The IRS is prohibited by federal law (IRC § 6103) from sharing taxpayer information with immigration authorities.',
      },
      {
        title: 'Filing Helps Your Future Case',
        description: 'Tax records demonstrate good moral character, continuous US presence, and employment history — all important factors in future immigration cases including asylum, cancellation of removal, and adjustment of status.',
      },
    ],
  },
  {
    id: 'shared-special-visas',
    title: 'Special Visas You May Qualify For',
    items: [
      {
        title: 'U-Visa — Crime Victims',
        description: 'If you are the victim of a serious crime (domestic violence, sexual assault, trafficking, kidnapping, extortion, and others) and cooperate with law enforcement, you may qualify for a U-visa. This provides work authorization, protection from deportation, and a path to a green card after 3 years. You do NOT need to have legal immigration status to apply.',
      },
      {
        title: 'T-Visa — Trafficking Victims',
        description: 'If you have been a victim of human trafficking (labor or sex trafficking), you may qualify for a T-visa. This provides work authorization, protection from deportation, access to federal benefits, and a path to a green card. If you are under 18, you do not need to cooperate with law enforcement.',
      },
      {
        title: 'VAWA Self-Petition — Domestic Violence',
        description: 'If you are the abused spouse, child, or parent of a US citizen or permanent resident, you can file a self-petition under the Violence Against Women Act (VAWA) without your abuser\'s knowledge or consent. This provides work authorization and a path to a green card. Despite the name, VAWA protects people of any gender.',
      },
      {
        title: 'Special Immigrant Juvenile Status (SIJS)',
        description: 'If you are under 21 and have been abused, neglected, or abandoned by one or both parents, you may qualify for SIJS. This requires a state court finding and a USCIS petition. SIJS provides a green card and is available regardless of how you entered the US. Time-sensitive — consult an attorney quickly as you must apply before turning 21.',
      },
    ],
  },
];
