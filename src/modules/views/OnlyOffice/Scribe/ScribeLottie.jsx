import Lottie from 'lottie-react'
import PropTypes from 'prop-types'
import React, { useRef, useEffect } from 'react'

/**
 * A Scribe Lottie animation, sized for a specific slot.
 *
 * The two animations this project ships are vector (no bitmap assets), so they
 * stay crisp at any size — but their source canvases differ in aspect ratio
 * (the loader is square, the button mark is 4:3). Pass width AND height that
 * match the source ratio to avoid letterboxing; `xMidYMid meet` keeps the mark
 * centred and uncropped whatever the box.
 *
 * Every Scribe surface that animates goes through here so the lottie-web runtime
 * is imported from ONE place (and mocked from one place in tests).
 */
export const ScribeLottie = ({
  animationData,
  width,
  height,
  loop = true,
  autoplay = true,
  play,
  className,
  style
}) => {
  const lottieRef = useRef(null)

  // When `play` is passed the animation is driven imperatively (e.g. play only
  // while the button is hovered): run it on `true`, and on `false` rewind to the
  // first frame and hold there so the resting state is a clean static mark.
  const controlled = play !== undefined
  useEffect(() => {
    const anim = lottieRef.current
    if (!anim || !controlled) return
    if (play) {
      anim.play()
    } else {
      anim.goToAndStop(0, true)
    }
  }, [play, controlled])

  return (
    <Lottie
      lottieRef={lottieRef}
      animationData={animationData}
      loop={loop}
      autoplay={controlled ? false : autoplay}
      className={className}
      style={{ width, height, ...style }}
      rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
      aria-hidden="true"
    />
  )
}

ScribeLottie.propTypes = {
  animationData: PropTypes.object.isRequired,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  loop: PropTypes.bool,
  autoplay: PropTypes.bool,
  // Optional imperative gate: when defined, the animation plays only while true.
  play: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object
}
