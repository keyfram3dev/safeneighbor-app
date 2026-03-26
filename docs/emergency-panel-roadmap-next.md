# Emergency Panel 2.0 Roadmap

This document captures the next-generation emergency panel work after the original emergency-panel roadmap was completed in [src/App.js](/Users/mitchrutter/Documents/my-projects/safeneighbor-app/src/App.js).

## Goal

Take the panel from a polished emergency workflow to a more adaptive, more trustworthy, and more resilient command center.

The focus for 2.0 is:
- stronger live-location management after a share succeeds
- safer destructive-action handling
- more situational guidance at the top of the panel
- a better large-screen composition
- stricter accessibility and focus control

## Phase 1: Stronger Live-Location Success And Management

Goal:
- make location sharing feel dependable after the first send, not like a one-shot success toast

Changes:
- promote the success state into a real management state
- distinguish:
  - ready to share
  - location sent
  - live tracking active
  - live tracking stopped
- show:
  - last update timing
  - clearer live-tracking state
  - next actions like stop, refresh, clear, or jump to the right guide

Success criteria:
- users can tell whether sharing is active, stale, or stopped without rereading the whole card
- the location area feels like something they can manage, not just trigger

## Phase 2: Better Purge Confirmation Safety

Goal:
- make accidental destructive action much less likely

Changes:
- replace one-step browser confirmation with an in-panel confirm flow
- show:
  - stronger warning copy
  - the number of recordings affected
  - a deliberate acknowledgement step
- keep the destructive confirm visually distinct from routine actions

Success criteria:
- purge cannot happen through a casual or rushed tap
- the user understands what will be deleted before confirming

## Phase 3: Smarter Situational Recommendations

Goal:
- make the panel more adaptive to the user’s current state

Changes:
- add a recommendation surface near the top of the panel
- prioritize different actions based on current conditions, for example:
  - live tracking already active
  - location already sent
  - no trusted contacts configured
  - location permission blocked
  - default “share first” state
- keep recommendations short, directive, and action-oriented

Success criteria:
- the top of the panel feels chosen for the user’s current situation
- fewer people have to scan the whole panel to know where to start

## Phase 4: Desktop-Specific Polish

Goal:
- make the panel feel intentionally designed on large screens instead of simply scaled up from mobile

Changes:
- widen the shell on desktop
- split the layout into:
  - urgent actions on the main rail
  - support, calm, utilities, and danger actions on a secondary rail
- use sticky behavior and cleaner spacing so large screens feel calmer and more scannable

Success criteria:
- the panel feels like a desktop command center, not a stretched phone overlay
- large-screen scanning is faster and less vertical

## Phase 5: Full Focus Trap And Escape-Key Tightening

Goal:
- make the emergency panel behave like a real, high-trust modal dialog

Changes:
- trap keyboard focus inside the panel while it is open
- restore focus to the previously focused trigger on close
- close the right layer on `Escape`
  - purge confirm first
  - share warning second
  - panel last
- prevent background page scrolling while the panel is open

Success criteria:
- keyboard users cannot tab behind the emergency panel
- dismiss behavior is predictable and layered correctly

## Suggested Future Work After 2.0

Once these phases are complete, likely next steps are:
- scenario handoff continuity between the panel and the selected guide
- more explicit live-share success or delivery feedback
- stronger analytics-informed prioritization
- optional motion refinement for open/close and state changes
