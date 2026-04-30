# Design System Specification: The Architectural Ledger

## 1. Overview & Creative North Star
**Creative North Star: "The Ethereal Vault"**
This design system rejects the "cluttered spreadsheet" aesthetic of traditional fintech. Instead, it adopts the posture of a **Digital Curator**. The goal is to transform complex financial data into an editorial experience that feels quiet, authoritative, and spacious. 

We break the "template" look by utilizing **Intentional Asymmetry**—where critical balances are given massive typographic scale—and **Tonal Layering**, replacing rigid grid lines with soft transitions of light. The result is a dashboard that doesn't just show numbers; it narrates a financial story through a lens of premium clarity.

---

## 2. Colors & Surface Philosophy
The palette is rooted in a deep, professional `primary` blue, balanced by organic `secondary` greens and a sophisticated `tertiary` coral.

### The "No-Line" Rule
**Explicit Instruction:** Designers are prohibited from using 1px solid borders to section content. Boundaries must be defined solely through background color shifts. Use `surface-container-low` for large section backgrounds and `surface-container-lowest` for cards to create distinction without visual noise.

### Surface Hierarchy & Nesting
Treat the UI as physical layers of frosted glass. 
- **Base Layer:** `surface` (#f6fafe)
- **Content Zones:** `surface-container-low` (#f0f4f8)
- **Interactive Cards:** `surface-container-lowest` (#ffffff)
- **Popovers/Modals:** `surface-bright` (#f6fafe) with a 20px backdrop blur.

### The "Glass & Gradient" Rule
Main CTAs and high-level summaries (like "Total Net Worth") should utilize a **Signature Texture**. Instead of flat `primary`, use a linear gradient: 
`Linear Gradient (135deg, primary #00488d to primary-container #005fb8)`. 
Apply a subtle `on-primary` (10% opacity) inner glow to the top edge to simulate a beveled, premium finish.

---

## 3. Typography: The Editorial Scale
We use **Inter** for its mathematical precision and neutral "Swiss" feel. The hierarchy is designed to feel like a high-end financial journal.

*   **Display (The Headline Figures):** Use `display-lg` (3.5rem) for primary account balances. Reduce letter-spacing to `-0.02em` to create a "compact wealth" feel.
*   **Headline (Sectional Context):** Use `headline-sm` (1.5rem) for major module headers. Pair this with a `secondary` color for positive trends.
*   **Title (Information Architecture):** `title-md` (1.125rem) is the workhorse for card titles and navigation.
*   **Body (The Narrative):** `body-md` (0.875rem) for all data points.
*   **Label (The Metadata):** `label-sm` (0.6875rem) in `on-surface-variant` for timestamps and secondary metrics. Always use All-Caps with `+0.05em` letter-spacing for labels to distinguish them from body text.

---

## 4. Elevation & Depth: Tonal Layering
Depth is achieved through the **Layering Principle** rather than structural lines.

*   **Ambient Shadows:** Floating elements (Modals, Hovered Cards) use a "Natural Light" shadow:
    - `box-shadow: 0px 24px 48px -12px rgba(23, 28, 31, 0.08);`
    - The shadow is tinted with the `on-surface` color to avoid a "dirty" grey appearance.
*   **The "Ghost Border" Fallback:** If accessibility requires a container boundary, use a **Ghost Border**: `outline-variant` (#c2c6d4) at **15% opacity**.
*   **Glassmorphism:** For sidebars and navigation overlays, use `surface` at 80% opacity with a `backdrop-filter: blur(12px)`. This integrates the UI into the background color, softening the "edge" of the software.

---

## 5. Components

### Financial Cards
Forbid the use of divider lines. Separate the "Header" from the "Data" using a 24px vertical gap.
- **Background:** `surface-container-lowest` (#ffffff).
- **Corner Radius:** `xl` (1.5rem) for parent containers; `md` (0.75rem) for internal elements.
- **Interaction:** On hover, shift background to `surface-bright` and apply the Ambient Shadow.

### Data Tables (The "Fluid Row")
Discard the 1990s table look. 
- **Rows:** Each row is a `surface-container-low` container with `none` borders. 
- **Spacing:** Use 12px vertical padding between rows to let the `surface` color act as a "natural divider."
- **Positive Balances:** Use `on-secondary-container` (#486a51) for the text color of sage green gains.

### Progress Bars (Budgeting)
- **Track:** `surface-container-highest` (#dfe3e7).
- **Fill:** Use the `primary` to `primary-container` gradient. 
- **Shape:** Always `full` (9999px) roundedness for a soft, approachable feel.

### Buttons
- **Primary:** Gradient fill (`primary` to `primary-container`), `lg` (1rem) roundedness. No border.
- **Secondary:** `surface-container-high` background with `on-primary-fixed-variant` text.
- **Tertiary (Ghost):** No background. Use `primary` text.

### Intuitive Navigation
- **Active State:** Instead of a thick bar, use a `primary` dot (4px) beneath the icon and transition the icon color to `primary`.
- **Blur Effect:** Apply `backdrop-blur` to the top navigation bar to maintain a sense of space as the user scrolls.

---

## 6. Do’s and Don'ts

### Do:
*   **DO** use whitespace as a functional tool. If a card feels crowded, increase padding to `xl` rather than adding a border.
*   **DO** use "Sage Green" (`secondary_container`) for positive financial growth and "Soft Coral" (`tertiary_container`) for warnings.
*   **DO** use `surface-dim` for inactive or "empty" states to visually recede the component.

### Don’t:
*   **DON'T** use 100% black (#000000). Use `on-surface` (#171c1f) for all "black" text to maintain the soft tonal range.
*   **DON'T** use traditional 4px border radii. This system requires `md` (0.75rem) or `xl` (1.5rem) to feel modern and "soft."
*   **DON'T** use zebra-striping in tables. Use vertical white space and hover-state color shifts instead.