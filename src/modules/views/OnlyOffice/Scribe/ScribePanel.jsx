import React, { useState, useRef } from 'react'

import IconButton from 'cozy-ui/transpiled/react/IconButton'
import Icon from 'cozy-ui/transpiled/react/Icon'
import CrossIcon from 'cozy-ui/transpiled/react/Icons/Cross'
import Typography from 'cozy-ui/transpiled/react/Typography'
import { useTheme } from 'cozy-ui/transpiled/react/styles'

import { useScribe } from '@/modules/views/OnlyOffice/Scribe/ScribeContext'
import { ResizeHandle } from '@/modules/views/OnlyOffice/Scribe/ResizeHandle'
import { ChatMessageList } from '@/modules/views/OnlyOffice/Scribe/ChatMessageList'
import { ChatInput } from '@/modules/views/OnlyOffice/Scribe/ChatInput'
import { isScribeDevMd } from '@/modules/views/OnlyOffice/Scribe/scribeDevMode'
import { ProbeMetricsPanel } from '@/modules/views/OnlyOffice/Scribe/ScribeResultPanel'
import { ScribeSparkleGlyph } from '@/modules/views/OnlyOffice/Scribe/ScribeSelectionButtonIcon'
import {
  PANEL_GUTTER,
  PANEL_RADIUS,
  isDarkTheme,
  panelShadow,
  canvasBackground
} from '@/modules/views/OnlyOffice/Scribe/scribeSurface'

export const PANEL_WIDTH = 400

export const ScribePanel = () => {
  const theme = useTheme()
  const { closePanel, panelWidth } = useScribe()
  // Dev-only: lets a dev open the conformance probe (corpus metrics) from the
  // chat side panel — the inline ScribeResultPanel is only reachable from the
  // popover flow, so chat-side usage had no way to see the gate metrics.
  const devMode = isScribeDevMd()
  const [showProbe, setShowProbe] = useState(false)

  // Cross-component keyboard wiring (Plan 05): the input's Up-from-empty hands
  // focus to the thread controller's most-recent card; the controller returns
  // focus to the input on Escape / Down-past-newest. ScribePanel owns both refs
  // because it renders the two as siblings.
  const inputRef = useRef(null)
  const listRef = useRef(null)

  const isDark = isDarkTheme(theme)

  return (
    // Two boxes, and the split is the whole point of the redesign. The OUTER one
    // is the panel's slot in the editor row: it still measures exactly
    // `panelWidth`, because that is the distance from the window's right edge
    // that ResizeHandle drags (see its onPointerMove) — so the gutter has to be
    // PADDING taken out of the slot, never margin added to it, or every drag
    // would fight a widening panel. Its background is the application canvas
    // showing through that padding. The INNER one is the card.
    <div
      data-scribe-panel
      style={{
        width: panelWidth,
        flexShrink: 0,
        boxSizing: 'border-box',
        display: 'flex',
        flexDirection: 'row',
        height: '100%',
        padding: `${PANEL_GUTTER}px ${PANEL_GUTTER}px ${PANEL_GUTTER}px 0`,
        background: canvasBackground(isDark)
      }}
    >
      <ResizeHandle />
      <div
        data-scribe-panel-card
        style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          minWidth: 0,
          borderRadius: PANEL_RADIUS,
          background: theme.palette.background.paper,
          boxShadow: panelShadow(isDark)
        }}
      >
        {/* Header — no rule under it. A divider here cut the card into two
            stacked panes; the card's own edge is already the boundary, and the
            thread below carries its own separation by being a list of tinted
            blocks on white. */}
        <div
          style={{
            display: 'flex',
            flexDirection: 'row',
            alignItems: 'center',
            padding: '14px 14px 8px',
            flexShrink: 0
          }}
        >
          <ScribeSparkleGlyph size={22} />
          <Typography
            variant="h6"
            style={{ marginLeft: 9, flex: 1, fontSize: 15, fontWeight: 650, letterSpacing: '-0.1px' }}
          >
            Scribe
          </Typography>
          {devMode && (
            <button
              type="button"
              onClick={() => setShowProbe(v => !v)}
              title="Sonde de conformité (dev)"
              style={{
                marginRight: 8,
                fontSize: 11,
                cursor: 'pointer',
                padding: '2px 8px',
                borderRadius: 4,
                border: `1px solid ${theme.palette.divider}`,
                background: showProbe ? theme.palette.action.selected : 'transparent',
                color: theme.palette.text.secondary
              }}
            >
              Sonde
            </button>
          )}
          <IconButton size="small" onClick={closePanel}>
            <Icon icon={CrossIcon} size={16} />
          </IconButton>
        </div>

        {/* Chat body (kept mounted; probe view overlays it so chat state is preserved) */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0, position: 'relative' }}>
          <ChatMessageList
            ref={listRef}
            returnFocusToInput={() => inputRef.current && inputRef.current.focus()}
          />
          <ChatInput
            ref={inputRef}
            onArrowUp={() => listRef.current && listRef.current.focusMostRecentCardInsert()}
          />
          {devMode && showProbe && (
            <div
              style={{
                position: 'absolute',
                inset: 0,
                zIndex: 5,
                background: theme.palette.background.paper,
                display: 'flex',
                flexDirection: 'column',
                overflow: 'auto',
                padding: 12
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                <Typography variant="subtitle2" style={{ flex: 1 }}>
                  Sonde de conformité
                </Typography>
                <IconButton size="small" onClick={() => setShowProbe(false)}>
                  <Icon icon={CrossIcon} size={14} />
                </IconButton>
              </div>
              <ProbeMetricsPanel />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
