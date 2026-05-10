# Design System - Complete Content

This is a comprehensive design system guide covering token architecture, component specifications, and presentation generation.

## Key Components

**Token Structure:** Three-layer system progressing from primitive values (raw colors like `#2563EB`) through semantic aliases (purpose-based naming) to component-specific tokens.

**Primary Use Cases:** The system supports design token creation, component state definitions, CSS variable systems, spacing/typography scales, and notably, "slide/presentation generation" for brand-compliant decks.

**Core Scripts:** Tools include token generation, validation utilities, and a BM25-powered slide search engine (`search-slides.py`) that enables contextual presentation recommendations based on deck position and emotional arc.

**Slide System Architecture:** Presentations leverage design tokens plus Chart.js, pulling from decision CSVs covering 15 deck structures, 25 layouts, copywriting formulas (PAS, AIDA, FAB), and color/typography logic tied to emotional beats.

**Critical Requirement:** "ALL slides MUST import `assets/design-tokens.css` - single source of truth" and exclusively use CSS variables rather than hardcoded values for compliance and theme flexibility.

**Pattern Breaking:** The Duarte sparkline methodology alternates emotional states (frustration ↔ hope) at 1/3 and 2/3 deck positions to maintain engagement.

**License:** MIT
