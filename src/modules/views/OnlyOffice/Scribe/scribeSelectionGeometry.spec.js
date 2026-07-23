import {
  createVirtualAnchor,
  editorBoxToViewport,
  getSelectionEndCorner,
  getVisibleSelectionBox,
  isBoxInEditorView
} from '@/modules/views/OnlyOffice/Scribe/scribeSelectionGeometry'
import { FRAME_EDITOR_NAME } from '@/modules/views/OnlyOffice/config'

// The editor frame is the only DOM the contract touches: it is what turns
// editor-window px into Drive viewport px.
const mountEditorFrame = ({ left, top }) => {
  const iframe = document.createElement('iframe')
  iframe.setAttribute('name', FRAME_EDITOR_NAME)
  iframe.getBoundingClientRect = () => ({
    left,
    top,
    width: 800,
    height: 600,
    right: left + 800,
    bottom: top + 600
  })
  document.body.appendChild(iframe)
  return iframe
}

describe('scribeSelectionGeometry', () => {
  afterEach(() => {
    document.body.innerHTML = ''
  })

  describe('editorBoxToViewport', () => {
    it('adds the editor frame offset', () => {
      mountEditorFrame({ left: 100, top: 50 })

      expect(
        editorBoxToViewport({ left: 10, top: 20, width: 30, height: 40 })
      ).toEqual({ left: 110, top: 70, width: 30, height: 40 })
    })

    // An editor that reports nothing must make every consumer fall back, not
    // produce a box at the window origin.
    it('returns null without a box', () => {
      mountEditorFrame({ left: 100, top: 50 })

      expect(editorBoxToViewport(null)).toBeNull()
    })

    it('returns null when the editor frame is not mounted', () => {
      expect(
        editorBoxToViewport({ left: 10, top: 20, width: 30, height: 40 })
      ).toBeNull()
    })
  })

  describe('isBoxInEditorView', () => {
    const rect = { viewport: { left: 0, top: 100, width: 500, height: 400 } }

    it('accepts a box fully inside the visible document area', () => {
      expect(
        isBoxInEditorView(rect, { left: 10, top: 110, width: 20, height: 20 })
      ).toBe(true)
    })

    // The geometry keeps describing where the selection WOULD be once it is
    // scrolled away — above the viewport here, i.e. over the editor's toolbar.
    it('rejects a box scrolled out of the visible area', () => {
      expect(
        isBoxInEditorView(rect, { left: 10, top: 40, width: 20, height: 20 })
      ).toBe(false)
    })

    it('rejects a box that only partly overflows', () => {
      expect(
        isBoxInEditorView(rect, { left: 490, top: 110, width: 20, height: 20 })
      ).toBe(false)
    })

    // Older SDK: nothing to clip against, so nothing is hidden.
    it('accepts everything when the editor reports no viewport', () => {
      expect(
        isBoxInEditorView({}, { left: -50, top: -50, width: 20, height: 20 })
      ).toBe(true)
    })
  })

  describe('getSelectionEndCorner', () => {
    it('uses the END corner, not the bounding box', () => {
      const rect = {
        left: 0,
        top: 0,
        width: 400,
        height: 60,
        corners: [
          [10, 0],
          [10, 20],
          [120, 40],
          [120, 60]
        ]
      }

      expect(getSelectionEndCorner(rect)).toEqual({ x: 120, y: 60 })
    })

    it('falls back to the bbox corner when corners are absent', () => {
      expect(
        getSelectionEndCorner({ left: 5, top: 5, width: 100, height: 20 })
      ).toEqual({ x: 105, y: 25 })
    })
  })

  describe('getVisibleSelectionBox', () => {
    const viewport = { left: 0, top: 100, width: 500, height: 400 }

    it('converts a fully visible selection', () => {
      mountEditorFrame({ left: 30, top: 10 })

      expect(
        getVisibleSelectionBox({
          left: 10,
          top: 110,
          width: 200,
          height: 20,
          viewport
        })
      ).toEqual({ left: 40, top: 120, width: 200, height: 20 })
    })

    // A tall selection routinely runs past the visible area. Anchoring to the
    // part the user can see beats dropping the anchor for a long selection.
    it('clips a selection that overflows the visible area', () => {
      mountEditorFrame({ left: 0, top: 0 })

      expect(
        getVisibleSelectionBox({
          left: 10,
          top: 50,
          width: 100,
          height: 300,
          viewport
        })
      ).toEqual({ left: 10, top: 100, width: 100, height: 250 })
    })

    // Nothing left to point at -> the caller falls back to the centred menu.
    it('returns null when the selection is entirely scrolled away', () => {
      mountEditorFrame({ left: 0, top: 0 })

      expect(
        getVisibleSelectionBox({
          left: 10,
          top: 0,
          width: 100,
          height: 40,
          viewport
        })
      ).toBeNull()
    })

    it('returns null for an empty box', () => {
      mountEditorFrame({ left: 0, top: 0 })

      expect(
        getVisibleSelectionBox({ left: 10, top: 110, width: 0, height: 20 })
      ).toBeNull()
    })
  })

  describe('createVirtualAnchor', () => {
    // The whole point of the indirection: Popper re-reads the reference, and must
    // see where the selection is NOW, not where it was when the menu opened.
    it('reads the box late, on every call', () => {
      let box = { left: 0, top: 0, width: 10, height: 10 }
      const anchor = createVirtualAnchor(() => box)

      expect(anchor.getBoundingClientRect().left).toBe(0)

      box = { left: 200, top: 300, width: 10, height: 10 }

      expect(anchor.getBoundingClientRect()).toMatchObject({
        left: 200,
        top: 300,
        right: 210,
        bottom: 310
      })
      expect(anchor.clientWidth).toBe(10)
    })

    // MUI validates these two as numbers before handing the object to Popper.
    it('exposes numeric client sizes even with no box', () => {
      const anchor = createVirtualAnchor(() => null)

      expect(typeof anchor.clientWidth).toBe('number')
      expect(typeof anchor.clientHeight).toBe('number')
      expect(anchor.getBoundingClientRect().width).toBe(0)
    })
  })
})
