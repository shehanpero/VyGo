// VyGo — operator trust chips (avatar circle + name).
// Uses the design-system .operator-chip / .operator-chip-avatar classes
// (docs/design-system.md). Renders a compact, hover-friendly row of
// operators — used on the corridor cards and route results.

export function operatorInitials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase()
}

export default function OperatorChips({ operators = [], limit = 0, className = '' }) {
  const shown = limit > 0 ? operators.slice(0, limit) : operators
  const extra = operators.length - shown.length

  if (operators.length === 0) {
    return (
      <div className={`flex flex-wrap items-center gap-2 ${className}`}>
        <span className="text-xs text-slate-400">Bus owners coming soon</span>
      </div>
    )
  }

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      {shown.map((op) => (
        <span key={op} className="operator-chip" title={op}>
          <span className="operator-chip-avatar" aria-hidden="true">{operatorInitials(op)}</span>
          {op}
        </span>
      ))}
      {extra > 0 && <span className="text-xs text-slate-400">+{extra} more</span>}
    </div>
  )
}
