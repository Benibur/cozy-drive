import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { useTheme } from 'cozy-ui/transpiled/react/styles'
import { useI18n } from 'twake-i18n'

import { ScribeHoverTooltip } from '@/modules/views/OnlyOffice/Scribe/ScribeHoverTooltip'
import { ScribeLottie } from '@/modules/views/OnlyOffice/Scribe/ScribeLottie'
import buttonAnimation from '@/modules/views/OnlyOffice/Scribe/assets/scribeButtonAnimation.json'
import { FRAME_EDITOR_NAME } from '@/modules/views/OnlyOffice/config'

// Fallback placement, used only when the plugin reports no geometry (older
// plugin build, or a frame it cannot read). The bottom-right corner is the one
// region of the editor where OnlyOffice draws no chrome of its own, so it is the
// only place a BLIND offset is safe.
const BOTTOM_OFFSET = 80
const RIGHT_OFFSET = 40

// Placement inside the document area, once the plugin does report it
// (DOCUMENT_GEOMETRY: the box of `id_viewer`, plus the page box inside it).
const EDGE_MARGIN = 12 // between the button and the edge of the document area
const PAGE_GAP = 12 // between the page and the button, when the margin is wide enough
// Stated on the button below as well, so this arithmetic cannot drift from what
// is actually rendered.
const BUTTON_WIDTH = 48

/**
 * Where to put the button, in viewport px, from the geometry the plugin reports.
 *
 * Horizontally it hugs the RIGHT EDGE OF THE PAGE — the grey margin, not the far
 * right of the window, which is where OnlyOffice keeps its own icon strip. When
 * that margin is too narrow to hold the button (narrow window, high zoom), it
 * falls back to the right edge of the document area, which is the last position
 * still clear of the chrome. Vertically it sits at the TOP of the document area:
 * that edge is below the ribbon and the rulers by construction.
 *
 * Returns null when the geometry cannot be used, so the caller keeps the blind
 * bottom-right fallback.
 */
const getGeometryPosition = geometry => {
  const viewer = geometry && geometry.viewer
  if (!viewer) return null

  const iframe = document.getElementsByName(FRAME_EDITOR_NAME)[0]
  if (!iframe) return null
  const frame = iframe.getBoundingClientRect()

  const page = geometry.page
  const viewerRight = viewer.left + viewer.width
  const pageRight = page ? page.left + page.width : null

  const rightEdge = Math.min(
    pageRight === null ? Infinity : pageRight + PAGE_GAP + BUTTON_WIDTH,
    viewerRight - EDGE_MARGIN
  )
  // Never let it slide out of the document area on the other side.
  const left = Math.max(rightEdge - BUTTON_WIDTH, viewer.left + EDGE_MARGIN)

  return {
    left: frame.left + left,
    top: frame.top + viewer.top + EDGE_MARGIN
  }
}

const getButtonStyle = isDark => ({
  cursor: 'pointer',
  borderRadius: 20,
  width: BUTTON_WIDTH,
  boxSizing: 'border-box',
  // The animated mark is the whole content now, so it takes nearly the full
  // 48px button — only a hair of padding keeps it off the rounded corners.
  padding: '5px 2px',
  background: isDark ? '#2d2d2d' : 'white',
  boxShadow: isDark
    ? '0 2px 8px rgba(0,0,0,0.4)'
    : '0 2px 8px rgba(0,0,0,0.15)',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 6,
  fontSize: 14,
  fontFamily: 'inherit',
  color: isDark ? '#e0e0e0' : '#333',
  transition: 'opacity 200ms ease'
})

/**
 * Floating zone holding the "open side panel" button (translucent by default,
 * opaque on hover), rendered through a portal on document.body.
 *
 * It is placed at the top of the document area, against the right edge of the
 * page, from the geometry the plugin reports; without that geometry it falls
 * back to the bottom-right corner of the viewport.
 *
 * The inline-Scribe trigger that used to sit here was removed: it is now the
 * under-selection floating button (ScribeSelectionButton), which appears right
 * where the user is working. Panel access stays here because the panel is
 * useful without any selection.
 *
 * @param {{ visible: boolean,
 *           geometry: {viewer: object, page: object|null}|null,
 *           onTogglePanel: () => void }} props
 */
export const ScribeFloatingZone = ({ visible, geometry, onTogglePanel }) => {
  const { t } = useI18n()
  const theme = useTheme()
  const isDark = (theme.palette.type || theme.palette.mode) === 'dark'
  const [hoveredPanel, setHoveredPanel] = useState(false)

  useEffect(() => {
    if (visible) {
      setHoveredPanel(false)
    }
  }, [visible])

  if (!visible) return null

  const buttonStyle = getButtonStyle(isDark)
  const position = getGeometryPosition(geometry)

  return createPortal(
    <div
      style={{
        position: 'fixed',
        ...(position || { bottom: BOTTOM_OFFSET, right: RIGHT_OFFSET }),
        zIndex: 100000,
        display: 'flex',
        flexDirection: 'column',
        gap: 8
      }}
    >
      <button
        style={{
          ...buttonStyle,
          opacity: hoveredPanel ? 1 : 0.4,
          position: 'relative'
        }}
        onClick={onTogglePanel}
        onMouseEnter={() => setHoveredPanel(true)}
        onMouseLeave={() => setHoveredPanel(false)}
        type="button"
      >
        {hoveredPanel && (
          <ScribeHoverTooltip
            label={t('Scribe.button.open_panel')}
            shortcut="(Ctrl+Shift+I x2)"
            align="right"
            placement={position ? 'bottom' : 'top'}
          />
        )}
        <ScribeLottie
          animationData={buttonAnimation}
          width={44}
          height={33}
        />
      </button>
    </div>,
    document.body
  )
}
