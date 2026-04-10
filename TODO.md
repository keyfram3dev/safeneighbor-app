# SafeNeighbor TODO List

## Legal Quiz Implementation Plan

### Objective
- Add an interactive legal-preparedness quiz that helps users remember core constitutional protections and rehearse what to say in real SafeNeighbor encounter scenarios.
- Start with `Legal` as the launch surface, using a hero CTA first, and expand later into deeper scenario-linked practice.

### Product Direction
- Launch from the `Legal` hero as a secondary action next to `Get Legal Help`.
- Use a focused quiz experience rather than embedding the full quiz UI inside the hero card.
- On mobile, open as a full-screen or near-full-screen stepper/modal.
- On desktop, open as a large modal or panel inside the Legal experience.
- Keep the long-term option open for a dedicated `Quiz` tab later, but do not add that in v1.

### Learning Strategy
- Combine:
  - multiple-choice questions
  - short “tap the exact phrase” recall drills
- Emphasize:
  - retrieval practice
  - immediate corrective feedback
  - repetition of missed items
  - phrase-level recall under pressure
- Prefer SafeNeighbor’s own scripts and rights language over generic civics trivia.

### Source Material To Reuse
- Constitutional rights content already in `Legal`:
  - 1st Amendment
  - 4th Amendment
  - 5th Amendment
  - 6th Amendment
  - 14th Amendment
- Phrase drills already reflected in the app:
  - `I do not consent to a search.`
  - `Am I free to leave?`
  - `I want to speak to a lawyer.`
  - `I am exercising my right to remain silent.`
- Scenario-based language already in `scenarioData`:
  - `door`
  - `street`
  - `vehicle`
  - `workplace`
  - `border`
- Rights-card language already in `RightsCard`.

### Recommended Placement

#### Phase 1 Placement
- [ ] Add a new hero CTA in `Legal`:
  - label idea: `Practice With Quiz`
  - position: next to `Get Legal Help`
- [ ] Open a dedicated quiz modal/stepper from that CTA.
- [ ] Keep the rest of the Legal hero visually calm and unchanged except for the new button.

#### Future Placement
- [ ] Add “Practice this amendment” entry points from each amendment card.
- [ ] Add “Quiz this scenario” entry points from scenario cards or scenario-detail pages.
- [ ] Consider a permanent `Quiz` tab in `Legal` if usage and completion rates justify it.

### Phase 1 Content Scope

#### Constitutional Foundations
- [ ] 1st Amendment: speech, assembly, recording in public
- [ ] 4th Amendment: unreasonable search/seizure, consent, judicial vs administrative warrant
- [ ] 5th Amendment: right to remain silent
- [ ] 6th Amendment: right to ask for a lawyer
- [ ] 14th Amendment: due process and equal protection for all persons

#### Applied Scenario Practice
- [ ] Door encounter
- [ ] Street stop
- [ ] Vehicle stop
- [ ] Workplace encounter
- [ ] Border / checkpoint encounter

#### Core Phrase Reinforcement
- [ ] Search refusal phrase
- [ ] Freedom-to-leave question
- [ ] Silence invocation phrase
- [ ] Lawyer request phrase

### Question Design For V1

#### Multiple Choice
- [ ] “Which amendment protects this?” questions
- [ ] “What should you say next?” questions
- [ ] “Which response is safest?” questions
- [ ] “Which one is wrong?” trap-recognition questions
- [ ] Judicial vs administrative warrant recognition questions

#### Phrase Recall
- [ ] Build short tap-to-reconstruct phrase drills using exact SafeNeighbor language.
- [ ] Start with 3-5 high-value phrases only.
- [ ] Show the exact phrase again after completion as reinforcement.

#### Feedback Pattern
- [ ] After each answer, show:
  - correct answer
  - short explanation
  - exact phrase or takeaway to remember
- [ ] For missed questions, store them for a retry round in the same session.

### Initial Question Bank Plan

#### V1 Question Count
- [ ] 10 constitutional-rights questions
- [ ] 10 scenario-based response questions
- [ ] 5 “spot the unsafe response” questions
- [ ] 3-5 exact-phrase recall drills

#### Strong First Questions To Include
- [ ] Which amendment most directly protects recording police or ICE in public?
- [ ] Which amendment protects against unreasonable searches?
- [ ] Which phrase should you use to refuse consent to a search?
- [ ] Which phrase should you use to invoke silence?
- [ ] Which phrase should you use to ask for a lawyer?
- [ ] Does an administrative warrant signed by ICE allow entry into your home?
- [ ] At the door, what should you ask them to show?
- [ ] On the street, what is the first question you should ask?
- [ ] During a vehicle stop, what should you say about searches?
- [ ] Which rights apply to all persons regardless of immigration status?

### Technical Implementation Plan

#### Phase 1A: Content Model
- [ ] Create `src/data/legalQuizData.js`
- [ ] Define a structured schema for each quiz item:
  - `id`
  - `type` (`multipleChoice` or `phraseRecall`)
  - `category`
  - `sourceSection`
  - `prompt`
  - `choices`
  - `correctAnswer`
  - `explanation`
  - `reinforcementPhrase`
  - `tags`
  - `difficulty`
- [ ] Tag content by amendment and scenario so later filtering is easy.

#### Phase 1B: UI
- [ ] Create `src/components/LegalQuiz.js`
- [ ] Build quiz states:
  - intro
  - in-progress question view
  - answer feedback
  - retry missed items
  - results summary
- [ ] Support mobile-first stepper behavior.
- [ ] Make the UI visually match `Legal` and `Scenarios`.

#### Phase 1C: Launch Integration
- [ ] Add the new hero CTA to `src/components/Legal.js`
- [ ] Connect CTA to open the quiz
- [ ] Preserve keyboard-safe, mobile-friendly behavior if the quiz ever includes typed or tap-recall interactions

#### Phase 1D: Persistence
- [ ] Save lightweight quiz progress locally:
  - last completed date
  - last score
  - missed question IDs
  - phrase drills needing review
- [ ] Add a simple “Review missed questions” entry for repeat practice later

### Phase 2 Expansion

#### Deeper Scenario Training
- [ ] Generate quiz sets directly from `scenarioData` decision branches
- [ ] Add “What should you say?” drills tied to specific scenario steps
- [ ] Link feedback screens back to the full scenario guide

#### More Legal Coverage
- [ ] Add protest / civil disobedience questions
- [ ] Add community witness / recording-rights questions
- [ ] Add rights-by-status quiz variants where content differs meaningfully
- [ ] Add state-specific recording-consent quiz items later if that content is stable enough to support practice

#### Adaptive Review
- [ ] Increase frequency of missed or low-confidence questions
- [ ] Repeat correct-but-low-confidence items in the same session
- [ ] Add short “60-second refresh” quiz packs

### Phase 3 Long-Term Enhancements
- [ ] Add a dedicated `Quiz` tab inside `Legal` if engagement is strong
- [ ] Add streaks, session summaries, or “review 3 phrases” nudges
- [ ] Add scenario-specific practice launchers across the app
- [ ] Add analytics dashboards for:
  - quiz starts
  - completion rate
  - most missed questions
  - most missed phrases
  - highest-friction scenario categories

### Copy / UX Decisions To Lock During Build
- [ ] Finalize hero CTA label:
  - `Practice With Quiz`
  - `Rights Quiz`
  - `Practice Rights`
- [ ] Decide whether the intro screen says:
  - “Learn your rights”
  - “Practice what to say”
  - or both
- [ ] Keep feedback language calm, practical, and non-punitive
- [ ] Avoid framing scores in a way that feels gamified at the expense of preparedness

