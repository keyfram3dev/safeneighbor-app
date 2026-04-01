# Legal Section Design Overhaul

## What Was Done

The Legal page was the oldest-designed section in the app. This overhaul brings it in line with the modern design language used on Home, Scenarios, and Record pages.

### File Modified
- `src/components/Legal.js`

---

## Changes

### 1. Hero Section (Complete Redesign)
- **Before**: Plain centered Lucide `Scale` icon (64px) + h1 + subtitle, no container
- **After**: Full `rounded-[32px]` hero card matching Record/Scenarios pattern
  - Gradient background (`from-slate-950 via-slate-950/95 to-slate-900/80`)
  - Blue blur orbs (top-right, bottom-left) + grid pattern overlay
  - Top gradient accent line (`via-blue-400/35`)
  - Eyebrow label: "Legal Protection"
  - Icon badge: h-14 w-14 rounded-2xl with Phosphor `Scales` icon (blue theme)
  - Title: `text-[2rem] sm:text-[2.75rem] font-black tracking-tight`
  - Subtitle + support paragraph
  - 3 status pills: "Know Your Rights" (purple), "AI Powered" (cyan), "50 State Laws" (amber)
  - "Get Legal Help" CTA moved into hero card (emerald gradient with shadow)
  - Staggered entrance animations (`scenario-fade-in`, `scenario-rise-in`)

### 2. Tab Navigation (Refined)
- **Before**: Basic pill bar with `bg-gradient-to-br from-slate-800/80`, per-tab solid active colors
- **After**: Sticky nav (`top-[84px]`) with `backdrop-blur-xl` and `bg-slate-950/84`
  - Subtle glow shadows on active tabs with color-matched dot indicators
  - Consistent `tracking-[0.06em]` sizing
  - `active:scale-[0.98]` press feedback

### 3. Constitution Tab Cards (5 Amendments + Civil Disobedience)
- **Before**: Generic `from-slate-800/80 to-slate-900/80 border-slate-700/50` for all, no color differentiation until expanded, `text-xl font-bold` titles
- **After**: Each card has:
  - Subtle color-tinted gradient in collapsed state (e.g., `to-purple-950/20` for 1st Amendment)
  - Color-matched icon box (h-10 w-10) with themed Phosphor icon per amendment:
    - 1st: Megaphone (purple) | 4th: House (red) | 5th: ShieldWarning (blue)
    - 6th: Handshake (emerald) | 14th: Gavel (amber)
  - Radial gradient glow on hover (`opacity-0 -> opacity-100`)
  - Color-matched hover borders and shadows (`hover:border-purple-500/30 hover:shadow-purple-500/5`)
  - `font-black` titles, description text hidden on mobile (`hidden sm:block`)
  - `scenario-section-item` stagger animation class

### 4. Civil Disobedience Section
- **Before**: Plain `border-t border-slate-700` divider, basic h2 header
- **After**: Proper section header with eyebrow ("Civic Action"), teal gradient divider line
  - All 3 sub-cards (History/BookOpenText, Charges/Warning, Safety/Shield) + Witness card (Eye/pink) get full card treatment with icon boxes and hover glows

### 5. State Recording Laws Section
- **Before**: Basic `border-t border-slate-700` divider, plain dropdown, basic card
- **After**:
  - Section header with eyebrow ("By State"), cyan gradient divider
  - Dropdown: `appearance-none`, `rounded-2xl`, focus ring, caret icon overlay
  - State content card: `rounded-[28px]` with cyan color hint and shadow
  - Consent badge: pill styling with color-coded dot (emerald = one-party, amber = two-party)

### 6. Status Tab (Animations)
- Added `scenario-section-rise` stagger animation to container
- Individual sections (Disclaimer, Never Sign, Persona Cards, Everyone Should Know) wrapped with `scenario-section-item`

### 7. Footer (Now Shared Across All Tabs)
- **Before**: Quote, FaqCta, Disclaimer, Install CTA only appeared on Constitution tab
- **After**: All moved outside tab views, visible on every tab
  - Quote styled with serif font (`Palatino Linotype`) and refined typography
  - Install CTA: `rounded-2xl`, border, gradient shadow, `active:scale-[0.98]`

### 8. Import Cleanup
- Removed: Lucide `Scale` import (replaced with Phosphor `Scales`)
- Added: `Shield`, `BookOpenText`, `Brain`, `Gavel`, `Handshake`, `Megaphone`
- Added `aniDelay` helper for stagger timing
- Outer container: `max-w-5xl` (was `max-w-4xl`), `pb-24`, `page-transition-in`

---

## Design System Patterns Applied
- `rounded-[32px]` hero cards with blur orbs and grid overlay
- `rounded-[28px]` content cards with color-tinted gradients
- Icon boxes: `h-10/14 w-10/14 rounded-xl/2xl border-{color}-500/20 bg-{color}-500/10`
- Radial gradient hover glows: `bg-[radial-gradient(circle_at_top_right,rgba(...),transparent_48%)]`
- Section headers: eyebrow label + large `font-black tracking-tight` title + description
- Status pills: `rounded-full border px-3 py-1.5 text-[11px] font-bold uppercase tracking-[0.2em]`
- Sticky tab navigation with `backdrop-blur-xl`
- Stagger animations: `scenario-fade-in`, `scenario-rise-in`, `scenario-section-rise`, `scenario-section-item`
- Serif quote typography with `Palatino Linotype` font family

## Deployed
- **URL**: https://safeneighbor-33bb0.web.app
- **Date**: 2026-04-01
