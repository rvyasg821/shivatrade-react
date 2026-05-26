import React, { Fragment, useEffect, useState, useCallback, useRef } from 'react'
import useFormLoading from '@src/hooks/useFormLoading'
import { useSearchParams } from 'react-router-dom'
import { useDispatch, useSelector } from 'react-redux'
import {
  Card, CardBody, CardHeader, CardTitle,
  Button, Badge, Row, Col, Spinner, Input, Label, FormGroup,
  Modal, ModalHeader, ModalBody, ModalFooter,
  Nav, NavItem, NavLink, TabContent, TabPane, UncontrolledTooltip,
  Alert, ButtonGroup,
} from 'reactstrap'
import { Clock, Plus, Trash2, BarChart2, List, Calendar, CheckCircle, AlertTriangle, XCircle, LogOut, Coffee, Settings, Info, RotateCcw, Download, Upload, Edit2 } from 'react-feather'
import AttendanceImportModal from '../components/ImportModal'
import instance from '@src/utility/AxiosConfig'
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints'
import {
  getAttendanceList, getMonthlyReport, getAnnualReport, getDailyReport,
  createManualEntry, updateRecord, deleteRecord, clearAttendanceActionFlag,
  getSettings, updateSettings, resetLocationSettings,
} from '../store'
import { getEmployeeList } from '@src/views/employees/store'
import Notification from '@components/toast/notification'
import DatatablePagination from '@components/datatable/DatatablePagination'
import { formatDate, formatTime } from '@src/utility/dateFormat'
import Select from 'react-select'
import DateInput from '@components/date-input'
import SetupReturnBanner from '@src/components/SetupReturnBanner'

const STATUS_BADGE = {
  present: 'doc-badge-green',
  absent: 'doc-badge-red',
  half_day: 'doc-badge-orange',
  on_leave: 'doc-badge-gray',
  holiday: 'doc-badge-gray',
}


