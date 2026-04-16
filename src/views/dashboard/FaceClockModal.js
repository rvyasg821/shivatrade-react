/* eslint-disable jsx-a11y/media-has-caption */
import { useEffect, useRef, useState, useCallback } from 'react'
import { useSelector } from 'react-redux'
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, Spinner, Alert, Row, Col,
} from 'reactstrap'
import { useTranslation } from 'react-i18next'
import { Camera, CheckCircle, XCircle, MapPin, LogIn, LogOut, Coffee, Play, User } from 'react-feather'
import Select from 'react-select'
import instance from '@src/utility/AxiosConfig'
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints'

// Persistent kiosk location for Company Admin / multi-location admin
const KIOSK_LOCATION_KEY = 'pg_kiosk_location_id'

// UI states for the modal
const PHASE = {
  PICK_LOCATION: 'pick_location',
  CAMERA: 'camera',           // live preview, ready to capture
  IDENTIFYING: 'identifying', // image sent, waiting for match
  CONFIRM: 'confirm',         // employee shown, action buttons visible
  CLOCKING: 'clocking',       // action sent, waiting for response
  SUCCESS: 'success',         // success screen, auto-reset to camera
  ERROR: 'error',             // recoverable error, retry button
}

const ACTION_META = {
  clock_in: { label: 'Clock In', color: 'success', icon: <LogIn size={18} /> },
  break_in: { label: 'Start Break', color: 'warning', icon: <Coffee size={18} /> },
  break_out: { label: 'End Break', color: 'info', icon: <Play size={18} /> },
  clock_out: { label: 'Clock Out', color: 'danger', icon: <LogOut size={18} /> },
}

const formatTime = (iso) => {
  if (!iso) return '—'
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' })
}

