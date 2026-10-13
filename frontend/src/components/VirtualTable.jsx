import { useState } from 'react'

const OVERSCAN = 6

export default function VirtualTable({
  columns,
  rows,
  rowKey = 'id',
  gridClass,
  itemHeight = 64,
  height = 560,
  empty = null,
  label = 'Results',
}) {
  const [scrollTop, setScrollTop] = useState(0)

  const total = rows.length
  const totalHeight = total * itemHeight
  const start = Math.max(0, Math.floor(scrollTop / itemHeight) - OVERSCAN)
  const end = Math.min(total, Math.ceil((scrollTop + height) / itemHeight) + OVERSCAN)
  const visible = []
  for (let i = start; i < end; i++) {
    visible.push({ index: i, offset: i * itemHeight })
  }

  return (
    <div role="table" aria-label={label} className="card overflow-hidden">
      <div className="overflow-auto" style={{ maxHeight: height }} onScroll={(e) => setScrollTop(e.currentTarget.scrollTop)}>
        <div className="relative min-w-[960px]">
          <div
            role="row"
            className={`${gridClass} sticky top-0 z-10 items-center border-b border-slate-800 bg-slate-900 px-5 py-3 text-xs uppercase tracking-wide text-slate-400`}
          >
            {columns.map((col) => (
              <div key={col.key} role="columnheader" className="px-1 py-0.5">
                {col.header ?? col.key}
              </div>
            ))}
          </div>
          {total === 0 ? (
            empty
          ) : (
            <div className="relative" style={{ height: totalHeight }}>
              {visible.map(({ index, offset }) => {
                const row = rows[index]
                return (
                  <div
                    key={row[rowKey]}
                    role="row"
                    className={`${gridClass} absolute left-0 right-0 items-center border-b border-slate-800/60 px-5 text-sm hover:bg-slate-800/40`}
                    style={{ height: itemHeight, transform: `translateY(${offset}px)` }}
                  >
                    {columns.map((col) => (
                      <div key={col.key} role="cell" className={`truncate ${col.className || ''}`}>
                        {col.render ? col.render(row) : row[col.key]}
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
