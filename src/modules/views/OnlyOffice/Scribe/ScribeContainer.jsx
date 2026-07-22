import PropTypes from 'prop-types'
import React, { useRef, useCallback, useEffect, useState } from 'react'

import ClickAwayListener from 'cozy-ui/transpiled/react/ClickAwayListener'
import Drawer from 'cozy-ui/transpiled/react/Drawer'
import Popover from 'cozy-ui/transpiled/react/Popover'
import Popper from 'cozy-ui/transpiled/react/Popper'
import useBreakpoints from 'cozy-ui/transpiled/react/providers/Breakpoints'
import { useTheme } from 'cozy-ui/transpiled/react/styles'

import styles from '@/modules/views/OnlyOffice/Scribe/scribe.styl'

const SWIPE_THRESHOLD = 60

// Distance between the anchor and the menu — the arrow lives in this gap.
const ANCHOR_OFFSET = 12
// Keep the menu off the very edge of the window when it is pushed back into view.
const VIEWPORT_PADDING = 8
// Above the floating buttons (100000): the menu they open must cover them, and
// the whole point of dropping the modal was that nothing dims the document.
const ANCHORED_Z_INDEX = 100001

/**
 * Anchored, NON-modal container: the menu hangs off the selection with an arrow
 * pointing back at it (no backdrop, so the document stays readable and
 * scrollable underneath — which is why the geometry keeps being pushed).
 *
 * Placement is delegated to popper.js rather than computed here: it flips
 * bottom<->top depending on the room around the selection and shifts the menu
 * sideways to keep it in the window, with the arrow tracking the anchor. That is
 * exactly the "put it where there is space" logic, already written and tested.
 *
 * Dropping the modal means re-doing by hand the three things Popover gave for
 * free: closing on an outside click, closing on Escape, and moving focus into
 * the menu.
 */