const FaceClockModal = ({ isOpen, toggle, currentUser }) => {
  const { t } = useTranslation()

  // Refs
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const successTimerRef = useRef(null)

  // State
  const [phase, setPhase] = useState(PHASE.CAMERA)
  const [cameraReady, setCameraReady] = useState(false)
  const [error, setError] = useState(null)
  const [match, setMatch] = useState(null) // { employee, state, confidence }
  const [successInfo, setSuccessInfo] = useState(null)

  // Location selection (for Company Admin / multi-location admin)
  const [locationId, setLocationId] = useState(null)
  const [locationOptions, setLocationOptions] = useState([])
  const [loadingLocations, setLoadingLocations] = useState(false)

  // ── Source of truth for location: navbar location selector ──
  // The top header has a global location selector backed by state.locationContext.
  // We default the kiosk to whatever's selected there. The user can still override
  // via the picker / "Change location" link if they want to.
  const navbarSelectedLocationId = useSelector((state) => state?.locationContext?.selectedLocationId)
  const companyLocations = useSelector((state) => state?.locationContext?.companyLocations) || []

  // Derive the human-readable name for the currently bound location
  const currentLocation = companyLocations.find((l) => l._id === locationId)
  const currentLocationName = currentLocation
    ? `${currentLocation.location_name || currentLocation.name}${currentLocation.location_code ? ` (${currentLocation.location_code})` : ''}`
    : null

  // Determine if a location picker is needed
  const roleName = (currentUser?.role?.name || '').toLowerCase()
  const isCompanyAdmin = roleName === 'company admin'
  const assignedLocations = currentUser?.assignedLocations || []
  const primaryLocationId = currentUser?.location_id || currentUser?.locationId || null

  // Resolve the effective default location, in order of priority:
  // 1) navbar-selected location (if set)
  // 2) localStorage kiosk pin (if user explicitly chose one before)
  // 3) JWT primary location
  // Only show the picker if NONE of the above resolve to a valid location.
  const resolveDefaultLocation = () => {
    if (navbarSelectedLocationId) return navbarSelectedLocationId
    const stored = localStorage.getItem(KIOSK_LOCATION_KEY)
    if (stored) return stored
    if (primaryLocationId) return primaryLocationId
    return null
  }

  // ── Camera lifecycle ──────────────────────────────────────────────────────
  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((tr) => tr.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }, [])

  const startCamera = useCallback(async () => {
    setError(null)
    setCameraReady(false)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'user', width: { ideal: 640 }, height: { ideal: 480 } },
      })
      streamRef.current = stream
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        await videoRef.current.play()
        setCameraReady(true)
      }
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        setError(t('Camera permission denied. Please allow camera access in your browser settings.'))
      } else if (err.name === 'NotFoundError') {
        setError(t('No camera found on this device.'))
      } else {
        setError(`${t('Camera error')}: ${err.message}`)
      }
    }
  }, [t])

  // ── Initial setup when modal opens ────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) {
      stopStream()
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current)
        successTimerRef.current = null
      }
      return
    }

    // Try to default to a location automatically — navbar > localStorage > JWT primary
    const resolved = resolveDefaultLocation()
    if (resolved) {
      setLocationId(resolved)
      setPhase(PHASE.CAMERA)
      return
    }

    // No default available → show picker
    setPhase(PHASE.PICK_LOCATION)

    // Prefer companyLocations from the locationContext (already loaded for the navbar)
    // to avoid an extra API call.
    if (companyLocations && companyLocations.length > 0) {
      const filtered = isCompanyAdmin
        ? companyLocations
        : companyLocations.filter((l) => assignedLocations.includes(l._id))
      setLocationOptions(filtered.map((l) => ({
        value: l._id,
        label: `${l.location_name || l.name}${l.location_code ? ` (${l.location_code})` : ''}`,
      })))
      return
    }

    // Fallback: fetch from API if companyLocations isn't populated yet
    setLoadingLocations(true)
    instance.get(API_ENDPOINTS.locations.list, { params: { perPage: 500 } })
      .then((res) => {
        const list = res.data?.data || []
        const filtered = isCompanyAdmin
          ? list
          : list.filter((l) => assignedLocations.includes(l._id))
        setLocationOptions(filtered.map((l) => ({
          value: l._id,
          label: `${l.location_name || l.name}${l.location_code ? ` (${l.location_code})` : ''}`,
        })))
      })
      .catch(() => setLocationOptions([]))
      .finally(() => setLoadingLocations(false))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, navbarSelectedLocationId])

  // ── Start camera when entering the camera phase ───────────────────────────
  useEffect(() => {
    if (!isOpen) return
    if (phase === PHASE.CAMERA) {
      startCamera()
    }
    if (phase !== PHASE.CAMERA && phase !== PHASE.IDENTIFYING) {
      stopStream()
    }
  }, [isOpen, phase, startCamera, stopStream])

  // ── Capture & identify ────────────────────────────────────────────────────
  const handleCapture = async () => {
    if (!videoRef.current || !canvasRef.current || !cameraReady) return
    setPhase(PHASE.IDENTIFYING)
    setError(null)

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.85)

    try {
      const res = await instance.post(API_ENDPOINTS.attendance.faceIdentify, {
        image: base64,
        location_id: locationId,
      })
      const data = res.data?.data
      if (!data?.matched) {
        setError(data?.reason || t('Face not recognised. Please try again.'))
        setPhase(PHASE.ERROR)
        return
      }
      setMatch({ ...data, capturedImage: base64 })
      stopStream()
      setPhase(PHASE.CONFIRM)
    } catch (err) {
      setError(err?.response?.data?.message || t('Identification failed. Please try again.'))
      setPhase(PHASE.ERROR)
    }
  }

  // ── Confirm an action ─────────────────────────────────────────────────────
  const handleAction = async (action) => {
    if (!match?.employee?.user_id) return
    setPhase(PHASE.CLOCKING)
    setError(null)
    try {
      const res = await instance.post(API_ENDPOINTS.attendance.faceClock, {
        user_id: match.employee.user_id,
        action,
        location_id: locationId,
        face_image: match.capturedImage,
      })
      setSuccessInfo({
        action,
        employee: match.employee,
        message: res.data?.message || t('Recorded'),
        timestamp: new Date(),
      })
      setPhase(PHASE.SUCCESS)

      // Show success briefly, then close the modal so the dashboard refreshes.
      // Next employee will reopen via the Face Clock button.
      successTimerRef.current = setTimeout(() => {
        handleClose()
      }, 1800)
    } catch (err) {
      setError(err?.response?.data?.message || t('Clock action failed. Please try again.'))
      setPhase(PHASE.ERROR)
    }
  }

  // ── Reset state (used by Try Again on the error screen) ──────────────────
  const resetForNext = () => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
    setMatch(null)
    setSuccessInfo(null)
    setError(null)
    setPhase(PHASE.CAMERA)
  }

  // ── Location picker confirm ───────────────────────────────────────────────
  const handleLocationConfirm = (opt) => {
    if (!opt?.value) return
    localStorage.setItem(KIOSK_LOCATION_KEY, opt.value)
    setLocationId(opt.value)
    setPhase(PHASE.CAMERA)
  }

  const handleChangeLocation = () => {
    localStorage.removeItem(KIOSK_LOCATION_KEY)
    setLocationId(null)
    stopStream()
    setPhase(PHASE.PICK_LOCATION)
    // Reload location list
    setLoadingLocations(true)
    instance.get(API_ENDPOINTS.locations.list, { params: { perPage: 500 } })
      .then((res) => {
        const list = res.data?.data || []
        const filtered = isCompanyAdmin
          ? list
          : list.filter((l) => assignedLocations.includes(l._id))
        setLocationOptions(filtered.map((l) => ({
          value: l._id,
          label: `${l.location_name || l.name} ${l.location_code ? `(${l.location_code})` : ''}`,
        })))
      })
      .catch(() => setLocationOptions([]))
      .finally(() => setLoadingLocations(false))
  }

  const handleClose = () => {
    stopStream()
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current)
      successTimerRef.current = null
    }
    toggle()
  }

  // ── Render helpers ────────────────────────────────────────────────────────
  const renderLocationPicker = () => (
    <div className='py-2'>
      <h5 className='mb-1 text-center'>{t('Select location for this kiosk')}</h5>
      <p className='text-muted small text-center mb-2'>
        {t('This device will be tied to the chosen location. Only employees from that location can clock in here.')}
      </p>
      {loadingLocations ? (
        <div className='text-center py-2'><Spinner size='sm' /></div>
      ) : (
        <Select
          options={locationOptions}
          onChange={handleLocationConfirm}
          placeholder={t('Choose a location...')}
          isSearchable
          autoFocus
        />
      )}
    </div>
  )

  const renderCamera = () => (
    <div className='text-center'>
      {error && <Alert color='danger'>{error}</Alert>}
      <div style={{ position: 'relative', display: 'inline-block', maxWidth: '100%' }}>
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            maxWidth: 480,
            borderRadius: 12,
            background: '#000',
            display: error ? 'none' : 'block',
            transform: 'scaleX(-1)', // mirror for natural feel
          }}
        />
        {/* Face position guide */}
        {cameraReady && !error && (
          <div
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 220,
              height: 280,
              border: '3px dashed rgba(255,255,255,0.6)',
              borderRadius: '50%',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {!error && !cameraReady && (
        <div className='py-2'>
          <Spinner size='sm' className='me-50' />
          {t('Starting camera...')}
        </div>
      )}
      {cameraReady && !error && (
        <p className='text-muted small mt-1 mb-0'>
          {t('Position your face in the circle and tap Capture')}
        </p>
      )}
    </div>
  )

  const renderIdentifying = () => (
    <div className='text-center py-3'>
      <Spinner color='primary' />
      <h5 className='mt-1 mb-0'>{t('Identifying...')}</h5>
    </div>
  )

  const renderConfirm = () => {
    if (!match) return null
    const { employee, state } = match
    const stateText = state.is_clocked_out
      ? t('Already clocked out today')
      : state.on_break
        ? `${t('On break since')} ${formatTime(state.clock_in)}`
        : state.is_clocked_in
          ? `${t('Clocked in at')} ${formatTime(state.clock_in)}`
          : t('Not clocked in yet today')

    const placeholderStyle = {
      width: 100, height: 100, borderRadius: '50%',
      background: '#e9ecef', color: '#09418B', display: 'inline-flex',
      alignItems: 'center', justifyContent: 'center',
      marginBottom: 12, border: '3px solid #09418B',
    }

    return (
      <div className='text-center py-1'>
        {employee.photo && !match.photoFailed ? (
          <img
            src={employee.photo}
            alt={employee.name}
            style={{
              width: 100, height: 100, borderRadius: '50%', objectFit: 'cover',
              border: '3px solid #09418B', marginBottom: 12,
            }}
            onError={() => setMatch((prev) => prev ? { ...prev, photoFailed: true } : prev)}
          />
        ) : (
          <div style={placeholderStyle}>
            <User size={48} />
          </div>
        )}
        <h4 className='mb-25'>{t('Hi')}, {employee.name}!</h4>
        {employee.employee_code && (
          <div className='text-muted small mb-50'>{employee.employee_code}</div>
        )}
        <div className='text-muted small mb-2'>{stateText}</div>

        {state.valid_actions && state.valid_actions.length > 0 ? (
          <Row className='g-1 justify-content-center'>
            {state.valid_actions.map((action) => {
              const meta = ACTION_META[action]
              if (!meta) return null
              return (
                <Col xs={state.valid_actions.length === 1 ? 12 : 6} key={action}>
                  <Button
                    color={meta.color}
                    block
                    size='lg'
                    onClick={() => handleAction(action)}
                    className='d-flex align-items-center justify-content-center gap-50'
                  >
                    {meta.icon}
                    {t(meta.label)}
                  </Button>
                </Col>
              )
            })}
          </Row>
        ) : (
          <Alert color='secondary' className='mb-0'>
            {t('No actions available — already clocked out for today.')}
          </Alert>
        )}
      </div>
    )
  }

  const renderClocking = () => (
    <div className='text-center py-3'>
      <Spinner color='primary' />
      <h5 className='mt-1 mb-0'>{t('Recording...')}</h5>
    </div>
  )

  const renderSuccess = () => {
    if (!successInfo) return null
    const meta = ACTION_META[successInfo.action]
    return (
      <div className='text-center py-3'>
        <CheckCircle size={64} className='text-success mb-1' />
        <h4 className='mb-25'>{t('Success!')}</h4>
        <p className='mb-25'>
          <strong>{successInfo.employee.name}</strong>
        </p>
        <p className='text-muted mb-1'>
          {meta ? t(meta.label) : successInfo.message} — {formatTime(successInfo.timestamp)}
        </p>
        <p className='text-muted small'>{t('Closing...')}</p>
      </div>
    )
  }

  const renderError = () => (
    <div className='text-center py-3'>
      <XCircle size={64} className='text-danger mb-1' />
      <h5 className='mb-1'>{error || t('Something went wrong')}</h5>
    </div>
  )

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      toggle={handleClose}
      centered
      size='md'
      backdrop='static'
      keyboard={false}
    >
      <ModalHeader
        toggle={handleClose}
        style={{ backgroundColor: '#09418B', padding: '1.25rem 1.5rem' }}
        close={
          <button
            type='button'
            className='btn-close btn-close-white'
            aria-label='Close'
            onClick={handleClose}
          />
        }
      >
        <span style={{ color: '#fff', fontSize: '1.15rem' }}>
          <Camera size={18} className='me-50' />
          {t('Face Clock Kiosk')}
        </span>
      </ModalHeader>
      <ModalBody className='py-2'>
        {phase === PHASE.PICK_LOCATION && renderLocationPicker()}
        {phase === PHASE.CAMERA && renderCamera()}
        {phase === PHASE.IDENTIFYING && renderIdentifying()}
        {phase === PHASE.CONFIRM && renderConfirm()}
        {phase === PHASE.CLOCKING && renderClocking()}
        {phase === PHASE.SUCCESS && renderSuccess()}
        {phase === PHASE.ERROR && renderError()}
      </ModalBody>
      <ModalFooter className='d-flex justify-content-between align-items-center'>
        <div className='d-flex flex-column align-items-start'>
          {locationId && phase !== PHASE.PICK_LOCATION && (
            <>
              {currentLocationName && (
                <div className='d-flex align-items-center text-muted small'>
                  <MapPin size={12} className='me-25 text-primary' />
                  <span className='fw-semibold'>{currentLocationName}</span>
                </div>
              )}
              <Button color='link' size='sm' onClick={handleChangeLocation} className='p-0' style={{ fontSize: '0.75rem' }}>
                {t('Change location')}
              </Button>
            </>
          )}
        </div>
        <div className='d-flex gap-1'>
          {phase === PHASE.CAMERA && (
            <>
              <Button color='secondary' outline onClick={handleClose}>
                {t('Close')}
              </Button>
              <Button
                color='primary'
                onClick={handleCapture}
                disabled={!cameraReady}
              >
                <Camera size={14} className='me-50' />
                {t('Capture')}
              </Button>
            </>
          )}
          {phase === PHASE.CONFIRM && (
            <Button color='secondary' outline onClick={handleClose}>
              {t('Cancel')}
            </Button>
          )}
          {phase === PHASE.ERROR && (
            <>
              <Button color='secondary' outline onClick={handleClose}>
                {t('Close')}
              </Button>
              <Button color='primary' onClick={resetForNext}>
                {t('Try Again')}
              </Button>
            </>
          )}
        </div>
      </ModalFooter>
    </Modal>
  )
}

export default FaceClockModal
