import React, { Fragment, useEffect, useState, useCallback } from 'react'
import useFormLoading from '@src/hooks/useFormLoading'
import DateInput from '@components/date-input'
import { useDispatch, useSelector } from 'react-redux'
import {
  Card, CardBody, CardHeader, CardTitle,
  Button, Badge, Row, Col, Spinner,
  Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Input,
  Nav, NavItem, NavLink, TabContent, TabPane, UncontrolledTooltip,
} from 'reactstrap'
import { Shield, AlertTriangle, CheckCircle, Clock, FileText, Plus, Trash2, Edit2 } from 'react-feather'
import { useTranslation } from 'react-i18next'
import Select from 'react-select'
import Notification from '@components/toast/notification'
import DatatablePagination from '@components/datatable/DatatablePagination'
import { defaultPerPageRow } from '@constant/defaultValues'
import {
  getDashboard,
  getImmigrationList, createImmigration, updateImmigration, deleteImmigration,
  getRtwList, createRtwCheck, updateRtwCheck, deleteRtwCheck,
  getEventList, createEvent, updateEvent, reportEvent, markEventNotApplicable, deleteEvent,
  getAuditLog, clearComplianceActionFlag,
  getComplianceSettings, updateComplianceSettings,
} from './store'
import { getEmployeeList } from '../employees/store'
import instance from '@src/utility/AxiosConfig'
import NotificationSettingsPanel from '@components/notification-settings'

// Auto-calculate visa expiry based on visa type
const VISA_DURATIONS = {
  skilled_worker: { years: 5 },
  student: { years: 3 },
  family: { months: 30 },
  visitor: { months: 6 },
  settlement: { years: 10 },
  british_citizen: null, // no expiry
  graduate: { years: 2 },
  health_care: { years: 3 },
  seasonal_worker: { months: 6 },
  other: { years: 2 },
}

const calcVisaExpiry = (startDate, visaType) => {
  if (!startDate || !visaType) return ''
  const duration = VISA_DURATIONS[visaType]
  if (!duration) return '' // no expiry (e.g. british_citizen)
  const d = new Date(startDate + 'T12:00:00Z')
  if (duration.years) d.setUTCFullYear(d.getUTCFullYear() + duration.years)
  if (duration.months) d.setUTCMonth(d.getUTCMonth() + duration.months)
  return d.toISOString().split('T')[0]
}

const STATUS_BADGE = {
  active: 'doc-badge-green',
  expiring: 'doc-badge-orange',
  expired: 'doc-badge-red',
  action_required: 'doc-badge-red',
  pending: 'doc-badge-orange',
  reported: 'doc-badge-green',
  overdue: 'doc-badge-red',
  not_applicable: 'doc-badge-gray',
  passed: 'doc-badge-green',
  failed: 'doc-badge-red',
  visa_holder: 'doc-badge-green',
  settled: 'doc-badge-green',
  revoked: 'doc-badge-red',
}

const StatusTag = ({ value }) => {
  if (!value) return <span className='text-muted'>—</span>
  const cls = STATUS_BADGE[value] || 'doc-badge-gray'
  return <span className={`doc-badge ${cls}`}>{value.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}</span>
}

const daysUntil = (dateStr) => {
  if (!dateStr) return null
  return Math.floor((new Date(dateStr) - new Date()) / 86400000)
}

const DaysChip = ({ date }) => {
  if (!date) return <span className='text-muted'>—</span>
  const days = daysUntil(date)
  const color = days < 0 ? 'light-danger' : days <= 30 ? 'light-danger' : days <= 90 ? 'light-warning' : 'light-success'
  return <Badge color={color}>{days < 0 ? `${Math.abs(days)}d overdue` : `${days}d`}</Badge>
}

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-GB') : '—'

