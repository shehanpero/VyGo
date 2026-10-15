import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FilesetResolver, FaceLandmarker } from '@mediapipe/tasks-vision'
import {
  FaCamera,
  FaTimes,
  FaEye,
  FaArrowLeft,
  FaArrowRight,
  FaCheckCircle,
  FaLightbulb,
} from 'react-icons/fa'

// Live camera capture used for identity documents and the face scan.
//
// - mode="document" → rear camera, rectangular frame guide.
// - mode="face" + liveness → a Face ID-style guided challenge. The user must
//   complete a randomly ordered sequence of actions (blink, turn head left,
//   turn head right) tracked with MediaPipe FaceLandmarker. A static photo or a
//   replayed video cannot satisfy an unpredictable action sequence.
//
// If the liveness model cannot load, it falls back to a presence hold. Manual
// upload is a last resort and is reported to the server as not live.

const TURN_THRESHOLD = 0.16
const TURN_STRONG = 0.34

const ACTION_META = {
  blink: { label: 'Blink your eyes', icon: FaEye },
  'turn-left': { label: 'Slowly turn your head to the left', icon: FaArrowLeft },
  'turn-right': { label: 'Slowly turn your head to the right', icon: FaArrowRight },
}

function shuffledChallenge() {
  const actions = ['blink', 'turn-left', 'turn-right']
  for (let i = actions.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[actions[i], actions[j]] = [actions[j], actions[i]]
  }
  return actions
}

