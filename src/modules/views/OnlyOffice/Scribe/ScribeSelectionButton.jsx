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
import {
  editorBoxToViewport,
  getSelectionEndCorner,
  isBoxInEditorView
} from '@/modules/views/OnlyOffice/Scribe/scribeSelectionGeometry'

// Gap (px) between the end of the text selection and the visible disc, both
// horizontally and vertically. Applies to the DISC, not to the svg box — the
// asset's own shadow padding is compensated separately.
const SELECTION_GAP = 4

// Tooltips anchor on the button BOX, but this button's box has DISC_INSET_TOP
// px of transparent shadow padding above the disc. Subtract it so the gap the
// eye sees matches the side-panel button's.
const TOOLTIP_GAP = 8 - DISC_INSET_TOP

/**
 * Screen box of the button, in VIEWPORT px, or null when it is not on screen
 * (no geometry from the editor, editor not mounted, or the selection scrolled
 * out of the visible document area — see isBoxInEditorView).
 *
 * Two boxes, because they are not the same thing: `left`/`top` is the SVG BOX
 * (which carries transparent shadow padding and is what gets positioned), while
 * `disc` is the visible disc inside it. Anything that has to line up with the
 * button must align to the DISC, or it lines up with padding nobody can see.
 *
 * Exported so those callers cannot re-derive the position with their own copy of
 * the insets, which is exactly how the tooltip gaps drifted apart before.
 */
export const getSelectionButtonBox = rect => {
  if (!rect) return null

  const anchor = getSelectionEndCorner(rect)

  // Disc box in the EDITOR frame — this is what gets clipped against the
  // document viewport, which is expressed in that same frame.
  const discInEditor = {
    left: anchor.x + SELECTION_GAP,
    top: anchor.y + SELECTION_GAP,
    width: DISC_SIZE,
    height: DISC_SIZE
  }
  if (!isBoxInEditorView(rect, discInEditor)) return null

  const disc = editorBoxToViewport(discInEditor)
  if (!disc) return null

  return {
    // The svg box: shifted by the asset's internal insets so the DISC lands where
    // it should. Without this the shadow padding pushes the disc up and left.
    left: disc.left - DISC_INSET_LEFT,
    top: disc.top - DISC_INSET_TOP,
    disc
  }
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

  const box = getSelectionButtonBox(rect)
  if (!box) return null

  const { left, top } = box

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
