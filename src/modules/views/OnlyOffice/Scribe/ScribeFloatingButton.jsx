import React, { useEffect, useState } from 'react'
import { createPortal } from 'react-dom'

import { useTheme } from 'cozy-ui/transpiled/react/styles'
import { useI18n } from 'twake-i18n'

import { ScribeHoverTooltip } from '@/modules/views/OnlyOffice/Scribe/ScribeHoverTooltip'

const getButtonStyle = isDark => ({
  cursor: 'pointer',
  borderRadius: 20,
  padding: '8px 16px',
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

const PanelIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect
      x="1.5"
      y="2.5"
      width="13"
      height="11"
      rx="1.5"
      stroke="currentColor"
      strokeWidth="1.2"
    />
    <line
      x1="10"
      y1="2.5"
      x2="10"
      y2="13.5"
      stroke="currentColor"
      strokeWidth="1.2"
    />
  </svg>
)

/**
 * Floating zone rendered in the bottom-right of the viewport. Holds the
 * "open side panel" button (translucent by default, opaque on hover), via a
 * portal on document.body.
 *
 * The inline-Scribe trigger that used to sit here was removed: it is now the
 * under-selection floating button (ScribeSelectionButton), which appears right
 * where the user is working. Panel access stays here because the panel is
 * useful without any selection.
 *
 * @param {{ visible: boolean, onTogglePanel: () => void }} props
 */
export const ScribeFloatingZone = ({ visible, onTogglePanel }) => {
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

  return createPortal(
    <div
      style={{
        position: 'fixed',
        bottom: 80,
        right: 40,
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
          />
        )}
        <PanelIcon />
      </button>
    </div>,
    document.body
  )
}
