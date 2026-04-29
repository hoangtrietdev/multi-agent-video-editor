# Design Specification: Orchestra AI (MVP) - Version 1.1

## 1. Visual Identity & Foundation

### Color Palette (Dark Mode First)
- **Primary (Electric Indigo):** `#6366F1`
  - *Usage:* Primary CTAs, active states, key orchestration lines.
- **Secondary (Slate):**
  - `slate-950`: `#020617` (Deepest Background)
  - `slate-900`: `#0f172a` (Surface/Container)
  - `slate-800`: `#1e293b` (Elevated Surface/Borders)
- **Accent (Cyan):** `#22D3EE`
  - *Usage:* Success states, "Ready" indicators.
- **Text:**
  - `slate-50`: `#f8fafc` (Primary Headlines)
  - `slate-400`: `#94a3b8` (Secondary/Labels)

### Typography (Inter Sans-Serif)
- **Display:** 32px / Leading 40px / SemiBold (Screen Titles)
- **Headline:** 20px / Leading 28px / Bold (Section Headers)
- **Body Large:** 16px / Leading 24px / Regular (Inputs/Primary Text)
- **Body Small:** 14px / Leading 20px / Medium (Labels/Captions)
- **Monospace:** 12px (Agent status/Log info)

### Layout & Spacing (8dp Grid)
- **Margins:** 20dp horizontal margin.
- **Padding:** 16dp internal padding for containers.
- **Corner Radius:** 12dp (standard), 24dp (pill buttons).
- **Separation:** 1dp border (slate-800) for section separation.

## 2. Component Specifications

### Navigation (TopAppBar & BottomNavBar)
- **TopAppBar:** Height 64dp, `slate-900/60` background with `backdrop-blur-xl`. Centered title in `slate-50` SemiBold.
- **BottomNavBar:** Height 80dp, `slate-950/80`. Active icons in `Electric Indigo` with a soft glow (`shadow-indigo-500/20`).

### Interactive Elements
- **Primary Button:** Full width, 56dp height, `Electric Indigo` background, white text, 12dp radius.
- **Dropdowns/Inputs:** `slate-900` background, `slate-800` border, `slate-50` text.
- **Flow Nodes:** Circular or rounded-rect containers (80dp-100dp wide) with center-aligned icons and status labels below.

## 3. Screen-by-Screen Logic

### 1. Start Project
- **Grid:** 3-column media grid with 4dp spacing.
- **Interaction:** Multi-select with indigo checkmark overlays. Persistent bottom action bar showing selection count.

### 2. Project Configuration
- **Form Structure:** Vertical stack.
- **Labels:** Uppercase, 12px, `slate-400` bold labels above every field.
- **CTA:** "Visualize Flow" button at the bottom.

### 3. Agent Flow Visualization
- **Canvas:** Dark `slate-950` background.
- **Connections:** 2dp vertical lines connecting agents.
- **Animation Goal:** Pulse effect on the "Analyzing..." state.

### 4. Video Preview & Export
- **Aspect Ratio:** 9:16 (Portrait) centered player.
- **Playback Controls:** Centered Play/Pause pill.
- **CTAs:** Vertical stack of primary and secondary buttons.