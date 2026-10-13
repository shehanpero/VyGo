import { motion, useReducedMotion } from 'framer-motion'
import { useRef } from 'react'
import { isNativePlatform } from '../../api/client'

const EASE = [0.16, 1, 0.3, 1]

export default function StaggerReveal({
  children,
  staggerDelay = 0.08,
  initialDelay = 0,
  duration = 0.7,
  y = 32,
  blur = '6px',
  className = '',
  once = true,
  amount = 0.15,
}) {
  const ref = useRef(null)
  const reduce = useReducedMotion()

  if (reduce || isNativePlatform()) {
    return <div ref={ref} className={className}>{children}</div>
  }

  const containerVariants = {
    hidden: {},
    visible: {
      transition: {
        staggerChildren: staggerDelay,
        delayChildren: initialDelay,
      },
    },
  }

  const itemVariants = {
    hidden: { opacity: 0, y, filter: `blur(${blur})` },
    visible: {
      opacity: 1,
      y: 0,
      filter: 'blur(0px)',
      transition: { duration, ease: EASE },
    },
  }

  return (
    <motion.div
      ref={ref}
      initial="hidden"
      whileInView="visible"
      viewport={{ once, amount }}
      variants={containerVariants}
      className={className}
    >
      {Array.isArray(children)
        ? children.map((child, i) => (
            <motion.div key={i} variants={itemVariants}>
              {child}
            </motion.div>
          ))
        : <motion.div variants={itemVariants}>{children}</motion.div>}
    </motion.div>
  )
}
