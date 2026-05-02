---
name: Technical Workbench
colors:
  surface: '#f7f9fb'
  surface-dim: '#d8dadc'
  surface-bright: '#f7f9fb'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f2f4f6'
  surface-container: '#eceef0'
  surface-container-high: '#e6e8ea'
  surface-container-highest: '#e0e3e5'
  on-surface: '#191c1e'
  on-surface-variant: '#46474a'
  inverse-surface: '#2d3133'
  inverse-on-surface: '#eff1f3'
  outline: '#76777b'
  outline-variant: '#c7c6ca'
  surface-tint: '#5f5e5f'
  primary: '#000000'
  on-primary: '#ffffff'
  primary-container: '#1b1b1c'
  on-primary-container: '#858384'
  inverse-primary: '#c8c6c7'
  secondary: '#505f76'
  on-secondary: '#ffffff'
  secondary-container: '#d0e1fb'
  on-secondary-container: '#54647a'
  tertiary: '#000000'
  on-tertiary: '#ffffff'
  tertiary-container: '#1c1b19'
  on-tertiary-container: '#868380'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#e5e2e3'
  primary-fixed-dim: '#c8c6c7'
  on-primary-fixed: '#1b1b1c'
  on-primary-fixed-variant: '#474647'
  secondary-fixed: '#d3e4fe'
  secondary-fixed-dim: '#b7c8e1'
  on-secondary-fixed: '#0b1c30'
  on-secondary-fixed-variant: '#38485d'
  tertiary-fixed: '#e6e2de'
  tertiary-fixed-dim: '#cac6c2'
  on-tertiary-fixed: '#1c1b19'
  on-tertiary-fixed-variant: '#484644'
  background: '#f7f9fb'
  on-background: '#191c1e'
  surface-variant: '#e0e3e5'
typography:
  headline-sm:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '600'
    lineHeight: 24px
    letterSpacing: -0.01em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
  body-sm:
    fontFamily: Inter
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 18px
  label-mono:
    fontFamily: Space Grotesk
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.02em
  code-snippet:
    fontFamily: monospace
    fontSize: 13px
    fontWeight: '400'
    lineHeight: 20px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  unit: 4px
  container-margin: 1.5rem
  gutter: 1rem
  panel-gap: 0.75rem
  element-padding: 0.5rem
---

## Brand & Style
The design system is rooted in **Functional Minimalism**, prioritizing information density and clarity above all else. It is designed for developers and data scientists who require a focused, "no-nonsense" environment for local research and experimentation. 

The aesthetic draws from the precision of IDEs and terminal interfaces, utilizing a strict grid and a "system status" ethos. The emotional response is one of reliability, control, and technical transparency. Visual flair is intentionally suppressed to ensure that user data and code remain the primary focus. Surfaces are flat, borders are purposeful, and whitespace is used surgically to create distinct logical groupings without wasting screen real estate.

## Colors
The palette is hyper-minimalist, centered on a spectrum of architectural grays. The background is a clean white to ensure maximum contrast for text and data visualizations. 

- **Primary & Neutrals**: A deep charcoal (#1A1A1B) is used for primary text and core UI actions. Slate grays provide hierarchy for secondary information and structural borders.
- **Semantic Colors**: Success green and warning amber are desaturated and lean toward "industrial" shades. They are used sparingly to indicate system state (e.g., job completion, resource limits) rather than for decorative purposes.
- **Accents**: There are no vibrant gradients. Interactivity is signaled through subtle shifts in gray scale or thin, high-contrast borders.

## Typography
This design system utilizes **Inter** for its neutral, systematic qualities, ensuring high legibility at small sizes. **Space Grotesk** is used for labels and metadata to inject a subtle technical, geometric character into the "system status" indicators.

The type scale is compact to support high-density layouts. Headlines are kept small and weighted heavily for clear section anchoring. Mono-spaced fonts are treated as first-class citizens, used for any data output, variables, or configuration paths.

## Layout & Spacing
The layout follows a **Fixed-Fluid Hybrid** model. Navigation and sidebars are fixed-width to maintain a consistent control surface, while the primary "workbench" area is fluid to allow data tables and visualizations to expand.

A strict 4px base grid governs all spacing. The design system prioritizes a "compact" density setting—vertical margins between related elements are kept minimal (8px-12px) to maximize the amount of information visible above the fold. Logic is separated by thin 1px borders rather than wide gutters.

## Elevation & Depth
Depth is conveyed through **Tonal Layering** and **Low-Contrast Outlines** rather than shadows. 

1.  **Base Layer**: Pure white (#FFFFFF) for the main workspace.
2.  **Surface Tier**: Light gray (#F8FAFC) for sidebars, toolbars, and inactive panels.
3.  **Borders**: A consistent 1px solid border (#E2E8F0) defines all cards, inputs, and sections. 

Shadows are almost entirely avoided, reserved only for temporary floating elements like context menus or tooltips, where a very subtle, tight 4px blur with 5% opacity is used to provide separation from the background.

## Shapes
The shape language is disciplined and professional. A "Soft" (4px) corner radius is applied to buttons, cards, and input fields. This slight rounding prevents the UI from feeling aggressive while maintaining a precise, engineered appearance. Large containers like main panels or the viewport itself retain sharp 0px corners to reinforce the "workbench" feel.

## Components
- **Buttons**: Primary buttons use a solid charcoal fill with white text. Secondary buttons are "ghost" style with a 1px slate border. All buttons use small padding (6px 12px) for a compact footprint.
- **Cards**: Simple containers with a 1px border and no shadow. Headers within cards should have a subtle bottom border to separate titles from content.
- **Input Fields**: Rectangular with a 1px border. Focus states are indicated by a 1px solid charcoal border—avoiding colored "glows."
- **Chips/Status Badges**: Small, rectangular badges with a subtle background tint and high-contrast text. Use monospaced type for status labels.
- **Data Tables**: Zero-border on the outer container, with horizontal row separators only. Use a hover state of light gray (#F1F5F9) to assist row tracking.
- **Data Science Specifics**: Include "Execution Progress" bars (thin 4px lines) and "Resource Monitors" (compact sparklines) using the semantic color palette.