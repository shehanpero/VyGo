// Local-calendar helpers. `toISOString()` renders UTC and can drift a whole
// day for users east of the meridian (Sri Lanka is UTC+05:30), so every
// "today" / date-bucket the UI ships to the backend must be built from local
// date parts instead.
export const toLocalYMD = (d = new Date()) => {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

export const today = () => toLocalYMD()

export const dateOffset = (days) => {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return toLocalYMD(d)
}

export const fmtLKR = (n) => `LKR ${Number(n || 0).toLocaleString()}`
