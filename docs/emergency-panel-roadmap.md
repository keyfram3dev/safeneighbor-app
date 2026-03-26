# Emergency Panel Roadmap

This document captures the next round of design, content, and structural improvements for the emergency panel currently rendered in [src/App.js](/Users/mitchrutter/Documents/my-projects/safeneighbor-app/src/App.js).

## Current State Summary

The emergency panel already does a lot:
- opens quickly from the global header and Home
- supports live location sharing
- links into high-priority scenarios
- provides legal help, encounter logging, post-encounter guidance, and safety check-in
- includes calming elements like breathing and a quote
- includes destructive emergency purge access

What it still lacks is stronger hierarchy and sequencing. Right now it feels like a long stacked tool sheet rather than a calm, high-trust emergency command center.

Main issues:
- too many equal-weight blocks competing for attention
- urgent actions, support tools, reflection, and low-priority utility content all live in one vertical stack
- destructive actions sit too close to routine emergency actions
- scenario choices are clear but not grouped by user intent
- the panel is visually functional but not yet premium or especially reassuring under stress
- supporting copy is accurate, but some of it is too dense for a true crisis surface

## Goals

The improved emergency panel should:
- reduce cognitive load immediately
- make the next action obvious in under 2 seconds
- feel calm, trustworthy, and intentional
- separate immediate response from secondary and destructive actions
- make safety-critical flows easier to scan and harder to misuse

## Phase 1: Rebuild Information Hierarchy

Goal:
- reorganize the panel by urgency and user intent instead of one long tool stack

Changes:
- create a clear top-level structure:
  - immediate actions
  - get help and share
  - document and follow-up
  - calm and reset
  - utilities and destructive actions
- move breathing/reflection lower so they support the flow without interrupting urgent actions
- separate the purge action into its own low-visibility danger zone
- make legal help and location sharing feel like first-class actions, not just sibling blocks

Suggested order:
1. emergency header and reassurance line
2. primary action cluster
3. scenario selection
4. secondary support tools
5. calm/reset content
6. install/helpful utilities
7. danger zone

Success criteria:
- the panel feels like an emergency workflow, not a long modal
- the first visible actions match the most likely needs in a stressful moment

## Phase 2: Redesign The Top Action Cluster

Goal:
- make the top of the panel immediately actionable and unmistakable

Changes:
- turn the top of the panel into 2 to 3 prominent action cards/buttons:
  - share my location
  - get legal help
  - choose scenario / what is happening
- give live location state a more obvious “active / sent / tracking” treatment
- reduce the visual density of the share warning step
- surface trusted-contact readiness more cleanly when setup is missing

Design ideas:
- use larger primary cards with clearer icons and short supporting text
- add a more deliberate active-state treatment for live tracking
- use a compact inline reassurance line like:
  - encrypted
  - share only when you choose
  - stops when you stop it

Success criteria:
- users immediately know where to start
- live location feels dependable and understandable

## Phase 3: Improve Scenario Selection

Goal:
- make situation selection faster and more intuitive under stress

Changes:
- group scenarios under a stronger heading like “What is happening right now?”
- redesign the 4 main scenario buttons as larger, clearer response cards
- optionally add 1-line sublabels to each:
  - ICE at my door: what to say through the door
  - stopped in public: silence and consent guidance
  - vehicle stop: traffic-stop rights
  - border/checkpoint: special search rules
- make the scenario choices visually distinct from secondary tools

Design ideas:
- use a 2x2 grid on larger screens and strong stacked cards on mobile
- improve icon container consistency
- add stronger hover/focus states and clearer selected/pressed behavior

Success criteria:
- users can identify their scenario faster
- scenario entry feels like the core of the panel, not one section among many

## Phase 4: Separate Primary, Secondary, And Danger Actions

Goal:
- prevent accidental misuse and improve trust

Changes:
- classify actions into:
  - primary: share location, legal help, scenario guidance
  - secondary: encounter log, post-encounter, safety check-in
  - danger: purge data
- move purge into a bordered danger section with stronger explanatory copy
- avoid placing purge near everyday emergency actions
- consider requiring an additional confirm step or hold-to-confirm pattern for purge