const CompliancePage = () => {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const store = useSelector((s) => s.compliance)
  const employeeStore = useSelector((s) => s.employee)
  const authStore = useSelector((s) => s.auth)
  const locationCtx = useSelector((s) => s.locationContext)
  const { selectedLocationId } = locationCtx || {}
  const modulePerms = authStore?.authUserItem?.role?.permissions?.['compliance'] || {}
  const canWrite = !!(modulePerms.can_update || modulePerms.can_add)

  const [submitting, setSubmitting] = useState(false)
  useFormLoading(submitting)

  const [tab, setTab] = useState('dashboard')

  // Pagination state per tab
  const [immigPage, setImmigPage] = useState(0)
  const [immigPerPage, setImmigPerPage] = useState(defaultPerPageRow)
  const [rtwPage, setRtwPage] = useState(0)
  const [rtwPerPage, setRtwPerPage] = useState(defaultPerPageRow)
  const [eventPage, setEventPage] = useState(0)
  const [eventPerPage, setEventPerPage] = useState(defaultPerPageRow)
  const [auditPage, setAuditPage] = useState(0)
  const [auditPerPage, setAuditPerPage] = useState(defaultPerPageRow)

  // Employee filter (shared across tabs)
  const [empFilter, setEmpFilter] = useState(null)
  const filterByEmployee = (list) => {
    if (!empFilter) return list
    return (list || []).filter(r => r.user_id === empFilter.value)
  }

  // Immigration modal
  const [immigModal, setImmigModal] = useState(false)
  const [editImmig, setEditImmig] = useState(null)
  const [immigForm, setImmigForm] = useState({
    user_id: '', visa_type: '', immigration_status: 'visa_holder', brp_number: '',
    share_code: '', visa_start_date: '', visa_expiry_date: '', work_restriction: '',
    is_sponsored: false, cos_number: '', sponsor_license_number: '', notes: '',
  })

  // RTW modal
  const [rtwModal, setRtwModal] = useState(false)
  const [editRtw, setEditRtw] = useState(null)
  const [rtwForm, setRtwForm] = useState({
    user_id: '', check_type: 'manual', check_date: '', result: 'passed',
    valid_from: '', valid_until: '', share_code_used: '', follow_up_required: false,
    follow_up_date: '', notes: '',
  })

  // Event modal
  const [eventModal, setEventModal] = useState(false)
  const [editEvent, setEditEvent] = useState(null)
  const [eventForm, setEventForm] = useState({
    user_id: '', event_type: 'custom', event_date: '', description: '',
  })

  // Report modal
  const [reportModal, setReportModal] = useState(false)
  const [reportingEventId, setReportingEventId] = useState(null)
  const [refNumber, setRefNumber] = useState('')

  const employees = employeeStore?.employeeItems || []
  const employeeMap = {}
  employees.forEach((e) => { employeeMap[e._id] = e })
  const employeeOptions = employees.map(e => ({
    value: e._id,
    label: `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() + (e.employee_code ? ` (${e.employee_code})` : ''),
  }))

  const load = useCallback(() => {
    const locParams = selectedLocationId ? { location_id: selectedLocationId } : {}
    dispatch(getDashboard(locParams))
    if (tab === 'immigration') dispatch(getImmigrationList(locParams))
    else if (tab === 'rtw') dispatch(getRtwList(locParams))
    else if (tab === 'events') dispatch(getEventList(locParams))
    else if (tab === 'audit') dispatch(getAuditLog(locParams))
  }, [dispatch, tab, selectedLocationId])

  useEffect(() => { load() }, [load])

  // Load employees for dropdown in modals (filtered by location)
  useEffect(() => {
    const params = { perPage: 1000 }
    if (selectedLocationId) params.location_id = selectedLocationId
    dispatch(getEmployeeList(params))
  }, [dispatch, selectedLocationId])

  useEffect(() => {
    const successFlags = [
      'CREATE_IMMIGRATION', 'UPDATE_IMMIGRATION', 'DELETE_IMMIGRATION',
      'CREATE_RTW', 'UPDATE_RTW', 'DELETE_RTW',
      'CREATE_EVENT', 'UPDATE_EVENT', 'REPORT_EVENT', 'NOT_APPLICABLE_EVENT', 'DELETE_EVENT',
    ]
    if (successFlags.includes(store.actionFlag)) {
      Notification('Success', t('Action completed.'), 'success')
      setImmigModal(false); setRtwModal(false); setEventModal(false); setReportModal(false)
      setEditImmig(null); setEditRtw(null); setEditEvent(null)
      load()
    }
    if (store.error) Notification('Error', store.error, 'warning')
    if (store.actionFlag) dispatch(clearComplianceActionFlag())
  }, [store.actionFlag, store.error])

  const handleImmigSubmit = async () => {
    setSubmitting(true)
    try {
      if (editImmig) dispatch(updateImmigration({ id: editImmig._id, data: immigForm }))
      else dispatch(createImmigration(immigForm))
    } finally {
      setSubmitting(false)
    }
  }

  const openEditImmig = (r) => {
    setEditImmig(r)
    setImmigForm({
      user_id: r.user_id, visa_type: r.visa_type || '', immigration_status: r.immigration_status,
      brp_number: r.brp_number || '', share_code: r.share_code || '',
      visa_start_date: r.visa_start_date || '', visa_expiry_date: r.visa_expiry_date || '',
      work_restriction: r.work_restriction || '', is_sponsored: r.is_sponsored,
      cos_number: r.cos_number || '', sponsor_license_number: r.sponsor_license_number || '',
      notes: r.notes || '',
    })
    setImmigModal(true)
  }

  const openEditRtw = (r) => {
    setEditRtw(r)
    setRtwForm({
      user_id: r.user_id, check_type: r.check_type || 'manual', check_date: r.check_date || '',
      result: r.result || 'passed', valid_from: r.valid_from || '', valid_until: r.valid_until || '',
      share_code_used: r.share_code_used || '', follow_up_required: !!r.follow_up_required,
      follow_up_date: r.follow_up_date || '', notes: r.notes || '',
    })
    setRtwModal(true)
  }

  const openEditEvent = (r) => {
    setEditEvent(r)
    setEventForm({
      user_id: r.user_id, event_type: r.event_type || 'custom',
      event_date: r.event_date || '', description: r.description || '',
    })
    setEventModal(true)
  }

  const db = store.dashboard

  // ── DatatablePagination column definitions ──────────────────────────────────

  const immigrationColumns = [
    {
      name: t('Employee'),
      minWidth: '220px',
      cell: (r) => {
        const emp = employeeMap[r.user_id]
        return (
          <div>
            <div className='fw-semibold text-body'>{emp ? `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`.trim() : r.user_id?.substring(0, 8)}</div>
            {emp?.email && <div className='small text-muted'>{emp.email}</div>}
          </div>
        )
      },
    },
    {
      name: t('Visa / Status'),
      minWidth: '160px',
      cell: (r) => (
        <div className='d-flex flex-column py-1 gap-25'>
          <span className='fw-semibold text-capitalize'>{r.visa_type?.replace(/_/g, ' ') || '—'}</span>
          <StatusTag value={r.immigration_status} />
        </div>
      ),
    },
    {
      name: t('Status'),
      cell: (r) => <StatusTag value={r.status} />,
    },
    {
      name: t('Expiry'),
      cell: (r) => (
        <div className='d-flex flex-column py-1 gap-25'>
          <span>{fmtDate(r.visa_expiry_date)}</span>
          <DaysChip date={r.visa_expiry_date} />
        </div>
      ),
    },
    {
      name: t('Sponsored'),
      cell: (r) => r.is_sponsored
        ? <CheckCircle size={16} className='text-success' />
        : <span className='text-muted'>—</span>,
    },
    {
      name: t('Next RTW'),
      cell: (r) => fmtDate(r.next_rtw_check_date),
    },
    ...(canWrite ? [{
      name: t('Actions'),
      cell: (r) => (
        <div className='d-flex gap-75'>
          <span id={`immig-edit-${r._id}`} className='cursor-pointer' onClick={() => openEditImmig(r)}>
            <Edit2 size={16} className='text-primary' />
          </span>
          <UncontrolledTooltip target={`immig-edit-${r._id}`}>{t('Edit')}</UncontrolledTooltip>
          <span id={`immig-del-${r._id}`} className='cursor-pointer' onClick={() => dispatch(deleteImmigration(r._id))}>
            <Trash2 size={16} className='text-danger' />
          </span>
          <UncontrolledTooltip target={`immig-del-${r._id}`}>{t('Delete')}</UncontrolledTooltip>
        </div>
      ),
    }] : []),
  ]

  const rtwColumns = [
    {
      name: t('Employee'),
      minWidth: '220px',
      cell: (r) => {
        const emp = employeeMap[r.user_id]
        return (
          <div>
            <div className='fw-semibold text-body'>{emp ? `${emp.first_name || emp.firstName || ''} ${emp.last_name || emp.lastName || ''}`.trim() : r.user_id?.substring(0, 8)}</div>
            {emp?.email && <div className='small text-muted'>{emp.email}</div>}
          </div>
        )
      },
    },
    {
      name: t('Check Type'),
      cell: (r) => <Badge color='light-secondary'>{r.check_type?.replace(/_/g, ' ')}</Badge>,
    },
    {
      name: t('Date'),
      cell: (r) => fmtDate(r.check_date),
    },
    {
      name: t('Result'),
      cell: (r) => <StatusTag value={r.result} />,
    },
    {
      name: t('Valid Until'),
      cell: (r) => r.valid_until
        ? fmtDate(r.valid_until)
        : <span className='text-success small'>{t('Indefinite')}</span>,
    },
    {
      name: t('Follow-up'),
      cell: (r) => r.follow_up_required
        ? <Badge color={daysUntil(r.follow_up_date) <= 0 ? 'light-danger' : 'light-warning'}>{fmtDate(r.follow_up_date)}</Badge>
        : <span className='text-muted'>—</span>,
    },
    ...(canWrite ? [{
      name: t('Actions'),
      cell: (r) => (
        <div className='d-flex gap-75'>
          <span id={`rtw-edit-${r._id}`} className='cursor-pointer' onClick={() => openEditRtw(r)}>
            <Edit2 size={14} className='text-primary' />
          </span>
          <UncontrolledTooltip target={`rtw-edit-${r._id}`}>{t('Edit')}</UncontrolledTooltip>
          <span id={`rtw-del-${r._id}`} className='cursor-pointer' onClick={() => {
            dispatch(deleteRtwCheck(r._id)).then((res) => {
              if (!res.error) {
                Notification('Success', t('RTW check deleted'), 'success');
                load();
              } else {
                Notification('Error', res.error?.message || t('Failed to delete'), 'warning');
              }
            });
          }}>
            <Trash2 size={14} className='text-danger' />
          </span>
          <UncontrolledTooltip target={`rtw-del-${r._id}`}>{t('Delete')}</UncontrolledTooltip>
        </div>
      ),
    }] : []),
  ]

  const eventColumns = [
    {
      name: t('Employee'),
      minWidth: '200px',
      cell: (e) => {
        const emp = employeeMap[e.user_id]
        return (
          <div>
            <div className='fw-semibold text-body'>{emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : e.user_id?.substring(0, 8)}</div>
            {emp?.email && <div className='small text-muted'>{emp.email}</div>}
          </div>
        )
      },
    },
    {
      name: t('Event Type'),
      minWidth: '180px',
      cell: (e) => <Badge color='light-secondary'>{e.event_type?.replace(/_/g, ' ')}</Badge>,
    },
    {
      name: t('Event Date'),
      cell: (e) => fmtDate(e.event_date),
    },
    {
      name: t('Deadline'),
      cell: (e) => e.reporting_deadline
        ? <div className='d-flex flex-column py-1 gap-25'><DaysChip date={e.reporting_deadline} /><span className='small text-muted'>{fmtDate(e.reporting_deadline)}</span></div>
        : <span className='text-muted'>—</span>,
    },
    {
      name: t('Status'),
      cell: (e) => <StatusTag value={e.status} />,
    },
    {
      name: t('Reference'),
      cell: (e) => <span className='small text-muted'>{e.reference_number || '—'}</span>,
    },
    ...(canWrite ? [{
      name: t('Actions'),
      minWidth: '200px',
      center: true,
      cell: (e) => (
        <div className='d-flex gap-50 align-items-center flex-wrap justify-content-center'>
          {e.status === 'pending' && (
            <Button size='sm' color='success' className='py-25 px-50' style={{ fontSize: '0.75rem' }} onClick={() => { setReportingEventId(e._id); setReportModal(true) }}>
              {t('Report')}
            </Button>
          )}
          {e.status === 'pending' && (
            <Button size='sm' color='secondary' outline className='py-25 px-50' style={{ fontSize: '0.75rem' }} onClick={() => dispatch(markEventNotApplicable(e._id))}>
              {t('N/A')}
            </Button>
          )}
          <span id={`evt-edit-${e._id}`} className='cursor-pointer' onClick={() => openEditEvent(e)}>
            <Edit2 size={14} className='text-primary' />
          </span>
          <UncontrolledTooltip target={`evt-edit-${e._id}`}>{t('Edit')}</UncontrolledTooltip>
          <span id={`evt-del-${e._id}`} className='cursor-pointer' onClick={() => dispatch(deleteEvent(e._id))}>
            <Trash2 size={14} className='text-danger' />
          </span>
          <UncontrolledTooltip target={`evt-del-${e._id}`}>{t('Delete')}</UncontrolledTooltip>
        </div>
      ),
    }] : []),
  ]

  const auditColumns = [
    {
      name: t('Action'),
      cell: (a) => <Badge color='light-secondary'>{a.action?.replace(/_/g, ' ')}</Badge>,
    },
    {
      name: t('Employee'),
      minWidth: '200px',
      cell: (a) => {
        const emp = employeeMap[a.user_id]
        return (
          <div>
            <div className='fw-semibold'>{emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : (a.user_id?.substring(0, 8) || '—')}</div>
            {emp?.email && <div className='small text-muted'>{emp.email}</div>}
          </div>
        )
      },
    },
    {
      name: t('Performed By'),
      cell: (a) => {
        const performer = employeeMap[a.performed_by]
        return <span className='small'>{performer ? `${performer.first_name || ''} ${performer.last_name || ''}`.trim() : (a.performed_by ? 'Admin' : 'System')}</span>
      },
    },
    {
      name: t('Entity'),
      cell: (a) => <span className='small text-muted'>{a.entity_type || '—'}</span>,
    },
    {
      name: t('Date'),
      cell: (a) => <span className='small'>{new Date(a.createdAt).toLocaleString('en-GB')}</span>,
    },
  ]

  return (
    <Fragment>
      {/* ── Page Header ── */}
      <div className='d-flex align-items-center justify-content-between mb-2'>
        <h3 className='mb-0'>
          <Shield size={18} className='me-1' />
          {t('Home Office Compliance')}
        </h3>
      </div>

      {/* ── Tabs ── */}
      <Card className='mb-0'>
        <CardBody className='pb-0 pt-2 px-2'>
          <Nav tabs className='mb-0'>
            <NavItem>
              <NavLink active={tab === 'dashboard'} onClick={() => setTab('dashboard')} style={{ cursor: 'pointer' }}>
                {t('Dashboard')}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={tab === 'immigration'} onClick={() => setTab('immigration')} style={{ cursor: 'pointer' }}>
                {t('Immigration Records')}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={tab === 'rtw'} onClick={() => setTab('rtw')} style={{ cursor: 'pointer' }}>
                {t('RTW Checks')}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={tab === 'events'} onClick={() => setTab('events')} style={{ cursor: 'pointer' }}>
                {t('UKVI Events')}
                {db?.overdue_events > 0 && <Badge color='danger' className='ms-1' pill>{db.overdue_events}</Badge>}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={tab === 'audit'} onClick={() => setTab('audit')} style={{ cursor: 'pointer' }}>
                {t('Audit Log')}
              </NavLink>
            </NavItem>
            {canWrite && (
              <NavItem>
                <NavLink active={tab === 'settings'} onClick={() => setTab('settings')} style={{ cursor: 'pointer' }}>
                  {t('Settings')}
                </NavLink>
              </NavItem>
            )}
          </Nav>
        </CardBody>
      </Card>

      <TabContent activeTab={tab} className='mt-2'>

        {/* ── DASHBOARD TAB ── */}
        <TabPane tabId='dashboard'>
          {store.loading && !db ? (
            <div className='text-center p-5'><Spinner /></div>
          ) : (
            <>
              <Row className='g-2 mb-2'>
                <Col md={3} sm={6}>
                  <Card className={`text-center border-${db?.visas_expiring_30_days > 0 ? 'danger' : 'success'}`} style={{ cursor: 'pointer' }} onClick={() => setTab('immigration')}>
                    <CardBody>
                      <AlertTriangle size={28} className={`mb-1 text-${db?.visas_expiring_30_days > 0 ? 'danger' : 'success'}`} />
                      <h3 className='mb-25'>{db?.visas_expiring_30_days ?? 0}</h3>
                      <p className='text-muted small mb-0'>{t('Visas expiring in 30 days')}</p>
                    </CardBody>
                  </Card>
                </Col>
                <Col md={3} sm={6}>
                  <Card className='text-center border-warning' style={{ cursor: 'pointer' }} onClick={() => setTab('immigration')}>
                    <CardBody>
                      <Clock size={28} className='mb-1 text-warning' />
                      <h3 className='mb-25'>{db?.visas_expiring_90_days ?? 0}</h3>
                      <p className='text-muted small mb-0'>{t('Visas expiring in 90 days')}</p>
                    </CardBody>
                  </Card>
                </Col>
                <Col md={3} sm={6}>
                  <Card className={`text-center border-${db?.overdue_events > 0 ? 'danger' : 'secondary'}`} style={{ cursor: 'pointer' }} onClick={() => setTab('events')}>
                    <CardBody>
                      <AlertTriangle size={28} className={`mb-1 text-${db?.overdue_events > 0 ? 'danger' : 'muted'}`} />
                      <h3 className='mb-25'>{db?.overdue_events ?? 0}</h3>
                      <p className='text-muted small mb-0'>{t('Overdue UKVI events')}</p>
                    </CardBody>
                  </Card>
                </Col>
                <Col md={3} sm={6}>
                  <Card className='text-center border-warning' style={{ cursor: 'pointer' }} onClick={() => setTab('events')}>
                    <CardBody>
                      <FileText size={28} className='mb-1 text-warning' />
                      <h3 className='mb-25'>{db?.pending_events ?? 0}</h3>
                      <p className='text-muted small mb-0'>{t('Pending events to report')}</p>
                    </CardBody>
                  </Card>
                </Col>
              </Row>

              {db?.expiring_records?.length > 0 && (
                <Card>
                  <CardHeader className='border-bottom py-1'>
                    <CardTitle tag='h6' className='mb-0'>
                      <AlertTriangle size={15} className='me-75 text-danger' />
                      {t('Visas Expiring Within 30 Days')}
                    </CardTitle>
                  </CardHeader>
                  <CardBody>
                    <DatatablePagination
                      columns={[
                        { name: t('Employee'), cell: (r) => { const emp = employeeMap[r.user_id]; return (<div><div className='fw-semibold'>{emp ? `${emp.first_name || ''} ${emp.last_name || ''}`.trim() : r.user_id?.substring(0, 8)}</div>{emp?.email && <div className='small text-muted'>{emp.email}</div>}</div>) } },
                        { name: t('Visa Type'), cell: (r) => r.visa_type || '—' },
                        { name: t('Expiry'), cell: (r) => fmtDate(r.visa_expiry_date) },
                        { name: t('Time Left'), cell: (r) => <DaysChip date={r.visa_expiry_date} /> },
                        { name: t('Status'), cell: (r) => <StatusTag value={r.status} /> },
                      ]}
                      data={db.expiring_records}
                      currentPage={0}
                      rowsPerPage={db.expiring_records.length || defaultPerPageRow}
                      pagination={{ total: db.expiring_records.length, perPage: db.expiring_records.length }}
                      handleSort={() => {}}
                      handleRowPerPage={() => {}}
                      handlePagination={() => {}}
                      loading={true}
                      disablePagination={true}
                    />
                  </CardBody>
                </Card>
              )}
            </>
          )}
        </TabPane>

        {/* ── IMMIGRATION RECORDS TAB ── */}
        <TabPane tabId='immigration'>
          <Card>
            <CardHeader className='border-bottom py-1 d-flex align-items-center justify-content-between'>
              <CardTitle tag='h5' className='mb-0'>{t('Immigration Records')}</CardTitle>
              <div className='d-flex align-items-center gap-1'>
                <div style={{ width: 200 }}>
                  <Select options={employeeOptions} value={empFilter} onChange={(opt) => { setEmpFilter(opt); setImmigPage(0) }}
                    placeholder={t('All employees')} isClearable isSearchable classNamePrefix='select' />
                </div>
                {canWrite && (
                  <Button color='primary' size='sm' onClick={() => { setEditImmig(null); setImmigModal(true) }}>
                    <Plus size={14} className='me-25' />{t('New Record')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <DatatablePagination
                columns={immigrationColumns}
                data={filterByEmployee(store.immigrationList)}
                currentPage={immigPage}
                rowsPerPage={immigPerPage}
                pagination={{ total: filterByEmployee(store.immigrationList).length, perPage: immigPerPage }}
                handleSort={() => {}}
                handleRowPerPage={(e) => { setImmigPerPage(parseInt(e.target.value)); setImmigPage(0) }}
                handlePagination={(page) => setImmigPage(page.selected)}
                loading={!store.loading}
              />
            </CardBody>
          </Card>
        </TabPane>

        {/* ── RTW CHECKS TAB ── */}
        <TabPane tabId='rtw'>
          <Card>
            <CardHeader className='border-bottom py-1 d-flex align-items-center justify-content-between'>
              <CardTitle tag='h5' className='mb-0'>{t('Right to Work Checks')}</CardTitle>
              <div className='d-flex align-items-center gap-1'>
                <div style={{ width: 200 }}>
                  <Select options={employeeOptions} value={empFilter} onChange={(opt) => { setEmpFilter(opt); setRtwPage(0) }}
                    placeholder={t('All employees')} isClearable isSearchable classNamePrefix='select' />
                </div>
                {canWrite && (
                  <Button color='primary' size='sm' className='text-nowrap' onClick={() => { setEditRtw(null); setRtwForm({ user_id: '', check_type: 'manual', check_date: '', result: 'passed', valid_from: '', valid_until: '', share_code_used: '', follow_up_required: false, follow_up_date: '', notes: '' }); setRtwModal(true) }}>
                    <Plus size={14} className='me-25' />{t('New RTW Check')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <DatatablePagination
                columns={rtwColumns}
                data={filterByEmployee(store.rtwList)}
                currentPage={rtwPage}
                rowsPerPage={rtwPerPage}
                pagination={{ total: filterByEmployee(store.rtwList).length, perPage: rtwPerPage }}
                handleSort={() => {}}
                handleRowPerPage={(e) => { setRtwPerPage(parseInt(e.target.value)); setRtwPage(0) }}
                handlePagination={(page) => setRtwPage(page.selected)}
                loading={!store.loading}
              />
            </CardBody>
          </Card>
        </TabPane>

        {/* ── UKVI EVENTS TAB ── */}
        <TabPane tabId='events'>
          <Card>
            <CardHeader className='border-bottom py-1 d-flex align-items-center justify-content-between'>
              <CardTitle tag='h5' className='mb-0'>{t('UKVI Reportable Events')}</CardTitle>
              <div className='d-flex align-items-center gap-1'>
                <div style={{ width: 200 }}>
                  <Select options={employeeOptions} value={empFilter} onChange={(opt) => { setEmpFilter(opt); setEventPage(0) }}
                    placeholder={t('All employees')} isClearable isSearchable classNamePrefix='select' />
                </div>
                {canWrite && (
                  <Button color='primary' size='sm' className='text-nowrap' onClick={() => { setEditEvent(null); setEventForm({ user_id: '', event_type: 'custom', event_date: '', description: '' }); setEventModal(true) }}>
                    <Plus size={14} className='me-25' />{t('Log Event')}
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardBody>
              <DatatablePagination
                columns={eventColumns}
                data={filterByEmployee(store.eventList)}
                currentPage={eventPage}
                rowsPerPage={eventPerPage}
                pagination={{ total: filterByEmployee(store.eventList).length, perPage: eventPerPage }}
                handleSort={() => {}}
                handleRowPerPage={(e) => { setEventPerPage(parseInt(e.target.value)); setEventPage(0) }}
                handlePagination={(page) => setEventPage(page.selected)}
                loading={!store.loading}
              />
            </CardBody>
          </Card>
        </TabPane>

        {/* ── AUDIT LOG TAB ── */}
        <TabPane tabId='audit'>
          <Card>
            <CardHeader className='border-bottom py-1 d-flex align-items-center justify-content-between'>
              <CardTitle tag='h5' className='mb-0'>{t('Compliance Audit Log')}</CardTitle>
              <div style={{ width: 200 }}>
                <Select options={employeeOptions} value={empFilter} onChange={(opt) => { setEmpFilter(opt); setAuditPage(0) }}
                  placeholder={t('All employees')} isClearable isSearchable classNamePrefix='select' />
              </div>
            </CardHeader>
            <CardBody>
              <DatatablePagination
                columns={auditColumns}
                data={filterByEmployee(store.auditLog)}
                currentPage={auditPage}
                rowsPerPage={auditPerPage}
                pagination={{ total: filterByEmployee(store.auditLog).length, perPage: auditPerPage }}
                handleSort={() => {}}
                handleRowPerPage={(e) => { setAuditPerPage(parseInt(e.target.value)); setAuditPage(0) }}
                handlePagination={(page) => setAuditPage(page.selected)}
                loading={!store.loading}
              />
            </CardBody>
          </Card>
        </TabPane>

        {/* ── SETTINGS TAB ── */}
        {canWrite && (
          <TabPane tabId='settings'>
            <ComplianceSettingsTab />
          </TabPane>
        )}

      </TabContent>

      {/* ── IMMIGRATION MODAL ── */}
      <Modal isOpen={immigModal} toggle={() => setImmigModal(false)} size='lg' centered backdrop='static' keyboard={false}>
        <ModalHeader toggle={() => setImmigModal(false)}>
          {editImmig ? t('Edit Immigration Record') : t('New Immigration Record')}
        </ModalHeader>
        <ModalBody>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Employee')} <span className='text-danger'>*</span></Label>
                <Select
                  classNamePrefix='select'
                  options={employeeOptions}
                  value={employeeOptions.find(o => o.value === immigForm.user_id) || null}
                  onChange={opt => setImmigForm(f => ({ ...f, user_id: opt?.value || '' }))}
                  placeholder={t('Search employee...')}
                  isClearable isSearchable
                />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Visa Type')}</Label>
                <Input type='select' value={immigForm.visa_type} onChange={e => {
                  const vt = e.target.value
                  setImmigForm(f => {
                    const updated = { ...f, visa_type: vt }
                    if (f.visa_start_date && vt) updated.visa_expiry_date = calcVisaExpiry(f.visa_start_date, vt)
                    return updated
                  })
                }}>
                  <option value=''>{t('Select Visa Type')}</option>
                  <option value='skilled_worker'>{t('Skilled Worker')}</option>
                  <option value='student'>{t('Student')}</option>
                  <option value='family'>{t('Family')}</option>
                  <option value='visitor'>{t('Visitor')}</option>
                  <option value='settlement'>{t('Settlement (ILR)')}</option>
                  <option value='british_citizen'>{t('British Citizen')}</option>
                  <option value='graduate'>{t('Graduate')}</option>
                  <option value='health_care'>{t('Health & Care')}</option>
                  <option value='seasonal_worker'>{t('Seasonal Worker')}</option>
                  <option value='other'>{t('Other')}</option>
                </Input>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Immigration Status')}</Label>
                <Input type='select' value={immigForm.immigration_status} onChange={e => setImmigForm(f => ({ ...f, immigration_status: e.target.value }))}>
                  <option value='british_citizen'>{t('British Citizen')}</option>
                  <option value='eu_settled'>{t('EU Settled')}</option>
                  <option value='eu_pre_settled'>{t('EU Pre-Settled')}</option>
                  <option value='visa_holder'>{t('Visa Holder')}</option>
                  <option value='ilr'>{t('ILR')}</option>
                  <option value='other'>{t('Other')}</option>
                </Input>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>{t('BRP Number')}</Label>
                <Input value={immigForm.brp_number} onChange={e => setImmigForm(f => ({ ...f, brp_number: e.target.value }))} />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Visa Start Date')}</Label>
                <DateInput value={immigForm.visa_start_date} id="visa_start_date" onChange={(dates, str, iso) => {
                  const sd = iso
                  setImmigForm(f => {
                    const updated = { ...f, visa_start_date: sd }
                    if (sd && f.visa_type) updated.visa_expiry_date = calcVisaExpiry(sd, f.visa_type)
                    return updated
                  })
                }} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Visa Expiry Date')}</Label>
                <DateInput value={immigForm.visa_expiry_date} id="visa_expiry_date" onChange={(dates, str, iso) => setImmigForm(f => ({ ...f, visa_expiry_date: iso }))} />
              </FormGroup>
            </Col>
          </Row>
          <FormGroup>
            <Label>{t('Work Restriction')}</Label>
            <Input value={immigForm.work_restriction} onChange={e => setImmigForm(f => ({ ...f, work_restriction: e.target.value }))} placeholder='e.g. 20 hrs/week during term' />
          </FormGroup>
          <Row>
            <Col md={4}>
              <div className='form-check form-switch mt-1'>
                <Input type='checkbox' className='form-check-input' id='is_sponsored'
                  checked={immigForm.is_sponsored} onChange={e => setImmigForm(f => ({ ...f, is_sponsored: e.target.checked }))} />
                <Label className='form-check-label ms-75' htmlFor='is_sponsored'>{t('Sponsored Employee')}</Label>
              </div>
            </Col>
            {immigForm.is_sponsored && (
              <>
                <Col md={4}>
                  <FormGroup>
                    <Label>{t('CoS Number')}</Label>
                    <Input value={immigForm.cos_number} onChange={e => setImmigForm(f => ({ ...f, cos_number: e.target.value }))} />
                  </FormGroup>
                </Col>
                <Col md={4}>
                  <FormGroup>
                    <Label>{t('Sponsor Licence No.')}</Label>
                    <Input value={immigForm.sponsor_license_number} onChange={e => setImmigForm(f => ({ ...f, sponsor_license_number: e.target.value }))} />
                  </FormGroup>
                </Col>
              </>
            )}
          </Row>
          <FormGroup>
            <Label>{t('Notes')}</Label>
            <Input type='textarea' rows={2} value={immigForm.notes} onChange={e => setImmigForm(f => ({ ...f, notes: e.target.value }))} />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' outline onClick={() => setImmigModal(false)}>{t('Cancel')}</Button>
          <Button color='primary' onClick={handleImmigSubmit} disabled={store.loading || !immigForm.user_id}>
            {store.loading ? <Spinner size='sm' /> : editImmig ? t('Update') : t('Create')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── RTW MODAL ── */}
      <Modal isOpen={rtwModal} toggle={() => setRtwModal(false)} centered backdrop='static' keyboard={false}>
        <ModalHeader toggle={() => setRtwModal(false)}>{editRtw ? t('Edit RTW Check') : t('New RTW Check')}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t('Employee')} <span className='text-danger'>*</span></Label>
            <Select
              classNamePrefix='select'
              options={employeeOptions}
              value={employeeOptions.find(o => o.value === rtwForm.user_id) || null}
              onChange={opt => setRtwForm(f => ({ ...f, user_id: opt?.value || '' }))}
              placeholder={t('Search employee...')}
              isClearable isSearchable
            />
          </FormGroup>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Check Type')}</Label>
                <Input type='select' value={rtwForm.check_type} onChange={e => setRtwForm(f => ({ ...f, check_type: e.target.value }))}>
                  <option value='manual'>{t('Manual')}</option>
                  <option value='digital_share_code'>{t('Digital Share Code')}</option>
                  <option value='employer_checking_service'>{t('Employer Checking Service')}</option>
                </Input>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Result')}</Label>
                <Input type='select' value={rtwForm.result} onChange={e => setRtwForm(f => ({ ...f, result: e.target.value }))}>
                  <option value='passed'>{t('Passed')}</option>
                  <option value='failed'>{t('Failed')}</option>
                  <option value='pending'>{t('Pending')}</option>
                </Input>
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Check Date')} <span className='text-danger'>*</span></Label>
                <DateInput value={rtwForm.check_date} id="check_date" maxDate="today" onChange={(dates, str, iso) => {
                  const cd = iso
                  setRtwForm(f => {
                    const updated = { ...f, check_date: cd }
                    // Auto-set valid_until to 1 year from check date
                    if (cd && !f.valid_until) {
                      const d = new Date(cd + 'T12:00:00Z')
                      d.setUTCFullYear(d.getUTCFullYear() + 1)
                      updated.valid_until = d.toISOString().split('T')[0]
                    }
                    return updated
                  })
                }} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Valid Until')}</Label>
                <DateInput value={rtwForm.valid_until} id="valid_until" onChange={(dates, str, iso) => setRtwForm(f => ({ ...f, valid_until: iso }))} />
                <small className='text-muted'>{t('Leave blank for British citizens (indefinite)')}</small>
              </FormGroup>
            </Col>
          </Row>
          {rtwForm.check_type === 'digital_share_code' && (
            <FormGroup>
              <Label>{t('Share Code Used')}</Label>
              <Input value={rtwForm.share_code_used} onChange={e => setRtwForm(f => ({ ...f, share_code_used: e.target.value }))} />
            </FormGroup>
          )}
          <Row>
            <Col md={6}>
              <div className='form-check form-switch mt-1'>
                <Input type='checkbox' className='form-check-input' id='follow_up_required'
                  checked={rtwForm.follow_up_required} onChange={e => setRtwForm(f => ({ ...f, follow_up_required: e.target.checked }))} />
                <Label className='form-check-label ms-75' htmlFor='follow_up_required'>{t('Follow-up required')}</Label>
              </div>
            </Col>
            {rtwForm.follow_up_required && (
              <Col md={6}>
                <FormGroup>
                  <Label>{t('Follow-up Date')}</Label>
                  <DateInput value={rtwForm.follow_up_date} id="follow_up_date" minDate="today" onChange={(dates, str, iso) => setRtwForm(f => ({ ...f, follow_up_date: iso }))} />
                </FormGroup>
              </Col>
            )}
          </Row>
          <FormGroup>
            <Label>{t('Notes')}</Label>
            <Input type='textarea' rows={2} value={rtwForm.notes} onChange={e => setRtwForm(f => ({ ...f, notes: e.target.value }))} />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' outline onClick={() => setRtwModal(false)}>{t('Cancel')}</Button>
          <Button color='primary' onClick={async () => { setSubmitting(true); try { if (editRtw) { await dispatch(updateRtwCheck({ id: editRtw._id, data: rtwForm })) } else { await dispatch(createRtwCheck(rtwForm)) } } finally { setSubmitting(false) } }} disabled={store.loading || !rtwForm.user_id || !rtwForm.check_date}>
            {store.loading ? <Spinner size='sm' /> : editRtw ? t('Update') : t('Save Check')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── EVENT MODAL ── */}
      <Modal isOpen={eventModal} toggle={() => setEventModal(false)} centered backdrop='static' keyboard={false}>
        <ModalHeader toggle={() => setEventModal(false)}>{editEvent ? t('Edit Compliance Event') : t('Log Compliance Event')}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t('Employee')} <span className='text-danger'>*</span></Label>
            <Select
              classNamePrefix='select'
              options={employeeOptions}
              value={employeeOptions.find(o => o.value === eventForm.user_id) || null}
              onChange={opt => setEventForm(f => ({ ...f, user_id: opt?.value || '' }))}
              placeholder={t('Search employee...')}
              isClearable isSearchable
            />
          </FormGroup>
          <FormGroup>
            <Label>{t('Event Type')}</Label>
            <Input type='select' value={eventForm.event_type} onChange={e => setEventForm(f => ({ ...f, event_type: e.target.value }))}>
              <option value='absence_10_days'>{t('Absence 10+ Days (Unauthorised)')}</option>
              <option value='role_change'>{t('Role Change')}</option>
              <option value='salary_change'>{t('Salary Change')}</option>
              <option value='resignation'>{t('Resignation')}</option>
              <option value='termination'>{t('Termination')}</option>
              <option value='working_hours_breach'>{t('Working Hours Breach')}</option>
              <option value='visa_expiry'>{t('Visa Expiry')}</option>
              <option value='failed_rtw_check'>{t('Failed RTW Check')}</option>
              <option value='address_change'>{t('Address Change')}</option>
              <option value='custom'>{t('Custom')}</option>
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>{t('Event Date')} <span className='text-danger'>*</span></Label>
            <DateInput value={eventForm.event_date} id="event_date" maxDate="today" onChange={(dates, str, iso) => setEventForm(f => ({ ...f, event_date: iso }))} />
          </FormGroup>
          <FormGroup>
            <Label>{t('Description')}</Label>
            <Input type='textarea' rows={3} value={eventForm.description} onChange={e => setEventForm(f => ({ ...f, description: e.target.value }))} />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' outline onClick={() => setEventModal(false)}>{t('Cancel')}</Button>
          <Button color='primary' onClick={async () => { setSubmitting(true); try { if (editEvent) { await dispatch(updateEvent({ id: editEvent._id, data: eventForm })) } else { await dispatch(createEvent(eventForm)) } } finally { setSubmitting(false) } }} disabled={store.loading || !eventForm.user_id || !eventForm.event_date}>
            {store.loading ? <Spinner size='sm' /> : editEvent ? t('Update') : t('Log Event')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── REPORT MODAL ── */}
      <Modal isOpen={reportModal} toggle={() => setReportModal(false)} centered backdrop='static' keyboard={false}>
        <ModalHeader toggle={() => setReportModal(false)}>{t('Mark Event as Reported')}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t('UKVI Reference Number (optional)')}</Label>
            <Input value={refNumber} onChange={e => setRefNumber(e.target.value)} placeholder='e.g. UKVI-2026-XXXXX' />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' outline onClick={() => setReportModal(false)}>{t('Cancel')}</Button>
          <Button color='success' onClick={async () => { setSubmitting(true); try { dispatch(reportEvent({ id: reportingEventId, data: { reference_number: refNumber } })) } finally { setSubmitting(false) } }} disabled={store.loading}>
            {store.loading ? <Spinner size='sm' /> : t('Confirm Reported')}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  )
}

// ─── Compliance Settings Tab Component ──────────────────────────────────────

const COMPLIANCE_EVENTS = [
  { key: 'VISA_EXPIRY_WARNING', label: 'Visa Expiry Warning' },
  { key: 'RTW_FOLLOWUP_DUE', label: 'RTW Follow-up Due' },
  { key: 'UKVI_DEADLINE_WARNING', label: 'UKVI Deadline Warning' },
  { key: 'COMPLIANCE_EVENT_CREATED', label: 'New Compliance Event Created' },
]

const ComplianceSettingsTab = () => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const [saving, setSaving] = useState(false)
  const [loadingPrefs, setLoadingPrefs] = useState(true)
  useFormLoading(saving)

  // Reminder settings
  const [config, setConfig] = useState({
    rtw_check_reminder_days: 3,
    visa_reminder_1st_days: 90,
    visa_reminder_2nd_days: 60,
    visa_reminder_3rd_days: 30,
    ukvi_deadline_alert_days: '5,3,1',
    personal_verification_months: 6,
    additional_notification_emails: '',
  })

  // Notification preferences
  const [notifPrefs, setNotifPrefs] = useState({})

  useEffect(() => {
    // Load compliance settings
    dispatch(getComplianceSettings()).then((res) => {
      if (res.payload?.data) setConfig(res.payload.data)
    })
    // Load notification preferences
    instance.get('/admin/notification/preferences')
      .then((res) => {
        const prefs = {}
        const list = res.data?.data || []
        list.forEach((p) => { prefs[p.event_key] = p })
        setNotifPrefs(prefs)
      })
      .catch(() => {})
      .finally(() => setLoadingPrefs(false))
  }, [])

  const handleConfigChange = (field, value) => {
    setConfig((prev) => ({ ...prev, [field]: value }))
  }

  const handleNotifToggle = (eventKey, channel, value) => {
    setNotifPrefs((prev) => ({
      ...prev,
      [eventKey]: { ...(prev[eventKey] || { email_enabled: true, sms_enabled: false, whatsapp_enabled: false }), [channel]: value },
    }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      // Save reminder settings
      await dispatch(updateComplianceSettings(config))

      // Save notification preferences
      const preferences = COMPLIANCE_EVENTS.map((evt) => ({
        event_key: evt.key,
        email_enabled: notifPrefs[evt.key]?.email_enabled ?? true,
        sms_enabled: notifPrefs[evt.key]?.sms_enabled ?? false,
        whatsapp_enabled: notifPrefs[evt.key]?.whatsapp_enabled ?? false,
      }))
      await instance.put('/admin/notification/preferences', { preferences })

      Notification('Success', t('Compliance settings saved'), 'success')
    } catch (err) {
      Notification('Error', err?.message || t('Failed to save settings'), 'warning')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <CardBody>
        {/* ── Reminder Settings ── */}
        <h6 className='fw-bold text-uppercase text-muted mb-1'>{t('Reminder Settings')}</h6>
        <hr className='mt-0 mb-2' />
        <Row>
          <Col md={6} className='mb-2'>
            <Label>{t('Right to Work Check Reminder (Days)')}</Label>
            <Input type='number' min={1} value={config.rtw_check_reminder_days}
              onChange={(e) => handleConfigChange('rtw_check_reminder_days', e.target.value)} />
            <small className='text-muted'>{t('Days before RTW check expiry to send reminder')}</small>
          </Col>
          <Col md={6} className='mb-2'>
            <Label>{t('Visa Expiry Reminder 1st (Days)')}</Label>
            <Input type='number' min={1} value={config.visa_reminder_1st_days}
              onChange={(e) => handleConfigChange('visa_reminder_1st_days', e.target.value)} />
            <small className='text-muted'>{t('First reminder before visa expiry')}</small>
          </Col>
          <Col md={6} className='mb-2'>
            <Label>{t('Visa Expiry Reminder 2nd (Days)')}</Label>
            <Input type='number' min={1} value={config.visa_reminder_2nd_days}
              onChange={(e) => handleConfigChange('visa_reminder_2nd_days', e.target.value)} />
          </Col>
          <Col md={6} className='mb-2'>
            <Label>{t('Visa Expiry Reminder 3rd (Days)')}</Label>
            <Input type='number' min={1} value={config.visa_reminder_3rd_days}
              onChange={(e) => handleConfigChange('visa_reminder_3rd_days', e.target.value)} />
          </Col>
          <Col md={6} className='mb-2'>
            <Label>{t('UKVI Deadline Alert Days')}</Label>
            <Input value={config.ukvi_deadline_alert_days}
              onChange={(e) => handleConfigChange('ukvi_deadline_alert_days', e.target.value)} />
            <small className='text-muted'>{t('Comma-separated days before deadline, e.g. 5,3,1')}</small>
          </Col>
          <Col md={6} className='mb-2'>
            <Label>{t('Personal Details Verification (Every X Months)')}</Label>
            <Input type='number' min={1} value={config.personal_verification_months}
              onChange={(e) => handleConfigChange('personal_verification_months', e.target.value)} />
          </Col>
        </Row>

        {/* ── Additional Notification Emails ── */}
        <h6 className='fw-bold text-uppercase text-muted mb-1 mt-2'>{t('Additional Notification Emails')}</h6>
        <hr className='mt-0 mb-2' />
        <Row>
          <Col md={12} className='mb-2'>
            <Label>{t('Additional email addresses for compliance notifications')}</Label>
            <Input value={config.additional_notification_emails}
              onChange={(e) => handleConfigChange('additional_notification_emails', e.target.value)}
              placeholder={t('e.g. hr@company.com, compliance@company.com')} />
            <small className='text-muted'>{t('Comma-separated email addresses')}</small>
          </Col>
        </Row>

        <div className='d-flex justify-content-end mt-3 mb-3'>
          <Button color='primary' onClick={handleSave} disabled={saving}>
            {saving ? <Spinner size='sm' /> : t('Save Reminder Settings')}
          </Button>
        </div>

        {/* ── Notification Preferences + Templates (shared component) ── */}
        <NotificationSettingsPanel events={COMPLIANCE_EVENTS} />
      </CardBody>
    </Card>
  )
}

export default CompliancePage
