import Lottie from 'lottie-react'
import PropTypes from 'prop-types'
import React from 'react'

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
  className,
  style
}) => (
  <Lottie
    animationData={animationData}
    loop={loop}
    autoplay={autoplay}
    className={className}
    style={{ width, height, ...style }}
    rendererSettings={{ preserveAspectRatio: 'xMidYMid meet' }}
    aria-hidden="true"
  />
)

ScribeLottie.propTypes = {
  animationData: PropTypes.object.isRequired,
  width: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  height: PropTypes.oneOfType([PropTypes.number, PropTypes.string]).isRequired,
  loop: PropTypes.bool,
  autoplay: PropTypes.bool,
  className: PropTypes.string,
  style: PropTypes.object
}
