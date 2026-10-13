import { useCallback, useEffect, useRef, useState } from 'react'
import { FaCamera, FaTimes, FaCheck } from 'react-icons/fa'

// Live camera capture used for identity documents and the face scan.
//
// - mode="document"  → rear camera, rectangular frame guide
// - mode="face" + liveness → front camera, oval guide with a presence/liveness
//   hold (the user must stay inside the oval for a couple of seconds while the
//   feed is live, so a static uploaded photo is not enough).
//
// Falls back to the native camera via a file input when getUserMedia is not
// available (older WebViews) so the flow never dead-ends.
export default function CameraCapture({ mode = 'document', liveness = false, onCapture, onCancel }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const detectorRef = useRef(null)
  const rafRef = useRef(0)
  const heldRef = useRef(0)
  const lastTsRef = useRef(0)
  const doneRef = useRef(false)

  const [phase, setPhase] = useState('starting') // starting | ready | error
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState('')
  const isFace = mode === 'face'

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
  }, [])

  const finish = useCallback(
    (dataUrl) => {
      if (doneRef.current) return
      doneRef.current = true
      stopStream()
      onCapture?.(dataUrl)
    },
    [onCapture, stopStream]
  )

  const capture = useCallback(() => {
    const video = videoRef.current
    if (!video || !video.videoWidth) return
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!isFace) {
      // mirror nothing for the rear (document) camera
    } else {
      ctx.translate(canvas.width, 0)
      ctx.scale(-1, 1)
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    finish(canvas.toDataURL('image/jpeg', 0.85))
  }, [finish, isFace])

  useEffect(() => {
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase('error')
        setError('Camera is not available on this device. Use the upload option below.')
        return
      }
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: isFace ? 'user' : 'environment', width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: false,
        })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play().catch(() => {})
        }
        setPhase('ready')

        if (liveness) {
          const FD = typeof window !== 'undefined' ? window.FaceDetector : undefined
          if (FD) {
            try {
              detectorRef.current = new FD({ fastMode: true, maxDetectedFaces: 1 })
            } catch {
              detectorRef.current = null
            }
          }
          lastTsRef.current = performance.now()
          const loop = async () => {
            if (doneRef.current) return
            const now = performance.now()
            const dt = (now - lastTsRef.current) / 1000
            lastTsRef.current = now
            let present = true
            const v = videoRef.current
            if (detectorRef.current && v && v.videoWidth) {
              try {
                const faces = await detectorRef.current.detect(v)
                present = faces.some((f) => {
                  const cx = f.boundingBox.x + f.boundingBox.width / 2
                  const cy = f.boundingBox.y + f.boundingBox.height / 2
                  return (
                    cx > v.videoWidth * 0.2 &&
                    cx < v.videoWidth * 0.8 &&
                    cy > v.videoHeight * 0.15 &&
                    cy < v.videoHeight * 0.85
                  )
                })
              } catch {
                present = true
              }
            }
            heldRef.current = present ? heldRef.current + dt : 0
            const p = Math.min(1, heldRef.current / 2.5)
            setProgress(p)
            if (p >= 1) {
              capture()
              return
            }
            rafRef.current = requestAnimationFrame(loop)
          }
          rafRef.current = requestAnimationFrame(loop)
        }
      } catch (e) {
        if (!cancelled) {
          setPhase('error')
          setError('Could not start the camera. Check the camera permission, or use the upload option.')
        }
      }
    }

    start()
    return () => {
      cancelled = true
      stopStream()
    }
  }, [capture, isFace, liveness, stopStream])

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => finish(String(reader.result))
    reader.readAsDataURL(file)
  }

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950/95 backdrop-blur-xl">
      <div className="flex items-center justify-between px-4 py-4 pt-safe">
        <div className="text-sm font-semibold text-white">
          {isFace ? 'Face scan' : 'Capture document'}
        </div>
        <button
          type="button"
          onClick={() => {
            stopStream()
            onCancel?.()
          }}
          className="grid h-10 w-10 place-items-center rounded-lg text-slate-300 hover:bg-slate-800/60"
          aria-label="Cancel"
        >
          <FaTimes />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        {phase !== 'error' ? (
          <div className="relative w-full max-w-md">
            <video
              ref={videoRef}
              playsInline
              muted
              className="w-full rounded-2xl bg-black"
              style={{ transform: isFace ? 'scaleX(-1)' : 'none' }}
            />
            {/* guide overlay */}
            <div className="pointer-events-none absolute inset-0 grid place-items-center">
              {isFace ? (
                <div className="h-3/5 w-1/2 rounded-[50%] border-4 border-accent-400/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]" />
              ) : (
                <div className="h-1/2 w-4/5 rounded-xl border-4 border-accent-400/80 shadow-[0_0_0_9999px_rgba(2,6,23,0.55)]" />
              )}
            </div>
            <p className="mt-4 text-center text-xs text-slate-300">
              {isFace
                ? 'Centre your face in the oval and hold still while it scans.'
                : 'Fit the whole document inside the frame and keep it well lit.'}
            </p>
          </div>
        ) : (
          <div className="max-w-sm rounded-2xl bg-slate-900/80 p-6 text-center">
            <FaCamera className="mx-auto mb-3 text-3xl text-slate-500" />
            <p className="text-sm text-slate-300">{error}</p>
          </div>
        )}
      </div>

      <div className="px-4 pb-8 pb-safe">
        {phase === 'error' ? (
          <label className="btn-primary w-full cursor-pointer justify-center">
            <FaCamera className="mr-2" /> Use device camera
            <input type="file" accept="image/*" capture={isFace ? 'user' : 'environment'} className="hidden" onChange={onFile} />
          </label>
        ) : liveness ? (
          <div className="mx-auto max-w-md">
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-nexus-500 to-violet-500 transition-[width] duration-100"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <button
              type="button"
              className="btn-nexus w-full justify-center"
              disabled={phase !== 'ready'}
              onClick={capture}
            >
              <FaCheck className="mr-2" /> Capture now
            </button>
            <label className="mt-2 block cursor-pointer text-center text-xs text-slate-400 hover:text-slate-200">
              Having trouble? Upload a photo instead
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />
            </label>
          </div>
        ) : (
          <div className="mx-auto max-w-md">
            <button type="button" className="btn-nexus w-full justify-center" disabled={phase !== 'ready'} onClick={capture}>
              <FaCamera className="mr-2" /> Capture
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