Design ideas:
- use distinct visual systems:
  - strong red/amber emphasis for urgent actions
  - quieter slate/glass surfaces for support tools
  - contained danger card for purge

Success criteria:
- destructive actions no longer visually compete with help-seeking actions
- the panel feels safer and more deliberate

## Phase 5: Tighten Copy And Tone

Goal:
- make the panel read faster and sound calmer

Changes:
- shorten subtitles and helper text throughout
- reduce all-caps overload where it harms readability
- rewrite headings to sound calm and directive, not just loud
- tighten location-warning copy into shorter bullets
- make “what this does” language more concrete and less repetitive

Content direction:
- calm, direct, trustworthy
- short sentences
- tell the user what happens next
- use warnings sparingly and precisely

Success criteria:
- copy is easier to scan under stress
- the panel sounds like a trusted guide, not a collection of system messages

## Phase 6: Build A Stronger Calm/Reset Section

Goal:
- keep calming tools available without interrupting the urgent flow

Changes:
- group breathing and the quote into a distinct lower “steady yourself” section
- make the breathing tool feel intentionally supportive rather than appended
- consider hiding the quote behind a smaller expandable or lower-emphasis treatment

Design ideas:
- treat this as an interlude/support zone
- use softer contrast and quieter typography

Success criteria:
- calming tools are present but do not crowd the urgent decisions
- the panel feels emotionally steadier

## Phase 7: Improve Mobile Ergonomics

Goal:
- make the panel easier to use one-handed on phones

Changes:
- increase tap target clarity for top actions
- ensure the most important actions appear without too much scrolling
- reduce dense stacked spacing where it slows scanning
- make the bottom safe-area and dismissal behavior feel intentional
- keep the panel easy to reopen while live tracking is active

Success criteria:
- top actions are reachable and obvious on mobile
- the panel feels like a purpose-built emergency mobile surface

## Phase 8: Strengthen Accessibility And State Feedback

Goal:
- make the panel clearer for all users and safer in edge cases

Changes:
- improve screen-reader descriptions for live state, warnings, and destructive actions
- announce state changes like location shared, tracking active, and errors more clearly
- ensure focus order follows urgency
- improve the semantics of grouped sections and action clusters
- strengthen visible state feedback for active tracking and disabled/loading states

Success criteria:
- emergency state changes are understandable without relying on visuals alone
- accessibility quality matches the seriousness of the feature

## Phase 9: Visual Polish Round

Goal:
- make the emergency panel feel premium and trustworthy

Changes:
- introduce a stronger top surface with clearer hierarchy
- improve background/surface layering
- standardize action-card treatments
- reduce repeated button styling patterns
- make spacing and typography more intentional

Design direction:
- calm but urgent
- premium, not flashy
- deliberate use of red/amber accents
- less generic glassmorphism repetition

Success criteria:
- the emergency panel feels like one cohesive system
- visual hierarchy supports stress-use instead of adding noise

## Recommended Implementation Order

1. Phase 1: Rebuild Information Hierarchy
2. Phase 2: Redesign The Top Action Cluster
3. Phase 3: Improve Scenario Selection
4. Phase 4: Separate Primary, Secondary, And Danger Actions
5. Phase 5: Tighten Copy And Tone
6. Phase 6: Build A Stronger Calm/Reset Section
7. Phase 7: Improve Mobile Ergonomics
8. Phase 8: Strengthen Accessibility And State Feedback
9. Phase 9: Visual Polish Round

## Suggested Delivery Strategy

### Pass 1: Structure
- hierarchy rebuild
- top action cluster
- scenario redesign
- danger zone separation

### Pass 2: Content And UX
- copy tightening
- calm/reset section
- mobile ergonomics
- accessibility/state feedback

### Pass 3: Polish
- visual system cleanup
- final spacing, typography, and surface refinement

## Best Next Step

If starting implementation soon, begin with:
- Phase 1: Rebuild Information Hierarchy
- Phase 2: Redesign The Top Action Cluster

Those two phases will deliver the biggest immediate improvement in usability and trust.
