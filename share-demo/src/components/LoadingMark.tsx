/**
 * Trip "global loading" mark with the draw-on motion from the reference recording:
 * the mountain outline is traced as a stroke (valley → small peak → base → big peak)
 * while the mark settles into place, the sun grows and arcs up from the lower left,
 * then the two horizon lines grow out from the centre. Geometry and colours follow the
 * `global loading` icon in the Figma file (24 × 24, #121826 / #FFB400).
 */
export function LoadingMark({ size = 44 }: { size?: number }) {
  return (
    <svg className="lmark" width={size} height={size} viewBox="0 0 24 24" fill="none" aria-hidden>
      <g className="lmark-body">
        <path
          className="lmark-mtn"
          pathLength={1}
          d="M14.5 10 L17 6.9 L22.05 15 L2 15 L7.98 2.6 L14.5 10"
          stroke="#121826"
          strokeWidth={1.5}
          strokeLinejoin="miter"
          strokeLinecap="butt"
        />
      </g>
      <circle className="lmark-sun" cx={17.76} cy={5.26} r={3.76} fill="#FFB400" />
      {/* horizon lines: each half grows from the centre outward */}
      <path className="lmark-l1" pathLength={1} d="M12 18.25 H4.5" stroke="#121826" strokeWidth={1.5} />
      <path className="lmark-l1" pathLength={1} d="M12 18.25 H19.5" stroke="#121826" strokeWidth={1.5} />
      <path className="lmark-l2" pathLength={1} d="M12 21.25 H7.5" stroke="#121826" strokeWidth={1.5} />
      <path className="lmark-l2" pathLength={1} d="M12 21.25 H16.5" stroke="#121826" strokeWidth={1.5} />
    </svg>
  );
}
