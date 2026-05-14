import { useState } from 'react'

/**
 * Tooltip component — wraps any children with a hover tooltip.
 *
 * Usage:
 *   <Tooltip content="This is the tip text">
 *     <span>Hover me</span>
 *   </Tooltip>
 *
 * For a quick help "?" icon:
 *   <HelpIcon tip="PRN means 'as needed' — given only when the resident requests it." />
 */
export default function Tooltip({ content, children, placement = 'top' }) {
  const [visible, setVisible] = useState(false)

  const positionCls = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[placement] ?? 'bottom-full left-1/2 -translate-x-1/2 mb-2'

  const arrowCls = {
    top: 'top-full left-1/2 -translate-x-1/2 -mt-1',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 -mb-1',
    left: 'left-full top-1/2 -translate-y-1/2 -ml-1',
    right: 'right-full top-1/2 -translate-y-1/2 -mr-1',
  }[placement] ?? 'top-full left-1/2 -translate-x-1/2 -mt-1'

  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
      onFocus={() => setVisible(true)}
      onBlur={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          role="tooltip"
          className={`absolute z-50 px-2.5 py-1.5 text-xs font-medium text-white bg-slate-800 rounded-lg shadow-xl whitespace-nowrap pointer-events-none max-w-[220px] text-center leading-snug ${positionCls}`}
        >
          {content}
          <span className={`absolute w-2 h-2 bg-slate-800 rotate-45 ${arrowCls}`} />
        </span>
      )}
    </span>
  )
}

/**
 * Convenience component: a small circular "?" icon that shows a tooltip on hover.
 *
 * Usage:
 *   <HelpIcon tip="Explanation text here" />
 */
export function HelpIcon({ tip, placement = 'top' }) {
  return (
    <Tooltip content={tip} placement={placement}>
      <span className="inline-flex items-center justify-center w-4 h-4 text-[10px] font-bold text-slate-400 border border-slate-300 rounded-full cursor-help hover:text-slate-600 hover:border-slate-400 transition-colors ml-1 flex-shrink-0">
        ?
      </span>
    </Tooltip>
  )
}
