import { render, screen, fireEvent } from '@testing-library/react'
import React from 'react'

import useBreakpoints from 'cozy-ui/transpiled/react/providers/Breakpoints'

jest.mock('cozy-ui/transpiled/react/providers/Breakpoints', () => {
  const mock = jest.fn()
  return {
    ...jest.requireActual('cozy-ui/transpiled/react/providers/Breakpoints'),
    __esModule: true,
    default: mock,
    useBreakpoints: mock
  }
})

jest.mock('cozy-ui/transpiled/react/Popover', () => {
  const MockPopover = ({ children, ...props }) => (
    <div data-testid="popover" data-props={JSON.stringify(props)}>
      {children}
    </div>
  )
  MockPopover.displayName = 'MockPopover'
  return { __esModule: true, default: MockPopover }
})

jest.mock('cozy-ui/transpiled/react/Popper', () => {
  const MockPopper = ({ children, anchorEl, placement, modifiers, open }) => (
    <div
      data-testid="popper"
      data-anchored={anchorEl ? 'yes' : 'no'}
      data-open={String(open)}
      data-placement={placement}
      data-modifiers={JSON.stringify(Object.keys(modifiers || {}))}
      // `arrow.element` is a DOM node, so only the serialisable modifiers are
      // exposed — but their VALUES matter, not just their names (see the flip
      // test below).
      data-modifier-config={JSON.stringify({
        offset: (modifiers || {}).offset,
        flip: (modifiers || {}).flip,
        preventOverflow: (modifiers || {}).preventOverflow
      })}
    >
      {typeof children === 'function'
        ? children({ placement: 'bottom-start' })
        : children}
    </div>
  )
  MockPopper.displayName = 'MockPopper'
  return { __esModule: true, default: MockPopper }
})

jest.mock('cozy-ui/transpiled/react/Drawer', () => {
  const MockDrawer = ({ children, ...props }) => {
    // Serialize ModalProps and PaperProps for assertion
    const serializable = {
      anchor: props.anchor,
      open: props.open,
      ModalProps: props.ModalProps,
      PaperProps: props.PaperProps
    }
    return (
      <div
        data-testid="drawer"
        data-props={JSON.stringify(serializable)}
        onClick={() => props.onClose && props.onClose({}, 'backdropClick')}
      >
        {children}
      </div>
    )
  }
  MockDrawer.displayName = 'MockDrawer'
  return { __esModule: true, default: MockDrawer }
})

import { ScribeContainer } from '@/modules/views/OnlyOffice/Scribe/ScribeContainer'

