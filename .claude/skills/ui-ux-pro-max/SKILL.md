# UI/UX Pro Max - Design Intelligence Guide

## Overview

This is a comprehensive design system reference for web and mobile applications. It provides structured guidance across 50+ styles, 161 color palettes, 57 font pairings, and 99 UX principles organized by priority and domain.

## Core Structure

The guide organizes rules into 10 priority categories, from CRITICAL (Accessibility, Touch & Interaction) through LOW (Charts & Data). Each category contains specific, actionable guidelines with reasoning tied to platform standards like Apple HIG and Material Design.

## Key Usage Scenarios

**When to apply:** UI structure, visual design decisions, interaction patterns, and user experience quality control.

**Must use for:** Designing new pages, creating components, choosing color/typography, reviewing UI code, implementing navigation, and making product-level design decisions.

**Skip for:** Backend logic, API design, performance unrelated to interfaces, infrastructure work, and non-visual scripts.

## Critical Priority Areas

**Accessibility:** "Minimum 4.5:1 ratio for normal text" with visible focus rings, descriptive alt text, and full keyboard support.

**Touch & Interaction:** Minimum 44×44pt touch targets with 8px+ spacing between them, avoiding reliance on hover-only states.

**Performance:** WebP/AVIF images, lazy loading, layout shift prevention (CLS < 0.1), and responsive image handling.

## Practical Implementation

The guide includes a CLI-based search system using Python scripts that generate design systems by querying parallel domains (product, style, color, typography). Users can persist design systems hierarchically with master rules and page-specific overrides.

## Pre-Delivery Standards

**Visual quality checks:** No emoji icons, consistent icon families, proper contrast ratios in both light and dark modes, and no layout-shifting interaction states.

**Interaction standards:** Clear pressed feedback within 80-150ms, 150-300ms micro-interaction timing, and accessible focus management.

**Layout verification:** Safe-area compliance, 4/8dp spacing rhythm, readable text measure on all device sizes, and verified tablet/landscape support.
