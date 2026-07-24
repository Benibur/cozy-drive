import React from 'react'

import { useTheme } from 'cozy-ui/transpiled/react/styles'

import { MarkdownPreview } from '@/modules/views/OnlyOffice/Scribe/MarkdownPreview'
import MessageActions from '@/modules/views/OnlyOffice/Scribe/MessageActions'

// The card frame is a quiet neutral, not an accent. It is nested INSIDE the
// assistant surface, and a coloured box within a box read as a mis-click; the
// border only has to BOUND the fragment. The accent (blue) lives in the quote
// bars and the send action, never in this frame.
const CARD_BORDER = isDark =>
  isDark ? 'rgba(255, 255, 255, 0.12)' : 'rgba(20, 20, 45, 0.12)'
const CARD_BG = isDark => (isDark ? 'rgba(255, 255, 255, 0.04)' : 'transparent')

/**
 * FragmentCard - a bordered, neutral card for a single LLM response
 * fragment (FRAG-01/D-01). It renders the fragment as rich markdown via
 * MarkdownPreview and carries its own Copy / Insert / Replace actions.
 *
 * D-03 INVARIANT (the governing rule): the `raw` fragment string — markers
 * intact ({{REF:...}}, [TABLE:]/[CELL:], [^scribe-fn-N]) — is passed UNCHANGED
 * to BOTH consumers:
 *   - <MarkdownPreview> does cosmetic marker cleanup INTERNALLY (returns a new
 *     display string, never mutating the input) for display only.
 *   - <MessageActions content={raw}> routes Copy/Insert/Replace on the verbatim
 *     raw, which the OO rich-reinjection pipeline (FRAG-03) parses to restore
 *     tables/images/footnotes/cross-refs.
 * FragmentCard performs NO string cleaning of `raw` itself — stripping markers
 * here would silently break FRAG-03.
 *
 * Replace is gated on `hasSelection` (FRAG-04/D-07) inside MessageActions, and
 * each action button shows the accent focus ring (D-09) from MessageActions —
 * the focusable-<button> substrate the Plan 05 keyboard controller drives.
 */
const FragmentCard = ({ raw, hasSelection }) => {
  const theme = useTheme()
  const isDark = (theme.palette.type || theme.palette.mode) === 'dark'

  return (
    <div
      data-fragment-card
      style={{
        border: `1px solid ${CARD_BORDER(isDark)}`,
        background: CARD_BG(isDark),
        borderRadius: 10,
        padding: '10px 12px',
        margin: '6px 0'
      }}
    >
      <MarkdownPreview>{raw}</MarkdownPreview>
      <MessageActions content={raw} hasSelection={hasSelection} />
    </div>
  )
}

export { FragmentCard }
