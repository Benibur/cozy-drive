/**
 * What a Scribe surface looks like as an OBJECT POSED ON the application,
 * rather than a region welded into it.
 *
 * The side panel used to be a full-bleed column: square corners, flush against
 * the editor, its only separation a hard shadow on the left edge. It read as a
 * part of the editor chrome. Everything here exists to say the opposite — the
 * panel is a card, it has air around it, and the application shows through that
 * air. The tokens live together because the effect only holds if they agree:
 * a radius without a gutter clips against the editor, a gutter without a
 * canvas colour is an invisible white band.
 *
 * NOTE ON COLOUR — these are alpha overlays, not palette lookups. The gutter
 * has to read as "a shade deeper than whatever is behind" in BOTH themes, and
 * `background.default` is not a token every Cozy theme (or every test theme
 * mock) actually provides. Compositing over the app background gets the right
 * answer without depending on a token that may not be there.
 */

/** Scribe accent — the brand blue, worn by every accent bar and the send action. */
export const SCRIBE_BLUE = '#0A84FF'

/** The send button's resting/disabled fill: a softer wash of the accent. */
export const SCRIBE_BLUE_SOFT = '#A2D0FF'

/**
 * The user's own chat bubble — a cool neutral grey with dark text. The user's
 * turn is set apart by TONE, not by an accent fill: the accent (blue) is
 * reserved for the send action and the thin quote/selection bars.
 */
export const USER_BUBBLE_BG = '#D3D8DC'

/** Air between the panel card and the window / the editor, in px. */
export const PANEL_GUTTER = 12

/** Corner radius of the panel card. */
export const PANEL_RADIUS = 14

/** Corner radius of the composer box and the message cards inside it. */
export const SURFACE_RADIUS = 12

/**
 * MUI moved `palette.type` to `palette.mode`; Cozy themes in the wild still
 * carry either. Read both, in one place, so no surface has to remember.
 */
export const isDarkTheme = theme =>
  (theme.palette.type || theme.palette.mode) === 'dark'

/**
 * The lift that makes the card look posed rather than inlaid. Two layers: a
 * tight contact shadow that gives the edge definition against a light canvas,
 * and a wide soft one that carries the sense of height.
 */
export const panelShadow = isDark =>
  isDark
    ? '0 1px 2px rgba(0,0,0,0.5), 0 10px 30px rgba(0,0,0,0.45)'
    : '0 1px 2px rgba(20,20,45,0.06), 0 8px 24px rgba(20,20,45,0.09)'

/**
 * The gutter colour — the application canvas the card floats on. Composited
 * over whatever the app paints behind it (see the note above).
 */
export const canvasBackground = isDark =>
  isDark ? 'rgba(0,0,0,0.38)' : 'rgba(20,20,45,0.055)'