### Verification Checklist
- [ ] Users can launch the quiz from the Legal hero without confusion
- [ ] The first version covers 1st, 4th, 5th, 6th, and 14th Amendments
- [ ] The first version includes scenario-based “what should you say?” questions
- [ ] Phrase recall drills use exact SafeNeighbor language
- [ ] Feedback explains why an answer is correct, not just whether it is correct
- [ ] Missed questions can be repeated for reinforcement
- [ ] Mobile flow feels clean and focused, not cramped
- [ ] The quiz feels like part of SafeNeighbor, not a bolted-on trivia module

## Signals Redesign Plan

### Objective
- Rework the `Signals` page so it reads as an operational field guide first and a reference page second.
- Improve first-read clarity, section hierarchy, and navigability without breaking the visual language shared with `Home`, `Scenarios`, and `Record`.

### Strategy
- Reduce the number of competing messages in the hero and make the primary action unmistakable.
- Tighten the page flow around a single operational sequence:
  1. Alert people
  2. Coordinate visually
  3. Stabilize / de-escalate
  4. Back up the signal digitally
  5. Keep it available offline
- Move explanatory or theory-heavy content lower unless it directly helps immediate action.

### Concrete Redesign Tasks

#### 1. Simplify The Hero
- [ ] Reduce the hero to one main thesis, one supporting paragraph, one primary CTA, and one secondary CTA.
- [ ] Convert the right rail into a lighter support column so it reinforces the hero instead of competing with it.
- [ ] Remove or relocate at least one of the current hero support modules:
  - signal ladder
  - rapid action cards
  - checklist
- [ ] Keep the hero answer focused on: “What should I do first if I need to coordinate right now?”

#### 2. Tighten Hero Typography
- [ ] Increase contrast between headline, support copy, and helper labels so the middle of the hero does not feel typographically flat.
- [ ] Reduce the number of mini-eyebrows and uppercase labels visible at once.
- [ ] Make instructional copy feel distinct from reassurance/reference copy through size, spacing, and weight rather than color alone.

#### 3. Re-sequence The Page
- [ ] Keep `Alert Patterns` as the first operational section after the jump bar.
- [ ] Move `Hierarchy of Sound` lower on the page, or fold it into the alert-patterns section as a compact reference block.
- [ ] Preserve the order:
  - Alert Patterns
  - Hand Signals
  - De-escalation
  - Digital Backup
  - Offline Access
- [ ] Ensure every section answers one concrete user question before adding supporting explanation.

#### 4. Refine Jump Bar Strategy
- [ ] Keep the sticky jump bar, but reduce visual competition between the jump pills and the section headers below.
- [ ] Consider toning down default pill emphasis while preserving the active state.
- [ ] Preserve:
  - distributed layout on larger screens
  - horizontal scroll safety on smaller screens
  - soft white active outline

#### 5. Upgrade Alert Pattern Cards
- [ ] Make the pattern cards feel more procedural and less decorative.
- [ ] Strengthen the reading order within each card:
  - pattern
  - what it means
  - what neighbors should do
- [ ] Consider adding a small urgency label or sequence marker so the escalation logic is easier to compare at a glance.
- [ ] Check whether the audio play control is visually balanced with the pattern block and not over-dominant.

#### 6. Improve Hand Signal Comparison
- [ ] Keep the expandable card pattern, but improve the closed state so users can compare gestures faster without opening every item.
- [ ] Add stronger visual distinction between:
  - gesture title
  - meaning
  - how to perform
- [ ] Evaluate whether the right-side support column should stay separate or be folded into the main compare area.

#### 7. Clarify De-escalation And Digital Backup
- [ ] Make `De-escalation` feel like the page’s “stabilize after attention arrives” section, not just another card group.
- [ ] Make `Digital Backup` explicitly frame messaging/buddy systems as support layers for the in-person protocol.
- [ ] Reduce any repeated copy patterns that make these sections feel structurally identical to the earlier ones.

#### 8. Create A Stronger Typographic System
- [ ] Define a more deliberate hierarchy for:
  - page title
  - section titles
  - operational labels
  - body copy
  - reference/helper text
- [ ] Make sure repeated card families do not all use the same “small uppercase label + short paragraph” rhythm.
- [ ] Use spacing and cadence to separate instruction from explanation more clearly.

#### 9. Final UX Polish
- [ ] Audit section density on desktop so each major block has a distinct rhythm and breathing room.
- [ ] Verify the page still reads cleanly on mobile after any hero simplification.
- [ ] Re-check motion timing so reveal order reinforces hierarchy instead of making all support elements feel equally important.
- [ ] Keep install/offline access as the closing practical next step.

### Verification Checklist
- [ ] `Signals` hero has one unmistakable primary action.
- [ ] The page flow reads top-to-bottom without strategic interruptions.
- [ ] The jump bar helps orientation without becoming the loudest element.
- [ ] Cards are easier to scan and compare.
- [ ] Typography clearly distinguishes instruction, explanation, and supporting reference.
- [ ] Desktop and mobile both feel intentional, not just responsive.

## Completed

### Mobile Fixes
- [x] Fix community reports incident report forms to have uniform sized buttons for options
- [x] Make the record function use rear-facing camera by default with flip button to switch between front/rear cameras
- [x] Fix nearest address not showing in community reports (works on localhost but not production)
- [x] Make all top menus in Record section fit on mobile (stacked layout with centered buttons)

### API & Backend Issues
- [x] Fix Legal section "Ask AI" - fixed Cloud Function URL, Referer header, model name, new API key with referrer restrictions
- [x] Add client-side rate limiting to Ask AI (5/min, 30/hour per user)
- [x] Fix submitting anonymous report sometimes adds 2 reports instead of 1
- [x] Add rate limiting: IP can only submit 3 reports per hour (server-side Cloud Function)
- [x] Add modal when adding report to same location - prompt to verify existing report instead of new pin

### UI Enhancements
- [x] Make EMERGENCY button at top flash to draw the eye
- [x] Replace location pin emoji with Phosphor map-pin-simple or map-pin-simple-area icons
- [x] Replace "choose location within 3 miles" emoji with Phosphor map-trifold
- [x] On Leaflet map in community reporting, use Phosphor map-pin-simple for plotted map points
- [x] For verified reports on Leaflet map, use shield-check Phosphor icon instead of emoji
- [x] Change Signals card emojis to corresponding bold Phosphor icons
- [x] Change whistle volume icon to Phosphor
- [x] Change Visual Signaling section emojis to Phosphor hand icons
- [x] Fix Legal Constitutional Foundation icon spacing (desktop too close, mobile responsive fix)
- [x] Added disclaimer components to all major sections (Home, Scenarios, Record, Legal, De-escalation, Whistle)

### New Features
- [x] Add testing feature to community reporting - when user enters "test" a green pin is added instead of red
- [x] When clicking "focus map" in local activity feed, scroll up to Leaflet map
- [x] Download and link whistle sounds for Signals whistle section

### Cloud Backup Implementation
- [x] Create in-app guide explaining backup options and benefits (Why Backup? modal)
- [x] Add Google Drive OAuth integration via Google Identity Services
- [x] Implement Google Drive API upload for encrypted recordings
- [x] Add backup settings UI with toggle for Google Drive vs Cloudflare R2 (or both)
- [x] Add backup status indicators in vault (backed up / pending / failed per provider)
- [x] Email Key button in Backup Settings
- [x] PIN security reminder in Backup Settings

### Security & Encryption
- [x] PIN-derived key wrapping (AES-KW via Web Crypto) — master key encrypted with PBKDF2-derived KEK
- [x] Record section gated behind PIN; other sections remain open
- [x] Key cleared from memory on leaving Record or auto-lock
- [x] Duress PIN (decoy mode) — shows empty vault on duress entry
- [x] Metadata stripping for recordings (location, EXIF removal)
- [x] Privacy settings (toggle location capture, toggle metadata strip)

