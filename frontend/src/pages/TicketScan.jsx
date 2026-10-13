import { useRef, useState } from 'react'
import { api, errorMessage, isNativePlatform } from '../api/client'
import { useAuth } from '../context/AuthContext'
import {
  CapacitorBarcodeScanner,
  CapacitorBarcodeScannerTypeHint,
  CapacitorBarcodeScannerCameraDirection,
  CapacitorBarcodeScannerScanOrientation,
} from '@capacitor/barcode-scanner'
import jsQR from 'jsqr'
import {
  FaQrcode,
  FaCamera,
  FaImage,
  FaKeyboard,
  FaCheckCircle,
  FaTimesCircle,
  FaTicketAlt,
} from 'react-icons/fa'

const resultStyles = {
  ok: 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400',
  bad: 'border-red-500/40 bg-red-500/10 text-red-400',
}

export default function TicketScan() {
  const { user } = useAuth()
  const isNative = isNativePlatform()
  const [scanning, setScanning] = useState(false)
  const [validating, setValidating] = useState(false)
  const [validation, setValidation] = useState(null)
  const [error, setError] = useState('')
  const [mode, setMode] = useState(isNative ? 'camera' : 'upload')
  const [pasted, setPasted] = useState('')
  const fileRef = useRef(null)

  const roleLabel = user?.roles?.includes('ADMIN')
    ? 'Admin'
    : user?.roles?.includes('OPERATOR')
      ? 'Bus Owner'
      : 'Conductor'

  const validateContent = async (content) => {
    const qr = (content || '').trim()
    if (!qr) return
    setValidating(true)
    setValidation(null)
    setError('')
    try {
      const res = await api.post('/tickets/validate', { qrContent: qr, tripId: null })
      setValidation(res.data)
    } catch (err) {
      setValidation({
        valid: false,
        message: errorMessage(err, 'Validation failed'),
        ticket: null,
      })
    } finally {
      setValidating(false)
    }
  }

  const scanWithCamera = async () => {
    setError('')
    setValidation(null)
    setScanning(true)
    try {
      const result = await CapacitorBarcodeScanner.scanBarcode({
        hint: CapacitorBarcodeScannerTypeHint.QR_CODE,
        scanInstructions: 'Point at the passenger ticket QR code',
        cameraDirection: CapacitorBarcodeScannerCameraDirection.BACK,
        scanOrientation: CapacitorBarcodeScannerScanOrientation.PORTRAIT,
        android: { scanningLibrary: 'zxing' },
      })
      if (result && result.ScanResult) {
        await validateContent(result.ScanResult)
      } else {
        setError('No QR code detected')
      }
    } catch (err) {
      const msg = String(err?.message || err)
      setError(msg.toLowerCase().includes('cancelled') ? 'Scanning was cancelled.' : `Scanning failed: ${msg}`)
    } finally {
      setScanning(false)
    }
  }

  const decodeImage = async (file) => {
    setError('')
    setValidation(null)
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        canvas.width = img.width
        canvas.height = img.height
        const ctx = canvas.getContext('2d', { willReadFrequently: true })
        ctx.drawImage(img, 0, 0)
        const imageData = ctx.getImageData(0, 0, img.width, img.height)
        const code = jsQR(imageData.data, img.width, img.height, {
          inversionAttempts: 'dontInvert',
        })
        if (code && code.data) {
          validateContent(code.data)
        } else {
          setError('No QR code found in the image. Try a clearer photo.')
        }
      }
      img.onerror = () => setError('Could not read that image file')
      img.src = reader.result
    }
    reader.onerror = () => setError('Could not read the file')
    reader.readAsDataURL(file)
  }

  const submitPasted = (e) => {
    e.preventDefault()
    if (!pasted.trim()) return
    validateContent(pasted.trim())
  }

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-extrabold gradient-text">Scan Ticket QR</h1>
          <p className="text-sm text-slate-400">Validate passenger e-tickets ({roleLabel})</p>
          <div className="scan-divider mt-4 w-40" />
        </div>
        <span className="badge bg-nexus-500/15 text-nexus-400">
          <FaTicketAlt className="mr-1" /> /tickets/validate
        </span>
      </div>

      {error && (
        <div role="alert" className="mb-5 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-400">
          {error}
        </div>
      )}

      <div className="glass-strong glow-border rounded-2xl p-6">
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <button
            type="button"
            className={mode === 'camera' ? 'btn-holo' : 'btn-secondary'}
            onClick={() => setMode('camera')}
          >
            <FaCamera /> Camera
          </button>
          <button
            type="button"
            className={mode === 'upload' ? 'btn-holo' : 'btn-secondary'}
            onClick={() => setMode('upload')}
          >
            <FaQrcode /> Upload image
          </button>
          <button
            type="button"
            className={mode === 'paste' ? 'btn-holo' : 'btn-secondary'}
            onClick={() => setMode('paste')}
          >
            <FaKeyboard /> Enter manually
          </button>
          {!isNative && (
            <p className="text-xs text-slate-500">
              Camera opens in your browser — the Android app scans full-screen.
            </p>
          )}
        </div>

        {(mode === 'camera') && (
          <div className="grid place-items-center gap-4 rounded-xl border border-dashed border-slate-700 py-16 text-center">
            <FaQrcode className={`text-5xl ${scanning ? 'animate-pulse text-nexus-400' : 'text-slate-600'}`} />
            {scanning ? (
              <p className="text-sm text-slate-300">Scanning… point at the ticket QR code</p>
            ) : (
              <>
                <button type="button" className="btn-nexus px-6" onClick={scanWithCamera}>
                  <FaCamera /> Start camera scan
                </button>
              </>
            )}
          </div>
        )}

        {mode === 'upload' && (
          <div className="grid place-items-center gap-4 rounded-xl border border-dashed border-slate-700 py-16 text-center">
            <FaQrcode className="text-5xl text-slate-600" />
            <p className="text-sm text-slate-400">Upload a screenshot or photo of the ticket QR</p>
            <button type="button" className="btn-holo" onClick={() => fileRef.current?.click()}>
              Choose image
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) decodeImage(e.target.files[0])
              }}
            />
          </div>
        )}

        {mode === 'paste' && (
          <form onSubmit={submitPasted} className="space-y-4">
            <textarea
              className="input min-h-28 resize-y"
              value={pasted}
              onChange={(e) => setPasted(e.target.value)}
              placeholder="Paste the QR code content here"
              aria-label="Paste QR content"
            />
            <button type="submit" className="btn-holo w-full" disabled={validating || !pasted.trim()}>
              {validating ? 'Validating…' : 'Validate'}
            </button>
          </form>
        )}
      </div>

      {validating && (
        <div className="glass-strong glow-border mt-5 grid place-items-center gap-3 rounded-2xl p-10 text-sm text-slate-400">
          <span className="loader-beam h-5 w-5 rounded-full border-2 border-slate-700" />
          Validating ticket…
        </div>
      )}

      {validation && (
        <div
          role="status"
          className={`mt-5 rounded-2xl border px-5 py-4 text-sm ${validation.valid ? resultStyles.ok : resultStyles.bad}`}
        >
          <div className="flex items-center gap-2 font-semibold">
            {validation.valid ? <FaCheckCircle /> : <FaTimesCircle />}
            {validation.message || (validation.valid ? 'Ticket is valid' : 'Ticket is not valid')}
          </div>
          {validation.valid && validation.ticket && (
            <div className="mt-3 grid gap-x-8 gap-y-1 text-xs sm:grid-cols-2">
              {validation.ticket.bookingRef && (
                <div>Ref: {validation.ticket.bookingRef}</div>
              )}
              {validation.ticket.passengerName && (
                <div>Passenger: {validation.ticket.passengerName}</div>
              )}
              {validation.ticket.seatNumbers && (
                <div>
                  Seats:{' '}
                  {Array.isArray(validation.ticket.seatNumbers)
                    ? validation.ticket.seatNumbers.join(', ')
                    : validation.ticket.seatNumbers}
                </div>
              )}
              {validation.ticket.status && <div>Status: {validation.ticket.status}</div>}
            </div>
          )}
          <button
            type="button"
            className="btn-holo mt-4 !px-4 !py-2 text-xs"
            onClick={() => {
              setValidation(null)
              setPasted('')
              setMode('camera')
            }}
          >
            <FaQrcode /> Scan another
          </button>
        </div>
      )}
    </div>
  )
}