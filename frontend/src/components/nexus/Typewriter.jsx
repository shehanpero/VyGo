import { useEffect, useState } from 'react'

/**
 * Typewriter — cyclic text with a blinking caret. Cycles through `words`
 * with a typing + pausing rhythm, ideal for hero sublines.
 */
export default function Typewriter({
  words = [],
  typingMs = 55,
  deletingMs = 28,
  holdMs = 1600,
  className = '',
  caret = true,
}) {
  const [text, setText] = useState('')
  const [active, setActive] = useState(0)
  const [deleting, setDeleting] = useState(false)

  useEffect(() => {
    if (!words.length) return
    const current = words[active % words.length]
    let timeout

    if (!deleting) {
      if (text.length < current.length) {
        timeout = setTimeout(() => setText(current.slice(0, text.length + 1)), typingMs)
      } else {
        timeout = setTimeout(() => setDeleting(true), holdMs)
      }
    } else {
      if (text.length > 0) {
        timeout = setTimeout(() => setText(current.slice(0, text.length - 1)), deletingMs)
      } else {
        setDeleting(false)
        setActive((a) => (a + 1) % words.length)
        timeout = setTimeout(() => {}, deletingMs)
      }
    }
    return () => clearTimeout(timeout)
  }, [text, deleting, active, words, typingMs, deletingMs, holdMs])

  return (
    <span className={`inline-block ${className}`}>
      {text}
      {caret && <span className="tw-caret" aria-hidden="true" />}
    </span>
  )
}