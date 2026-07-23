import { render, screen, fireEvent } from '@testing-library/react'
import React, { createRef } from 'react'

import useBreakpoints from 'cozy-ui/transpiled/react/providers/Breakpoints'

// Light theme mock — the menu reads palette.type and palette.grey for the
// focused-row highlight (prompt / open-panel entries). Keep the rest of the
// styles module (makeStyles etc.) intact for cozy-ui's ListItem/Paper.
jest.mock('cozy-ui/transpiled/react/styles', () => ({
  ...jest.requireActual('cozy-ui/transpiled/react/styles'),
  __esModule: true,
  useTheme: () => ({
    palette: {
      type: 'light',
      grey: { 200: '#eee', 700: '#444' }
    }
  })
}))

// i18n: echo the key so labels/placeholders are the raw keys
// ('Scribe.button.open_panel', 'Scribe.menu.correct_grammar', ...).
jest.mock('twake-i18n', () => ({
  __esModule: true,
  useI18n: () => ({ t: key => key, lang: 'en' })
}))

// Controllable breakpoints — default desktop; individual tests can flip mobile.
jest.mock('cozy-ui/transpiled/react/providers/Breakpoints', () => {
  const mock = jest.fn()
  return {
    ...jest.requireActual('cozy-ui/transpiled/react/providers/Breakpoints'),
    __esModule: true,
    default: mock,
    useBreakpoints: mock
  }
})

// Dev-mode entry is off so the menu shows only the canonical four LLM actions.
jest.mock('@/modules/views/OnlyOffice/Scribe/scribeDevMode', () => ({
  __esModule: true,
  isScribeDevMd: () => false
}))

import { ScribeActionMenu } from '@/modules/views/OnlyOffice/Scribe/ScribeActionMenu'

const OPEN_PANEL_LABEL = 'Scribe.button.open_panel'
const ACTION_LABELS = [
  'Scribe.menu.correct_grammar',
  'Scribe.menu.translate',
  'Scribe.menu.change_tone',
  'Scribe.menu.improve'
]

const renderMenu = (props = {}) => {
  const onSelect = props.onSelect || jest.fn()
  const onOpenPanel = 'onOpenPanel' in props ? props.onOpenPanel : jest.fn()
  const ref = props.ref || createRef()
  const utils = render(
    <ScribeActionMenu
      ref={ref}
      onSelect={onSelect}
      onClose={props.onClose || jest.fn()}
      onOpenPanel={onOpenPanel}
      selectedText="hello"
    />
  )
  return { ...utils, onSelect, onOpenPanel, ref }
}

