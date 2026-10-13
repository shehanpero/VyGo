import { useCallback, useEffect, useRef, useState } from 'react'
import { api, errorMessage } from '../api/client'

export function useRouteTools({ q, network } = {}) {
  const [routes, setRoutes] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const abortRef = useRef(null)

  const reload = useCallback(() => {
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setLoading(true)
    setError('')
    const params = {}
    if (q) params.q = q
    if (network) params.network = network
    api
      .get('/route-tools', { params, signal: controller.signal })
      .then((res) => {
        if (abortRef.current === controller) setRoutes(res.data || [])
      })
      .catch((err) => {
        if (abortRef.current !== controller) return
        if (err?.code === 'ERR_CANCELED') return
        setError(errorMessage(err, 'Failed to load route tools'))
      })
      .finally(() => {
        if (abortRef.current === controller) setLoading(false)
      })
  }, [q, network])

  useEffect(() => {
    reload()
    return () => {
      abortRef.current?.abort()
      abortRef.current = null
    }
  }, [reload])

  return { routes, loading, error, reload }
}

export default useRouteTools
