// lottie-react renders through lottie-web, which drives a real <canvas>/<svg>
// render loop and requestAnimationFrame — noise jsdom cannot run and tests do
// not care about. Every Scribe surface that plays an animation goes through the
// `Lottie` default export (directly or via ScribeLottie), so stubbing it here,
// once, keeps the whole suite free of the animation runtime while preserving the
// element's box (className/style) for layout assertions.
const React = require('react')

const Lottie = props =>
  React.createElement('div', {
    'data-testid': 'lottie',
    'aria-hidden': true,
    className: props.className,
    style: props.style
  })

Lottie.useLottie = () => ({ View: null, play: () => {}, stop: () => {}, goToAndStop: () => {} })
Lottie.useLottieInteractivity = () => null
Lottie.default = Lottie

module.exports = Lottie
