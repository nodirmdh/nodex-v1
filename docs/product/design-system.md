# Nodex Design System

## Foundation

Nodex uses a shadcn/Radix-style primitive layer, Tailwind CSS, Lucide icons, and semantic CSS variables.

## Themes

- light;
- dark;
- Telegram-aware theme via `.telegram-theme`;
- reduced motion via media query.

## Token Groups

- background and foreground;
- surface, elevated surface, muted surface;
- border;
- primary, secondary, accent;
- destructive, warning, success, info;
- focus and overlay;
- radii;
- shadows;
- motion durations;
- z-index scale.

## UI Direction

The visual language should feel like modern mobility, logistics SaaS, and fintech products: compact, confident, high hierarchy, no noisy card stacks.

## Rules

- Use semantic tokens; do not hardcode random colors in components.
- Avoid cards inside cards.
- Use rows, dividers, sticky controls, drawers, and bottom sheets for dense workflows.
- Every shell must show loading, empty, error/offline/no-environment states where relevant.
