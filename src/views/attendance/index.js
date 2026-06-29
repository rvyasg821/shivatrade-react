import React, { Fragment, useEffect, useState, useCallback, useRef } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Card, CardBody, CardHeader, CardTitle,
  Button, Badge, Row, Col, Spinner, FormGroup, Label, Input,
  Modal, ModalHeader, ModalBody, ModalFooter, Alert,
  Nav, NavItem, NavLink, TabContent, TabPane,
} from 'reactstrap'
import { Clock, Coffee, LogIn, LogOut, Calendar, MapPin, BarChart2, List } from 'react-feather'
import FaceCaptureModal from './components/FaceCaptureModal'
import {
  getToday, getMyRecords, clockIn, clockOut,
  startBreak, endBreak, clearAttendanceActionFlag,
  getMyMonthlyReport, getMyAnnualReport,
} from './store'
import Notification from '@components/toast/notification'
import DatatablePagination from '@components/datatable/DatatablePagination'
import { formatDate, formatTime } from '@src/utility/dateFormat'

const STATUS_COLORS = {
  present: 'light-success',
  late: 'light-warning',
  absent: 'light-danger',
  half_day: 'light-info',
  on_leave: 'light-primary',
  holiday: 'light-secondary',
}

const formatClockTime = (isoStr, tz) => {
  if (!isoStr) return '—'
  if (tz) {
    try {
      return new Date(isoStr).toLocaleTimeString('en-US', {
        timeZone: tz, hour: 'numeric', minute: '2-digit', hour12: true,
      })
    } catch (_) { /* fall through */ }
  }
  const d = new Date(isoStr)
  const h = d.getUTCHours()
  const m = d.getUTCMinutes()
  const period = h >= 12 ? 'PM' : 'AM'
  const hour = h % 12 || 12
  return `${hour}:${String(m).padStart(2, '0')} ${period}`
}

const formatHours = (h) => {
  if (!h && h !== 0) return '—'
  const hrs = Math.floor(h)
  const mins = Math.round((h - hrs) * 60)
  return `${hrs}h ${mins}m`
}

const LiveTimer = ({ clockIn, breakMinutes = 0 }) => {
  const [elapsed, setElapsed] = useState('')
  const intervalRef = useRef(null)
  useEffect(() => {
    if (!clockIn) { setElapsed('—'); return }
    const clockInMs = new Date(clockIn).getTime()
    const breakMs = (breakMinutes || 0) * 60000
    const tick = () => {
      const workedMs = Math.max(0, Date.now() - clockInMs - breakMs)
      const totalSec = Math.floor(workedMs / 1000)
      const h = Math.floor(totalSec / 3600)
      const m = Math.floor((totalSec % 3600) / 60)
      const s = totalSec % 60
      setElapsed(`${h}h ${String(m).padStart(2, '0')}m ${String(s).padStart(2, '0')}s`)
    }
    tick()
    intervalRef.current = setInterval(tick, 1000)
    return () => clearInterval(intervalRef.current)
  }, [clockIn, breakMinutes])
  return <span>{elapsed}</span>
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
const currentYear = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i)