export default function CameraCapture({ mode = 'document', liveness = false, onCapture, onCancel }) {
  const videoRef = useRef(null)
  const streamRef = useRef(null)
  const rafRef = useRef(0)
  const landmarkerRef = useRef(null)
  const detectorRef = useRef(null)
  const heldRef = useRef(0)
  const lastTsRef = useRef(0)
  const doneRef = useRef(false)
  const stepRef = useRef(0)
  const blinkArmedRef = useRef(false)
  const partialRef = useRef(0)
  const onCaptureRef = useRef(onCapture)
  const onCancelRef = useRef(onCancel)
  const challengeModeRef = useRef('challenge')

  const [phase, setPhase] = useState('starting') // starting | ready | error
  const [error, setError] = useState('')
  const [progress, setProgress] = useState(0)
  const [stepIndex, setStepIndex] = useState(0)
  const [hint, setHint] = useState('')
  const [challengeMode, setChallengeMode] = useState('challenge') // challenge | presence

  const isFace = mode === 'face'
  const useLiveness = isFace && liveness
  const steps = useMemo(() => (useLiveness ? shuffledChallenge() : []), [useLiveness])

  useEffect(() => {
    onCaptureRef.current = onCapture
    onCancelRef.current = onCancel
  }, [onCapture, onCancel])

  const stopStream = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (landmarkerRef.current) {
      try {
        landmarkerRef.current.close()
      } catch {
        /* ignore */
      }
      landmarkerRef.current = null
    }
  }, [])

  const finish = useCallback(
    (dataUrl, meta = {}) => {
      if (doneRef.current) return
      doneRef.current = true
      stopStream()
      onCaptureRef.current?.(dataUrl, meta)
    },
    [stopStream]
  )

  const capture = useCallback(
    (meta = {}) => {
      const video = videoRef.current
      if (!video || !video.videoWidth) return
      const canvas = document.createElement('canvas')
      canvas.width = video.videoWidth
      canvas.height = video.videoHeight
      const ctx = canvas.getContext('2d')
      if (isFace) {
        ctx.translate(canvas.width, 0)
        ctx.scale(-1, 1)
      }
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
      finish(canvas.toDataURL('image/jpeg', 0.9), meta)
    },
    [finish, isFace]
  )

  useEffect(() => {
    let cancelled = false

    async function start() {
      if (!navigator.mediaDevices?.getUserMedia) {
        setPhase('error')
        setError('Camera is not available on this device. Use the camera upload option below.')
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

        if (!useLiveness) return

        let landmarker = null
        try {
          const resolver = await FilesetResolver.forVisionTasks(
            'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@0.10.14/wasm'
          )
          landmarker = await FaceLandmarker.createFromOptions(resolver, {
            baseOptions: {
              modelAssetPath:
                'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
              delegate: 'GPU',
            },
            runningMode: 'VIDEO',
            numFaces: 1,
            outputFaceBlendshapes: true,
          })
        } catch {
          landmarker = null
        }
        if (cancelled) return
        landmarkerRef.current = landmarker

        if (!landmarker) {
          challengeModeRef.current = 'presence'
          setChallengeMode('presence')
          const FD = typeof window !== 'undefined' ? window.FaceDetector : undefined
          if (FD) {
            try {
              detectorRef.current = new FD({ fastMode: true, maxDetectedFaces: 1 })
            } catch {
              detectorRef.current = null
            }
          }
        }

        const blendScore = (blendshapes, name) => {
          const cats = blendshapes?.[0]?.categories
          if (!cats) return 0
          const found = cats.find((c) => c.categoryName === name)
          return found ? found.score : 0
        }

        lastTsRef.current = performance.now()
        const loop = async () => {
          if (doneRef.current || cancelled) return
          const now = performance.now()
          const dt = Math.min(0.1, (now - lastTsRef.current) / 1000)
          lastTsRef.current = now
          const v = videoRef.current

          if (landmarker && v && v.videoWidth) {
            let centered = false
            try {
              const res = landmarker.detectForVideo(v, now)
              const lm = res?.faceLandmarks?.[0]
              if (lm && lm.length > 400) {
                const noseX = lm[1].x
                const midX = (lm[234].x + lm[454].x) / 2
                const halfW = Math.abs(lm[454].x - lm[234].x) / 2 || 0.001
                const yaw = (noseX - midX) / halfW
                centered = Math.abs(yaw) < 0.6 && lm[1].y > 0.12 && lm[1].y < 0.9

                const action = steps[stepRef.current]
                let stepDone = false
                let partial = 0

                if (action === 'blink') {
                  const left = blendScore(res?.faceBlendshapes, 'eyeBlinkLeft')
                  const right = blendScore(res?.faceBlendshapes, 'eyeBlinkRight')
                  if (left > 0.5 && right > 0.5) blinkArmedRef.current = true
                  partial = blinkArmedRef.current ? 0.6 : Math.min(left, right) * 0.6
                  if (blinkArmedRef.current && left < 0.3 && right < 0.3) stepDone = true
                } else if (action === 'turn-left') {
                  partial = Math.min(1, Math.max(0, yaw) / TURN_THRESHOLD)
                  stepDone = yaw > TURN_THRESHOLD || yaw < -TURN_STRONG
                } else if (action === 'turn-right') {
                  partial = Math.min(1, Math.max(0, -yaw) / TURN_THRESHOLD)
                  stepDone = yaw < -TURN_THRESHOLD || yaw > TURN_STRONG
                }

                if (centered) setHint('')
                else setHint('Centre your face in the ring')

                if (stepDone) {
                  blinkArmedRef.current = false
                  const next = stepRef.current + 1
                  if (next >= steps.length) {
                    capture({ livenessPassed: true, livenessMode: 'challenge', actions: steps.join(',') })
                    return
                  }
                  stepRef.current = next
                  setStepIndex(next)
                  setProgress(next / steps.length)
                  rafRef.current = requestAnimationFrame(loop)
                  return
                }
                const overall = (stepRef.current + Math.min(1, partial)) / steps.length
                setProgress(Math.min(1, overall))
              } else {
                setHint('Centre your face in the ring')
              }
            } catch {
              /* frame dropped — keep looping */
            }
          } else {
            // Fallback presence hold.
            let centered = true
            if (detectorRef.current && v && v.videoWidth) {
              try {
                const faces = await detectorRef.current.detect(v)
                centered = faces.some((f) => {
                  const cx = f.boundingBox.x + f.boundingBox.width / 2
                  const cy = f.boundingBox.y + f.boundingBox.height / 2
                  return cx > v.videoWidth * 0.2 && cx < v.videoWidth * 0.8 && cy > v.videoHeight * 0.15 && cy < v.videoHeight * 0.85
                })
              } catch {
                centered = true
              }
            }
            heldRef.current = centered ? heldRef.current + dt : 0
            setProgress(Math.min(1, heldRef.current / 2.5))
            if (centered && heldRef.current >= 2.5) {
              capture({ livenessPassed: true, livenessMode: 'presence', actions: 'presence-hold' })
              return
            }
          }

          rafRef.current = requestAnimationFrame(loop)
        }
        rafRef.current = requestAnimationFrame(loop)
      } catch {
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
  }, [capture, isFace, useLiveness, steps, stopStream])

  const onFile = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => finish(String(reader.result), { livenessPassed: false, livenessMode: 'none' })
    reader.readAsDataURL(file)
  }

  const activeAction = steps[stepIndex]
  const ActiveIcon = activeAction ? ACTION_META[activeAction].icon : FaEye
  const r = 46
  const circumference = 2 * Math.PI * r

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-slate-950">
      <div className="flex items-center justify-between px-4 py-4 pt-safe">
        <div className="text-sm font-semibold text-white">
          {isFace ? (useLiveness ? 'Face verification' : 'Face scan') : 'Capture document'}
        </div>
        <button
          type="button"
          onClick={() => {
            stopStream()
            onCancelRef.current?.()
          }}
          className="grid h-10 w-10 place-items-center rounded-lg text-slate-300 hover:bg-slate-800/60"
          aria-label="Cancel"
        >
          <FaTimes />
        </button>
      </div>

      <div className="relative flex flex-1 items-center justify-center overflow-hidden px-4">
        {phase !== 'error' ? (
          <div className="relative mx-auto w-full max-w-sm">
            <div className="relative mx-auto aspect-square w-full overflow-hidden rounded-full">
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover"
                style={{ transform: isFace ? 'scaleX(-1)' : 'none' }}
              />
              <div className="pointer-events-none absolute inset-0 rounded-full shadow-[0_0_0_9999px_rgba(2,6,23,0.82)]" />
            </div>

            {useLiveness && challengeMode === 'challenge' && (
              <>
                <svg viewBox="0 0 100 100" className="pointer-events-none absolute inset-0 h-full w-full -rotate-90">
                  <circle cx="50" cy="50" r={r} fill="none" stroke="rgba(148,163,184,0.25)" strokeWidth="1.4" />
                  <circle
                    cx="50"
                    cy="50"
                    r={r}
                    fill="none"
                    stroke="url(#faceRing)"
                    strokeWidth="2.4"
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={circumference * (1 - progress)}
                    style={{ transition: 'stroke-dashoffset 120ms linear' }}
                  />
                  <defs>
                    <linearGradient id="faceRing" x1="0" y1="0" x2="1" y2="1">
                      <stop offset="0%" stopColor="#5b8cff" />
                      <stop offset="100%" stopColor="#a855f7" />
                    </linearGradient>
                  </defs>
                </svg>

                <div className="pointer-events-none absolute inset-0 grid place-items-center">
                  <div className="flex flex-col items-center gap-2 pt-2 text-center">
                    <span className="grid h-16 w-16 place-items-center rounded-full bg-slate-950/70 text-2xl text-accent-400 ring-1 ring-accent-400/40">
                      <ActiveIcon />
                    </span>
                    <span className="max-w-[12rem] text-sm font-semibold text-white drop-shadow">
                      {ACTION_META[activeAction]?.label}
                    </span>
                  </div>
                </div>
              </>
            )}
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
        ) : useLiveness && challengeMode === 'challenge' ? (
          <div className="mx-auto max-w-sm">
            <div className="mb-3 flex items-center justify-center gap-2">
              {steps.map((s, i) => (
                <span
                  key={s}
                  className={`h-1.5 rounded-full transition-all ${
                    i < stepIndex ? 'w-6 bg-emerald-400' : i === stepIndex ? 'w-6 bg-accent-400' : 'w-3 bg-slate-700'
                  }`}
                />
              ))}
            </div>
            <p className="text-center text-xs text-slate-400">{hint || 'Follow the prompts to prove it is really you'}</p>
            <label className="mt-3 flex cursor-pointer items-center justify-center gap-1 text-center text-xs text-slate-500 hover:text-slate-300">
              <FaLightbulb /> Having trouble? Upload a photo instead (no liveness)
              <input type="file" accept="image/*" capture="user" className="hidden" onChange={onFile} />
            </label>
          </div>
        ) : useLiveness ? (
          <div className="mx-auto max-w-sm">
            <div className="mb-3 h-1.5 w-full overflow-hidden rounded-full bg-slate-800">
              <div
                className="h-full rounded-full bg-gradient-to-r from-nexus-500 to-violet-500 transition-[width] duration-100"
                style={{ width: `${Math.round(progress * 100)}%` }}
              />
            </div>
            <div className="flex items-center justify-center gap-2 text-xs text-slate-400">
              <FaCheckCircle className={progress >= 1 ? 'text-emerald-400' : 'text-slate-600'} />
              Hold still while we scan your face…
            </div>
          </div>
        ) : (
          <div className="mx-auto max-w-sm">
            <button type="button" className="btn-nexus w-full justify-center" disabled={phase !== 'ready'} onClick={() => capture()}>
              <FaCamera className="mr-2" /> Capture
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