// Display clock times in location timezone
const formatClockTime = (isoStr, tz) => {
  if (!isoStr) return '—'
  if (tz) {
    try {
      return new Date(isoStr).toLocaleTimeString('en-US', {
        timeZone: tz,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
      })
    } catch (_) { /* fall through to UTC */ }
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

const todayStr = () => new Date().toISOString().split('T')[0]

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const AttendanceAdminPage = () => {
  const dispatch = useDispatch()
  const [searchParams] = useSearchParams()
  const store = useSelector((s) => s.attendance)
  const employeeStore = useSelector((s) => s.employee)
  const authStore = useSelector((s) => s.auth)
  const locationCtx = useSelector((s) => s.locationContext)
  const { selectedLocationId } = locationCtx || {}
  const modulePerms = authStore?.authUserItem?.role?.permissions?.['attendance'] || {}
  const canWrite = !!(modulePerms.can_update || modulePerms.can_add)

  // Read URL query params (from employee view navigation)
  const qTab = searchParams.get('tab')
  const qView = searchParams.get('view')
  const qYear = searchParams.get('year')
  const qMonth = searchParams.get('month')
  const qUserId = searchParams.get('userId')

  const [submitting, setSubmitting] = useState(false)
  useFormLoading(submitting)
  const [activeTab, setActiveTab] = useState(qTab || 'daily')
  const [filters, setFilters] = useState({ _startDate: '', _endDate: '', _userId: '', _status: '' })
  const [page, setPage] = useState(0)
  const [limit, setLimit] = useState(20)

  // Manual entry modal
  const [manualModal, setManualModal] = useState(false)
  const [manualData, setManualData] = useState({ user_id: '', date: todayStr(), clock_in: '', clock_out: '', status: '', notes: '' })

  // Import modal
  const [importModal, setImportModal] = useState(false)

  // Edit record modal
  const [editModal, setEditModal] = useState(false)
  const [editData, setEditData] = useState(null)
  const handleExport = async () => {
    try {
      const params = {}
      if (selectedLocationId) params.location_id = selectedLocationId
      if (filters._startDate) params.start_date = filters._startDate
      if (filters._endDate) params.end_date = filters._endDate
      const res = await instance.get(API_ENDPOINTS.attendance.export, { params, responseType: 'blob' })
      const url = URL.createObjectURL(new Blob([res.data]))
      const a = document.createElement('a')
      a.href = url
      a.download = `attendance-${filters._startDate || 'all'}-${filters._endDate || 'all'}.csv`
      a.click()
      URL.revokeObjectURL(url)
    } catch {
      Notification('Error', 'Export failed', 'warning')
    }
  }

  // Report filters
  const [reportDate, setReportDate] = useState(todayStr())
  const [reportYear, setReportYear] = useState(qYear ? +qYear : new Date().getFullYear())
  const [reportMonth, setReportMonth] = useState(qMonth ? +qMonth : new Date().getMonth() + 1)
  const [reportUserId, setReportUserId] = useState(qUserId || '')
  const [reportView, setReportView] = useState(qView || 'monthly') // 'monthly' or 'annual'

  // Determine user role
  const roleName = authStore?.authUserItem?.role?.name || ''
  const isCompanyAdmin = roleName === 'Company Admin'
  const isLocationAdmin = roleName === 'Location Admin'
  const companyLocations = locationCtx?.companyLocations || []

  // Resolve timezone from selected location or API response
  const locationTimezone = (() => {
    // Try from companyLocations list (Company Admin)
    if (selectedLocationId && companyLocations.length) {
      const loc = companyLocations.find(l => l._id === selectedLocationId)
      if (loc?.timezone) return loc.timezone
    }
    // Try from selectedLocationDetails (Location Admin)
    if (locationCtx?.selectedLocationDetails?.timezone) return locationCtx.selectedLocationDetails.timezone
    // Fallback to timezone from API response
    if (store.timezone) return store.timezone
    return null
  })()

  // Settings scope: 'company' or 'location'
  const [settingsScope, setSettingsScope] = useState('company')
  const [settingsLocationId, setSettingsLocationId] = useState('')

  // Settings state
  const defaultSettings = {
    late_threshold_minutes: 15,
    early_leave_threshold_minutes: 15,
    overtime_enabled: false,
    overtime_threshold_hours: 8,
    overtime_multiplier: 1.5,
    break_tracking_enabled: false,
    auto_clock_out_enabled: false,
    auto_clock_out_time: '18:00',
    face_capture_enabled: false,
    gps_enabled: false,
    geofence_radius_meters: 100,
    geofence_lat: 0,
    geofence_lng: 0,
  }
  const [settingsData, setSettingsData] = useState(defaultSettings)

  // Load settings when tab is activated or scope/location changes
  useEffect(() => {
    if (activeTab === 'settings') {
      const params = {}
      if (isCompanyAdmin) {
        // Company Admin: use scope selector
        if (settingsScope === 'location' && settingsLocationId) {
          params.locationId = settingsLocationId
        }
        // scope === 'company' → no locationId → fetches company defaults
      } else if (isLocationAdmin) {
        // Location Admin: always use their assigned location
        if (selectedLocationId) params.locationId = selectedLocationId
      } else {
        // Fallback: use global location context
        if (selectedLocationId) params.locationId = selectedLocationId
      }
      dispatch(getSettings(params))
    }
  }, [activeTab, settingsScope, settingsLocationId, selectedLocationId, isCompanyAdmin, isLocationAdmin, dispatch])

  // Sync store settings into local state
  useEffect(() => {
    if (store.settings) {
      setSettingsData((prev) => ({ ...prev, ...store.settings }))
    }
  }, [store.settings])

  const handleSettingsChange = (field, value) => {
    setSettingsData((prev) => ({ ...prev, [field]: value }))
  }

  const handleSaveSettings = async () => {
    setSubmitting(true)
    try {
      const params = {}
      if (isCompanyAdmin) {
        if (settingsScope === 'location' && settingsLocationId) {
          params.locationId = settingsLocationId
        }
      } else if (selectedLocationId) {
        params.locationId = selectedLocationId
      }
      await dispatch(updateSettings({ params, data: settingsData }))
    } finally {
      setSubmitting(false)
    }
  }

  const handleResetLocationSettings = () => {
    const locId = isCompanyAdmin ? settingsLocationId : selectedLocationId
    if (!locId) return
    dispatch(resetLocationSettings({ locationId: locId }))
  }

  useEffect(() => {
    const empParams = { _limit: 500 }
    if (selectedLocationId) empParams.location_id = selectedLocationId
    dispatch(getEmployeeList(empParams))
  }, [dispatch, selectedLocationId])

  const loadList = useCallback(() => {
    const params = { _limit: limit, _offset: page * limit }
    if (filters._startDate) params._startDate = filters._startDate
    if (filters._endDate) params._endDate = filters._endDate
    if (filters._userId) params._userId = filters._userId
    if (filters._status) params._status = filters._status
    if (selectedLocationId) params._locationId = selectedLocationId
    dispatch(getAttendanceList(params))
  }, [dispatch, page, filters, limit, selectedLocationId])

  useEffect(() => { if (activeTab === 'list') loadList() }, [activeTab, loadList])

  useEffect(() => {
    if (store.actionFlag === 'MANUAL_ENTRY') {
      Notification('Success', 'Attendance entry saved.', 'success')
      setManualModal(false)
      setManualData({ user_id: '', date: todayStr(), clock_in: '', clock_out: '', status: '', notes: '' })
      loadList()
    }
    if (store.actionFlag === 'DELETE_RECORD') {
      Notification('Success', 'Record deleted.', 'success')
      loadList()
    }
    if (store.actionFlag === 'UPDATE_SETTINGS') {
      Notification('Success', 'Attendance settings updated.', 'success')
    }
    if (store.actionFlag === 'RESET_LOCATION_SETTINGS') {
      Notification('Success', 'Location settings reset to company defaults.', 'success')
    }
    if (store.actionFlag === 'UPDATE_RECORD') {
      Notification('Success', 'Record updated.', 'success')
      setEditModal(false)
      setEditData(null)
      loadList()
    }
    if (store.error) Notification('Error', store.error, 'warning')
    if (store.actionFlag) dispatch(clearAttendanceActionFlag())
  }, [store.actionFlag, store.error, dispatch, loadList])

  const handleManualSubmit = async () => {
    setSubmitting(true)
    try {
      const payload = { ...manualData }
      if (!payload.clock_in) delete payload.clock_in
      if (!payload.clock_out) delete payload.clock_out
      if (!payload.status) delete payload.status
      if (!payload.notes) delete payload.notes
      await dispatch(createManualEntry(payload))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = (id) => dispatch(deleteRecord(id))

  const handleEditOpen = (r) => {
    // Convert UTC clock times to location timezone for the edit form
    const toLocalTime = (isoStr) => {
      if (!isoStr) return ''
      const tz = locationTimezone || 'UTC'
      try {
        return new Date(isoStr).toLocaleTimeString('en-GB', { timeZone: tz, hour: '2-digit', minute: '2-digit', hour12: false })
      } catch {
        return new Date(isoStr).toISOString().slice(11, 16)
      }
    }
    setEditData({
      _id: r._id,
      user_name: r.user_name || '',
      date: r.date || '',
      clock_in: toLocalTime(r.clock_in),
      clock_out: toLocalTime(r.clock_out),
      break_minutes: r.break_minutes ?? 0,
      status: r.status || 'present',
      is_late: r.is_late || false,
      is_early_leave: r.is_early_leave || false,
      notes: r.notes || '',
    })
    setEditModal(true)
  }

  const handleEditSave = async () => {
    if (!editData?._id) return
    setSubmitting(true)
    try {
      const payload = {
        status: editData.status,
        break_minutes: +editData.break_minutes || 0,
        is_late: editData.is_late,
        is_early_leave: editData.is_early_leave,
        notes: editData.notes,
      }
      if (editData.clock_in) payload.clock_in = editData.clock_in
      if (editData.clock_out) payload.clock_out = editData.clock_out
      await dispatch(updateRecord({ id: editData._id, data: payload }))
    } finally {
      setSubmitting(false)
    }
  }

  const loadDailyReport = useCallback(() => {
    const params = { date: reportDate }
    if (selectedLocationId) params.locationId = selectedLocationId
    dispatch(getDailyReport(params))
  }, [dispatch, reportDate, selectedLocationId])

  useEffect(() => { if (activeTab === 'daily') loadDailyReport() }, [activeTab, loadDailyReport])

  const loadMonthlyReport = useCallback(() => {
    const params = { year: reportYear, month: reportMonth }
    if (reportUserId) params.userId = reportUserId
    if (selectedLocationId) params.locationId = selectedLocationId
    dispatch(getMonthlyReport(params))
  }, [dispatch, reportYear, reportMonth, reportUserId, selectedLocationId])

  const loadAnnualReport = useCallback(() => {
    if (!reportUserId) return
    dispatch(getAnnualReport({ year: reportYear, userId: reportUserId }))
  }, [dispatch, reportYear, reportUserId])

  // Auto-load report when tab is active
  useEffect(() => {
    if (activeTab === 'monthly') {
      if (reportView === 'annual') loadAnnualReport()
      else loadMonthlyReport()
    }
  }, [activeTab, reportView, loadMonthlyReport, loadAnnualReport])

  const employees = employeeStore?.employeeItems || []
  const employeeMap = {}
  employees.forEach((e) => { employeeMap[e._id] = e })
  const employeeOptions = employees.map((e) => ({
    value: e._id,
    label: `${e.first_name || e.firstName} ${e.last_name || e.lastName}`,
  }))

  // Auto-select first employee when switching to annual view
  useEffect(() => {
    if (reportView === 'annual' && !reportUserId && employees.length > 0) {
      setReportUserId(employees[0]._id)
    }
  }, [reportView, employees])

  // ── Column definitions ──────────────────────────────────────────────────────

  const listColumns = [
    {
      name: 'Date',
      minWidth: '120px',
      cell: (r) => <span className='fw-semibold text-body'>{formatDate(r.date)}</span>,
    },
    {
      name: 'Employee',
      minWidth: '220px',
      cell: (r) => (
        <div>
          <div className='fw-semibold text-body'>{r.user_name || r.user_id?.substring(0, 8)}</div>
          {r.user_email && <div className='small text-muted'>{r.user_email}</div>}
        </div>
      ),
    },
    {
      name: 'Clock In',
      minWidth: '120px',
      center: true,
      cell: (r) => formatClockTime(r.clock_in, locationTimezone) || '—',
    },
    {
      name: 'Clock Out',
      minWidth: '120px',
      center: true,
      cell: (r) => formatClockTime(r.clock_out, locationTimezone) || '—',
    },
    {
      name: 'Hours',
      minWidth: '100px',
      center: true,
      cell: (r) => formatHours(r.total_hours),
    },
    {
      name: 'OT',
      minWidth: '90px',
      center: true,
      cell: (r) => formatHours(r.overtime_hours || 0),
    },
    {
      name: 'Break',
      minWidth: '90px',
      center: true,
      cell: (r) => r.break_minutes ? <span>{r.break_minutes}m</span> : <span className='text-muted'>0m</span>,
    },
    {
      name: 'Status',
      minWidth: '200px',
      center: true,
      cell: (r) => (
          <div className='d-flex gap-25 flex-wrap justify-content-center align-items-center'>
            <span className={`doc-badge ${STATUS_BADGE[r.status] || 'doc-badge-gray'}`}>
              {(r.status?.replace(/_/g, ' ') || '—').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
            {r.is_late && <span className="doc-badge doc-badge-red" style={{ fontSize: '0.6rem' }}>Late</span>}
            {r.is_early_leave && <span className="doc-badge doc-badge-orange" style={{ fontSize: '0.6rem' }}>Early</span>}
            {r.overtime_hours > 0 && <span className="doc-badge doc-badge-gray" style={{ fontSize: '0.6rem' }}>OT</span>}
          </div>
        ),
    },
    ...(canWrite ? [{
      name: 'Actions',
      minWidth: '100px',
      center: true,
      cell: (r) => (
        <div className='d-flex gap-75 align-items-center'>
          <span id={`edit-att-${r._id}`} className='cursor-pointer' onClick={() => handleEditOpen(r)}>
            <Edit2 size={14} className='text-primary' />
          </span>
          <UncontrolledTooltip target={`edit-att-${r._id}`}>Edit</UncontrolledTooltip>
          <span id={`del-att-${r._id}`} className='cursor-pointer' onClick={() => handleDelete(r._id)}>
            <Trash2 size={14} className='text-danger' />
          </span>
          <UncontrolledTooltip target={`del-att-${r._id}`}>Delete</UncontrolledTooltip>
        </div>
      ),
    }] : []),
  ]

  const dailyColumns = [
    {
      name: 'Employee',
      minWidth: '220px',
      cell: (r) => {
        const emp = employeeMap[r.user_id]
        return (
          <div>
            <div className='fw-semibold text-body'>{r.user_name || (emp ? `${emp.first_name || emp.firstName} ${emp.last_name || emp.lastName}` : r.user_id?.substring(0, 8))}</div>
            {(r.user_email || emp?.email) && <div className='small text-muted'>{r.user_email || emp.email}</div>}
          </div>
        )
      },
    },
    { name: 'Clock In', minWidth: '120px', center: true, cell: (r) => formatClockTime(r.clock_in, locationTimezone) },
    { name: 'Clock Out', minWidth: '120px', center: true, cell: (r) => formatClockTime(r.clock_out, locationTimezone) },
    { name: 'Hours', minWidth: '100px', center: true, cell: (r) => formatHours(r.total_hours) },
    { name: 'OT', minWidth: '90px', center: true, cell: (r) => formatHours(r.overtime_hours || 0) },
    { name: 'Break', minWidth: '90px', center: true, cell: (r) => r.break_minutes ? `${r.break_minutes}m` : '0m' },
    {
      name: 'Status',
      minWidth: '200px',
      center: true,
      cell: (r) => (
          <div className='d-flex gap-25 flex-wrap justify-content-center align-items-center'>
            <span className={`doc-badge ${STATUS_BADGE[r.status] || 'doc-badge-gray'}`}>
              {(r.status?.replace(/_/g, ' ') || '—').replace(/\b\w/g, c => c.toUpperCase())}
            </span>
            {r.is_late && <span className="doc-badge doc-badge-red" style={{ fontSize: '0.6rem' }}>Late</span>}
            {r.is_early_leave && <span className="doc-badge doc-badge-orange" style={{ fontSize: '0.6rem' }}>Early</span>}
            {r.overtime_hours > 0 && <span className="doc-badge doc-badge-gray" style={{ fontSize: '0.6rem' }}>OT</span>}
          </div>
        ),
    },
  ]

  const monthlyColumns = [
    {
      name: 'Employee',
      minWidth: '220px',
      cell: (r) => {
        const emp = employeeMap[r.user_id]
        return (
          <div>
            <div className='fw-semibold text-body'>{r.user_name || (emp ? `${emp.first_name || emp.firstName} ${emp.last_name || emp.lastName}` : r.user_id?.substring(0, 8))}</div>
            {(r.user_email || emp?.email) && <div className='small text-muted'>{r.user_email || emp.email}</div>}
          </div>
        )
      },
    },
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

  return (
    <Fragment>
      <SetupReturnBanner />
      {/* ── Page Header ── */}
      <div className='d-flex align-items-center justify-content-between mb-2'>
        <h3 className='mb-0'>
          <Clock size={18} className='me-1' />
          Attendance Management
        </h3>
      </div>

      {/* ── Tabs ── */}
      <Card className='mb-0'>
        <CardBody className='pb-0 pt-50'>
          <Nav tabs className='mb-0'>
            <NavItem>
              <NavLink active={activeTab === 'daily'} onClick={() => setActiveTab('daily')} style={{ cursor: 'pointer' }}>
                <Calendar size={14} className='me-50' />Daily Report
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeTab === 'list'} onClick={() => setActiveTab('list')} style={{ cursor: 'pointer' }}>
                <List size={14} className='me-50' />Records
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={activeTab === 'monthly'} onClick={() => setActiveTab('monthly')} style={{ cursor: 'pointer' }}>
                <BarChart2 size={14} className='me-50' />Monthly Report
              </NavLink>
            </NavItem>
            {canWrite && (
              <NavItem>
                <NavLink active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} style={{ cursor: 'pointer' }}>
                  <Settings size={14} className='me-50' />Settings
                </NavLink>
              </NavItem>
            )}
          </Nav>
        </CardBody>
      </Card>

      <TabContent activeTab={activeTab} className='mt-2'>

        {/* ── DAILY REPORT TAB ── */}
        <TabPane tabId='daily'>
          <Card className='mb-1'>
            <CardBody className='py-1'>
              <Row className='g-2 align-items-end'>
                <Col md={3}>
                  <Label className='form-label small mb-25'>Date</Label>
                  <DateInput value={reportDate} onChange={(dates, str, iso) => setReportDate(iso)} id='reportDate' />
                </Col>
                <Col md={2}>
                  <Button color='primary' size='sm' onClick={loadDailyReport}>Load Report</Button>
                </Col>
              </Row>
            </CardBody>
          </Card>

          {/* Daily Summary Cards */}
          {store.dailyReport?.length > 0 && (() => {
            const dr = store.dailyReport
            const totalEmp = dr.length
            const present = dr.filter(r => ['present', 'late'].includes(r.status)).length
            const absent = dr.filter(r => r.status === 'absent').length
            const late = dr.filter(r => r.is_late).length
            const earlyLeave = dr.filter(r => r.is_early_leave).length
            const onLeave = dr.filter(r => r.status === 'on_leave').length
            return (
              <Row className='mb-1'>
                <Col><Card className='mb-0 py-75 px-1 text-center'><div className='small text-muted'>Total</div><h4 className='mb-0'>{totalEmp}</h4></Card></Col>
                <Col><Card className='mb-0 py-75 px-1 text-center'><div className='small text-success'>Present</div><h4 className='mb-0 text-success'>{present}</h4></Card></Col>
                <Col><Card className='mb-0 py-75 px-1 text-center'><div className='small text-danger'>Absent</div><h4 className='mb-0 text-danger'>{absent}</h4></Card></Col>
                <Col><Card className='mb-0 py-75 px-1 text-center'><div className='small text-warning'>Late</div><h4 className='mb-0 text-warning'>{late}</h4></Card></Col>
                <Col><Card className='mb-0 py-75 px-1 text-center'><div className='small text-info'>Early Leave</div><h4 className='mb-0 text-info'>{earlyLeave}</h4></Card></Col>
                <Col><Card className='mb-0 py-75 px-1 text-center'><div className='small text-primary'>On Leave</div><h4 className='mb-0 text-primary'>{onLeave}</h4></Card></Col>
              </Row>
            )
          })()}

          <Card>
            <CardHeader className='border-bottom py-1'>
              <CardTitle tag='h5' className='mb-0'>
                <BarChart2 size={15} className='me-75' />
                Daily Report — {reportDate}
              </CardTitle>
            </CardHeader>
            <CardBody>
              <DatatablePagination
                columns={dailyColumns}
                data={store.dailyReport}
                loading={store.loading}
                disablePagination
              />
            </CardBody>
          </Card>
        </TabPane>

        {/* ── RECORDS TAB ── */}
        <TabPane tabId='list'>
          {/* Filter bar */}
          <Card className='mb-1'>
            <CardBody className='py-1'>
              <Row className='g-2 align-items-end'>
                <Col md={2}>
                  <Label className='form-label small mb-25'>Start Date</Label>
                  <DateInput value={filters._startDate} onChange={(dates, str, iso) => setFilters(f => ({ ...f, _startDate: iso }))} id='filterStartDate' />
                </Col>
                <Col md={2}>
                  <Label className='form-label small mb-25'>End Date</Label>
                  <DateInput value={filters._endDate} onChange={(dates, str, iso) => setFilters(f => ({ ...f, _endDate: iso }))} id='filterEndDate' />
                </Col>
                <Col md={3}>
                  <Label className='form-label small mb-25'>Employee</Label>
                  <Input type='select' bsSize='sm' value={filters._userId}
                    onChange={(e) => setFilters(f => ({ ...f, _userId: e.target.value }))}>
                    <option value=''>All Employees</option>
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.first_name || emp.firstName} {emp.last_name || emp.lastName}</option>
                    ))}
                  </Input>
                </Col>
                <Col md={2}>
                  <Label className='form-label small mb-25'>Status</Label>
                  <Input type='select' bsSize='sm' value={filters._status}
                    onChange={(e) => setFilters(f => ({ ...f, _status: e.target.value }))}>
                    <option value=''>All Statuses</option>
                    <option value='present'>Present</option>
                    <option value='absent'>Absent</option>
                    <option value='half_day'>Half Day</option>
                    <option value='on_leave'>On Leave</option>
                    <option value='holiday'>Holiday</option>
                  </Input>
                </Col>
                <Col md={3} className='d-flex gap-50'>
                  <Button color='primary' size='sm' onClick={() => { setPage(0); loadList() }}>Search</Button>
                  <Button color='secondary' outline size='sm' onClick={() => {
                    setFilters({ _startDate: '', _endDate: '', _userId: '', _status: '' })
                    setPage(0)
                  }}>Clear</Button>
                </Col>
              </Row>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className='border-bottom py-1 d-flex align-items-center justify-content-between flex-wrap gap-1'>
              <CardTitle tag='h5' className='mb-0'>Attendance Records</CardTitle>
              <div className='d-flex gap-1'>
                <Button color='outline-secondary' size='sm' onClick={handleExport}>
                  <Download size={14} className='me-50' />Export
                </Button>
                {canWrite && (
                  <Button color='outline-secondary' size='sm' onClick={() => setImportModal(true)}>
                    <Upload size={14} className='me-50' />Import
                  </Button>
                )}
                {canWrite && (
                  <Button color='primary' size='sm' onClick={() => setManualModal(true)}>
                    <Plus size={14} className='me-25' />Manual Entry
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <DatatablePagination
                columns={listColumns}
                data={store.attendanceList}
                pagination={{ total: store.attendanceTotal, perPage: limit }}
                currentPage={page + 1}
                handlePagination={(p) => setPage(p)}
                rowsPerPage={limit}
                handleRowPerPage={(rows) => { setLimit(Number(rows)); setPage(0) }}
                loading={store.loading}
              />
            </CardBody>
          </Card>
        </TabPane>

        {/* ── MONTHLY/ANNUAL REPORT TAB ── */}
        <TabPane tabId='monthly'>
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
                <Col md={3}>
                  <Label className='form-label small mb-25'>Employee {reportView === 'annual' ? <span className='text-danger'>*</span> : '(optional)'}</Label>
                  <Input type='select' bsSize='sm' value={reportUserId} onChange={(e) => setReportUserId(e.target.value)}>
                    {reportView === 'monthly' && <option value=''>All Employees</option>}
                    {employees.map(emp => (
                      <option key={emp._id} value={emp._id}>{emp.first_name || emp.firstName} {emp.last_name || emp.lastName}</option>
                    ))}
                  </Input>
                </Col>
                <Col md={2}>
                  <Button color='primary' size='sm' onClick={reportView === 'annual' ? loadAnnualReport : loadMonthlyReport}
                    disabled={reportView === 'annual' && !reportUserId}>
                    Load Report
                  </Button>
                </Col>
              </Row>
            </CardBody>
          </Card>

          <Card>
            <CardHeader className='border-bottom py-1'>
              <CardTitle tag='h5' className='mb-0'>
                <BarChart2 size={15} className='me-75' />
                {reportView === 'annual'
                  ? `Annual Report — ${reportYear}`
                  : `Monthly Report — ${MONTHS[reportMonth - 1]} ${reportYear}`
                }
              </CardTitle>
            </CardHeader>
            <CardBody>
              {reportView === 'annual' ? (
                !reportUserId ? (
                  <div className='text-center text-muted py-3'>Please select an employee for annual report</div>
                ) : (
                  <DatatablePagination
                    columns={[
                      { name: 'Month', minWidth: '120px', cell: (r) => <span className="fw-semibold">{r.month_name}</span> },
                      ...monthlyColumns.filter(c => c.name !== 'Employee'),
                    ]}
                    data={store.annualReport}
                    loading={store.loading}
                    disablePagination
                  />
                )
              ) : (
                <DatatablePagination
                  columns={monthlyColumns}
                  data={store.monthlyReport}
                  loading={store.loading}
                  disablePagination
                />
              )}
            </CardBody>
          </Card>
        </TabPane>

        {/* ── SETTINGS TAB ── */}
        <TabPane tabId='settings'>
          {!store.loading && activeTab === 'settings' ? (
            <div className='text-center py-3'><Spinner size='sm' /> Loading settings...</div>
          ) : (
            <>
              {/* Scope Selector — Company Admin only */}
              {isCompanyAdmin && (
                <Card className='mb-1'>
                  <CardBody className='py-1'>
                    <Row className='g-2 align-items-center'>
                      <Col md='auto'>
                        <Label className='form-label small mb-0 me-1'>Settings Scope:</Label>
                      </Col>
                      <Col md='auto'>
                        <ButtonGroup size='sm'>
                          <Button
                            color={settingsScope === 'company' ? 'primary' : 'outline-primary'}
                            onClick={() => { setSettingsScope('company'); setSettingsLocationId('') }}
                          >
                            Company Default
                          </Button>
                          <Button
                            color={settingsScope === 'location' ? 'primary' : 'outline-primary'}
                            onClick={() => setSettingsScope('location')}
                          >
                            By Location
                          </Button>
                        </ButtonGroup>
                      </Col>
                      {settingsScope === 'location' && (
                        <Col md={4}>
                          <Select
                            options={companyLocations.map(loc => ({ value: loc._id, label: loc.location_name || loc.name }))}
                            value={companyLocations.map(loc => ({ value: loc._id, label: loc.location_name || loc.name })).find(o => o.value === settingsLocationId) || null}
                            onChange={(opt) => setSettingsLocationId(opt?.value || '')}
                            placeholder='Select a location...'
                            isClearable
                            styles={{
                              control: (base) => ({ ...base, minHeight: '32px', fontSize: '0.875rem' }),
                              valueContainer: (base) => ({ ...base, padding: '0 8px' }),
                              input: (base) => ({ ...base, margin: 0, padding: 0, color: '#000' }),
                              singleValue: (base) => ({ ...base, color: '#000' }),
                              option: (base) => ({ ...base, color: '#000' }),
                              indicatorsContainer: (base) => ({ ...base, height: '32px' }),
                              dropdownIndicator: (base) => ({ ...base, padding: '4px' }),
                              clearIndicator: (base) => ({ ...base, padding: '4px' }),
                            }}
                          />
                        </Col>
                      )}
                    </Row>
                  </CardBody>
                </Card>
              )}

              {/* Info Banners */}
              {isCompanyAdmin && settingsScope === 'company' && (
                <Alert color='info' className='d-flex align-items-center mb-1'>
                  <Info size={16} className='me-75' />
                  These settings apply to all locations without custom overrides.
                </Alert>
              )}

              {isCompanyAdmin && settingsScope === 'location' && !settingsLocationId && (
                <Alert color='secondary' className='mb-1'>
                  Select a location above to view or customize its settings.
                </Alert>
              )}

              {settingsScope === 'location' && settingsLocationId && store.settingsInherited && (
                <Alert color='info' className='d-flex align-items-center mb-1'>
                  <Info size={16} className='me-75' />
                  Inherited from company defaults. Save to create custom settings for this location.
                </Alert>
              )}

              {settingsScope === 'location' && settingsLocationId && !store.settingsInherited && (
                <Alert color='warning' className='d-flex align-items-center justify-content-between mb-1'>
                  <span>
                    <Info size={16} className='me-75' />
                    <Badge color='warning' className='me-75'>Location Override</Badge>
                    This location has custom settings.
                  </span>
                  <Button color='outline-warning' size='sm' onClick={handleResetLocationSettings}>
                    <RotateCcw size={14} className='me-50' />Reset to Company Defaults
                  </Button>
                </Alert>
              )}

              {/* Location Admin banners */}
              {isLocationAdmin && store.settingsInherited && (
                <Alert color='info' className='d-flex align-items-center mb-1'>
                  <Info size={16} className='me-75' />
                  Using company defaults. Save to customize for this location.
                </Alert>
              )}

              {isLocationAdmin && !store.settingsInherited && store.settings && (
                <Alert color='warning' className='d-flex align-items-center justify-content-between mb-1'>
                  <span>
                    <Info size={16} className='me-75' />
                    <Badge color='warning' className='me-75'>Custom Settings</Badge>
                    This location has custom attendance settings.
                  </span>
                  <Button color='outline-warning' size='sm' onClick={handleResetLocationSettings}>
                    <RotateCcw size={14} className='me-50' />Reset to Company Defaults
                  </Button>
                </Alert>
              )}

              {/* Hide form when Company Admin picks "By Location" but hasn't selected a location */}
              {(settingsScope !== 'location' || settingsLocationId || !isCompanyAdmin) && (<>
              <Row>
                {/* Section 1: Time & Thresholds */}
                <Col md={6}>
                  <Card>
                    <CardHeader className='border-bottom py-1'>
                      <CardTitle tag='h5' className='mb-0'>Time & Thresholds</CardTitle>
                    </CardHeader>
                    <CardBody>
                      <FormGroup>
                        <Label className='form-label'>Late Threshold (minutes)</Label>
                        <Input type='number' min={0} value={settingsData.late_threshold_minutes}
                          onChange={(e) => handleSettingsChange('late_threshold_minutes', +e.target.value)} />
                      </FormGroup>
                      <FormGroup className='mb-0'>
                        <Label className='form-label'>Early Leave Threshold (minutes)</Label>
                        <Input type='number' min={0} value={settingsData.early_leave_threshold_minutes}
                          onChange={(e) => handleSettingsChange('early_leave_threshold_minutes', +e.target.value)} />
                      </FormGroup>
                    </CardBody>
                  </Card>
                </Col>

                {/* Section 2: Overtime — HIDDEN per ops request 2026-05-26.
                    DB flag overtime_enabled = false at hide time; BE OT logic is a no-op.
                    Restore by removing the `false && (` wrapper + closing `)}`. */}
                {false && (
                <Col md={6}>
                  <Card>
                    <CardHeader className='border-bottom py-1'>
                      <CardTitle tag='h5' className='mb-0'>Overtime</CardTitle>
                    </CardHeader>
                    <CardBody>
                      <FormGroup className='d-flex align-items-center justify-content-between'>
                        <Label className='form-label mb-0'>Enable Overtime</Label>
                        <Input type='switch' checked={settingsData.overtime_enabled}
                          onChange={(e) => handleSettingsChange('overtime_enabled', e.target.checked)} />
                      </FormGroup>
                      {settingsData.overtime_enabled && (
                        <>
                          <FormGroup>
                            <Label className='form-label'>Overtime After (hours)</Label>
                            <Input type='number' min={0} step={0.5} value={settingsData.overtime_threshold_hours}
                              onChange={(e) => handleSettingsChange('overtime_threshold_hours', +e.target.value)} />
                          </FormGroup>
                          <FormGroup className='mb-0'>
                            <Label className='form-label'>Overtime Multiplier</Label>
                            <Input type='number' min={1} step={0.1} value={settingsData.overtime_multiplier}
                              onChange={(e) => handleSettingsChange('overtime_multiplier', +e.target.value)} />
                          </FormGroup>
                        </>
                      )}
                    </CardBody>
                  </Card>
                </Col>
                )}

                {/* Section 3: Break & Auto Clock-Out */}
                <Col md={6}>
                  <Card>
                    <CardHeader className='border-bottom py-1'>
                      <CardTitle tag='h5' className='mb-0'>Break & Auto Clock-Out</CardTitle>
                    </CardHeader>
                    <CardBody>
                      <FormGroup className='d-flex align-items-center justify-content-between'>
                        <Label className='form-label mb-0'>Enable Break Tracking</Label>
                        <Input type='switch' checked={settingsData.break_tracking_enabled}
                          onChange={(e) => handleSettingsChange('break_tracking_enabled', e.target.checked)} />
                      </FormGroup>
                      <hr className='my-1' />
                      <FormGroup className='d-flex align-items-center justify-content-between'>
                        <Label className='form-label mb-0'>Enable Auto Clock-Out</Label>
                        <Input type='switch' checked={settingsData.auto_clock_out_enabled}
                          onChange={(e) => handleSettingsChange('auto_clock_out_enabled', e.target.checked)} />
                      </FormGroup>
                      {settingsData.auto_clock_out_enabled && (
                        <FormGroup className='mb-0'>
                          <Label className='form-label'>Auto Clock-Out Time</Label>
                          <Input type='time' value={settingsData.auto_clock_out_time}
                            onChange={(e) => handleSettingsChange('auto_clock_out_time', e.target.value)} />
                        </FormGroup>
                      )}
                    </CardBody>
                  </Card>
                </Col>

                {/* Section 4: Verification — HIDDEN per ops request 2026-05-26.
                    DB flags face_capture_enabled + gps_enabled = false at hide time;
                    BE face/GPS checks are no-ops. Restore by removing the
                    `false && (` wrapper + closing `)}`. */}
                {false && (
                <Col md={6}>
                  <Card>
                    <CardHeader className='border-bottom py-1'>
                      <CardTitle tag='h5' className='mb-0'>Verification</CardTitle>
                    </CardHeader>
                    <CardBody>
                      <FormGroup className='d-flex align-items-center justify-content-between'>
                        <Label className='form-label mb-0'>Enable Face Capture</Label>
                        <Input type='switch' checked={settingsData.face_capture_enabled}
                          onChange={(e) => handleSettingsChange('face_capture_enabled', e.target.checked)} />
                      </FormGroup>
                      {settingsData.face_capture_enabled && (
                        <FormGroup>
                          <Label className='form-label'>Face Match Sensitivity</Label>
                          <Input type='select' value={settingsData.face_match_threshold || 0.6}
                            onChange={(e) => handleSettingsChange('face_match_threshold', +e.target.value)}>
                            <option value={0.45}>Strict (0.45)</option>
                            <option value={0.6}>Normal (0.6)</option>
                            <option value={0.75}>Lenient (0.75)</option>
                          </Input>
                          <small className='text-muted'>
                            Controls how strictly faces must match. Strict = fewer false matches, Lenient = more tolerance for variations.
                          </small>
                        </FormGroup>
                      )}
                      <hr className='my-1' />
                      <FormGroup className='d-flex align-items-center justify-content-between'>
                        <Label className='form-label mb-0'>Enable GPS Tracking</Label>
                        <Input type='switch' checked={settingsData.gps_enabled}
                          onChange={(e) => handleSettingsChange('gps_enabled', e.target.checked)} />
                      </FormGroup>
                      {settingsData.gps_enabled && (
                        <>
                          <p className='text-muted small mb-1'>
                            If geofence coordinates are not set below, the location's GPS coordinates will be used automatically.
                          </p>
                          <FormGroup>
                            <Label className='form-label'>Geofence Radius (meters)</Label>
                            <Input type='number' min={0} value={settingsData.geofence_radius_meters}
                              onChange={(e) => handleSettingsChange('geofence_radius_meters', +e.target.value)} />
                          </FormGroup>
                          <Row>
                            <Col md={6}>
                              <FormGroup className='mb-0'>
                                <Label className='form-label'>Geofence Latitude (override)</Label>
                                <Input type='number' step='any' value={settingsData.geofence_lat}
                                  onChange={(e) => handleSettingsChange('geofence_lat', +e.target.value)} />
                              </FormGroup>
                            </Col>
                            <Col md={6}>
                              <FormGroup className='mb-0'>
                                <Label className='form-label'>Geofence Longitude (override)</Label>
                                <Input type='number' step='any' value={settingsData.geofence_lng}
                                  onChange={(e) => handleSettingsChange('geofence_lng', +e.target.value)} />
                              </FormGroup>
                            </Col>
                          </Row>
                        </>
                      )}
                    </CardBody>
                  </Card>
                </Col>
                )}
              </Row>

              <div className='d-flex justify-content-end'>
                <Button color='primary' onClick={handleSaveSettings} disabled={!store.loading}>
                  {!store.loading ? <><Spinner size='sm' className='me-50' />Saving...</> : 'Save Settings'}
                </Button>
              </div>
              </>)}
            </>
          )}
        </TabPane>

      </TabContent>

      {/* ── Manual Entry Modal ── */}
      <Modal isOpen={manualModal} toggle={() => setManualModal(false)} centered modalClassName='modal-lg'>
        <ModalHeader toggle={() => setManualModal(false)} style={{ backgroundColor: '#09418B', padding: '1.25rem 1.5rem' }} close={<button type='button' className='btn-close btn-close-white' aria-label='Close' onClick={() => setManualModal(false)} />}><span style={{ color: '#fff', fontSize: '1.15rem' }}>Manual Attendance Entry</span></ModalHeader>
        <ModalBody className='py-3'>
          <FormGroup>
            <Label>Employee <span className='text-danger'>*</span></Label>
            <Select
              options={employeeOptions}
              value={employeeOptions.find(o => o.value === manualData.user_id) || null}
              onChange={(opt) => setManualData(d => ({ ...d, user_id: opt?.value || '' }))}
              placeholder='Search employee...'
              isClearable
            />
          </FormGroup>
          <FormGroup>
            <Label>Date <span className='text-danger'>*</span></Label>
            <DateInput value={manualData.date} onChange={(dates, str, iso) => setManualData(d => ({ ...d, date: iso }))} id='manualDate' />
          </FormGroup>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>Clock In</Label>
                <Input type='time' value={manualData.clock_in}
                  onChange={(e) => setManualData(d => ({ ...d, clock_in: e.target.value }))} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>Clock Out</Label>
                <Input type='time' value={manualData.clock_out}
                  onChange={(e) => setManualData(d => ({ ...d, clock_out: e.target.value }))} />
              </FormGroup>
            </Col>
          </Row>
          <FormGroup>
            <Label>Status</Label>
            <Input type='select' value={manualData.status} onChange={(e) => setManualData(d => ({ ...d, status: e.target.value }))}>
              <option value=''>Auto-calculate</option>
              <option value='present'>Present</option>
              <option value='absent'>Absent</option>
              <option value='half_day'>Half Day</option>
              <option value='on_leave'>On Leave</option>
              <option value='holiday'>Holiday</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>Notes</Label>
            <Input type='textarea' rows={2} value={manualData.notes}
              onChange={(e) => setManualData(d => ({ ...d, notes: e.target.value }))} />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' outline onClick={() => setManualModal(false)}>Cancel</Button>
          <Button color='primary' onClick={handleManualSubmit} disabled={!store.loading || !manualData.user_id || !manualData.date}>
            {!store.loading ? <Spinner size='sm' /> : 'Save Entry'}
          </Button>
        </ModalFooter>
      </Modal>

      <AttendanceImportModal
        isOpen={importModal}
        toggle={() => setImportModal(false)}
        onSuccess={() => loadList()}
      />

      {/* ── Edit Record Modal ── */}
      <Modal isOpen={editModal} backdrop='static' keyboard={false} className='modal-dialog-centered'>
        <ModalHeader toggle={() => { setEditModal(false); setEditData(null) }}>
          Edit Record {editData?.user_name ? `— ${editData.user_name}` : ''} {editData?.date ? `(${editData.date})` : ''}
        </ModalHeader>
        <ModalBody>
          {editData && (
            <Row className='g-1'>
              <Col md={6}>
                <Label className='form-label small mb-25'>Clock In</Label>
                <Input type='time' bsSize='sm' value={editData.clock_in}
                  onChange={(e) => setEditData(prev => ({ ...prev, clock_in: e.target.value }))} />
              </Col>
              <Col md={6}>
                <Label className='form-label small mb-25'>Clock Out</Label>
                <Input type='time' bsSize='sm' value={editData.clock_out}
                  onChange={(e) => setEditData(prev => ({ ...prev, clock_out: e.target.value }))} />
              </Col>
              <Col md={6}>
                <Label className='form-label small mb-25'>Break (minutes)</Label>
                <Input type='number' bsSize='sm' value={editData.break_minutes}
                  onChange={(e) => setEditData(prev => ({ ...prev, break_minutes: e.target.value }))} />
              </Col>
              <Col md={6}>
                <Label className='form-label small mb-25'>Status</Label>
                <Input type='select' bsSize='sm' value={editData.status}
                  onChange={(e) => setEditData(prev => ({ ...prev, status: e.target.value }))}>
                  <option value='present'>Present</option>
                  <option value='absent'>Absent</option>
                  <option value='half_day'>Half Day</option>
                  <option value='on_leave'>On Leave</option>
                  <option value='holiday'>Holiday</option>
                </Input>
              </Col>
              <Col md={6}>
                <div className='form-check mt-1'>
                  <Input type='checkbox' id='edit-is-late' checked={editData.is_late}
                    onChange={(e) => setEditData(prev => ({ ...prev, is_late: e.target.checked }))} />
                  <Label className='form-check-label' for='edit-is-late'>Late</Label>
                </div>
              </Col>
              <Col md={6}>
                <div className='form-check mt-1'>
                  <Input type='checkbox' id='edit-is-early' checked={editData.is_early_leave}
                    onChange={(e) => setEditData(prev => ({ ...prev, is_early_leave: e.target.checked }))} />
                  <Label className='form-check-label' for='edit-is-early'>Early Leave</Label>
                </div>
              </Col>
              <Col md={12}>
                <Label className='form-label small mb-25'>Notes</Label>
                <Input type='textarea' bsSize='sm' rows={2} value={editData.notes}
                  onChange={(e) => setEditData(prev => ({ ...prev, notes: e.target.value }))} />
              </Col>
            </Row>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' outline onClick={() => { setEditModal(false); setEditData(null) }}>Cancel</Button>
          <Button color='primary' onClick={handleEditSave} disabled={!store.loading}>
            {!store.loading ? <Spinner size='sm' /> : 'Update'}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  )
}

export default AttendanceAdminPage