const ScribeAnchoredContainer = ({
  open,
  onClose,
  anchorEl,
  anchorKey,
  paperStyle,
  onEntered,
  children
}) => {
  const theme = useTheme()
  const popperRef = useRef(null)
  const [arrowEl, setArrowEl] = useState(null)

  // A fresh rect arrived (the selection moved under a scroll, or the window was
  // resized): the anchor object is stable, so popper has to be told to re-read it.
  useEffect(() => {
    if (popperRef.current) popperRef.current.scheduleUpdate()
  }, [anchorKey])

  useEffect(() => {
    if (!open) return
    const handler = e => {
      if (e.key === 'Escape') {
        e.preventDefault()
        onClose()
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [open, onClose])

  // Stands in for Popover's TransitionProps.onEntered, which never fires here:
  // there is no transition, so the caller's focus handoff needs a trigger.
  useEffect(() => {
    if (open && onEntered) onEntered()
  }, [open, onEntered])

  // The menu changes size while it is open — a submenu's parent row, a prompt
  // growing to several lines — and popper.js v1 watches scroll and window resize
  // but NOT the size of its own popper. Without this the menu grows downwards
  // past the bottom of the window with nothing to catch it. Observing is cheaper
  // and more honest than guessing a maximum height.
  useEffect(() => {
    if (!open || typeof ResizeObserver === 'undefined') return
    const instance = popperRef.current
    const popperEl = instance && instance.popper
    if (!popperEl) return

    const observer = new ResizeObserver(() => {
      if (popperRef.current) popperRef.current.scheduleUpdate()
    })
    observer.observe(popperEl)
    return () => observer.disconnect()
  }, [open])

  return (
    <Popper
      open={open}
      anchorEl={anchorEl}
      popperRef={popperRef}
      placement="bottom-start"
      style={{ zIndex: ANCHORED_Z_INDEX }}
      modifiers={{
        offset: { enabled: true, offset: `0, ${ANCHOR_OFFSET}` },
        flip: { enabled: true, behavior: ['bottom-start', 'top-start'] },
        preventOverflow: {
          enabled: true,
          boundariesElement: 'viewport',
          padding: VIEWPORT_PADDING
        },
        arrow: { enabled: true, element: arrowEl }
      }}
    >
      {({ placement }) => (
        <ClickAwayListener onClickAway={onClose}>
          <div
            data-scribe-placement={placement}
            style={{
              // The arrow is painted in the menu's own paper colour, which only
              // the theme knows and a stylesheet cannot read.
              '--scribe-arrow-bg': theme.palette.background.paper,
              ...paperStyle
            }}
          >
            <span className={styles['scribe-anchor-arrow']} ref={setArrowEl} />
            {children}
          </div>
        </ClickAwayListener>
      )}
    </Popper>
  )
}

/**
 * ScribeContainer - Breakpoint-conditional container for Scribe UI.
 *
 * On mobile (isMobile): renders a bottom Drawer (auto-height, max 85vh).
 * On desktop: renders the existing Popover with all props passed through.
 *
 * This component only handles the container shell — all content
 * (menu, loading, result) is passed as children.
 *
 * Why MUI Drawer instead of cozy-ui BottomSheet:
 * - BottomSheet is designed for progressive disclosure with 3 snap points
 *   (min/medium/max) — Scribe needs simple open/close, not variable
 *   snap positions. BottomSheet is not suited for this use case.
 * - BottomSheet always renders via Portal (@material-ui/core/Portal),
 *   which breaks the React context chain (theme, i18n, cozy-client)
 *   that Scribe children rely on.
 * - BottomSheet expects children wrapped in BottomSheetItem for proper
 *   styling — this would force layout changes across all three Scribe
 *   steps (menu, loading, result) for no functional benefit.
 * - Drawer gives direct control over open/close, focus management
 *   (disableEnforceFocus, disableAutoFocus), and transition callbacks
 *   (SlideProps) that Scribe's keyboard navigation depends on.
 */
const ScribeContainer = ({
  open,
  onClose,
  children,
  TransitionProps,
  anchorEl,
  anchorKey,
  ...popoverProps
}) => {
  const { isMobile } = useBreakpoints()
  const touchStartY = useRef(null)

  const handleTouchStart = useCallback(e => {
    touchStartY.current = e.touches[0].clientY
  }, [])

  const handleTouchEnd = useCallback(
    e => {
      if (touchStartY.current === null) return
      const deltaY = e.changedTouches[0].clientY - touchStartY.current
      touchStartY.current = null
      if (deltaY > SWIPE_THRESHOLD) {
        onClose()
      }
    },
    [onClose]
  )

  if (isMobile) {
    return (
      <Drawer
        anchor="bottom"
        open={open}
        onClose={onClose}
        SlideProps={TransitionProps}
        ModalProps={{
          disableScrollLock: true,
          disableEnforceFocus: true,
          disableAutoFocus: true
        }}
        PaperProps={{
          style: {
            maxHeight: '85vh',
            borderRadius: '12px 12px 0 0',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'auto'
          }
        }}
        BackdropProps={{ style: { backgroundColor: 'rgba(0, 0, 0, 0.5)' } }}
      >
        {/* Drag handle — tap or swipe down to close */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            padding: '12px 0 8px',
            flexShrink: 0,
            cursor: 'grab',
            touchAction: 'none'
          }}
          onClick={onClose}
          onTouchStart={handleTouchStart}
          onTouchEnd={handleTouchEnd}
        >
          <div
            style={{
              width: 32,
              height: 4,
              borderRadius: 2,
              backgroundColor: 'rgba(128, 128, 128, 0.4)'
            }}
          />
        </div>
        {children}
      </Drawer>
    )
  }

  // Anchored when the editor tells us where the selection is; centred and modal
  // when it does not (see scribeSelectionGeometry: the fallback is what happens
  // on its own, not a case anyone has to remember to handle).
  if (anchorEl) {
    return (
      <ScribeAnchoredContainer
        open={open}
        onClose={onClose}
        anchorEl={anchorEl}
        anchorKey={anchorKey}
        paperStyle={popoverProps.PaperProps && popoverProps.PaperProps.style}
        onEntered={TransitionProps && TransitionProps.onEntered}
      >
        {children}
      </ScribeAnchoredContainer>
    )
  }

  return (
    <Popover
      open={open}
      onClose={onClose}
      TransitionProps={TransitionProps}
      {...popoverProps}
    >
      {children}
    </Popover>
  )
}

ScribeContainer.propTypes = {
  open: PropTypes.bool.isRequired,
  onClose: PropTypes.func.isRequired,
  children: PropTypes.node,
  // Popper virtual element. Present = anchored & non-modal, absent = centred modal.
  anchorEl: PropTypes.object,
  // Changes whenever the anchor has MOVED; the anchor object itself is stable.
  anchorKey: PropTypes.string
}

export { ScribeContainer }
