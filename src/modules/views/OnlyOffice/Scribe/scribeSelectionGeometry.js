import { FRAME_EDITOR_NAME } from '@/modules/views/OnlyOffice/config'

/**
 * THE SELECTION-GEOMETRY CONTRACT — the whole editor-specific surface of Scribe's
 * anchored UI, in one file.
 *
 * An editor that wants Scribe's UI anchored to the selection has exactly one
 * obligation: push a rect describing where the selection is on screen, and push
 * it again whenever it CHANGES or MOVES (scroll, zoom, resize). Everything the
 * Drive side does with it — the under-selection button, the anchored inline menu —
 * is built on the shape below and on nothing else.
 *
 *   {
 *     left, top, width, height,   // px, EDITOR-WINDOW frame (not the Drive viewport)
 *     corners?: [ [x,y] x4 ],     // start-TL, start-BL, end-TR, end-BR
 *     viewport?: { left, top, width, height }  // visible document area, same frame
 *   }
 *
 * An editor that cannot produce this simply never pushes: every consumer here
 * returns null, and the UI falls back to its unanchored form (a centred modal).
 * That fallback is not a degraded special case to remember — it is what happens
 * on its own when the geometry is absent.
 *
 * Today OnlyOffice fills the contract through the sdkjs patch
 * (`onSelectionGeometryChanged` -> SELECTION_GEOMETRY intent). See
 * plugins/onlyoffice-scribe/SDKJS-PATCH.md.
 */

/**
 * The editor frame's box in Drive viewport px, or null when the editor is not
 * mounted. This is the ONLY place that knows the editor lives in an iframe.
 */
const getEditorFrameRect = () => {
  const iframe = document.getElementsByName(FRAME_EDITOR_NAME)[0]
  return iframe ? iframe.getBoundingClientRect() : null
}

/**
 * Editor-window px -> Drive viewport px.
 *
 * @param {{left:number, top:number, width:number, height:number}|null} box
 * @returns {{left:number, top:number, width:number, height:number}|null}
 */
export const editorBoxToViewport = box => {
  if (!box) return null
  const frame = getEditorFrameRect()
  if (!frame) return null
  return {
    left: frame.left + box.left,
    top: frame.top + box.top,
    width: box.width,
    height: box.height
  }
}

/**
 * Is `box` fully inside the editor's visible document area?
 *
 * Scrolling a selection out of view does NOT stop the geometry from being
 * reported — the rect keeps describing where the selection *would* be, which is
 * over the toolbar or outside the editor entirely. Anchored UI is rendered in a
 * portal on document.body, so nothing clips it: it would float over the
 * application chrome. Callers test before they anchor.
 *
 * Both arguments are in the EDITOR frame. When the editor reports no viewport
 * (older SDK) there is nothing to clip against, so the answer is "yes" — the
 * previous behaviour.
 *
 * @param {object|null} rect - the pushed selection rect (carries `viewport`)
 * @param {{left:number, top:number, width:number, height:number}} box
 */
export const isBoxInEditorView = (rect, box) => {
  const viewport = rect && rect.viewport
  if (!viewport) return true
  return (
    box.left >= viewport.left &&
    box.top >= viewport.top &&
    box.left + box.width <= viewport.left + viewport.width &&
    box.top + box.height <= viewport.top + viewport.height
  )
}

/**
 * End of the selection — its bottom-right corner — in the EDITOR frame.
 *
 * NOT the centre of the bounding box: as soon as a selection spans more than a
 * few words the box is as wide as the paragraph, so its centre sits far from
 * where the user stopped dragging. The end corner is where the eye, and the
 * mouse, already are. Falls back to the bbox corner when the payload predates
 * the `corners` field.
 *
 * @param {object} rect
 * @returns {{x:number, y:number}}
 */
export const getSelectionEndCorner = rect => {
  const end = rect.corners && rect.corners[3]
  if (end && typeof end[0] === 'number' && typeof end[1] === 'number') {
    return { x: end[0], y: end[1] }
  }
  return { x: rect.left + rect.width, y: rect.top + rect.height }
}

/**
 * Intersection of two boxes, or null when they do not overlap.
 */
const intersect = (a, b) => {
  const left = Math.max(a.left, b.left)
  const top = Math.max(a.top, b.top)
  const right = Math.min(a.left + a.width, b.left + b.width)
  const bottom = Math.min(a.top + a.height, b.top + b.height)
  if (right <= left || bottom <= top) return null
  return { left, top, width: right - left, height: bottom - top }
}

/**
 * The VISIBLE part of the selection, in Drive viewport px — what UI anchored to
 * the selection itself (as opposed to the button) hangs off.
 *
 * Clipped rather than tested for full containment: a long selection routinely
 * runs past the top or bottom of the visible area, and anchoring to the part the
 * user can actually see is right, while dropping the anchor for a selection that
 * is merely tall is not. Returns null only when NOTHING of it is on screen —
 * which is the point at which anchored UI has nothing left to point at, and the
 * caller falls back to its centred form.
 */
export const getVisibleSelectionBox = rect => {
  if (!rect) return null
  const box = {
    left: rect.left,
    top: rect.top,
    width: rect.width,
    height: rect.height
  }
  if (!(box.width > 0) || !(box.height > 0)) return null
  const visible = rect.viewport ? intersect(box, rect.viewport) : box
  if (!visible) return null
  return editorBoxToViewport(visible)
}

/**
 * A Popper "virtual element" reading its box from `getBox` at every call.
 *
 * Popper re-reads the reference on its own scroll/resize handling, and we ask it
 * to re-read when a fresh rect arrives; both paths must see the CURRENT box, so
 * the object is stable and the box is read late. Handing Popper a plain frozen
 * rect instead would pin the menu to wherever the selection was when it opened.
 *
 * @param {() => ({left:number, top:number, width:number, height:number}|null)} getBox
 *   returns a box in VIEWPORT px.
 */
export const createVirtualAnchor = getBox => ({
  get clientWidth() {
    const box = getBox()
    return box ? box.width : 0
  },
  get clientHeight() {
    const box = getBox()
    return box ? box.height : 0
  },
  getBoundingClientRect: () => {
    const box = getBox() || { left: 0, top: 0, width: 0, height: 0 }
    return {
      left: box.left,
      top: box.top,
      right: box.left + box.width,
      bottom: box.top + box.height,
      width: box.width,
      height: box.height,
      x: box.left,
      y: box.top
    }
  }
})