describe('ScribeActionMenu', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    useBreakpoints.mockReturnValue({ isMobile: false })
  })

  it('renders the four LLM actions, the free-prompt input and the open-panel entry', () => {
    renderMenu()

    ACTION_LABELS.forEach(label => {
      expect(screen.getByText(label)).toBeInTheDocument()
    })
    // Free-prompt input is present (its placeholder is the raw i18n key).
    expect(
      screen.getByPlaceholderText('Scribe.prompt.placeholder')
    ).toBeInTheDocument()
    // Open-panel entry sits at the bottom with the reused i18n key.
    expect(screen.getByText(OPEN_PANEL_LABEL)).toBeInTheDocument()
  })

  it('renders the open-panel entry as the last list item, after the prompt', () => {
    const { container } = renderMenu()
    const openEntry = container.querySelector('[data-scribe-open-panel]')
    const promptEntry = container.querySelector('[data-scribe-prompt-entry]')
    expect(openEntry).toBeTruthy()
    expect(promptEntry).toBeTruthy()
    // DOM order: prompt entry precedes the open-panel entry.
    expect(
      promptEntry.compareDocumentPosition(openEntry) &
        Node.DOCUMENT_POSITION_FOLLOWING
    ).toBeTruthy()
  })

  it('does NOT render the open-panel action as a standalone <button>', () => {
    const { container } = renderMenu()
    // The old in-popover icon button is gone; open-panel is a ListItem now.
    // (The only remaining <button type="button"> is the prompt's send icon.)
    const openEntry = container.querySelector('[data-scribe-open-panel]')
    expect(openEntry).toBeTruthy()
    expect(openEntry.tagName.toLowerCase()).not.toBe('button')
    // No <button type="button"> anywhere in the tree carries the open-panel label.
    const buttons = Array.from(
      container.querySelectorAll('button[type="button"]')
    )
    buttons.forEach(btn => {
      expect(btn.textContent).not.toContain(OPEN_PANEL_LABEL)
    })
  })

  it('calls onOpenPanel (not onSelect) when the open-panel entry is clicked', () => {
    const { onSelect, onOpenPanel } = renderMenu()
    fireEvent.click(screen.getByText(OPEN_PANEL_LABEL))
    expect(onOpenPanel).toHaveBeenCalledTimes(1)
    // T-v3.1-05-04: the open-panel entry must never reach the LLM pipeline.
    expect(onSelect).not.toHaveBeenCalled()
  })

  it('omits the open-panel entry when onOpenPanel is not provided', () => {
    const { container } = renderMenu({ onOpenPanel: undefined })
    expect(screen.queryByText(OPEN_PANEL_LABEL)).toBeNull()
    expect(container.querySelector('[data-scribe-open-panel]')).toBeNull()
    // The prompt then takes the bottom corners (still rendered).
    expect(container.querySelector('[data-scribe-prompt-entry]')).toBeTruthy()
  })

  it('still routes the free-prompt submit through onSelect with the free-prompt id', () => {
    const { onSelect } = renderMenu()
    const input = screen.getByPlaceholderText('Scribe.prompt.placeholder')
    fireEvent.change(input, { target: { value: 'do a thing' } })
    fireEvent.keyDown(input, { key: 'Enter' })
    expect(onSelect).toHaveBeenCalledWith('free-prompt', 'do a thing', 'do a thing')
  })

  // The menu snaps to a wider width once the prompt has content, then back to
  // compact when cleared. (Anchored placement stays valid: popper repositions on
  // the resize — see ScribeActionMenu's width comment.)
  it('widens the menu while the prompt has content, and narrows back when cleared', () => {
    const { container } = renderMenu()
    const menuPaper = [...container.querySelectorAll('*')].find(
      el => el.style && (el.style.width === '280px' || el.style.width === '380px')
    )
    expect(menuPaper).toBeTruthy()
    expect(menuPaper.style.width).toBe('280px') // compact when empty

    const input = screen.getByPlaceholderText('Scribe.prompt.placeholder')
    fireEvent.change(input, { target: { value: 'hi' } })
    expect(menuPaper.style.width).toBe('380px') // wide with content

    fireEvent.change(input, { target: { value: '' } })
    expect(menuPaper.style.width).toBe('280px') // back to compact
  })

  // Type-ahead: start typing with the menu (not the pill) focused and the first
  // keystroke must LAND in the prompt — it was preventDefault'd, so without the
  // insertText hand-off it would be lost.
  it('type-ahead: a printable key on the menu chrome lands in the prompt and focuses it', () => {
    renderMenu()
    const prompt = screen.getByPlaceholderText('Scribe.prompt.placeholder')
    expect(prompt.value).toBe('')
    // Fire on an action row (a descendant of the menu Paper, NOT an input).
    fireEvent.keyDown(screen.getByText('Scribe.menu.correct_grammar'), {
      key: 'h'
    })
    expect(prompt.value).toBe('h')
    expect(document.activeElement).toBe(prompt)
  })

  // Space is deliberately excluded from type-ahead: it still activates the
  // focused row, so a leading space cannot start a prompt.
  it('type-ahead: space is not typed — it still selects the focused row', () => {
    const { onSelect } = renderMenu()
    fireEvent.keyDown(screen.getByText('Scribe.menu.correct_grammar'), {
      key: ' '
    })
    expect(
      screen.getByPlaceholderText('Scribe.prompt.placeholder').value
    ).toBe('')
    // The action id (not its label) is the first onSelect argument.
    expect(onSelect).toHaveBeenCalledWith(
      'correct-grammar',
      'Scribe.menu.correct_grammar',
      'Scribe.menu.correct_grammar'
    )
  })

  // A keystroke already inside an input (the prompt, or the custom-lang field)
  // must NOT be hijacked — the guard checks the event target tag.
  it('type-ahead: a key typed inside the prompt is left alone', () => {
    renderMenu()
    const prompt = screen.getByPlaceholderText('Scribe.prompt.placeholder')
    // Target is the textarea, so type-ahead's insertText hand-off is skipped;
    // a raw keyDown does not itself mutate the value, so it stays empty (i.e.
    // the character was not ALSO appended).
    fireEvent.keyDown(prompt, { key: 'x' })
    expect(prompt.value).toBe('')
  })

  describe('keyboard roving (desktop)', () => {
    const getMenuPaper = ref => {
      // The menu Paper is the element exposing focus() via the imperative ref.
      ref.current.focus()
      return document.activeElement
    }

    it('cycles ArrowDown: actions -> prompt -> open-panel -> wrap to first action', () => {
      const { ref, container } = renderMenu()
      const paper = getMenuPaper(ref)

      const promptEntry = container.querySelector('[data-scribe-prompt-entry]')
      const openEntry = container.querySelector('[data-scribe-open-panel]')

      // 4 actions (indices 0..3). After 3 downs we are on the last action.
      fireEvent.keyDown(paper, { key: 'ArrowDown' }) // -> action 1
      fireEvent.keyDown(paper, { key: 'ArrowDown' }) // -> action 2
      fireEvent.keyDown(paper, { key: 'ArrowDown' }) // -> action 3 (last action)
      // Next down lands on the prompt entry (highlighted via focusedBg).
      fireEvent.keyDown(paper, { key: 'ArrowDown' }) // -> prompt
      expect(promptEntry.style.backgroundColor).not.toBe('')

      // The prompt input owns its own arrows: simulate ArrowDown on the input,
      // which calls onArrow('down') -> moves focus to the open-panel entry.
      const input = screen.getByPlaceholderText('Scribe.prompt.placeholder')
      fireEvent.keyDown(input, { key: 'ArrowDown' })
      // open-panel entry is now selected (cozy-ui marks selected ListItems).
      expect(openEntry.className).toMatch(/selected|Mui-selected/)
    })

    it('Enter on the focused open-panel entry calls onOpenPanel', () => {
      const { ref, onOpenPanel, container } = renderMenu()
      const paper = getMenuPaper(ref)
      const input = screen.getByPlaceholderText('Scribe.prompt.placeholder')

      // Navigate down to the last action, then prompt, then to open-panel.
      fireEvent.keyDown(paper, { key: 'ArrowDown' })
      fireEvent.keyDown(paper, { key: 'ArrowDown' })
      fireEvent.keyDown(paper, { key: 'ArrowDown' })
      fireEvent.keyDown(paper, { key: 'ArrowDown' }) // prompt
      fireEvent.keyDown(input, { key: 'ArrowDown' }) // open-panel

      const openEntry = container.querySelector('[data-scribe-open-panel]')
      expect(openEntry.className).toMatch(/selected|Mui-selected/)

      fireEvent.keyDown(paper, { key: 'Enter' })
      expect(onOpenPanel).toHaveBeenCalledTimes(1)
    })

    it('ArrowUp from the first action wraps to the open-panel entry (last roving slot)', () => {
      const { ref, container } = renderMenu()
      const paper = getMenuPaper(ref)
      // focusIndex starts at 0 (first action). ArrowUp wraps to the last slot.
      fireEvent.keyDown(paper, { key: 'ArrowUp' })
      const openEntry = container.querySelector('[data-scribe-open-panel]')
      expect(openEntry.className).toMatch(/selected|Mui-selected/)
    })
  })
})
