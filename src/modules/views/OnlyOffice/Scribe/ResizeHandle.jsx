import React, { useState, useCallback, useEffect, useRef } from 'react'

import { useTheme } from 'cozy-ui/transpiled/react/styles'

import { useScribe } from '@/modules/views/OnlyOffice/Scribe/ScribeContext'
import { PANEL_GUTTER } from '@/modules/views/OnlyOffice/Scribe/scribeSurface'

export const ResizeHandle = () => {
  const { setPanelWidth } = useScribe()
  const theme = useTheme()
  const [isDragging, setIsDragging] = useState(false)
  const [isHovered, setIsHovered] = useState(false)
  const isDraggingRef = useRef(false)
  const pointerIdRef = useRef(null)

  const primaryColor = theme.palette.primary.main

  const onPointerDown = useCallback(e => {
    e.preventDefault()
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch (err) {
      // ignore — setPointerCapture may throw on unsupported pointer types
    }
    pointerIdRef.current = e.pointerId
    isDraggingRef.current = true
    setIsDragging(true)
    document.body.style.userSelect = 'none'
    document.body.style.cursor = 'col-resize'
  }, [])

  const onPointerMove = useCallback(e => {
    if (!isDraggingRef.current) return
    const newWidth = window.innerWidth - e.clientX
    setPanelWidth(newWidth)
  }, [setPanelWidth])

  const onPointerUp = useCallback(e => {
    if (!isDraggingRef.current) return
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch (err) {
      // already released or not captured — safe to ignore
    }
    pointerIdRef.current = null
    isDraggingRef.current = false
    setIsDragging(false)
    document.body.style.userSelect = ''
    document.body.style.cursor = ''
  }, [])

  // Reset body styles on unmount (pointer capture releases automatically)
  useEffect(() => {
    return () => {
      document.body.style.userSelect = ''
      document.body.style.cursor = ''
    }
  }, [])

  const showAccent = isHovered || isDragging
  const accentOpacity = isDragging ? 0.8 : 0.4

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      // The handle IS the gutter between the editor and the panel card: it fills
      // the whole air gap rather than sitting on a 6px seam, which both makes it
      // a real grab target and leaves nothing between the two surfaces that is
      // not draggable. The visible grip stays a thin pill — a 12px slab of
      // accent colour on hover would read as a third surface.
      style={{
        width: PANEL_GUTTER,
        flexShrink: 0,
        cursor: 'col-resize',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        touchAction: 'none'
      }}
    >
      {showAccent && (
        <div
          style={{
            width: 3,
            height: '32%',
            borderRadius: 2,
            backgroundColor: primaryColor,
            opacity: accentOpacity,
            transition: 'opacity 150ms ease'
          }}
        />
      )}
    </div>
  )
}