### Vault & Recording
- [x] Encryption labels on vault items (encrypted locally / backed up / decrypted)
- [x] .enc file download from vault (encrypted with backup key)
- [x] DECRYPT tab for restoring .enc backup files
- [x] Safari thumbnail generation fix
- [x] Native camera option for iOS (better quality and playback)
- [x] Import media from Photos at full quality

### PWA & Branding
- [x] Make install browserless app icon work (PWA with service worker, beforeinstallprompt, manifest)
- [x] Added PWA install buttons to all sections (Scenarios, Reports, Record, Legal, Signals)
- [x] Added smooth animations to Legal section expandable buttons (spring icon, height transition)
- [x] Make tab name on mobile and desktop browsers say "SafeNeighbor.us"
- [x] Create and add favicon icons (SVG shield + generated PNGs via sharp)
- [x] Create glassmorphism PWA app icon (full-bleed for iOS masking, rounded for display)
- [x] Add in-app splash screen (inline HTML div, CSS fade-out, React useEffect removal)
- [x] Generate iOS native startup splash screens (14 device-specific apple-touch-startup-image PNGs)
- [x] Add apple-mobile-web-app-capable + black-translucent status bar for native PWA feel
- [x] Fix header alignment for black-translucent status bar (safe area inset padding)
- [x] Add Welcome modal on first visit with glassmorphism styling
- [x] Fix Welcome modal flash/blink on first load (merged backdrop layers, SW reload guard)
- [x] Add blur+scale modal animations to all modals (CommunityReports, SecuritySettings, Record, BackupSettings, PinSetup)
- [x] Improve mobile responsiveness for navigation bar and header

### SEO & Discoverability
- [x] Set up comprehensive SEO (meta tags, OG, Twitter Cards, JSON-LD, sitemap, robots.txt, llms.txt)
- [x] Generate OG image for social media sharing
- [x] Google Search Console verification and sitemap submission
- [x] Add SVG favicon reference for Google search results
- [x] Add "Safe Neighbor" keyword variants for spaced search queries
- [x] Redesign app icon with new filled group people icon (noun-group-195974) across all SVGs
- [x] Update OG image with new icon + "Anonymously Report ICE Activity" CTA
- [x] Add OG image SVG source and generation to generate-icons.js script
- [x] Clean up unused icon preview files from public/

### Recent Fixes & Additions
- [x] Added PIN/Decoy PIN reminder to Welcome modal with link to Security Settings
- [x] PIN reminder only shows when PIN not yet configured
- [x] Fixed background scrolling when modals are open in Reports section
- [x] Changed contact email to SafeNeighbor.us@proton.me on all pages
- [x] Fixed offline map tile caching — tiles were never cached due to opaque response status check bug in service worker
- [x] Added crossOrigin to Leaflet TileLayer for proper CORS tile responses
- [x] Fixed offline banner text vertical centering (asymmetric padding)
- [x] Added Features modal with scannable list of all app capabilities (5 categories, 17 features)
- [x] Added Features button (violet) to Home page header alongside Security and Welcome
- [x] Added "Prepare & Plan" category to Features modal (Family Kit, Trusted Contacts, SOS Messages, Shareable Plan)

### Civil Disobedience Rights Education (Legal Section)
- [x] Full "Know Your Rights During Civil Disobedience" section in Legal
- [x] History & legal framework (1st Amendment, landmark cases, protected vs. criminal activity)
- [x] Rights if arrested (silence, attorney, booking, bail, what not to say)
- [x] Common charges explained (trespassing, disorderly conduct, unlawful assembly, obstruction, federal vs. state)
- [x] Practical safety (before/during/after: buddy system, what to bring, de-escalation, documentation, legal support)
- [x] Historical context & Stoic connection (MLK, Thoreau, Gandhi)

### Analytics
- [x] Added Umami custom event tracking (page_view, page_exit, scenario_open, emergency_mode, emergency_purge, modal_open, sos_alert, family_kit_share)
- [x] Exit page detection via beforeunload + visibilitychange for mobile
- [x] Per-page tracking for SPA navigation (custom events since Umami only sees `/` by default)

### Emergency Location Sharing (v2)
- [x] iOS SMS separator fix — uses `;` + `&body=` on iOS vs `,` + `?body=` on Android
- [x] iPadOS 13+ detection (MacIntel + maxTouchPoints > 1)
- [x] Refactored TrustedContacts SOS to use shared `buildLocationSmsUri` (iOS fix propagates)
- [x] Firestore live location streaming — `liveLocations/{shareId}` collection with `onSnapshot`
- [x] `watchPosition` continuous GPS tracking with 30s Firestore write throttle
- [x] LiveLocationViewer component — full-screen Leaflet map for contacts opening the live link
- [x] Query param routing (`?live={shareId}`) renders viewer without app chrome
- [x] Glassmorphism "Share My Location" button with 3D depth (gradient + inset shadow + drop shadow)
- [x] Persistent live tracking when emergency panel is closed (green LIVE indicator in header)
- [x] PIN-gated stop — requires PIN entry to stop live sharing (duress PIN silently dismisses)
- [x] Removed "Share Updated Location" button when live tracking is active

### Location Sharing Security Mitigations
- [x] E2E encryption — AES-256-GCM encrypts lat/lng/address/userName before Firestore write
- [x] Signal-style link — decryption key in URL fragment (`#key=...`), never sent to server
- [x] User warning before sharing — "Before You Share" panel explains SMS interception risk and E2E encryption
- [x] TTL cleanup Cloud Function — `cleanupLiveLocations` deletes docs older than 24h (runs hourly)
- [x] Firestore rules updated to accept encrypted document format (backward compatible with plaintext)
- [x] LiveLocationViewer decrypts client-side; shows "Cannot Decrypt" if key missing/invalid

