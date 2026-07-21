import React from 'react'

import { useTheme } from 'cozy-ui/transpiled/react/styles'

/**
 * The hover tooltip shared by every Scribe floating button (side-panel button,
 * under-selection button).
 *
 * It exists as a component because the two used to carry their own copy of the
 * same style object and silently drifted apart the moment one of them was
 * touched. There is one look, defined here, and nowhere else.
 *
 * Rendered inside a `position: relative` button, above it.
 *
 * @param {{ label: string,
 *           shortcut?: string,
 *           align?: 'right'|'center',
 *           gap?: number }} props
 *   align  which edge of the button the tooltip lines up with.
 *   gap    distance in px between the tooltip and the button box. Pass a
 *          reduced value when the button has transparent padding of its own
 *          (e.g. an asset with a baked-in drop shadow), so that the GAP THE EYE
 *          SEES stays the same across buttons.
 */
export const ScribeHoverTooltip = ({
  label,
  shortcut,
  align = 'center',
  gap = 8
}) => {
  const theme = useTheme()
  const isDark = (theme.palette.type || theme.palette.mode) === 'dark'

  const alignment =
    align === 'right'
      ? { right: 0 }
      : { left: '50%', transform: 'translateX(-50%)' }

  return (
    <span
      style={{
        position: 'absolute',
        bottom: '100%',
        marginBottom: gap,
        padding: '6px 10px',
        background: isDark ? '#555' : '#333',
        borderRadius: 6,
        fontSize: 12,
        // Typography is stated, never inherited. The under-selection button sets
        // line-height: 0 on itself to kill the inline gap under its svg, and the
        // tooltip is a CHILD of that button — inheriting it crushed the text to a
        // zero-height line. A shared component must not depend on what its host
        // button happens to do to typography.
        lineHeight: 1.4,
        fontFamily: 'inherit',
        fontWeight: 'normal',
        whiteSpace: 'nowrap',
        pointerEvents: 'none',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
        ...alignment
      }}
    >
      <span style={{ color: 'white' }}>{label}</span>
      {shortcut && <span style={{ color: '#999' }}>{shortcut}</span>}
    </span>
  )
}
