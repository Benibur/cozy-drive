import React, { useState } from 'react'
import { createPortal } from 'react-dom'

import { useI18n } from 'twake-i18n'

import { ScribeHoverTooltip } from '@/modules/views/OnlyOffice/Scribe/ScribeHoverTooltip'
import {
  ScribeSelectionButtonIcon,
  DISC_INSET_LEFT,
  DISC_INSET_TOP,
  DISC_SIZE
} from '@/modules/views/OnlyOffice/Scribe/ScribeSelectionButtonIcon'
import { FRAME_EDITOR_NAME } from '@/modules/views/OnlyOffice/config'

// Gap (px) between the end of the text selection and the visible disc, both
// horizontally and vertically. Applies to the DISC, not to the svg box — the
// asset's own shadow padding is compensated separately.
const SELECTION_GAP = 4

// Tooltips anchor on the button BOX, but this button's box has DISC_INSET_TOP
// px of transparent shadow padding above the disc. Subtract it so the gap the
// eye sees matches the side-panel button's.
const TOOLTIP_GAP = 8 - DISC_INSET_TOP

/**
 * Anchor point of the button = the END of the selection (its bottom-right
 * corner), not the centre of the bounding box.
 *
 * The bbox centre reads as "bottom-left" as soon as the selection spans more
 * than a few words: for a multi-line selection the box is as wide as the
 * paragraph, so its centre sits far from where the user stopped dragging. The
 * end corner is where the eye — and the mouse — already are.
 *
 * corners are [start-TL, start-BL, end-TR, end-BR] as produced by the sdkjs
 * patch, already in editor-window px. Fall back to the bbox corner when the
 * payload predates the corners field.
 */
const getAnchor = rect => {
  const end = rect.corners && rect.corners[3]
  if (end && typeof end[0] === 'number' && typeof end[1] === 'number') {
    return { x: end[0], y: end[1] }
  }
  return { x: rect.left + rect.width, y: rect.top + rect.height }
}

/**
 * Is the whole disc inside the visible document area?
 *
 * Scrolling a selection out of view does not stop the geometry from being
 * reported — the box keeps describing where the selection *would* be, which is
 * over OnlyOffice's toolbar or outside the editor entirely. The button is a
 * `position: fixed` portal on document.body, so nothing clips it: it would float
 * over the application chrome.
 *
 * We hide rather than clip. A disc sliced by an invisible edge reads as a
 * rendering glitch, and a half-button is not clickable in any useful way.
 * Requiring the disc to be FULLY inside also means it never overlaps the rulers
 * or the scrollbars, which sit just outside this area.
 *
 * `viewport` comes from the same sdkjs patch, in the same coordinate frame. When
 * it is absent (older SDK) we keep the previous behaviour and show the button.
 */
const isDiscFullyVisible = (rect, discLeft, discTop, discSize) => {
  const vp = rect.viewport
  if (!vp) return true
  return (
    discLeft >= vp.left &&
    discTop >= vp.top &&
    discLeft + discSize <= vp.left + vp.width &&
    discTop + discSize <= vp.top + vp.height
  )
}

/**
 * Floating Scribe button anchored just below-right of the current text
 * selection.
 *
 * The plugin reports the selection geometry in OnlyOffice editor-window client
 * px (SELECTION_GEOMETRY intent, from the sdkjs patch
 * Api.GetSelectionScreenRect). This component adds the editor iframe's viewport
 * offset to place a `position:fixed` button. Click opens the inline Scribe
 * popover on the selection.
 *
 * Known MVP limitation: the rect is refreshed when the selection CHANGES, not
 * when it MOVES on screen, so the button lags on scroll and zoom — see the
 * study (§6.2) for the push-event increment that fixes it.
 *
 * @param {{ rect: {left:number, top:number, width:number, height:number,
 *                 corners?: number[][]}|null,
 *           onTriggerScribe: () => void }} props
 */
export const ScribeSelectionButton = ({ rect, onTriggerScribe }) => {
  const { t } = useI18n()
  const [hovered, setHovered] = useState(false)

  if (!rect) return null

  // Editor-window px -> Drive viewport px: add the editor iframe's offset.
  const iframe = document.getElementsByName(FRAME_EDITOR_NAME)[0]
  if (!iframe) return null
  const frame = iframe.getBoundingClientRect()

  const anchor = getAnchor(rect)

  // Disc position in the EDITOR frame — this is what gets clipped against the
  // document viewport, which is expressed in that same frame.
  const discLeft = anchor.x + SELECTION_GAP
  const discTop = anchor.y + SELECTION_GAP
  if (!isDiscFullyVisible(rect, discLeft, discTop, DISC_SIZE)) return null

  // Editor frame -> Drive viewport, then shift by the asset's internal insets so
  // the svg box lands where the disc should be. Without this the shadow padding
  // pushes the disc up and left, which is exactly the offset the design does not
  // want.
  const left = frame.left + discLeft - DISC_INSET_LEFT
  const top = frame.top + discTop - DISC_INSET_TOP

  return createPortal(
    <div
      style={{
        position: 'fixed',
        left,
        top,
        zIndex: 100000
      }}
    >
      <button
        style={{
          // The svg asset IS the button (disc + shadow baked in), so the button
          // element itself must be completely transparent and unpadded.
          cursor: 'pointer',
          background: 'none',
          border: 'none',
          padding: 0,
          lineHeight: 0,
          display: 'block',
          position: 'relative',
          opacity: hovered ? 1 : 0.75,
          transition: 'opacity 200ms ease'
        }}
        onClick={onTriggerScribe}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        type="button"
      >
        {hovered && (
          <ScribeHoverTooltip
            label={t('Scribe.button.selection_menu')}
            shortcut="(Ctrl+Shift+I)"
            align="center"
            gap={TOOLTIP_GAP}
          />
        )}
        <ScribeSelectionButtonIcon />
      </button>
    </div>,
    document.body
  )
}
