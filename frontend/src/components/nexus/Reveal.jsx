import { motion } from 'framer-motion'
import { isNativePlatform } from '../../api/client'

const DEFAULT = {
  initial: { opacity: 0, y: 24, filter: 'blur(6px)' },
  whileInView: { opacity: 1, y: 0, filter: 'blur(0px)' },
  viewport: { once: true, margin: '-80px' },
}

/**
 * Scroll-triggered reveal with a cinematic blur-up. Wraps children in an
 * <motion.div>. Any framer-motion prop can be overridden; the defaults
 * give a consistent premium entrance across the app.
 *
 * On native (Android WebView) we render a plain element: the animated
 * `filter: blur()` leaves a filtered compositor layer around every block of
 * content, which Android WebView rasterises soft — making the whole app look
 * blurred. A plain wrapper keeps text crisp and scrolling smooth.
 */
export default function Reveal({
  children,
  delay = 0,
  as = 'div',
  className,
  initial,
  whileInView,
  viewport,
  transition,
  ...rest
}) {
  if (isNativePlatform()) {
    const Tag = as || 'div'
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    )
  }
  const Comp = motion[as || 'div']
  return (
    <Comp
      initial={initial || DEFAULT.initial}
      whileInView={whileInView || DEFAULT.whileInView}
      viewport={viewport || DEFAULT.viewport}
      transition={{
        duration: 0.6,
        ease: [0.22, 1, 0.36, 1],
        delay,
        ...(transition || {}),
      }}
      className={className}
      {...rest}
    >
      {children}
    </Comp>
  )
}