describe('ScribeContainer', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('renders Popover (not Drawer) on desktop with passthrough props', () => {
    useBreakpoints.mockReturnValue({ isMobile: false })

    const popoverProps = {
      anchorReference: 'anchorPosition',
      anchorPosition: { top: 400, left: 500 },
      transformOrigin: { vertical: 'center', horizontal: 'center' }
    }

    render(
      <ScribeContainer open={true} onClose={jest.fn()} {...popoverProps}>
        <div data-testid="content">Hello</div>
      </ScribeContainer>
    )

    expect(screen.getByTestId('popover')).toBeInTheDocument()
    expect(screen.queryByTestId('drawer')).not.toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()

    const props = JSON.parse(screen.getByTestId('popover').dataset.props)
    expect(props.open).toBe(true)
    expect(props.anchorReference).toBe('anchorPosition')
    expect(props.anchorPosition).toEqual({ top: 400, left: 500 })
    expect(props.transformOrigin).toEqual({
      vertical: 'center',
      horizontal: 'center'
    })
  })

  it('renders Drawer (not Popover) on mobile', () => {
    useBreakpoints.mockReturnValue({ isMobile: true })

    render(
      <ScribeContainer open={true} onClose={jest.fn()}>
        <div data-testid="content">Hello</div>
      </ScribeContainer>
    )

    expect(screen.getByTestId('drawer')).toBeInTheDocument()
    expect(screen.queryByTestId('popover')).not.toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()

    const props = JSON.parse(screen.getByTestId('drawer').dataset.props)
    expect(props.anchor).toBe('bottom')
    expect(props.open).toBe(true)
  })

  it('configures Drawer with correct ModalProps on mobile', () => {
    useBreakpoints.mockReturnValue({ isMobile: true })

    render(
      <ScribeContainer open={true} onClose={jest.fn()}>
        <div>Content</div>
      </ScribeContainer>
    )

    const props = JSON.parse(screen.getByTestId('drawer').dataset.props)
    expect(props.ModalProps).toEqual({
      disableScrollLock: true,
      disableEnforceFocus: true,
      disableAutoFocus: true
    })
  })

  it('configures Drawer PaperProps for a bottom sheet on mobile', () => {
    useBreakpoints.mockReturnValue({ isMobile: true })

    render(
      <ScribeContainer open={true} onClose={jest.fn()}>
        <div>Content</div>
      </ScribeContainer>
    )

    const props = JSON.parse(screen.getByTestId('drawer').dataset.props)
    expect(props.PaperProps.style).toEqual(
      expect.objectContaining({
        maxHeight: '85vh',
        borderRadius: '12px 12px 0 0'
      })
    )
  })

  // The anchored branch is what makes the inline menu sit ON the selection with an
  // arrow instead of dimming the document behind a centred modal.
  it('renders an anchored Popper (not the modal Popover) when given an anchor', () => {
    useBreakpoints.mockReturnValue({ isMobile: false })

    render(
      <ScribeContainer
        open={true}
        onClose={jest.fn()}
        anchorEl={{ getBoundingClientRect: () => ({}) }}
        anchorKey="10,20"
      >
        <div data-testid="content">Hello</div>
      </ScribeContainer>
    )

    expect(screen.getByTestId('popper')).toBeInTheDocument()
    expect(screen.queryByTestId('popover')).not.toBeInTheDocument()
    expect(screen.getByTestId('content')).toBeInTheDocument()

    const popper = screen.getByTestId('popper')
    expect(popper.dataset.anchored).toBe('yes')
    expect(popper.dataset.placement).toBe('bottom-start')
    // Placement is delegated: flip picks the side with room, preventOverflow keeps
    // the menu in the window, arrow keeps pointing at the selection.
    expect(JSON.parse(popper.dataset.modifiers)).toEqual(
      expect.arrayContaining(['flip', 'preventOverflow', 'arrow'])
    )
  })

  // No geometry from the editor -> the old centred modal, unchanged.
  it('falls back to the centred Popover when no anchor is given', () => {
    useBreakpoints.mockReturnValue({ isMobile: false })

    render(
      <ScribeContainer open={true} onClose={jest.fn()}>
        <div data-testid="content">Hello</div>
      </ScribeContainer>
    )

    expect(screen.getByTestId('popover')).toBeInTheDocument()
    expect(screen.queryByTestId('popper')).not.toBeInTheDocument()
  })

  // Mobile keeps its bottom sheet: a menu anchored to a caret is a desktop idea.
  it('keeps the Drawer on mobile even with an anchor', () => {
    useBreakpoints.mockReturnValue({ isMobile: true })

    render(
      <ScribeContainer
        open={true}
        onClose={jest.fn()}
        anchorEl={{ getBoundingClientRect: () => ({}) }}
      >
        <div data-testid="content">Hello</div>
      </ScribeContainer>
    )

    expect(screen.getByTestId('drawer')).toBeInTheDocument()
    expect(screen.queryByTestId('popper')).not.toBeInTheDocument()
  })

  it('closes the anchored menu on Escape', () => {
    useBreakpoints.mockReturnValue({ isMobile: false })
    const handleClose = jest.fn()

    render(
      <ScribeContainer
        open={true}
        onClose={handleClose}
        anchorEl={{ getBoundingClientRect: () => ({}) }}
      >
        <div>Content</div>
      </ScribeContainer>
    )

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  // The dimming veil makes the anchored menu stand out again, WITHOUT the
  // behaviour the modal backdrop used to break: it is pointer-events:none, so
  // scroll and clicks pass through to the document underneath.
  const findVeil = () => document.body.querySelector('[data-scribe-veil]')
  const veilColoured = () => {
    const v = findVeil()
    // transparent shows as '' or 'transparent' inline; coloured is the rgba.
    return (
      !!v &&
      v.style.backgroundColor !== '' &&
      v.style.backgroundColor !== 'transparent'
    )
  }

  it('darkens a pointer-events:none veil while the anchored menu is shown', () => {
    useBreakpoints.mockReturnValue({ isMobile: false })
    render(
      <ScribeContainer
        open={true}
        onClose={jest.fn()}
        anchorEl={{ getBoundingClientRect: () => ({}) }}
      >
        <div>Content</div>
      </ScribeContainer>
    )
    const veil = findVeil()
    expect(veil).toBeTruthy()
    expect(veil.style.pointerEvents).toBe('none')
    expect(veilColoured()).toBe(true)
  })

  // The veil element is PERSISTENT on desktop (so it can fade both ways); in the
  // centred fallback it is present but transparent, not coloured.
  it('leaves the veil transparent in the centred (unanchored) fallback', () => {
    useBreakpoints.mockReturnValue({ isMobile: false })
    render(
      <ScribeContainer open={true} onClose={jest.fn()}>
        <div>Content</div>
      </ScribeContainer>
    )
    expect(findVeil()).toBeTruthy()
    expect(veilColoured()).toBe(false)
  })

  // On mobile there is no veil at all (the Drawer has its own backdrop).
  it('renders no veil on mobile', () => {
    useBreakpoints.mockReturnValue({ isMobile: true })
    render(
      <ScribeContainer open={true} onClose={jest.fn()}>
        <div>Content</div>
      </ScribeContainer>
    )
    expect(findVeil()).toBeFalsy()
  })

  // The close must FADE, not yank: the veil is the SAME persistent node before
  // and after close (so CSS can transition its colour) — it just goes
  // transparent. This holds even when the close also drops the anchor (a click
  // in the document), which unmounts the anchored container but NOT the veil.
  it('fades the veil to transparent on close without removing the node', () => {
    useBreakpoints.mockReturnValue({ isMobile: false })
    const anchorEl = { getBoundingClientRect: () => ({}) }

    const { rerender } = render(
      <ScribeContainer open={true} onClose={jest.fn()} anchorEl={anchorEl}>
        <div>Content</div>
      </ScribeContainer>
    )
    const before = findVeil()
    expect(veilColoured()).toBe(true)

    // Close that also drops the anchor (document click): container switches to
    // the centred branch, but the veil node stays and merely goes transparent.
    rerender(
      <ScribeContainer open={false} onClose={jest.fn()} anchorEl={undefined}>
        <div>Content</div>
      </ScribeContainer>
    )
    const after = findVeil()
    expect(after).toBe(before) // same DOM node -> the transition can run
    expect(veilColoured()).toBe(false)
  })

  // popper.js v1 matches every `behavior` entry against
  // `data.placement.split('-')[0]`, i.e. the BASE placement. Listing
  // 'bottom-start' there never matches 'bottom', so flip returns on its first
  // line and silently does nothing: the menu stops flipping and is merely
  // shoved back into the window by preventOverflow — over the selection it is
  // supposed to point at. Popper re-applies the variation itself.
  it('gives flip BASE placements, without the variation', () => {
    useBreakpoints.mockReturnValue({ isMobile: false })

    render(
      <ScribeContainer
        open={true}
        onClose={jest.fn()}
        anchorEl={{ getBoundingClientRect: () => ({}) }}
      >
        <div>Content</div>
      </ScribeContainer>
    )

    const config = JSON.parse(
      screen.getByTestId('popper').dataset.modifierConfig
    )
    expect(config.flip.behavior).toEqual(['bottom', 'top'])
    config.flip.behavior.forEach(placement => {
      expect(placement).not.toContain('-')
    })
  })

  // An anchored menu whose anchor disappears WHILE STILL THE MENU STEP has
  // nothing left to point at — the selection was cleared or scrolled away. It
  // used to silently re-render as the centred modal (clicking in the document
  // clears the selection, and ClickAwayListener can't see that click — it lands
  // in a cross-origin iframe — so it teleported the menu to the middle of the
  // screen behind a backdrop). anchoredStep stays true: this IS a dismissal.
  it('closes an anchored menu when it loses its anchor on the menu step', () => {
    useBreakpoints.mockReturnValue({ isMobile: false })
    const handleClose = jest.fn()

    const { rerender } = render(
      <ScribeContainer
        open={true}
        onClose={handleClose}
        anchorEl={{ getBoundingClientRect: () => ({}) }}
        anchoredStep={true}
      >
        <div>Content</div>
      </ScribeContainer>
    )
    expect(handleClose).not.toHaveBeenCalled()

    rerender(
      <ScribeContainer
        open={true}
        onClose={handleClose}
        anchorEl={undefined}
        anchoredStep={true}
      >
        <div>Content</div>
      </ScribeContainer>
    )

    expect(handleClose).toHaveBeenCalledTimes(1)
  })

  // REGRESSION: picking an action (e.g. translate → English) advances the flow
  // from the anchored menu to the centred loading modal. The caller stops
  // supplying an anchor AS PART OF that transition (anchoredStep flips false in
  // the same render). That is NOT a dismissal — closing here cancelled the
  // intent and shut the menu the instant any action was clicked.
  it('does NOT close when the anchor disappears because the step advanced', () => {
    useBreakpoints.mockReturnValue({ isMobile: false })
    const handleClose = jest.fn()

    const { rerender } = render(
      <ScribeContainer
        open={true}
        onClose={handleClose}
        anchorEl={{ getBoundingClientRect: () => ({}) }}
        anchoredStep={true}
      >
        <div>Content</div>
      </ScribeContainer>
    )

    // step 'menu' -> 'loading': anchor gone AND anchoredStep false, together.
    rerender(
      <ScribeContainer
        open={true}
        onClose={handleClose}
        anchorEl={undefined}
        anchoredStep={false}
      >
        <div>Content</div>
      </ScribeContainer>
    )

    expect(handleClose).not.toHaveBeenCalled()
  })

  // The centred modal remains legitimate for an editor that reports no geometry
  // at all: never anchored, so there is no anchor to lose.
  it('leaves an unanchored menu open', () => {
    useBreakpoints.mockReturnValue({ isMobile: false })
    const handleClose = jest.fn()

    const { rerender } = render(
      <ScribeContainer open={true} onClose={handleClose}>
        <div>Content</div>
      </ScribeContainer>
    )
    rerender(
      <ScribeContainer open={true} onClose={handleClose}>
        <div>Content</div>
      </ScribeContainer>
    )

    expect(screen.getByTestId('popover')).toBeInTheDocument()
    expect(handleClose).not.toHaveBeenCalled()
  })

  // Mobile never anchors — its bottom sheet must not be dismissed by a selection
  // that went away.
  it('keeps the mobile Drawer open when the anchor disappears', () => {
    useBreakpoints.mockReturnValue({ isMobile: true })
    const handleClose = jest.fn()

    const { rerender } = render(
      <ScribeContainer
        open={true}
        onClose={handleClose}
        anchorEl={{ getBoundingClientRect: () => ({}) }}
      >
        <div>Content</div>
      </ScribeContainer>
    )
    rerender(
      <ScribeContainer open={true} onClose={handleClose} anchorEl={undefined}>
        <div>Content</div>
      </ScribeContainer>
    )

    expect(screen.getByTestId('drawer')).toBeInTheDocument()
    expect(handleClose).not.toHaveBeenCalled()
  })

  it('calls onClose when Drawer backdrop is clicked on mobile', () => {
    useBreakpoints.mockReturnValue({ isMobile: true })
    const handleClose = jest.fn()

    render(
      <ScribeContainer open={true} onClose={handleClose}>
        <div>Content</div>
      </ScribeContainer>
    )

    fireEvent.click(screen.getByTestId('drawer'))
    expect(handleClose).toHaveBeenCalledTimes(1)
  })
})
