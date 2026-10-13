import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { isNativePlatform } from '../../api/client'

const EASE = [0.16, 1, 0.3, 1]

export default function ScrollReveal({
  children,
  delay = 0,
  duration = 0.8,
  y = 24,
  x = 0,
  opacity = 0,
  scale = 1,
  blur = '8px',
  once = true,
  amount = 0.2,
  margin = '-80px',
  className = '',
  as = 'div',
  ...rest
}) {
  const ref = useRef(null)
  const inView = useInView(ref, { once, amount, margin })
  const reduce = useReducedMotion()

  const Comp = motion[as] || motion.div

  if (reduce || isNativePlatform()) {
    const Tag = as || 'div'
    return (
      <Tag className={className} {...rest}>
        {children}
      </Tag>
    )
  }

  return (
    <Comp
      ref={ref}
      initial={{
        opacity,
        y,
        x,
        scale: scale === 1 ? 1 : scale,
        filter: `blur(${blur})`,
      }}
      animate={
        inView
          ? {
              opacity: 1,
              y: 0,
              x: 0,
              scale: 1,
              filter: 'blur(0px)',
            }
          : {
              opacity,
              y,
              x,
              scale: scale === 1 ? 1 : scale,
              filter: `blur(${blur})`,
            }
      }
      transition={{
        duration,
        delay,
        ease: EASE,
      }}
      className={className}
      {...rest}
    >
      {children}
    </Comp>
  )
}
