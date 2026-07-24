import React from 'react'

/**
 * The Scribe brand mark in full colour — the gradient four-point sparkle with
 * its two satellite glints. Vector transcription of the design export
 * `scribe-icon-colored.svg` (viewBox 0 0 16 16), so it scales crisply to any
 * size instead of a fixed-resolution PNG.
 *
 * The three gradients carry document-unique ids (`scribeColored*`); render the
 * component once per view (it is the empty-panel welcome mark) so the ids never
 * collide.
 */
export const ScribeColoredIcon = ({ size = 48 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 16 16"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
    focusable="false"
  >
    <g clipPath="url(#scribeColoredClip)">
      <path
        stroke="url(#scribeColoredB)"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeOpacity="0.9"
        strokeWidth="1.333"
        d="M6.626 10.332a1.33 1.33 0 0 0-.958-.958L1.578 8.32a.333.333 0 0 1 0-.642l4.09-1.055a1.33 1.33 0 0 0 .958-.957l1.055-4.09a.333.333 0 0 1 .642 0l1.054 4.09a1.33 1.33 0 0 0 .958.958l4.09 1.054a.333.333 0 0 1 0 .642l-4.09 1.054a1.33 1.33 0 0 0-.958.958l-1.055 4.09a.333.333 0 0 1-.642 0z"
      />
      <path
        fill="url(#scribeColoredC)"
        fillOpacity="0.9"
        d="M13.335 1.336c.368 0 .667.299.667.667v.665h.668a.667.667 0 0 1 0 1.334h-.668v.668a.667.667 0 0 1-1.334 0v-.668h-.665a.667.667 0 0 1 0-1.334h.665v-.665c0-.368.299-.667.667-.667"
      />
      <path
        fill="url(#scribeColoredD)"
        fillOpacity="0.9"
        d="M2.667 10.668c.367 0 .664.297.666.664a.667.667 0 0 1 .001 1.333v.003a.667.667 0 0 1-1.334 0v-.002h-.001a.667.667 0 0 1 0-1.334H2a.667.667 0 0 1 .667-.664"
      />
    </g>
    <defs>
      <linearGradient
        id="scribeColoredB"
        x1="1.336"
        x2="19.625"
        y1="7.999"
        y2="7.999"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#00b7ff" />
        <stop offset="0.567" stopColor="#e06dd1" />
        <stop offset="1" stopColor="#ff0" />
      </linearGradient>
      <linearGradient
        id="scribeColoredC"
        x1="11.336"
        x2="16.822"
        y1="3.336"
        y2="3.336"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#00b7ff" />
        <stop offset="0.567" stopColor="#e06dd1" />
        <stop offset="1" stopColor="#ff0" />
      </linearGradient>
      <linearGradient
        id="scribeColoredD"
        x1="1.332"
        x2="4.99"
        y1="12.002"
        y2="12.002"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#00b7ff" />
        <stop offset="0.567" stopColor="#e06dd1" />
        <stop offset="1" stopColor="#ff0" />
      </linearGradient>
      <clipPath id="scribeColoredClip">
        <path fill="#fff" d="M0 0h16v16H0z" />
      </clipPath>
    </defs>
  </svg>
)