const AttendancePage = ({ hideRecords = false }) => {
  const dispatch = useDispatch()
  const store = useSelector((s) => s.attendance)

  const [breakModal, setBreakModal] = useState(false)
  const [breakType, setBreakType] = useState('short')
  const [actionLoading, setActionLoading] = useState(false)
  const [recordYear, setRecordYear] = useState(new Date().getFullYear())
  const [recordMonth, setRecordMonth] = useState(new Date().getMonth() + 1)
  const [faceCaptureModal, setFaceCaptureModal] = useState(false)
  const [faceCaptureAction, setFaceCaptureAction] = useState(null)

  // Tabs for full page view
  const [activeTab, setActiveTab] = useState('records')
  const [reportYear, setReportYear] = useState(new Date().getFullYear())
  const [reportMonth, setReportMonth] = useState(new Date().getMonth() + 1)
  const [reportView, setReportView] = useState('monthly')

  const today = store.todayRecord
  const tz = store.timezone
  const employeeSettings = store.employeeSettings
  const faceRequired = employeeSettings?.face_capture_enabled === true
  const gpsRequired = employeeSettings?.gps_enabled === true
  const breakTrackingEnabled = employeeSettings?.break_tracking_enabled !== false
  const [gpsStatus, setGpsStatus] = useState(null)
  const [gpsError, setGpsError] = useState(null)

  const loadRecords = useCallback(() => {
    const startDate = `${recordYear}-${String(recordMonth).padStart(2, '0')}-01`
    const lastDay = new Date(recordYear, recordMonth, 0).getDate()
    const endDate = `${recordYear}-${String(recordMonth).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`
    dispatch(getMyRecords({ startDate, endDate }))
  }, [dispatch, recordYear, recordMonth])

  const load = useCallback(() => {
    dispatch(getToday())
    if (!hideRecords) loadRecords()
  }, [dispatch, loadRecords, hideRecords])

  useEffect(() => { load() }, [load])

  // Load reports when tab changes
  useEffect(() => {
    if (hideRecords) return
    if (activeTab === 'report') {
      if (reportView === 'annual') {
        dispatch(getMyAnnualReport({ year: reportYear }))
      } else {
        dispatch(getMyMonthlyReport({ year: reportYear, month: reportMonth }))
      }
    }
  }, [activeTab, reportView, reportYear, reportMonth, dispatch, hideRecords])

  // GPS helper
  const getGpsPosition = () => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) { reject(new Error('Geolocation not supported.')); return }
      setGpsStatus('acquiring'); setGpsError(null)
      navigator.geolocation.getCurrentPosition(
        (pos) => { setGpsStatus('success'); resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }) },
        (err) => {
          setGpsStatus('error')
          let msg = 'Unable to get your location.'
          if (err.code === 1) msg = 'Location permission denied.'
          else if (err.code === 2) msg = 'Location unavailable.'
          else if (err.code === 3) msg = 'Location request timed out.'
          setGpsError(msg); reject(new Error(msg))
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 }
      )
    })
  }

  const dispatchClockAction = (action, extras = {}) => {
    setActionLoading(true); setGpsStatus(null); setGpsError(null)
    if (gpsRequired) {
      getGpsPosition().then((gps) => dispatch(action({ ...extras, gps }))).catch((err) => {
        Notification('Error', err.message, 'danger'); setActionLoading(false)
      })
    } else { dispatch(action(extras)) }
  }

  useEffect(() => {
    if (store.actionFlag === 'CLOCK_IN') {
      Notification('Success', 'Clocked in successfully!', 'success')
      setActionLoading(false); setGpsStatus(null); setGpsError(null)
      dispatch(getToday()); if (!hideRecords) loadRecords()
    }
    if (store.actionFlag === 'CLOCK_OUT') {
      Notification('Success', 'Clocked out successfully!', 'success')
      setActionLoading(false); setGpsStatus(null); setGpsError(null)
      dispatch(getToday()); if (!hideRecords) loadRecords()
    }
    if (store.actionFlag === 'START_BREAK') {
      Notification('Info', 'Break started.', 'info')
      setActionLoading(false); setBreakModal(false); dispatch(getToday())
    }
    if (store.actionFlag === 'END_BREAK') {
      Notification('Success', 'Break ended.', 'success')
      setActionLoading(false); dispatch(getToday()); if (!hideRecords) loadRecords()
    }
    if (store.error) { Notification('Error', store.error, 'danger'); setActionLoading(false); setGpsStatus(null) }
    if (store.actionFlag) dispatch(clearAttendanceActionFlag())
  }, [store.actionFlag, store.error, dispatch])

  const handleClockIn = () => {
    if (faceRequired) { setFaceCaptureAction('clock_in'); setFaceCaptureModal(true) }
    else dispatchClockAction(clockIn, {})
  }
  const handleClockOut = () => {
    if (faceRequired) { setFaceCaptureAction('clock_out'); setFaceCaptureModal(true) }
    else dispatchClockAction(clockOut, {})
  }
  const handleFaceCapture = (base64) => {
    setFaceCaptureModal(false)
    const faceDescriptor = { image: base64, capturedAt: new Date().toISOString() }
    if (faceCaptureAction === 'clock_in') dispatchClockAction(clockIn, { faceDescriptor })
    else dispatchClockAction(clockOut, { faceDescriptor })
    setFaceCaptureAction(null)
  }
  const handleStartBreak = () => { setActionLoading(true); dispatch(startBreak({ type: breakType })) }
  const handleEndBreak = () => { setActionLoading(true); dispatch(endBreak()) }

  const isClockedIn = today && today.clock_in && !today.clock_out
  const isClockedOut = today && today.clock_out
  const hasActiveBreak = today?.breaks?.some((b) => !b.end_time)

  const recordColumns = [
    { name: 'Date', minWidth: '180px', cell: (r) => <span className='fw-semibold text-body'>{formatDate(r.date)}</span> },
    { name: 'Clock In', minWidth: '150px', center: true, cell: (r) => formatClockTime(r.clock_in, tz) },
    { name: 'Clock Out', minWidth: '150px', center: true, cell: (r) => formatClockTime(r.clock_out, tz) },
    { name: 'Hours', minWidth: '130px', center: true, cell: (r) => formatHours(r.total_hours) },
    { name: 'OT', minWidth: '120px', center: true, cell: (r) => formatHours(r.overtime_hours || 0) },
    { name: 'Break', minWidth: '120px', center: true, cell: (r) => r.break_minutes ? <span>{r.break_minutes}m</span> : <span className='text-muted'>0m</span> },
    { name: 'Status', minWidth: '120px', center: true, cell: (r) => <Badge color={STATUS_COLORS[r.status] || 'light-secondary'}>{r.status?.replace('_', ' ')}</Badge> },
    {
      name: 'Flags', minWidth: '160px', center: true,
      cell: (r) => {
        const flags = []
        if (r.is_late) flags.push(<Badge key='late' color='light-warning'>Late</Badge>)
        if (r.is_early_leave) flags.push(<Badge key='early' color='light-info'>Early</Badge>)
        if (r.overtime_hours > 0) flags.push(<Badge key='ot' color='light-secondary'>OT</Badge>)
        return flags.length ? <div className='d-flex gap-25 flex-wrap justify-content-center'>{flags}</div> : <span className='text-muted'>—</span>
      },
    },
  ]

  // Monthly summary data (single row for the logged-in employee)
  const monthlySummary = store.myMonthlySummary
  const annualData = store.myAnnualReport || []

  const monthlyReportColumns = [
    { name: 'Present', minWidth: '80px', center: true, cell: (r) => <span className="fw-semibold" style={{ color: '#28c76f' }}>{r.present_days ?? 0}</span> },
    { name: 'Late', minWidth: '70px', center: true, cell: (r) => <span className="fw-semibold" style={{ color: '#ff9f43' }}>{r.late_days ?? 0}</span> },
    { name: 'Early', minWidth: '70px', center: true, cell: (r) => <span className="fw-semibold" style={{ color: '#00cfe8' }}>{r.early_leave_days ?? 0}</span> },
    { name: 'Absent', minWidth: '80px', center: true, cell: (r) => <span className="fw-semibold" style={{ color: '#ea5455' }}>{r.absent_days ?? 0}</span> },
    { name: 'Half Day', minWidth: '80px', center: true, cell: (r) => <span className="fw-semibold" style={{ color: '#ff9f43' }}>{r.half_day_days ?? 0}</span> },
    { name: 'On Leave', minWidth: '80px', center: true, cell: (r) => <span className="fw-semibold" style={{ color: '#7367f0' }}>{r.on_leave_days ?? 0}</span> },
    { name: 'Holiday', minWidth: '80px', center: true, cell: (r) => <span className="fw-semibold" style={{ color: '#82868b' }}>{r.holiday_days ?? 0}</span> },
    { name: 'Hours', minWidth: '80px', center: true, cell: (r) => <span className="fw-semibold" style={{ color: '#09418b' }}>{formatHours(r.total_hours ?? 0)}</span> },
    { name: 'OT', minWidth: '70px', center: true, cell: (r) => <span className="fw-semibold" style={{ color: '#09418b' }}>{formatHours(r.overtime_hours ?? 0)}</span> },
  ]

  const annualReportColumns = [
    { name: 'Month', minWidth: '120px', cell: (r) => <span className="fw-semibold">{r.month_name}</span> },
    ...monthlyReportColumns,
  ]

  // ── RENDER: hideRecords mode (dashboard) ── only today bar + clock buttons
  if (hideRecords) {
    return (
      <Fragment>
        <Card className='mb-2'>
          <CardBody style={{ paddingTop: '0.85rem', paddingBottom: '0.85rem' }}>
            <div className='d-flex align-items-center justify-content-between flex-wrap gap-2'>
              {/* Identity + live status */}
              <div className='d-flex align-items-center'>
                <div
                  className={`me-1 d-flex align-items-center justify-content-center rounded-circle bg-light-${isClockedIn ? (hasActiveBreak ? 'warning' : 'success') : 'secondary'}`}
                  style={{ width: 42, height: 42, flexShrink: 0 }}
                >
                  <Clock size={20} />
                </div>
                <div className='lh-1'>
                  <div className='fw-bolder mb-25'>
                    {new Date().toLocaleDateString('en-US', { weekday: 'long', day: 'numeric', month: 'short' })}
                  </div>
                  <div className='d-flex align-items-center gap-50 flex-wrap'>
                    {hasActiveBreak ? (
                      <Badge color='light-warning'><Coffee size={11} className='me-25' />On Break</Badge>
                    ) : today ? (
                      <Badge color={STATUS_COLORS[today.status] || 'light-secondary'} className='text-capitalize'>
                        {(today.status || '').replace('_', ' ') || 'Active'}
                      </Badge>
                    ) : (
                      <span className='text-muted small'>Not clocked in yet</span>
                    )}
                    {today && today.is_late && <Badge color='light-warning'>Late</Badge>}
                    {today && today.is_early_leave && <Badge color='light-info'>Early</Badge>}
                  </div>
                </div>
              </div>

              {/* Metrics */}
              <div className='d-flex align-items-center text-center'>
                <div style={{ padding: '0 0.95rem' }}>
                  <div className='text-muted text-uppercase fw-bold' style={{ fontSize: '0.66rem', letterSpacing: '0.03em' }}>In</div>
                  <div className='fw-bolder'>{today ? formatClockTime(today.clock_in, tz) : '—'}</div>
                </div>
                <div style={{ width: 1, height: 30, background: '#ebe9f1' }} />
                <div style={{ padding: '0 0.95rem' }}>
                  <div className='text-muted text-uppercase fw-bold' style={{ fontSize: '0.66rem', letterSpacing: '0.03em' }}>Out</div>
                  <div className='fw-bolder'>{today ? formatClockTime(today.clock_out, tz) : '—'}</div>
                </div>
                <div style={{ width: 1, height: 30, background: '#ebe9f1' }} />
                <div style={{ padding: '0 0.95rem' }}>
                  <div className='text-muted text-uppercase fw-bold' style={{ fontSize: '0.66rem', letterSpacing: '0.03em' }}>Hours</div>
                  <div className='fw-bolder' style={{ color: '#09418b' }}>
                    {today && today.clock_in && !today.clock_out
                      ? <LiveTimer clockIn={today.clock_in} breakMinutes={today.break_minutes} />
                      : today ? formatHours(today.total_hours) : '—'}
                  </div>
                </div>
                <div style={{ width: 1, height: 30, background: '#ebe9f1' }} />
                <div style={{ padding: '0 0.95rem' }}>
                  <div className='text-muted text-uppercase fw-bold' style={{ fontSize: '0.66rem', letterSpacing: '0.03em' }}>Break</div>
                  <div className='fw-bolder'>{today?.break_minutes ? `${today.break_minutes}m` : '0m'}</div>
                </div>
              </div>

              {/* Actions */}
              <div className='d-flex gap-75 align-items-center' style={{ flexShrink: 0, whiteSpace: 'nowrap' }}>
                {gpsRequired && gpsStatus === 'acquiring' && <span className='text-info small d-flex align-items-center'><Spinner size='sm' className='me-50' />Getting location...</span>}
                {!isClockedIn && !isClockedOut && (
                  <Button color='success' size='sm' onClick={handleClockIn} disabled={actionLoading}>
                    {actionLoading ? <Spinner size='sm' /> : <><LogIn size={14} className='me-50' />Clock In</>}
                  </Button>
                )}
                {isClockedIn && !hasActiveBreak && breakTrackingEnabled && (
                  <Button color='warning' size='sm' outline onClick={() => setBreakModal(true)} disabled={actionLoading}><Coffee size={14} className='me-50' />Break</Button>
                )}
                {isClockedIn && hasActiveBreak && breakTrackingEnabled && (
                  <Button color='info' size='sm' outline onClick={handleEndBreak} disabled={actionLoading}>
                    {actionLoading ? <Spinner size='sm' /> : <><Coffee size={14} className='me-50' />End Break</>}
                  </Button>
                )}
                {isClockedIn && (
                  <Button color='danger' size='sm' onClick={handleClockOut} disabled={actionLoading}>
                    {actionLoading ? <Spinner size='sm' /> : <><LogOut size={14} className='me-50' />Clock Out</>}
                  </Button>
                )}
              </div>
            </div>
          </CardBody>
        </Card>
        <Modal isOpen={breakModal} toggle={() => setBreakModal(false)} centered>
          <ModalHeader toggle={() => setBreakModal(false)}>Start Break</ModalHeader>
          <ModalBody>
            <FormGroup>
              <Label>Break Type</Label>
              <Input type='select' value={breakType} onChange={(e) => setBreakType(e.target.value)}>
                <option value='short'>Short Break</option>
                <option value='lunch'>Lunch Break</option>
                <option value='other'>Other</option>
              </Input>
            </FormGroup>
          </ModalBody>
          <ModalFooter>
            <Button color='secondary' outline onClick={() => setBreakModal(false)}>Cancel</Button>
            <Button color='warning' onClick={handleStartBreak} disabled={actionLoading}>{actionLoading ? <Spinner size='sm' /> : 'Start Break'}</Button>
          </ModalFooter>
        </Modal>
        <FaceCaptureModal isOpen={faceCaptureModal} toggle={() => { setFaceCaptureModal(false); setFaceCaptureAction(null) }}
          onCapture={handleFaceCapture} actionLabel={faceCaptureAction === 'clock_in' ? 'Clock In' : 'Clock Out'} />
      </Fragment>
    )
  }

  // ── RENDER: Full page (attendance page) ── tabs: Records | Report
  return (
    <Fragment>
      <div className='d-flex align-items-center justify-content-between mb-2'>
        <h3 className='mb-0'><Clock size={18} className='me-1' />My Attendance</h3>
      </div>

      <Card className='mb-0'>
        <CardBody className='pb-0 pt-50'>
          <Nav tabs className='mb-0'>
            <NavItem>
              <NavLink active={activeTab === 'records'} onClick={() => setActiveTab('records')} style={{ cursor: 'pointer' }}>
                <List size={14} className='me-50' />Records
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeTab === 'report'} onClick={() => setActiveTab('report')} style={{ cursor: 'pointer' }}>
                <BarChart2 size={14} className='me-50' />Report
              </NavLink>
            </NavItem>
          </Nav>
        </CardBody>
      </Card>

      <TabContent activeTab={activeTab} className='mt-2'>
        {/* ── RECORDS TAB ── */}
        <TabPane tabId='records'>
          <Card>
            <CardHeader className='border-bottom py-1 d-flex align-items-center justify-content-between'>
              <CardTitle tag='h5' className='mb-0'><Calendar size={15} className='me-75' />My Records</CardTitle>
              <div className='d-flex align-items-center gap-75'>
                <Input type='select' bsSize='sm' style={{ width: '90px' }} value={recordMonth} onChange={(e) => setRecordMonth(+e.target.value)}>
                  {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                </Input>
                <Input type='select' bsSize='sm' style={{ width: '90px' }} value={recordYear} onChange={(e) => setRecordYear(+e.target.value)}>
                  {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
                </Input>
              </div>
            </CardHeader>
            <CardBody>
              <DatatablePagination columns={recordColumns} data={store.myRecords} loading={store.loading} disablePagination />
            </CardBody>
          </Card>
        </TabPane>

        {/* ── REPORT TAB ── */}
        <TabPane tabId='report'>
          <Card className='mb-1'>
            <CardBody className='py-1'>
              <Row className='g-2 align-items-end'>
                <Col md={2}>
                  <Label className='form-label small mb-25'>View</Label>
                  <Input type='select' bsSize='sm' value={reportView} onChange={(e) => setReportView(e.target.value)}>
                    <option value='monthly'>Monthly</option>
                    <option value='annual'>Annual</option>
                  </Input>
                </Col>
                <Col md={2}>
                  <Label className='form-label small mb-25'>Year</Label>
                  <Input type='number' bsSize='sm' value={reportYear} onChange={(e) => setReportYear(+e.target.value)} />
                </Col>
                {reportView === 'monthly' && (
                  <Col md={2}>
                    <Label className='form-label small mb-25'>Month</Label>
                    <Input type='select' bsSize='sm' value={reportMonth} onChange={(e) => setReportMonth(+e.target.value)}>
                      {MONTHS.map((m, i) => <option key={i} value={i + 1}>{m}</option>)}
                    </Input>
                  </Col>
                )}
                <Col md={2}>
                  <Button color='primary' size='sm' onClick={() => {
                    if (reportView === 'annual') dispatch(getMyAnnualReport({ year: reportYear }))
                    else dispatch(getMyMonthlyReport({ year: reportYear, month: reportMonth }))
                  }}>Load Report</Button>
                </Col>
              </Row>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className='border-bottom py-1'>
              <CardTitle tag='h5' className='mb-0'>
                <BarChart2 size={15} className='me-75' />
                {reportView === 'annual' ? `Annual Report — ${reportYear}` : `Monthly Report — ${MONTHS[reportMonth - 1]} ${reportYear}`}
              </CardTitle>
            </CardHeader>
            <CardBody>
              {reportView === 'annual' ? (
                <DatatablePagination columns={annualReportColumns} data={annualData} loading={store.loading} disablePagination />
              ) : (
                monthlySummary ? (
                  <DatatablePagination columns={monthlyReportColumns} data={[monthlySummary]} loading={store.loading} disablePagination />
                ) : (
                  <div className='text-center text-muted py-3'>No data for this period</div>
                )
              )}
            </CardBody>
          </Card>
        </TabPane>
      </TabContent>
    </Fragment>
  )
}

export default AttendancePage
