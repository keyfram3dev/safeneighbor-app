# SafeNeighbor App Audit Remediation Plan

This plan turns the current design and content audit into concrete implementation work for the next four major surfaces:

- Scenarios
- Record
- Legal
- Community Reports

The goal is not a full rewrite. The goal is to make each area feel more intentional, easier to scan, and more trustworthy while following the existing app architecture and visual language.

## Priorities

Recommended implementation order:

1. Scenarios
2. Record
3. Legal
4. Community Reports

This order is based on user impact and scope:

- `Scenarios` is closest to core guidance and can improve quickly with IA and semantics work.
- `Record` is high-value but needs stronger task simplification.
- `Legal` needs content architecture more than feature work.
- `Community Reports` is powerful but more complex, so it should come after shared patterns are stronger.

## Phase 1: Scenarios

### Main problems

- Core actions still use clickable non-semantic cards.
- The page reads like a flat library more than a fast-response guide chooser.
- Urgent and preparatory tools compete visually.
- The screen could do more to help a user choose the right guide quickly.

### Goals

- Make the surface feel like a guided response launcher.
- Improve scan speed and semantic interaction.
- Separate urgent encounter guidance from prep tools and reference tools.

### Concrete changes

1. Replace clickable `motion.div` scenario cards with semantic `button` elements.
   Files:
   - [src/components/Scenarios.js](/Users/mitchrutter/Documents/my-projects/safeneighbor-app/src/components/Scenarios.js)

2. Reorganize the page into grouped sections.
   Suggested structure:
   - `What Is Happening Right Now`
   - `Prepare Ahead`
   - `Know Your Rights`

3. Promote the main urgent scenario guides into a more obvious top cluster.
   Suggested top items:
   - ICE at my door
   - Stopped on the street
   - Vehicle stop
   - Border crossing

4. Move Family Kit and Trusted Contacts into a quieter preparation section.

5. Add short sublabels or micro-copy that clarify when to use each scenario.
   Example:
   - `Speak through the door without opening it`
   - `Use when stopped in public`

6. Tighten section copy so the screen feels more directive and less like a card catalog.

### Success criteria

- A user can find the right scenario faster.
- The top half of the screen feels urgent and guided.
- Prep tools no longer compete with active-encounter choices.

## Phase 2: Record

### Main problems

- The screen is trying to do too many jobs at once.
- Recording, vault, backup, access control, and destructive actions all compete.
- The workflow guidance feels session-fragile rather than intentionally staged.
- The surface likely feels more operationally dense than necessary.

### Goals

- Make the primary action unmistakable.
- Separate recording from storage/security management.
- Make guidance feel deliberate instead of incidental.

### Concrete changes

1. Split the screen visually into three zones:
   - `Capture Now`
   - `Secure And Manage`
   - `Danger Zone`

2. Make recording the dominant first action.
   Suggested primary cluster:
   - Start recording
   - Start audio only
   - Quick explanation of where media is stored

3. Move backup/restore and vault management into a quieter management section lower on the screen.

4. Move purge and destructive controls into an isolated danger section with stronger visual separation.

5. Replace the load-scoped workflow-guide behavior with more intentional rules.
   Suggested approach:
   - show only when no recording exists yet
   - or show once per device state and dismiss persistently

6. Tighten copy around privacy and storage behavior.
   Aim for:
   - clearer file-safety language
   - less infrastructure-heavy wording
   - more direct user-facing explanations

### Success criteria

- The first thing a user sees is how to start capturing safely.
- Security and backup tools feel available but secondary.
- Destructive actions no longer compete with the main task.

## Phase 3: Legal

### Main problems

- The experience risks reading like a content dump.
- Large amounts of legal content are embedded directly in the component.
- Mobile users likely face too much dense information at once.
- The legal surface needs stronger progressive disclosure and clearer pathways.

### Goals

- Make Legal feel like a guided legal-help experience.
- Reduce cognitive load while keeping depth available.
- Improve the distinction between urgent help, reference help, and state-specific detail.

### Concrete changes

1. Pull large embedded legal/state content into a separate data module.
   Files:
   - [src/components/Legal.js](/Users/mitchrutter/Documents/my-projects/safeneighbor-app/src/components/Legal.js)
   - likely a new file such as `src/data/legalStateGuides.js`

2. Rebuild the screen into guided entry points.
   Suggested structure:
   - `Need Legal Help Right Now`
   - `Find State-Specific Information`
   - `Know Your Rights`
   - `Reference Library`

3. Add stronger top-level decision cards so users choose a path instead of scanning one dense screen.

4. Use progressive disclosure for state guides.
   Examples:
   - searchable state selector
   - compact state summary card
   - expand for detail only when needed

5. Tighten legal copy for mobile readability.
   Focus on:
   - shorter paragraphs
   - clearer headers
   - callout blocks for urgent advice vs explanation

6. Standardize legal callouts.
   Suggested categories:
   - `What to do now`
   - `What not to do`
   - `What to say`
   - `When to get a lawyer`

### Success criteria

- Legal feels guided, not dumped.
- Users can get urgent help without wading through reference content.
- State-specific information feels available without overwhelming the page.

## Phase 4: Community Reports

### Main problems

- The experience is feature-rich but cognitively heavy.
- Submission, live map, verification, safety logic, and resources all compete.
- The screen may feel too system-aware and infrastructural in places.
- Trust cues can be stronger and more user-facing.

### Goals

- Make the reports experience easier to understand at a glance.
- Reduce feature competition.
- Keep the power while hiding unnecessary complexity.

### Concrete changes

1. Reframe the top of the screen around three clear jobs:
   - `See What Is Happening`
   - `Report Activity`
   - `Verify And Help`

2. Make the map/list relationship clearer.
   Options:
   - stronger toggle between map and feed
   - or a more deliberate split with one mode visually primary

3. Demote backend-aware or technical complexity from the main reading path.
   Examples:
   - location fallback detail
   - rate limit messaging
   - verifier logic explanations

4. Improve the report submission flow hierarchy.
   Make the form feel like:
   - quick, serious, trustworthy
   - clear on what gets shared
   - clear on what stays private

5. Strengthen trust cues.
   Suggested additions:
   - how reports are reviewed
   - what “verified” means
   - when to report vs when to seek immediate help

6. Separate supportive resources from the main live-report surface so they do not compete with map/report actions.

### Success criteria

- A user immediately understands what reports are for.
- Reporting feels clear and trustworthy.
- The page feels less like a control panel and more like a community safety tool.

## Cross-Cutting Standards

These should apply to all four areas as work begins:

1. Use semantic buttons and links for all major interactive cards.

2. Separate primary, secondary, and destructive actions visually and structurally.

3. Prefer plainspoken, field-ready copy over abstract product language.

4. Use progressive disclosure instead of long stacked information blocks.

5. Keep mobile scan speed as the default design constraint.

6. Preserve the current SafeNeighbor tone:
   - calm
   - practical
   - credible
   - urgent only when needed

## Suggested Implementation Sequence

### Pass 1

- Scenarios semantics and regrouping
- Record primary-action hierarchy

### Pass 2

- Legal restructuring and content extraction
- Record danger-zone and management simplification

### Pass 3

- Community Reports IA cleanup
- Cross-screen copy tightening

### Pass 4

- Shared polish and consistency pass across all four areas

## Validation Checklist

After each pass:

```bash
npm test -- --watch=false
npm run build
```

Questions to ask after each implementation:

- Is the primary action obvious in under 3 seconds?
- Can a stressed user find the right path without reading everything?
- Does the screen feel like a guided tool instead of a feature pile?
- Does the copy sound like SafeNeighbor?
