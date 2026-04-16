import React, { useEffect, useRef, useState } from 'react'
import {
  Modal, ModalHeader, ModalBody, ModalFooter,
  Button, Spinner, Alert,
} from 'reactstrap'
import { Camera } from 'react-feather'

const FaceCaptureModal = ({ isOpen, toggle, onCapture, actionLabel }) => {
  const videoRef = useRef(null)
  const canvasRef = useRef(null)
  const streamRef = useRef(null)
  const [cameraReady, setCameraReady] = useState(false)
  const [error, setError] = useState(null)
  const [capturing, setCapturing] = useState(false)

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    setCameraReady(false)
  }

  useEffect(() => {
    if (!isOpen) return
    setError(null)
    setCameraReady(false)
    setCapturing(false)

    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: 'user', width: { ideal: 480 }, height: { ideal: 360 } } })
      .then((stream) => {
        streamRef.current = stream
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          videoRef.current.play()
          setCameraReady(true)
        }
      })
      .catch((err) => {
        if (err.name === 'NotAllowedError') {
          setError('Camera permission denied. Please allow camera access and try again.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera found on this device.')
        } else {
          setError(`Camera error: ${err.message}`)
        }
      })

    return () => stopStream()
  }, [isOpen])

  const handleCapture = () => {
    if (!videoRef.current || !canvasRef.current) return
    setCapturing(true)

    const video = videoRef.current
    const canvas = canvasRef.current
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    ctx.drawImage(video, 0, 0)
    const base64 = canvas.toDataURL('image/jpeg', 0.8)

    stopStream()
    onCapture(base64)
  }

  const handleCancel = () => {
    stopStream()
    toggle()
  }

  return (
    <Modal isOpen={isOpen} toggle={handleCancel} centered size='md'>
      <ModalHeader toggle={handleCancel}>
        <Camera size={16} className='me-50' />
        Face Capture
      </ModalHeader>
      <ModalBody className='text-center'>
        {error && <Alert color='danger'>{error}</Alert>}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={{
            width: '100%',
            maxWidth: 480,
            borderRadius: 8,
            background: '#000',
            display: error ? 'none' : 'block',
            margin: '0 auto',
          }}
        />
        <canvas ref={canvasRef} style={{ display: 'none' }} />
        {!error && !cameraReady && (
          <div className='py-2'>
            <Spinner size='sm' className='me-50' />
            Starting camera...
          </div>
        )}
      </ModalBody>
      <ModalFooter>
        <Button color='secondary' outline onClick={handleCancel}>Cancel</Button>
        <Button
          color='primary'
          onClick={handleCapture}
          disabled={!cameraReady || capturing}
        >
          {capturing ? <Spinner size='sm' /> : `Capture & ${actionLabel}`}
        </Button>
      </ModalFooter>
    </Modal>
  )
}

export default FaceCaptureModal
