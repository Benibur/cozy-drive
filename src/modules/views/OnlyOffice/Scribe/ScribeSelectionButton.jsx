import React, { useState } from 'react'
import { createPortal } from 'react-dom'

import { useTheme } from 'cozy-ui/transpiled/react/styles'
import { useI18n } from 'twake-i18n'

import { FRAME_EDITOR_NAME } from '@/modules/views/OnlyOffice/config'

// Gap (px) between the bottom of the text selection and the top of the button.
const SELECTION_GAP = 6

const getButtonStyle = isDark => ({
  cursor: 'pointer',
  borderRadius: '50%',
  width: 32,
  height: 32,
  padding: 0,
  background: isDark ? '#2d2d2d' : 'white',
  boxShadow: isDark
    ? '0 2px 8px rgba(0,0,0,0.4)'
    : '0 2px 8px rgba(0,0,0,0.15)',
  border: 'none',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  transition: 'opacity 200ms ease'
})

const getTooltipStyle = isDark => ({
  position: 'absolute',
  bottom: '100%',
  left: '50%',
  transform: 'translateX(-50%)',
  marginBottom: 8,
  padding: '6px 10px',
  background: isDark ? '#555' : '#333',
  borderRadius: 6,
  fontSize: 12,
  whiteSpace: 'nowrap',
  pointerEvents: 'none',
  display: 'flex',
  alignItems: 'center',
  gap: 4
})

const SparkleIcon = () => (
  <svg
    width="16"
    height="16"
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      d="M8 1l1.796 4.204L14 7l-4.204 1.796L8 13l-1.796-4.204L2 7l4.204-1.796L8 1z"
      fill="#7C3AED"
      stroke="#7C3AED"
      strokeWidth="0.5"
    />
    <path
      d="M12.5 1l.898 2.102L15.5 4l-2.102.898L12.5 7l-.898-2.102L9.5 4l2.102-.898L12.5 1z"
      fill="#7C3AED"
      stroke="#7C3AED"
      strokeWidth="0.3"
    />
  </svg>
)

/**
 * Floating Scribe button anchored UNDER the current text selection.
 *
 * The plugin reports the selection bounding box in OnlyOffice editor-window
 * client px (SELECTION_GEOMETRY intent, from the sdkjs patch
 * Api.GetSelectionScreenRect). This component adds the editor iframe's viewport
 * offset to place a `position:fixed` button just below the selection, centered
 * horizontally. Translucent at rest, opaque on hover, with a tooltip + shortcut.
 * Click opens the inline Scribe popover on the selection.
 *
 * Known MVP limitation: rect is refreshed on selection change only (not on pure
 * document scroll), so the button can lag during a scroll — see the study
 * (§6.2) for the scroll-glue increment.
 *
 * @param {{ rect: {left:number, top:number, width:number, height:number}|null,
 *           onTriggerScribe: () => void }} props
 */
export const ScribeSelectionButton = ({ rect, onTriggerScribe }) => {
  const { t } = useI18n()
  const theme = useTheme()
  const isDark = (theme.palette.type || theme.palette.mode) === 'dark'
  const [hovered, setHovered] = useState(false)

  if (!rect) return null

  // Editor-window px -> Drive viewport px: add the editor iframe's offset.
  const iframe = document.getElementsByName(FRAME_EDITOR_NAME)[0]
  if (!iframe) return null
  const frame = iframe.getBoundingClientRect()

  const left = frame.left + rect.left + rect.width / 2
  const top = frame.top + rect.top + rect.height + SELECTION_GAP

  const buttonStyle = getButtonStyle(isDark)
  const tooltipStyle = getTooltipStyle(isDark)

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left,
        top,
        transform: 'translateX(-50%)',
        zIndex: 100000
      }}
    >
      <button
        style={{
          ...buttonStyle,
          opacity: hovered ? 1 : 0.4,
          position: 'relative'
        }}
        onClick={onTriggerScribe}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        type="button"
      >
        {hovered && (
          <span style={tooltipStyle}>
            <span style={{ color: 'white' }}>{t('Scribe.button.text_ai')}</span>
            <span style={{ color: '#999' }}>(Ctrl+Shift+I)</span>
          </span>
        )}
        <SparkleIcon />
      </button>
    </div>,
    document.body
  )
}