### PWA & Offline Reliability
- [x] Centralized `useOnlineStatus` hook (`useSyncExternalStore`) — replaced inline online/offline listeners across App.js, CommunityReports.js, useEncounterSync.js
- [x] IndexedDB `pendingReports` store for offline report queuing (localStorageDB.js v2)
- [x] Service worker true background sync — `sync-pending-reports` tag processes IndexedDB queue when connectivity returns
- [x] Fixed missing `deviceId` in SW background sync — baked into `serverPayload` at queue time (SW can't access localStorage)
- [x] Migrated CommunityReports offline submit from localStorage to IndexedDB queuing with encrypted payloads
- [x] All rights guides, legal scripts, scenarios, and breathing guide pre-cached — static JS imports compiled into bundles, SW caches all JS/CSS from asset-manifest
- [x] i18n translations for all 21 languages cached offline — CRA compiles dynamic imports into JS chunks included in asset-manifest
- [x] Recorded evidence cached locally via IndexedDB with optional AES-256-GCM encryption
- [x] Offline indicator banner enhanced — shows what works offline (rights, scenarios, breathing, recordings) and what needs internet (live location, AI Q&A)
- [x] By Status tab expandable cards — added Home-style hover effects (lift, border glow, gradient overlay) per persona color

### Animation & UX Polish
- [x] Initial page load uses scale-up + fade animation instead of left-slide (direction=0 handling)
- [x] Security Settings button restyled with emerald gradient matching Features (violet) and Welcome (blue) button pattern
- [x] Screen Wake Lock during recording — prevents screen dimming on iOS 16.4+ and Android
- [x] PWA Manifest Shortcuts — Record, Know Your Rights, Report Incident quick actions from home screen icon
- [x] Query param routing (`?tab=record|rights|report`) for manifest shortcut deep linking

### Browser Compatibility
- [x] Instagram/Facebook/TikTok in-app WebView graceful degradation (map fallback UI, WebView detection banner)
- [x] Global ErrorBoundary component for render crash recovery (suggests opening in Safari/Chrome)
- [x] Fix "BY STATUS" tab icon misalignment on mobile (whitespace-nowrap prevents two-word label wrapping)
- [x] Fix Safari video playback (black screen / crossed-out play icon) — root cause: CSP missing `media-src 'self' blob: data:` directive, blocking blob URLs for `<video>`/`<audio>` elements
- [x] WebKit-recommended MediaRecorder pattern — `recorder.start(1000)` timeslice + `new Blob(chunks, { type: recorder.mimeType })` for proper fMP4 concatenation
- [x] Safari MIME type detection fix — detect empty blob `.type` from Safari's MediaRecorder, use `MediaRecorder.isTypeSupported` fallback
- [x] Data URL fallback for video playback — if blob URL fails on Safari, auto-retry with `FileReader.readAsDataURL`
- [x] Service worker skip `blob:` and `data:` URL requests to prevent SW interception of media playback

### Map UX Improvements
- [x] Tighten heat map radius/blur so it doesn't cover all of Ohio when zoomed out
- [x] Make cluster pin icons scale down when zooming out (zoom-aware sizing)
- [x] Add "My Pin" toggle to show/hide location selection marker on map
- [x] Auto-show location pin when "Re-Center GPS" is clicked
- [x] Fix heatmap not rendering (test reports were excluded from heat data)
- [x] Fix heatmap density — lower per-point intensity so overlapping reports create visible hotspots
- [x] Zoom-responsive heatmap radius (geographic size stays constant, dampened scaling with 14px minimum)
- [x] Tune heatmap opacity (minOpacity 0.55, gradient with balanced alpha values)
- [x] US View zoom out further (zoom 3) to see coast-to-coast activity at a glance
- [x] Initial map load centers on user GPS at zoom 7 (regional view) instead of zoom 11 (too close)
- [x] Fix Resources toggle reliability (auto-retry on failure, mapLoaded fallback, error state UI)

### Immigration Rights "By Status" Tab (Legal Section) ✅
- [x] Add 4th "BY STATUS" tab to Legal section (rose accent, IdentificationCard icon)
- [x] Create immigrationRightsData.js with all content as structured data
- [x] "Never Sign Without an Attorney" persistent warning banner with expandable form details
- [x] 3 persona selector cards: Undocumented, Green Card, Asylum Seeker
- [x] Undocumented: What NOT to Sign, Workplace Rights (FLSA/OSHA/NLRA), Public Charge, Education, Healthcare, Tax/ITIN (6 sections)
- [x] Green Card: Stronger Rights, Criminal Conviction Dangers, Padilla v. Kentucky, Travel Warnings, Maintaining Status, Path to Citizenship (6 sections)
- [x] Asylum Seeker: Right to Apply, Credible Fear Interview, One-Year Deadline, Persecution Grounds, Alternative Protections (Withholding/CAT), Work Authorization, What NOT to Do (7 sections)
- [x] "Everyone Should Know" shared section: Healthcare (EMTALA), Education (Plyler v. Doe), Tax Rights, Special Visas (U/T/VAWA/SIJS)
- [x] Home-style hover effects on persona cards, Never Sign banner, and Everyone Should Know sections
- [x] Responsive 4-tab bar for mobile (text-[10px] sm:text-sm)

### Encounter Logging (Quick-Tap Journal) ✅
- [x] Build timestamped encounter log with quick-tap options (agents at door, asked for warrant, showed warrant, detained, vehicle description, etc.)
- [x] Auto-attach GPS coordinates and timestamps to each log entry
- [x] Make log useful for attorneys — exportable as timestamped report (encounterLogDocument.js)
- [x] "Now" mode — real-time logging with auto-start from emergency panel, running timer, GPS lock
- [x] "After" mode — after-the-fact logging with date/time picker, editable event timestamps
- [x] After-the-fact reports include "logged from memory" note for attorney transparency
- [x] Split Now/After buttons in emergency panel; Encounter Log card on Home + Scenarios pages
- [x] Resume unfinished log prompt (per mode), share report via SMS/clipboard/Web Share
- [x] Send full timestamped report (not summary) to trusted contacts via SMS
- [x] Installation Help modal with 4-step iOS Safari PWA walkthrough screenshots
- [x] "Installation Help" link added under every install button across all 8 pages
- [x] Updated breathing exercise text across all pages (DeEscalation, ScenarioDetail)
- [x] Updated Welcome modal text (ICE encounter scripts, reporting description)

### Other Completed
- [x] Added contact footer to all pages (SafeNeighbor.us@proton.me)
- [x] Fixed mobile date/time input widths in incident report form
- [x] Reordered incident report form (Date → Location buttons → Time)
- [x] Added min="0" to prevent negative values in Agents/Vehicles inputs
- [x] Centered date/time input text
- [x] Fixed iOS Safari video duration extraction (was showing 00:00)
- [x] Added 1080p quality constraints to in-app camera
- [x] Changed download button to use Web Share API for iOS compatibility
- [x] Simplified vault playback for mobile
- [x] Fixed reverse geocoding on mobile Safari
- [x] Added state abbreviation to activity feed (e.g., "123 Main St, Columbus, OH")
- [x] Fixed double submission bug with isSubmitting state guard
- [x] Added dev mode bypass for testing without rate limiting
- [x] Focus map button now scrolls to Leaflet map and centers on report location
- [x] Changed submission success popup emoji to Phosphor ShieldCheck icon
- [x] Updated Record section with consistent glassmorphism styling
- [x] Added whistle sounds to all 4 community alert signals

---

## What's Left

All app features are complete. Remaining work is infrastructure, translation quality, and outreach.

### iOS Push Notifications & Proximity Alerts
**Context**: iOS 16.4+ supports Web Push API for home-screen PWAs. However, PWAs **cannot** access background geolocation, Geofencing API, or Background Sync reliably on iOS. True background proximity alerts require a native app wrapper.

#### Option 1: Foreground Proximity Alerts ✅ (complete)
- [x] 3-tier alert system: CRITICAL (≤ 0.5 mi full-screen modal), HIGH (≤ 1.5 mi bottom toast, 8s auto-dismiss), MODERATE (≤ 4 mi top banner)
- [x] Session-key AES-256-GCM encryption for in-memory report coordinate cache (key evaporates on tab close)
- [x] `getCurrentPosition` interval polling (default 1 min) — GPS coords exist only in callback scope, never stored
- [x] Configurable poll interval: 1 / 5 / 10 / 30 min (instant hook reactivity via StorageEvent)
- [x] Configurable re-alert cooldown: 5 min / 15 min / 30 min / 1 hr / 2 hr
- [x] Saved locations as custom proximity watchpoints — each with configurable radius slider (0.5–4 mi)
- [x] Add location by GPS (current position) OR address search (Nominatim geocoding)
- [x] GPS denied → saved location checks still run on every poll tick
- [x] CRITICAL modal CTAs: "Record Now" (→ Evidence Vault) + "View Safety Plan" (→ FamilyKit)
- [x] Haptic feedback on alert (warningHaptic for CRITICAL, alertHaptic for HIGH/MODERATE)
- [x] All 21 languages, all settings reactive with no page reload

#### Option 2: "Check My Route" Feature ✅
- [x] User enters a destination address
- [x] App draws the route and flags any ICE activity hotspots along the path
- [x] Suggest alternative routes if hotspots are detected (sorted safest-first)
- [x] Dual entry point: Home page accent card + Reports map toolbar button
- [x] Privacy consent dialog before first use (location + routing data disclosure)
- [x] OpenRouteService Directions API via Cloudflare Worker proxy (API key server-side)
- [x] OSRM fallback + straight-line corridor last resort
- [x] Nominatim forward geocoding (free, no API key)
- [x] All 21 languages supported
- [x] **TESTED 2/19**: Verified real driving routes render correctly with ORS integration

#### Option 3: Push Digests — removed
Push digests UI was removed. Root cause: the `sendPushDigests` Cloud Function checks for plaintext `lat`/`lng` fields, but all new reports use `encryptedPayload` with no plaintext coordinates in Firestore — so push digests silently never fired for any encrypted report. Foreground proximity alerts (Option 1) cover the same use case without the privacy tradeoff of storing location data.

#### Option 4: Native App Wrapper
See [FutureOptions.md](FutureOptions.md) — deferred, not currently planned.

**iOS PWA Limitations to keep in mind:**
- No background geolocation access
- No Geofencing API
- Limited Background Sync support
- Web Push only works for home-screen installed PWAs (not in Safari tabs)

### Infrastructure
See [FutureOptions.md](FutureOptions.md) — deferred until scale requires it.

### Translation Quality
- [ ] **Native speaker review** for Tier 2-4 translations (16 languages, all AI-translated at 100% coverage)
  - Review CSVs generated: run `node scripts/export-review-csvs.js` → outputs to `scripts/review-csvs/`
  - Tier 2: Arabic, Tagalog
  - Tier 3: French, Somali, Amharic, Dari/Farsi, Nepali, Punjabi, Hindi, Burmese, Haitian Creole, Portuguese
  - Tier 4 (lowest confidence): K'iche', Marshallese, Russian
  - **Best starting points**: Respond Crisis Translation and Tarjimly already work in the immigrant rights space and cover Arabic, Somali, Dari/Farsi, Amharic, and Haitian Creole — the highest-need review languages for this app
  - [Respond Crisis Translation](https://respondcrisistranslation.org/en/get-involved) — specializes in immigration/asylum contexts; covers Arabic, Somali, Dari/Farsi, Amharic, Haitian Creole
  - [Tarjimly](https://www.tarjimly.org/) — on-demand volunteer translators, strong coverage of Arabic, Somali, Dari/Farsi; ideal for iterative review
  - [Translators Without Borders](https://translatorswithoutborders.org/volunteer/) — humanitarian focus; broad language coverage including Nepali, Burmese, Punjabi, Hindi
  - [Charity Translators](https://charitytranslators.org/) — volunteer network for nonprofits; good for languages underserved by the others (K'iche', Marshallese, Tagalog)

### Outreach & Marketing

> **Strategic identity**: Lead with "digital civil rights preparedness and safety app" — not activist tool. This framing builds institutional credibility, reduces platform risk, and lets moderate allies join.
> **3 message pillars** (every post, page, graphic ladders to one): **Know Your Rights** · **Document Safely** · **Alert Instantly**
> **Movement frame**: "Prepared Communities. Protected Neighbors."
> **Safe messaging rule**: Never frame as interfering with law enforcement. Always: documentation, education, safety, legal preparedness.
>
> **Competitive differentiation** (use in pitches and press):
> - *ICEwhistle* — good but limited features. SafeNeighbor has a deeper toolkit (scenarios, evidence vault, encounter log, breathing guide, family preparedness kit)
> - *Know Your Rights 4 Immigrants* — iOS only, single-developer. SafeNeighbor is web-first: instant access, no download barrier, works on any device immediately
> - *KYRC App* — backed by Kaepernick's org but broader scope, not laser-focused on encounters
> - **SafeNeighbor's edge**: a complete emergency preparedness system, not just an information card. The evidence vault, panic wipe, whistle signal, proximity alerts, and community map are genuinely differentiated. Lead with these in marketing.

---

#### Phase 0 — Positioning & Trust Infrastructure (do before growth)
*People don't adopt safety apps without trust. Build this foundation first.*

**Website additions**
- [ ] **Plain English Privacy Page** — what is encrypted, what you cannot see, what metadata exists, local vs server storage. Transparency builds viral trust.
- [ ] **"How It Protects You" Page** — simple visual diagram: User → encrypted locally → sent securely → only user + contact can decrypt
- [ ] **Legal Advisory Disclaimer** — app provides educational resources, does not encourage interference with law enforcement, supports lawful rights documentation. Protects you and reassures partners.
- [ ] **Founder Story Page** — why did you build this? People join movements, not apps.
- [ ] **60–90 sec Explainer Video** — script arc: (1) fear reality "people don't know their rights" → (2) solution "SafeNeighbor helps you…" → (3) proof (encryption, SOS, alerts) → (4) CTA "Download. Share. Protect your community." This becomes your most powerful growth asset.
- [ ] **FAQ page** (safeneighbor.us/faq) — proactively close the "Trust Gap": "Is this a government app? (No.) Do you track my location? Do you collect emails?" Answer every fear before it blocks adoption. Link from the Know Your Rights scripts. Key questions to answer: zero-knowledge explained in plain language, what happens if you get a subpoena ("can't hand over what we don't have"), whether using the app creates a digital trail.
- [ ] **Community Guidelines / "Guardian Code" page** — sets tone for reporting accuracy: report only what you personally witness (no rumors), accuracy over speed (check for existing pins before adding), no doxing private citizens, zero tolerance for false alarms, safety first (document from a safe distance). Add a 1-sentence consent reminder before report submission: "By reporting, I confirm I am witnessing this activity personally and agree to the Guardian Code."
- [ ] **Guardian's Manual PDF** — 1-page free downloadable safety guide combining everything: Stoic mindset (breathe, focus on what you can control), legal scripts for at the door + public stop, how to use the community map, emergency checklist (phone charged, contact memorized, app bookmarked, silence is absolute). Offer as download on site; send to partner orgs to print for community meetings, distribute as "glovebox" resource.
- [ ] **Technical Security Architecture page** — for privacy advocates, researchers, and org IT teams who need to vet the app before recommending it. Cover: no user accounts (no emails/phones/passwords stored), ephemeral location processing (GPS used locally, not logged), report metadata stripping, TLS 1.3 in transit, pin location jitter (coordinates slightly offset so exact reporter location can't be identified), no third-party ad pixels or tracking scripts, privacy-respecting cookieless analytics. Explicitly state the subpoena-proof policy: "We cannot be compelled to turn over what we do not possess." Link from footer + FAQ.

**Social profile setup**
- [ ] Set up Instagram, TikTok, Facebook, X (Twitter), and Threads pages with consistent branding
- [ ] Secure @SafeNeighborUS (or @SafeNeighbor_) handle consistently across all platforms before anyone else takes it
- [ ] Bio copy: "Civil Rights Preparedness App · Know your rights. Document securely. Alert instantly. 🔐 Zero-knowledge. No tracking."
- [ ] Set up link-in-bio landing page (Linktree or similar) — Web App, Privacy Policy, Partner Toolkit, Guardian's Manual PDF
- [ ] Post 3 "seed" posts before promoting — don't let people land on an empty profile grid: (1) Stoic Shield / Manifesto welcome post (2) Security spotlight: "We don't collect your name, email, or phone number" (3) CTA screenshot of "At the Door" script
- [ ] Pin manifesto post to top of all profiles: mission, three tools (live map, legal scripts, zero-knowledge encryption), Stoic philosophy foundation, safeneighbor.us link
- [ ] Dual-track posting strategy: **Brand account** (@SafeNeighborUS) = official voice, calm/authoritative, live alerts + scripts + Stoic graphics. **Personal founder account** = behind-the-scenes, "Why I Built This," authentic story. Both accounts active; personal account promotes and reposts brand.

---

#### Phase 1 — Partner Toolkit (build collateral before outreach)
*This is your "sales collateral." Build it once, use it everywhere.*

- [ ] Design printable QR postcard/sticker — "KNOW YOUR RIGHTS / CONOCE TUS DERECHOS" + safeneighbor.us, downloadable so orgs can print their own. Print on bright yellow or orange cardstock ("Yellow Card" tactic) — looks like an official safety document, easy to spot in a cluttered drawer or wallet. Use Avery 5371 business card template for home printing.
- [ ] Design window decals for local businesses — "SafeNeighbor Protected Zone. Scan for rights info." Simplified QR sticker for cafes, bodegas, laundromats, remittance shops. Creates visible community infrastructure and generates organic curiosity.
- [ ] Create double-sided wallet card version: Side A = "Emergency Legal Scripts" (stay calm, remain silent, don't open door) + large QR code. Side B = community tool description + "Zero-knowledge. We don't track your identity." + safeneighbor.us footer with Stoic quote.
- [ ] Create multi-language bulletin insert (half-page) for church/mosque/gurdwara programs
- [ ] Write 60-sec explainer blurb orgs can copy-paste into newsletters/emails
- [ ] Build Partner Toolkit landing page or PDF: QR assets + co-branding instructions + social copy + video
- [ ] Create downloadable Ambassador Toolkit: social graphics, caption templates, QR code, printable rights cards
- [ ] Draft partnership pitch email template (ready to personalize and send) — lead with utility and security, not features. Mention: zero-knowledge model, no identity data collected, step-by-step legal scripts, live community heat map. Offer IT/legal team walkthrough of encryption. Include demo link. Close with 10-min call ask. Key personalization: mention a recent local win or campaign of theirs in opening paragraph.
- [ ] Host "Digital Defense & Physical Safety" webinars — 30–45 min workshops for community orgs or congregation groups (offer Zoom). Teach app usage as part of a broader safety protocol. Positions SafeNeighbor as a service, not just a link to share.

---

#### Phase 2 — Week 1: Seed Trust (target 100–500 early adopters)
*Private outreach first. Pitch: "We'd love your feedback and would be honored to support your community." Do NOT lead with tracking ICE — lead with rights education + encryption.*

**National org outreach**
- [ ] ACLU — draft outreach email (lead with civil rights preparedness angle)
- [ ] United We Dream — largest immigrant youth network nationally
- [ ] NILC (National Immigration Law Center) — already publishes KYR cards
- [ ] RAICES — large national org with strong grassroots base
- [ ] ILRC (Immigrant Legal Resource Center) — works with legal service providers nationwide
- [ ] FIRM (Fair Immigration Reform Movement) — coalition of grassroots orgs
- [ ] NDLON (National Day Laborer Organizing Network)

**State/local org outreach**
- [ ] State coalitions: CIRC (Colorado), MIRA (New England), Immigrant Defense Network (Minnesota)
- [ ] Local sanctuary churches and immigrant defense coalitions
- [ ] University immigrant resource centers
- [ ] Community legal clinics

**Faith community pipeline**
- [ ] Contact diocesan immigration ministries (Catholic parishes are massive in Latino communities)
- [ ] Reach out to Interfaith Immigration Coalition
- [ ] Offer to present at congregation meetings via Zoom
- [ ] Distribute bulletin inserts through faith community contacts

**Immigration lawyer network**
- [ ] Contact local immigration bar associations
- [ ] Present at CLE (Continuing Legal Education) events — attorneys get credit, you get a room full of people who see vulnerable clients every day
- [ ] Create one-pager lawyers can hand to every client or post in their office
- [ ] Offer a "Recommended by [Law Firm Name]" co-branded version — attorneys more likely to distribute if their name is on it
- [ ] Get listed on immigrationadvocates.org as a complementary tech resource

**Privacy community & security validation**
- [ ] Request security/privacy audit from EFF (Electronic Frontier Foundation) — draft outreach email explaining zero-knowledge architecture, offer to walk through technical implementation. Third-party validation from a credible privacy org = massive credibility multiplier. If EFF endorses or even tweets about it, user adoption will spike.
- [ ] Identify independent privacy researchers and civic-tech security researchers on X/GitHub to request informal review of the zero-knowledge claims — "Does our architecture actually deliver what we promise?"
- [ ] Seek listing on privacy-focused app directories (privacyguides.org, prism-break.org, etc.)

**Digital organizer outreach**
- [ ] Identify active Signal and Telegram groups where community safety organizers already communicate — be a helpful resource in these spaces (share rights guides, answer questions), not a spammer. Never lead with the app; lead with useful information.
- [ ] Reddit/Quora engagement — answer rights questions in r/Immigration, r/CivilRights, r/legaladvice, and local city subreddits (r/Chicago, r/LosAngeles, etc.). Link to specific guides naturally in context of answering the question; do not post promotional links cold.

---

#### Phase 3 — Week 2: Social Proof (content engine)
*Repetition is the strategy. Same message, different angles, 3–5x/week.*

**TikTok & Instagram Reels — "Know Your Rights" series**
- [ ] Script: "What to do if ICE knocks on your door" (30-sec scenario walkthrough)
- [ ] Script: "Can ICE enter your home without a warrant?"
- [ ] Script: "3 things you should NEVER do during an ICE encounter"
- [ ] Script: "This app records everything if you get stopped" (feature demo)
- [ ] Script: "Your neighbor is being detained — here's what to do RIGHT NOW"
- [ ] Carousel: "3 Things You Should Never Say…" graphic series
- [ ] Anonymous testimonials — "A neighbor in [City] used SafeNeighbor when…" format. No names, no identifying details. Social proof without privacy risk.
- [ ] Founder talking directly to camera — "Why I built this"
- [ ] All content: English + Spanish captions, fear-to-empowerment arc, trending audio

**"Protect Your Neighbor" ally content**
- [ ] Content angle: "What to do if you witness an ICE raid on your block" — constitutional rights for ALL residents
- [ ] Shareable post template: "I downloaded SafeNeighbor. You should too."

**Rapid response prep**
- [ ] Draft template posts for breaking enforcement news: "[City] — ICE operations reported. Know your rights → safeneighbor.us"
- [ ] Have posts ready to publish within minutes of major ICE news stories

**Twitter/X thread scripts** (draft and queue these — ready to deploy when accounts are set up)
- [ ] Thread Option 1 — "Emergency Preparedness" (6 posts): Opens with "Most people think they know their rights but panic takes over" → Post 2: "A knock at the door — do you open it?" + script → Post 3: "Stopped on the street — right to remain silent" → Post 4: "The power of the neighborhood — anonymous live map" → Post 5: "Why trust us? No email, no phone, encrypted on YOUR device" → Post 6: CTA + safeneighbor.us + hashtags
- [ ] Thread Option 2 — "Privacy Tech / Anti-Surveillance" (5 posts): Appeals to tech/privacy crowd. Opens "Surveillance is everywhere — your safety tools shouldn't be part of the problem" → explains zero-knowledge architecture → "local encryption > cloud storage" → "community heat map, updated by neighbors for neighbors" → CTA
- [ ] Hashtag strategy: Primary: #SafeNeighbor #KnowYourRights #CivilLiberties #MutualAid — Secondary: #PrivacyMatters #ZeroKnowledge #CommunityProtection #ImmigrationRights

**Stoic brand content**
- [ ] Create "Stoic Safety" quote graphics series for Instagram/Threads — text-based image posts building the "Guardian" brand identity: Marcus Aurelius, Epictetus quotes framed around community preparedness and civic duty. Calm, authoritative aesthetic.
- [ ] Press release template (ready to send to local independent news) — angle: "New privacy-first platform empowers neighborhoods to monitor law enforcement activity and protect civil rights." Include screenshot of Know Your Rights scripts. Target: local papers, civil rights bloggers, NPR affiliates, community radio, Spanish-language radio stations.

---

#### Phase 4 — Week 3: Community Champions
*Find 10 micro-influencers. Offer: early access, live walkthrough, co-hosted Instagram Live, affiliate tracking link.*

- [ ] Immigration attorneys active on TikTok/Instagram
- [ ] Civil rights educators and community organizers
- [ ] Latino creators with engaged followings
- [ ] Privacy advocates and tech journalists
- [ ] University & student org partnerships — UndocuScholars, campus DACA alliances, multicultural centers
- [ ] Host "Know Your Rights on Campus" workshops — pre-law clubs and social justice orgs will co-host
- [ ] Recruit student ambassadors who promote SafeNeighbor on their own channels (they have credibility with their peers that a brand account doesn't)

---

#### Phase 5 — Week 4: Earned Media
*Pitch angle: "New encrypted civil rights preparedness app launches to help families stay safe."*

- [ ] Local news in immigrant-heavy metros
- [ ] Independent journalists covering immigration/civil rights
- [ ] Civil rights and immigration podcasts
- [ ] Tech privacy blogs
- [ ] Target publications: Democracy Now!, Latino Rebels, Prism, The Intercept
- [ ] Spanish-language radio stations (hugely influential, often overlooked)
- [ ] Local access TV segments in immigrant-heavy metros — often overlooked, loyal viewership

---

#### Phase 6 — QR Code Guerrilla Distribution (ongoing, start local)
- [ ] Laundromats, bodegas, taquerias, check-cashing stores, remittance shops
- [ ] Immigration lawyer waiting rooms
- [ ] ESL classroom bulletin boards
- [ ] Community health clinics
- [ ] Public libraries (immigrant resource sections)

---

#### Phase 7 — Retention & Viral Loops (build into app)
*Most activism apps fail at retention. Build these in-app prompts.*
*Core messaging principle: "Fear converts once. Preparedness builds retention." Use language like "Prepared doesn't mean afraid" and "Know your rights before you need them" — urgency without panic.*

- [ ] After SOS setup: in-app prompt "Add one more trusted contact"
- [ ] After reading rights page: in-app prompt "Share this rights card"
- [ ] Weekly push notification: "Did you review your rights this month?"
- [ ] Monthly safety tip notifications
- [ ] Update log transparency (show users what changed and why)
- [ ] **Monthly community impact transparency posts** — "This month, X neighbors were alerted across Y zones" — posted to social and optionally shown in-app. Builds trust over time; shows the map is alive and useful.

**Guardian Badge gamification system** (browser-based, no accounts, privacy-first)
*Rewards reporting engagement without tracking identity. Everything stored in localStorage only — evaporates when user clears browser data.*
- [ ] Level 1 — **The Observer**: First report OR 5 verifications → toast: "Your verification helped [N] people stay safe. You've earned the Observer badge."
- [ ] Level 2 — **The Sentinel**: 10 verifications / 3 reports → shield with torch icon
- [ ] Level 3 — **The Guardian**: 25 verifications / 5 reports → shield with interlocking hands
- [ ] Level 4 — **The Pillar**: 50+ community actions → shield within Greek pillar
- [ ] "My Impact" page (/my-impact) — reads localStorage, displays earned badges, shows aggregate community actions. Include a "Wipe My History" button that clears localStorage instantly — privacy-first escape hatch.
- [ ] Social share for badges — generates generic image: "I am a verified Community Guardian on SafeNeighbor.us. I've helped keep my neighborhood informed and protected. #KnowledgeIsProtection" — no location, no identity in the share.
- [ ] Physical partner incentives (future) — "Sanctuary-Friendly" local business partnerships where showing a Pillar badge earns a discount or free coffee, turning digital engagement into real-world community bonds.

---

#### Phase 8 — Longer Plays (ongoing)

**SEO & Content Marketing**
- [ ] Write 5–10 blog posts targeting high-intent searches:
  - "What are my rights if ICE comes to my door"
  - "Can ICE enter my home without a warrant"
  - "How to record police encounters legally"
  - "Know your rights during immigration stop"
- [ ] State-specific rights pages (50 states = 50 high-value evergreen pages)

**SMS Campaign**
- [ ] Partner with orgs on "Text RIGHTS to [number]" → sends SafeNeighbor link + rights summary
- [ ] Evaluate Community.com or Twilio for delivery

**Neighborhood Safety Ambassador Program**
- [ ] 3-step ask: (1) Download (2) Share with 5 people (3) Post one rights graphic
- [ ] Make ambassadors feel like leaders — give them a title and a toolkit

### Planned Features (Roadmap)

> **Highest viral potential** (build these first — journalists and community organizers will talk about them):
> 1. **Rapid Legal Response Button** — one tap to a duty attorney is something no other app does
> 2. ~~**Family Safety Plan PDF Builder**~~ ✅ Done (FamilyKit.js + familyKitPDF.js)
> 3. **Dead Man's Switch encrypted backup** — solves a real fear (phone seizure) no one else is addressing

#### Community & Trust Building
- [x] **Flag False Reports** — Flag button on each report card, `flaggers` array in Firestore with per-device tracking, auto-hide at 4+ flags with "under review" state, FlagBanner icon with fill state for already-flagged
- [x] **Verified Witness Network (Passive Model)** — Opt-in "Community Witness Mode" toggle in Notification Settings (localStorage only, zero server footprint). Enhanced CRITICAL alerts with teal witness badge, "Respond as Witness" button (→ Encounter Log Now mode), expandable 4-step quick reference guide. Enhanced HIGH alerts with teal witness button. All 21 languages. Included in data wipe.
- [x] **Trusted Contacts refresh from Legal Help** — Clicking "Manage Trusted Contacts" from Get Legal Help now forces TrustedContacts to re-mount, picking up any organizations/hotlines saved during the session.
- [ ] **Know Your Neighbors** — Anonymous neighborhood safety circles organized by zip code. Coordinate without revealing identity — like a Signal group auto-organized through the app.

#### Community Witnessing Guide ✅
A legally-grounded, non-confrontational guide for community members who want to document ICE/DHS/USBP activity as witnesses — not participants. Framed as civil liberties literacy, not activism. Everything grounded in First Amendment case law (Glik v. Cunniff, Fields v. City of Philadelphia).

**Guide sections (CommunityWitnessing.js — 378 lines, full i18n across 21 languages):**
- [x] **Positioning & Distance** — Safe/lawful distance rules, compliance guidance, 4-point checklist
- [x] **What to Document** — 8-item tap-to-check documentation checklist (agency, badges, plates, warrant, name, etc.)
- [x] **The Name-to-Detention Pipeline** — 5-step pipeline: get name → ICE Detainee Locator → connect family/attorneys
- [x] **How to Respond if Agents Approach** — Script callout: "I am observing from a public space and exercising my First Amendment rights."
- [x] **The "Witness vs. Party" Legal Distinction** — Do/Don't split with clear obstruction warning
- [x] **De-escalation & Stoic Presence** — Marcus Aurelius quote, emotional regulation guidance
- [x] **Offline-first** — All guide content compiled into JS bundles, works without signal

**App integrations:**
- [x] Scenario card `community-witnessing` in Scenarios list and Home page
- [ ] Evidence Vault "Witness Report" template — pre-structured for detention documentation (distinct from "I'm being encountered" mode)
- [ ] Community Reports map: "I witnessed this detention — what now?" deep link into witnessing guide + name pipeline
- [ ] Encounter Log "Witnessing Mode" — separate logging flow distinct from personal encounter mode
- [x] Features modal addition under Community category

#### Family & Household Preparedness
- [x] **Family Safety Plan Builder** — Guided 7-step wizard (FamilyKit.js), localStorage persistence, printable PDF generation (familyKitPDF.js), shareable document, import from Trusted Contacts, all 21 languages.
- [ ] **Minor Protection Card Generator** — Printable wallet cards for children: their rights, emergency contacts, and key phrases in multiple languages.

#### Legal & Professional Integration
- [ ] **Attorney on Call Directory** — Curated, verified directory of immigration attorneys and legal aid orgs by city/county. Seed data from CLINIC (cliniclegal.org), AILA (ailalawyer.com), LawHelp.org, ILRC, and Vera Institute. Tier 1: static hours/phone/languages spoken. Tier 2: partner portal with manual availability toggle. Tier 3: API-based availability from org scheduling tools.
- [ ] **Rapid Legal Response Button** — One tap sends pre-formatted alert (location, time, description) to a partnered legal org's intake line or duty attorney. Coalition approach: partner with CLINIC or United We Dream at the national level rather than individual orgs.
- [ ] **Know Before You Go** — Courthouse and federal building safety advisories. Users check a location before entering; ICE has increasingly made arrests near courthouses.

#### Documentation & Evidence
- [ ] **Dead Man's Switch encrypted backup** — If user doesn't check in within a set time window, encrypted evidence and a pre-written alert message automatically go to designated contacts or legal organizations.
- [ ] **Witness Upload Portal** — Bystanders who filmed or witnessed an encounter submit footage anonymously to a legal org partner. Not stored on SafeNeighbor servers — routed directly to partner.

#### Education & Outreach
- [ ] **Know Your Rights Quiz with Shareable Badges** — Short rights literacy quiz with shareable completion certificates. Grassroots marketing: people share badges on social, spreading app awareness organically.
- [ ] **Scenario Simulator for Kids** — Age-appropriate, non-scary version helping families practice what to say and do together. Designed for schools and community center workshops.
- [ ] **Clergy & Organizer Dashboard** — Separate view for trusted community leaders: aggregated anonymized activity in their area, push safety alerts to congregation, training materials. Turns faith communities into distribution partners.

#### Accessibility & Reach
- [ ] **SMS Fallback Mode** — Stripped-down version that works entirely over SMS. Text a keyword to a number and receive rights information back. Expands reach to users with no smartphone or no data.
- [ ] **Offline-First Mode** — Downloadable package: full rights guide, local attorney contacts, and family plan available with zero connectivity. Critical for rural communities and people who turn off data to avoid tracking.
- [ ] **Accessibility Mode** — High contrast, large text, screen reader optimization, and audio playback of rights information for users with visual impairments or low literacy.

#### Partnership Outreach
- [ ] Email CLINIC national office (cliniclegal.org) — attorney directory data partnership pitch
- [ ] Email ILRC (ilrc.org) — data partnership and rapid response integration
- [ ] Research RAICES, United We Dream, NILC for Rapid Legal Response coalition
- [ ] Research local rapid response networks by city ("rapid response network [city]") — SafeNeighbor as the app layer on top of existing Signal/WhatsApp groups

---

### Known iOS Safari Limitations (Cannot Fix)
- **Vault save to Photos**: iOS Safari blocks saving IndexedDB-reconstructed blobs to Photos. Workaround: save immediately after recording, use native camera, or use cloud backup.

---

## PWA Offline Customization Reference

### How Offline PWA Works (The Big Picture)
Three files control the experience:
1. **manifest.json** — controls look and feel (icon, splash screen, name, theme color, display mode)
2. **service-worker.js** — the engine. Intercepts every network request and decides: serve from cache, fetch from network, or show a fallback
3. **React app code** — detects online/offline status and adapts the UI accordingly

### What You Can Customize

#### 1. Splash Screen & Theming (manifest.json)
Controls what users see when they tap the icon before the app loads:
```json
{
  "name": "SafeNeighbor",
  "short_name": "SafeNeighbor",
  "start_url": "/",
  "display": "standalone",
  "background_color": "#0a0a0a",
  "theme_color": "#3b82f6",
  "orientation": "portrait",
  "icons": [
    { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png" },
    { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png" },
    { "src": "/icon-maskable.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
  ]
}
```
- `"display": "standalone"` — looks like a native app with no browser chrome
- Maskable icon ensures icon looks right on Android's adaptive icon shapes
- `"display": "fullscreen"` for zero system UI

#### 2. Service Worker Caching Strategies
The heart of offline functionality. Pre-cache critical assets so they load instantly — even with no internet:
```js
// service-worker.js
const CACHE_NAME = 'safeneighbor-v1';

// Cached at install time — available offline immediately
const PRECACHE_URLS = [
  '/', '/index.html', '/static/js/main.js', '/static/css/main.css',
  '/rights-guide', '/emergency-breathing',
  '/scenario/traffic-stop', '/scenario/home-visit',
  '/offline.html'
];

// INSTALL: pre-cache critical resources
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => cache.addAll(PRECACHE_URLS))
      .then(() => self.skipWaiting())
  );
});

// ACTIVATE: clean up old caches when you deploy updates
self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys().then(keys =>
      Promise.all(
        keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k))
      )
    ).then(() => self.clients.claim())
  );
});

// FETCH: intercept requests and decide what to serve
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached) {
        // "Stale while revalidate" — serve cached, update in background
        fetch(event.request).then(response => {
          caches.open(CACHE_NAME).then(cache => {
            cache.put(event.request, response);
          });
        });
        return cached;
      }
      // Not in cache — try network, fall back to offline page
      return fetch(event.request).catch(() => {
        return caches.match('/offline.html');
      });
    })
  );
});
```
- **Install event** — downloads and caches every URL in PRECACHE_URLS on first visit/install
- **Activate event** — when you push a new version (change CACHE_NAME to v2), old cache gets deleted
- **Fetch event** — every request goes through this; checks cache first (instant load), quietly updates from network in background

#### 3. Adaptive UI Based on Connection Status
Detect online/offline in React components and change the experience accordingly.

---

## Completed (Archive)

<details>
<summary>Click to expand completed items</summary>

### Privacy & Data Hardening ✅
- [x] Move encryption key server to Swiss VPS (Infomaniak) — `key.safeneighbor.app` with Let's Encrypt SSL
- [x] Remove US-hosted Cloud Function key fallback — key served exclusively from Switzerland
- [x] Delete `getReportKey` Cloud Function from Firebase

### Before an Encounter — Preparation & Education ✅
- [x] Family Preparedness Kit — 7-step walkthrough, localStorage persistence, shareable document, import from Trusted Contacts
- [x] Trusted Contact Network — 3 emergency templates, one-tap SMS alerts, local-only storage

### During an Encounter — Real-Time Tools ✅
- [x] Live Location Sharing — GPS streaming, E2E encryption (AES-256-GCM), Signal-style URL keys, 24h TTL cleanup
- [x] Encounter Logging — timestamped quick-tap journal, Now/After modes, auto-sync to cloud backup, attorney-ready export

### After an Encounter — Next Steps ✅
- [x] Post-Encounter Guide — branching scenarios, checklists, hotline buttons, shareable report
- [x] Legal Resource Directory — 200+ orgs across 50 states, searchable/filterable, collapsible cards with phone/website

### Community-Level Features ✅
- [x] ICE Activity Heat Map — leaflet.heat with zoom-responsive radius, density visualization, recency decay
- [x] Community Resources — Overpass API safe zone mapping, color-coded markers, walking directions

### Multi-Language Translation ✅
- [x] 21 languages (1 English + 20 translated) at 100% coverage (1,975 keys each)
- [x] Language selector with search + tiered grouping, lazy loading, RTL support
- [x] Tier 1 (high confidence): Spanish, Chinese, Vietnamese, Korean
- [x] Tier 2-4 (AI-translated): Arabic, Tagalog, French, Somali, Amharic, Dari/Farsi, Nepali, Punjabi, Hindi, Burmese, K'iche', Marshallese, Russian, Haitian Creole, Portuguese

### Final Features ✅
- [x] Family Kit multi-language — All FamilyKit.js content uses i18n `t()` — translates with language selector
- [x] Offline Rights Card — Two-sided know-your-rights card (dark/red), print wallet cards, share/copy/email, fully offline, all 21 languages
- [x] Translation review CSV export tooling (`scripts/export-review-csvs.js`)
- [x] Git commit & push — 138 files, +63,508 lines

</details>
