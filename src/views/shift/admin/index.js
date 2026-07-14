import React, { Fragment, useEffect, useState, useCallback } from 'react'
import useFormLoading from '@src/hooks/useFormLoading'
import instance from '@src/utility/AxiosConfig'
import { useDispatch, useSelector } from 'react-redux'
import {
  Card, CardBody, CardHeader, CardTitle,
  Button, Badge, Table, Row, Col, Spinner, Alert,
  Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Input,
  Nav, NavItem, NavLink, TabContent, TabPane, UncontrolledTooltip,
} from 'reactstrap'
import { Grid, Plus, Trash2, CheckSquare, Copy, Edit2 } from 'react-feather'
import { formatDate, formatTimeStr } from '@src/utility/dateFormat'
import DatatablePagination from '@components/datatable/DatatablePagination'
import { useTranslation } from 'react-i18next'
import Notification from '@components/toast/notification'
import {
  getTemplates, createTemplate, updateTemplate, deleteTemplate,
  getAssignments, createAssignment, deleteAssignment,
  bulkAssign, copyWeek, publishRota,
  getSwaps, adminDecideSwap,
  getRotaLeaves, clearShiftActionFlag,
} from '../store'
import { getEmployeeList } from '@src/views/employees/store'
import { getHolidaysForRange } from '@src/views/holiday-calendar/store'
import DateInput from '@components/date-input'
import SetupReturnBanner from '@src/components/SetupReturnBanner'

const STATUS_COLORS = { scheduled: 'light-secondary', confirmed: 'light-success', swapped: 'light-info', cancelled: 'light-danger' }
const SWAP_COLORS = { pending: 'light-warning', accepted: 'light-info', rejected: 'light-danger', admin_approved: 'light-success', admin_rejected: 'light-danger' }

// Use UTC-safe date helpers to avoid timezone offset issues
const addDays = (dateStr, days) => {
  const d = new Date(dateStr + 'T12:00:00Z') // noon UTC avoids DST/timezone shift
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().split('T')[0]
}

const getMondayOfWeek = (offset = 0) => {
  const now = new Date()
  const y = now.getFullYear(), m = String(now.getMonth() + 1).padStart(2, '0'), day = String(now.getDate()).padStart(2, '0')
  const todayStr = `${y}-${m}-${day}`
  const d = new Date(todayStr + 'T12:00:00Z')
  const dow = d.getUTCDay() || 7 // 1=Mon..7=Sun
  return addDays(todayStr, -(dow - 1) + offset * 7)
}

const getSunday = (monday) => addDays(monday, 6)

const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

const ShiftAdminPage = () => {
  const dispatch = useDispatch()
  const { t } = useTranslation()
  const store = useSelector((s) => s.shift)
  const employeeStore = useSelector((s) => s.employee)
  const holidayCalendarStore = useSelector((s) => s.holidayCalendar)
  const authStore = useSelector((s) => s.auth)
  const locationCtx = useSelector((s) => s.locationContext)
  const { selectedLocationId } = locationCtx || {}
  const modulePerms = authStore?.authUserItem?.role?.permissions?.['shift'] || {}
  const canWrite = !!(modulePerms.can_update || modulePerms.can_add)

  const [submitting, setSubmitting] = useState(false)
  useFormLoading(submitting)
  const [activeTab, setActiveTab] = useState('rota')
  const [weekOffset, setWeekOffset] = useState(0)

  // Template modal
  const [templateModal, setTemplateModal] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  const [templateForm, setTemplateForm] = useState({ name: '', code: '', start_time: '09:00', end_time: '17:00', break_minutes: 30, color: '#7367f0', is_overnight: false })

  // Single assignment modal
  const [assignModal, setAssignModal] = useState(false)
  const [assignForm, setAssignForm] = useState({ user_id: '', date: '', shift_template_id: '', notes: '' })

  // Bulk assign modal
  const [bulkModal, setBulkModal] = useState(false)
  const [bulkForm, setBulkForm] = useState({ user_ids: [], monday: '', shift_template_id: '', include_days: [0, 1, 2, 3, 4] })

  // Copy week modal
  const [copyModal, setCopyModal] = useState(false)
  const [copyForm, setCopyForm] = useState({ source_monday: '', target_monday: '' })

  const monday = getMondayOfWeek(weekOffset)
  const sunday = getSunday(monday)

  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(monday, i))

  const loadRota = useCallback(() => {
    dispatch(getAssignments({ _startDate: monday, _endDate: sunday, _limit: 200 }))
    dispatch(getRotaLeaves({ _startDate: monday, _endDate: sunday, _locationId: selectedLocationId || undefined }))
    const holidayParams = { start_date: monday, end_date: sunday, _limit: 100 }
    if (selectedLocationId) holidayParams.location_id = selectedLocationId
    dispatch(getHolidaysForRange(holidayParams))
  }, [dispatch, monday, sunday, selectedLocationId])

  useEffect(() => {
    dispatch(getTemplates())
    const empParams = { _limit: 500 }
    if (selectedLocationId) empParams.location_id = selectedLocationId
    dispatch(getEmployeeList(empParams))
  }, [dispatch, selectedLocationId])
  useEffect(() => { if (activeTab === 'rota') loadRota() }, [activeTab, loadRota])
  useEffect(() => {
    if (activeTab === 'swaps') {
      const params = {}
      if (selectedLocationId) params._locationId = selectedLocationId
      dispatch(getSwaps(params))
    }
  }, [activeTab, dispatch, selectedLocationId])

  useEffect(() => {
    if (!store.actionFlag && !store.error) return

    const successFlags = ['CREATE_TEMPLATE', 'UPDATE_TEMPLATE', 'DELETE_TEMPLATE', 'CREATE_ASSIGNMENT', 'DELETE_ASSIGNMENT', 'BULK_ASSIGN', 'COPY_WEEK', 'PUBLISH_ROTA', 'ADMIN_DECIDE_SWAP']
    if (successFlags.includes(store.actionFlag)) {
      Notification('Success', t('Action completed.'), 'success')
      setTemplateModal(false)
      setAssignModal(false)
      setBulkModal(false)
      setCopyModal(false)
      setEditingTemplate(null)
      setTemplateForm({ name: '', code: '', start_time: '09:00', end_time: '17:00', break_minutes: 30, color: '#7367f0', is_overnight: false })
      dispatch(clearShiftActionFlag())
      dispatch(getTemplates())
      loadRota()
      if (activeTab === 'swaps') {
        const params = {}
        if (selectedLocationId) params._locationId = selectedLocationId
        dispatch(getSwaps(params))
      }
      return
    }
    if (store.error) {
      Notification('Error', store.error, 'warning')
      dispatch(clearShiftActionFlag())
      return
    }
    if (store.actionFlag) dispatch(clearShiftActionFlag())
  }, [store.actionFlag])

  const handleTemplateSubmit = async () => {
    setSubmitting(true)
    try {
      if (editingTemplate) {
        await dispatch(updateTemplate({ id: editingTemplate._id, data: templateForm }))
      } else {
        await dispatch(createTemplate(templateForm))
      }
    } finally {
      setSubmitting(false)
    }
  }

  const openEditTemplate = (tmpl) => {
    setEditingTemplate(tmpl)
    setTemplateForm({ name: tmpl.name, code: tmpl.code, start_time: tmpl.start_time?.slice(0, 5), end_time: tmpl.end_time?.slice(0, 5), break_minutes: tmpl.break_minutes, color: tmpl.color, is_overnight: tmpl.is_overnight })
    setTemplateModal(true)
  }

  const rotaGrid = {}
  for (const a of store.assignments) {
    if (!rotaGrid[a.user_id]) rotaGrid[a.user_id] = {}
    rotaGrid[a.user_id][a.date] = a
  }

  const templateMap = Object.fromEntries(store.templates.map(tmpl => [tmpl._id, tmpl]))

  // Build leaveGrid: leaveGrid[userId][date] = leave info
  const leaveGrid = {}
  for (const leave of (store.rotaLeaves || [])) {
    const start = new Date(`${leave.start_date}T12:00:00Z`)
    const end = new Date(`${leave.end_date}T12:00:00Z`)
    const cur = new Date(start)
    while (cur <= end) {
      const dateStr = cur.toISOString().split('T')[0]
      if (!leaveGrid[leave.user_id]) leaveGrid[leave.user_id] = {}
      leaveGrid[leave.user_id][dateStr] = leave
      cur.setDate(cur.getDate() + 1)
    }
  }

  // Build holidayMap: date string -> holiday info
  const holidayMap = {}
  for (const h of (holidayCalendarStore?.rangeHolidays || [])) {
    const dateStr = (h.date || '').split('T')[0]
    if (dateStr) {
      if (!holidayMap[dateStr]) holidayMap[dateStr] = []
      holidayMap[dateStr].push(h)
    }
  }

  const getShiftLabel = (assignment) => {
    if (!assignment) return null
    const tmpl = templateMap[assignment.shift_template_id]
    if (tmpl) return (
      <div style={{ color: tmpl.color || '#333', lineHeight: 1.3 }}>
        <div style={{ fontWeight: 600 }}>{tmpl.code}</div>
        <div style={{ fontSize: '0.65rem', opacity: 0.8 }}>{formatTimeStr(tmpl.start_time)}–{formatTimeStr(tmpl.end_time)}</div>
      </div>
    )
    return <span>{formatTimeStr(assignment.start_time)}–{formatTimeStr(assignment.end_time)}</span>
  }

  const employees = employeeStore?.employeeItems || []

  // The local "02 Jul" formatter that used to live here SHADOWED the imported
  // one, so every date on this page silently ignored the shared helper. Removed:
  // the page now uses the app-wide DD-MM-YYYY `formatDate` imported at the top.

  return (
    <Fragment>
      <SetupReturnBanner />
      {/* ── Page Header ── */}
      <div className="d-flex align-items-center justify-content-between mb-2">
        <h3 className="mb-0">
          <Grid size={18} className="me-1" />
          {t('Shift / Rota Management')}
        </h3>
      </div>

      {/* ── Tabs ── */}
      <Card className="mb-0">
        <CardBody className="pb-0 pt-50">
          <Nav tabs className="mb-0">
            <NavItem>
              <NavLink
                active={activeTab === 'rota'}
                onClick={() => setActiveTab('rota')}
                style={{ cursor: 'pointer' }}
              >
                {t('Rota')}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                active={activeTab === 'templates'}
                onClick={() => setActiveTab('templates')}
                style={{ cursor: 'pointer' }}
              >
                {t('Shift Templates')}
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink
                active={activeTab === 'swaps'}
                onClick={() => setActiveTab('swaps')}
                style={{ cursor: 'pointer' }}
              >
                {t('Swap Requests')}
              </NavLink>
            </NavItem>
            {canWrite && (
              <NavItem>
                <NavLink
                  active={activeTab === 'settings'}
                  onClick={() => setActiveTab('settings')}
                  style={{ cursor: 'pointer' }}
                >
                  {t('Settings')}
                </NavLink>
              </NavItem>
            )}
          </Nav>
        </CardBody>
      </Card>

      <TabContent activeTab={activeTab} className="mt-2">

        {/* ── ROTA TAB ── */}
        <TabPane tabId="rota">
          <Card>
            <CardHeader className="border-bottom py-1 d-flex align-items-center justify-content-between flex-wrap gap-1">
              <div className="d-flex align-items-center gap-1">
                <Button size="sm" outline color="secondary" onClick={() => setWeekOffset(w => w - 1)}>← {t('Prev')}</Button>
                <strong className="mx-1">{formatDate(monday)} – {formatDate(sunday)}</strong>
                <Button size="sm" outline color="secondary" onClick={() => setWeekOffset(w => w + 1)}>{t('Next')} →</Button>
              </div>
              {canWrite && (
                <div className="d-flex gap-1 flex-wrap">
                  <Button color="primary" size="sm" onClick={() => { setAssignForm(f => ({ ...f, date: monday })); setAssignModal(true) }}>
                    <Plus size={14} className="me-25" />{t('Assign')}
                  </Button>
                  <Button color="primary" size="sm" outline onClick={() => { setBulkForm(f => ({ ...f, monday })); setBulkModal(true) }}>
                    <Plus size={14} className="me-25" />{t('Bulk Assign')}
                  </Button>
                  <Button color="secondary" size="sm" outline onClick={() => { setCopyForm({ source_monday: getMondayOfWeek(weekOffset - 1), target_monday: monday }); setCopyModal(true) }}>
                    <Copy size={14} className="me-25" />{t('Copy Week')}
                  </Button>
                  <Button color="secondary" size="sm" outline onClick={() => dispatch(publishRota({ start_date: monday, end_date: sunday }))}>
                    <CheckSquare size={14} className="me-25" />{t('Publish')}
                  </Button>
                </div>
              )}
            </CardHeader>
            <CardBody className="p-0">
              {!store.loading ? (
                <div className="text-center p-4"><Spinner /></div>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <Table bordered size="sm" className="mb-0 shift-grid">
                    <thead>
                      <tr style={{ backgroundColor: '#09418B' }}>
                        <th style={{ minWidth: 160, backgroundColor: '#09418B', color: '#fff', border: '1px solid #0a5299' }}>{t('Employee')}</th>
                        {weekDates.map((d, i) => (
                          <th key={d} className="text-center" style={{ minWidth: 80, backgroundColor: '#09418B', color: '#fff', border: '1px solid #0a5299' }}>
                            <div className="fw-semibold">{DAYS[i]}</div>
                            <div style={{ fontSize: '0.7rem', opacity: 0.8 }}>{formatDate(d)}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {employees.length === 0 ? (
                        <tr><td colSpan={8} className="text-center text-muted p-4">{t('No employees loaded.')}</td></tr>
                      ) : employees.map(emp => (
                        <tr key={emp._id}>
                          <td className="rota-cell">
                            <small className="fw-semibold">{emp.first_name || emp.firstName} {emp.last_name || emp.lastName}</small>
                          </td>
                          {weekDates.map(date => {
                            const a = rotaGrid[emp._id]?.[date]
                            const leaveInfo = leaveGrid[emp._id]?.[date]
                            const dayHolidays = holidayMap[date]
                            return (
                              <td key={date} className="rota-cell text-center p-1" style={dayHolidays ? { backgroundColor: '#fff3e0' } : undefined}>
                                {leaveInfo ? (
                                  <Badge pill style={{ fontSize: '0.7rem', backgroundColor: '#09418b', color: '#fff' }}>{t('On Leave')}</Badge>
                                ) : dayHolidays ? (
                                  <div>
                                    <Badge pill style={{ fontSize: '0.65rem', backgroundColor: '#28a745', color: '#fff' }}>
                                      {dayHolidays.map(h => h.name).join(', ')}
                                    </Badge>
                                  </div>
                                ) : a ? (
                                  <div>
                                    <div style={{ fontSize: '0.8rem' }}>{getShiftLabel(a)}</div>
                                    {!a.published && <Badge color="light-warning" pill style={{ fontSize: '9px' }}>{t('draft')}</Badge>}
                                    {canWrite && (
                                      <span className="cursor-pointer ms-25" onClick={() => dispatch(deleteAssignment(a._id))}>
                                        <Trash2 size={10} className="text-danger" />
                                      </span>
                                    )}
                                  </div>
                                ) : canWrite ? (
                                  <span
                                    className="cursor-pointer text-muted"
                                    onClick={() => { setAssignForm({ user_id: emp._id, date, shift_template_id: '', notes: '' }); setAssignModal(true) }}
                                  >
                                    <Plus size={12} />
                                  </span>
                                ) : null}
                              </td>
                            )
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </Table>
                </div>
              )}
            </CardBody>
          </Card>
        </TabPane>

        {/* ── TEMPLATES TAB ── */}
        <TabPane tabId="templates">
          <Card>
            <CardHeader className="border-bottom py-1 d-flex align-items-center justify-content-between">
              <CardTitle tag="h5" className="mb-0">{t('Shift Templates')}</CardTitle>
              {canWrite && (
                <Button color="primary" size="sm" onClick={() => { setEditingTemplate(null); setTemplateModal(true) }}>
                  <Plus size={14} className="me-25" />{t('New Template')}
                </Button>
              )}
            </CardHeader>
            <CardBody>
              <DatatablePagination
                columns={[
                  {
                    name: t('Code'),
                    cell: (tmpl) => (
                      <Badge style={{ backgroundColor: tmpl.color, color: '#fff' }}>{tmpl.code}</Badge>
                    ),
                    width: '80px',
                  },
                  {
                    name: t('Name'),
                    cell: (tmpl) => <span className="fw-semibold text-body">{tmpl.name}</span>,
                    minWidth: '140px',
                  },
                  { name: t('Start'), cell: (tmpl) => formatTimeStr(tmpl.start_time) },
                  { name: t('End'), cell: (tmpl) => formatTimeStr(tmpl.end_time) },
                  { name: t('Break'), cell: (tmpl) => `${tmpl.break_minutes}m` },
                  {
                    name: t('Overnight'),
                    cell: (tmpl) => tmpl.is_overnight
                      ? <Badge color="light-info">Yes</Badge>
                      : <span className="text-muted">—</span>,
                  },
                  {
                    name: t('Colour'),
                    cell: (tmpl) => (
                      <div style={{ width: 20, height: 20, borderRadius: 4, backgroundColor: tmpl.color, border: '1px solid #eee' }} />
                    ),
                  },
                  {
                    name: t('Scope'),
                    cell: (tmpl) => tmpl.location_id
                      ? <Badge color="light-info">{t('Location')}</Badge>
                      : <Badge color="light-secondary">{t('Company-wide')}</Badge>,
                  },
                  ...(canWrite ? [{
                    name: t('Actions'),
                    cell: (tmpl) => (
                      <div className="d-flex gap-75">
                        <span id={`tmpl-edit-${tmpl._id}`} className="cursor-pointer" onClick={() => openEditTemplate(tmpl)}>
                          <Edit2 size={14} className="text-primary" />
                        </span>
                        <UncontrolledTooltip target={`tmpl-edit-${tmpl._id}`}>{t('Edit')}</UncontrolledTooltip>
                        <span id={`tmpl-del-${tmpl._id}`} className="cursor-pointer" onClick={() => dispatch(deleteTemplate(tmpl._id))}>
                          <Trash2 size={14} className="text-danger" />
                        </span>
                        <UncontrolledTooltip target={`tmpl-del-${tmpl._id}`}>{t('Delete')}</UncontrolledTooltip>
                      </div>
                    ),
                  }] : []),
                ]}
                data={store.templates}
                pagination={{ total: store.templates.length, perPage: store.templates.length || 20 }}
                loading={store.loading}
              />
            </CardBody>
          </Card>
        </TabPane>

        {/* ── SWAPS TAB ── */}
        <TabPane tabId="swaps">
          <Card>
            <CardHeader className="border-bottom py-1">
              <CardTitle tag="h5" className="mb-0">{t('Swap Requests')}</CardTitle>
            </CardHeader>
            <CardBody>
              <DatatablePagination
                columns={[
                  {
                    name: t('Requester'),
                    minWidth: '180px',
                    cell: (s) => (
                      <div>
                        <div className="fw-bold small">{s.requester_name || s.requester_id?.slice(-8)}</div>
                        {s.requester_email && <div className="small text-muted">{s.requester_email}</div>}
                      </div>
                    ),
                  },
                  {
                    name: t('Target'),
                    minWidth: '180px',
                    cell: (s) => s.target_name ? (
                      <div>
                        <div className="fw-bold small">{s.target_name}</div>
                        {s.target_email && <div className="small text-muted">{s.target_email}</div>}
                      </div>
                    ) : <span className="small text-muted">{t('Open')}</span>,
                  },
                  {
                    name: t('Requester Shift'),
                    minWidth: '150px',
                    cell: (s) => s.requester_shift_date ? (
                      <div>
                        <div className="small fw-semibold">{formatDate(s.requester_shift_date)}</div>
                        {(s.requester_shift_start || s.requester_shift_end) && (
                          <div className="small text-muted">{s.requester_shift_start?.slice(0, 5) || '—'} – {s.requester_shift_end?.slice(0, 5) || '—'}</div>
                        )}
                      </div>
                    ) : <span className="small text-muted">—</span>,
                  },
                  {
                    name: t('Target Shift'),
                    minWidth: '150px',
                    cell: (s) => s.target_shift_date ? (
                      <div>
                        <div className="small fw-semibold">{formatDate(s.target_shift_date)}</div>
                        {(s.target_shift_start || s.target_shift_end) && (
                          <div className="small text-muted">{s.target_shift_start?.slice(0, 5) || '—'} – {s.target_shift_end?.slice(0, 5) || '—'}</div>
                        )}
                      </div>
                    ) : <span className="small text-muted">—</span>,
                  },
                  {
                    name: t('Status'),
                    cell: (s) => <Badge color={SWAP_COLORS[s.status] || 'light-secondary'}>{s.status?.replace('_', ' ')}</Badge>,
                  },
                  {
                    name: t('Reason'),
                    cell: (s) => <span className="small text-muted">{s.reason || '—'}</span>,
                  },
                  {
                    name: t('Admin Notes'),
                    cell: (s) => <span className="small text-muted">{s.admin_notes || '—'}</span>,
                  },
                  ...(canWrite ? [{
                    name: t('Actions'),
                    minWidth: '160px',
                    cell: (s) => s.status === 'accepted' ? (
                      <div className="d-flex gap-50">
                        <Button size="sm" color="success" onClick={() => dispatch(adminDecideSwap({ id: s._id, data: { approve: true } }))}>
                          {t('Approve')}
                        </Button>
                        <Button size="sm" color="danger" outline onClick={() => dispatch(adminDecideSwap({ id: s._id, data: { approve: false, notes: 'Admin rejected' } }))}>
                          {t('Reject')}
                        </Button>
                      </div>
                    ) : null,
                  }] : []),
                ]}
                data={store.swaps}
                pagination={{ total: store.swaps.length, perPage: store.swaps.length || 20 }}
                loading={store.loading}
                disablePagination
              />
            </CardBody>
          </Card>
        </TabPane>

        {/* ── SETTINGS TAB ── */}
        {canWrite && (
          <TabPane tabId="settings">
            <ShiftNotificationSettings t={t} />
          </TabPane>
        )}
      </TabContent>

      {/* ── Template Modal ── */}
      <Modal isOpen={templateModal} toggle={() => setTemplateModal(false)} centered>
        <ModalHeader toggle={() => setTemplateModal(false)}>
          {editingTemplate ? t('Edit Shift Template') : t('New Shift Template')}
        </ModalHeader>
        <ModalBody>
          <Row>
            <Col md={8}>
              <FormGroup>
                <Label>{t('Name')} <span className="text-danger">*</span></Label>
                <Input value={templateForm.name} onChange={e => setTemplateForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Morning Shift" />
              </FormGroup>
            </Col>
            <Col md={4}>
              <FormGroup>
                <Label>{t('Code')} <span className="text-danger">*</span></Label>
                <Input value={templateForm.code} onChange={e => setTemplateForm(f => ({ ...f, code: e.target.value.toUpperCase() }))} placeholder="AM" maxLength={6} />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Start Time')}</Label>
                <Input type="time" value={templateForm.start_time} onChange={e => setTemplateForm(f => ({ ...f, start_time: e.target.value }))} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>{t('End Time')}</Label>
                <Input type="time" value={templateForm.end_time} onChange={e => setTemplateForm(f => ({ ...f, end_time: e.target.value }))} />
              </FormGroup>
            </Col>
          </Row>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Break (minutes)')}</Label>
                <Input type="number" min={0} value={templateForm.break_minutes} onChange={e => setTemplateForm(f => ({ ...f, break_minutes: +e.target.value }))} />
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Colour')}</Label>
                <Input type="color" value={templateForm.color} onChange={e => setTemplateForm(f => ({ ...f, color: e.target.value }))} />
              </FormGroup>
            </Col>
          </Row>
          <div className="form-check form-switch mt-1">
            <Input
              type="checkbox"
              className="form-check-input"
              id="is_overnight"
              checked={templateForm.is_overnight}
              onChange={e => setTemplateForm(f => ({ ...f, is_overnight: e.target.checked }))}
            />
            <Label className="form-check-label ms-75" htmlFor="is_overnight">
              {t('Overnight shift (spans midnight)')}
            </Label>
          </div>
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setTemplateModal(false)}>{t('Cancel')}</Button>
          <Button color="primary" onClick={handleTemplateSubmit} disabled={!store.loading || !templateForm.name || !templateForm.code}>
            {!store.loading ? <Spinner size="sm" /> : editingTemplate ? t('Update') : t('Create')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Assign Shift Modal ── */}
      <Modal isOpen={assignModal} toggle={() => setAssignModal(false)} centered>
        <ModalHeader toggle={() => setAssignModal(false)}>{t('Assign Shift')}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t('Employee')} <span className="text-danger">*</span></Label>
            <Input type="select" value={assignForm.user_id} onChange={e => setAssignForm(f => ({ ...f, user_id: e.target.value }))}>
              <option value="">{t('Select employee...')}</option>
              {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.first_name || emp.firstName} {emp.last_name || emp.lastName}</option>)}
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>{t('Date')} <span className="text-danger">*</span></Label>
            <DateInput value={assignForm.date} onChange={(dates, str, iso) => setAssignForm(f => ({ ...f, date: iso }))} id="assignDate" />
          </FormGroup>
          <FormGroup>
            <Label>{t('Shift Template')}</Label>
            <Input type="select" value={assignForm.shift_template_id} onChange={e => setAssignForm(f => ({ ...f, shift_template_id: e.target.value }))}>
              <option value="">{t('Custom / No template')}</option>
              {store.templates.map(tmpl => <option key={tmpl._id} value={tmpl._id}>{tmpl.code} – {tmpl.name}</option>)}
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>{t('Notes')}</Label>
            <Input type="textarea" rows={2} value={assignForm.notes} onChange={e => setAssignForm(f => ({ ...f, notes: e.target.value }))} />
          </FormGroup>
          {assignForm.date && holidayMap[assignForm.date] && (
            <Alert color="info" className="mt-1 mb-0">
              <strong>{t('Holiday:')}</strong> {holidayMap[assignForm.date].map(h => h.name).join(', ')}
            </Alert>
          )}
          {assignForm.user_id && assignForm.date && leaveGrid[assignForm.user_id]?.[assignForm.date] && (
            <Alert color="warning" className="mt-1 mb-0">
              <strong>{t('Warning:')}</strong> {t('This employee has approved leave on this date. You can still assign the shift, but it may cause a scheduling conflict.')}
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setAssignModal(false)}>{t('Cancel')}</Button>
          <Button color="primary" onClick={async () => { setSubmitting(true); try { await dispatch(createAssignment(assignForm)) } finally { setSubmitting(false) } }} disabled={!store.loading || !assignForm.user_id || !assignForm.date}>
            {!store.loading ? <Spinner size="sm" /> : t('Assign')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Bulk Assign Modal ── */}
      <Modal isOpen={bulkModal} toggle={() => setBulkModal(false)} centered>
        <ModalHeader toggle={() => setBulkModal(false)}>{t('Bulk Assign Week')}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t('Employees')} <span className="text-danger">*</span></Label>
            <Input type="select" multiple value={bulkForm.user_ids}
              onChange={e => setBulkForm(f => ({ ...f, user_ids: Array.from(e.target.selectedOptions).map(o => o.value) }))}
              style={{ minHeight: 120 }}>
              {employees.map(emp => <option key={emp._id} value={emp._id}>{emp.first_name || emp.firstName} {emp.last_name || emp.lastName}</option>)}
            </Input>
            <small className="text-muted">{t('Hold Ctrl/Cmd to select multiple')}</small>
          </FormGroup>
          <FormGroup>
            <Label>{t('Week starting (Monday)')} <span className="text-danger">*</span></Label>
            <DateInput value={bulkForm.monday} onChange={(dates, str, iso) => setBulkForm(f => ({ ...f, monday: iso }))} id="bulkMonday" />
          </FormGroup>
          <FormGroup>
            <Label>{t('Shift Template')} <span className="text-danger">*</span></Label>
            <Input type="select" value={bulkForm.shift_template_id} onChange={e => setBulkForm(f => ({ ...f, shift_template_id: e.target.value }))}>
              <option value="">{t('Select template...')}</option>
              {store.templates.map(tmpl => <option key={tmpl._id} value={tmpl._id}>{tmpl.code} – {tmpl.name}</option>)}
            </Input>
          </FormGroup>
          <FormGroup>
            <Label>{t('Days')}</Label>
            <div className="d-flex gap-1 flex-wrap">
              {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day, i) => (
                <div key={i} className="form-check me-1">
                  <Input type="checkbox" className="form-check-input" id={`day-${i}`}
                    checked={bulkForm.include_days.includes(i)}
                    onChange={e => setBulkForm(f => ({
                      ...f,
                      include_days: e.target.checked ? [...f.include_days, i] : f.include_days.filter(d => d !== i)
                    }))} />
                  <Label className="form-check-label" htmlFor={`day-${i}`}>{day}</Label>
                </div>
              ))}
            </div>
          </FormGroup>
          {Object.keys(holidayMap).length > 0 && (
            <Alert color="info" className="mt-1 mb-0">
              <small>
                <strong>{t('Note:')}</strong> {t('Holidays will be skipped automatically:')}{' '}
                {Object.entries(holidayMap).map(([date, holidays]) =>
                  `${formatDate(date)} (${holidays.map(h => h.name).join(', ')})`
                ).join('; ')}
              </small>
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setBulkModal(false)}>{t('Cancel')}</Button>
          <Button color="primary" disabled={!store.loading || !bulkForm.user_ids.length || !bulkForm.monday || !bulkForm.shift_template_id}
            onClick={async () => { setSubmitting(true); try { await dispatch(bulkAssign({ ...bulkForm, exclude_dates: Object.keys(holidayMap) })) } finally { setSubmitting(false) } }}>
            {!store.loading ? <Spinner size="sm" /> : t('Assign')}
          </Button>
        </ModalFooter>
      </Modal>

      {/* ── Copy Week Modal ── */}
      <Modal isOpen={copyModal} toggle={() => setCopyModal(false)} centered>
        <ModalHeader toggle={() => setCopyModal(false)}>{t('Copy Week')}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t('Source Week (Monday)')}</Label>
            <DateInput value={copyForm.source_monday} onChange={(dates, str, iso) => setCopyForm(f => ({ ...f, source_monday: iso }))} id="copySourceMonday" />
          </FormGroup>
          <FormGroup>
            <Label>{t('Target Week (Monday)')}</Label>
            <DateInput value={copyForm.target_monday} onChange={(dates, str, iso) => setCopyForm(f => ({ ...f, target_monday: iso }))} id="copyTargetMonday" />
          </FormGroup>
          {Object.keys(holidayMap).length > 0 && (
            <Alert color="info" className="mt-1 mb-0">
              <small>
                <strong>{t('Note:')}</strong> {t('Holidays in target week will be skipped automatically:')}{' '}
                {Object.entries(holidayMap).map(([date, holidays]) =>
                  `${formatDate(date)} (${holidays.map(h => h.name).join(', ')})`
                ).join('; ')}
              </small>
            </Alert>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color="secondary" outline onClick={() => setCopyModal(false)}>{t('Cancel')}</Button>
          <Button color="primary" disabled={!store.loading || !copyForm.source_monday || !copyForm.target_monday}
            onClick={async () => { setSubmitting(true); try { await dispatch(copyWeek({ ...copyForm, exclude_dates: Object.keys(holidayMap) })) } finally { setSubmitting(false) } }}>
            {!store.loading ? <Spinner size="sm" /> : t('Copy')}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  )
}

/* ── Shift Notification Settings Component ── */
import NotificationSettingsPanel from '@components/notification-settings'

const SHIFT_EVENTS = [
  { key: 'SHIFT_PUBLISHED', label: 'Shift Published' },
  { key: 'SHIFT_UPDATED', label: 'Shift Updated' },
  { key: 'SHIFT_SWAP_REQUESTED', label: 'Swap Requested' },
  { key: 'SHIFT_SWAP_APPROVED', label: 'Swap Approved' },
  { key: 'SHIFT_SWAP_REJECTED', label: 'Swap Rejected' },
  { key: 'SHIFT_SWAP_ACCEPTED', label: 'Swap Accepted' },
  { key: 'SHIFT_SWAP_DECLINED', label: 'Swap Declined' },
]

const ShiftNotificationSettings = () => (
  <NotificationSettingsPanel events={SHIFT_EVENTS} />
)

const _ShiftNotificationSettings_OLD = ({ t }) => {
  const [preferences, setPreferences] = useState({})
  const [prefLoading, setPrefLoading] = useState(false)
  const [prefSaving, setPrefSaving] = useState(false)

  const [selectedEvent, setSelectedEvent] = useState('')
  const [templateData, setTemplateData] = useState(null)
  const [templateLoading, setTemplateLoading] = useState(false)
  const [templateSaving, setTemplateSaving] = useState(false)
  const [customSubject, setCustomSubject] = useState('')
  const [customBody, setCustomBody] = useState('')
  const [templateChannel, setTemplateChannel] = useState('email')

  // Load preferences
  useEffect(() => {
    setPrefLoading(true)
    instance.get('/admin/notification/preferences')
      .then(res => {
        const data = res.data?.data || res.data || {}
        const prefs = {}
        SHIFT_EVENTS.forEach(evt => {
          prefs[evt.key] = data[evt.key] || { email: true, sms: false, whatsapp: false }
        })
        setPreferences(prefs)
      })
      .catch(() => {
        const defaults = {}
        SHIFT_EVENTS.forEach(evt => { defaults[evt.key] = { email: true, sms: false, whatsapp: false } })
        setPreferences(defaults)
      })
      .finally(() => setPrefLoading(false))
  }, [])

  const togglePref = (eventKey, channel) => {
    setPreferences(prev => ({
      ...prev,
      [eventKey]: { ...prev[eventKey], [channel]: !prev[eventKey]?.[channel] }
    }))
  }

  const savePreferences = async () => {
    setPrefSaving(true)
    try {
      await instance.put('/admin/notification/preferences', { preferences })
      Notification('Success', t('Notification preferences saved.'), 'success')
    } catch {
      Notification('Error', t('Failed to save preferences.'), 'warning')
    } finally {
      setPrefSaving(false)
    }
  }

  // Load template when event selection changes
  useEffect(() => {
    if (!selectedEvent) { setTemplateData(null); return }
    setTemplateLoading(true)
    instance.get(`/admin/notification/templates/${selectedEvent}`)
      .then(res => {
        const data = res.data?.data || res.data || {}
        setTemplateData(data)
        setCustomSubject(data.custom_subject || data.subject || '')
        setCustomBody(data.custom_body || data.body || '')
        setTemplateChannel(data.channel || 'email')
      })
      .catch(() => {
        setTemplateData(null)
        setCustomSubject('')
        setCustomBody('')
      })
      .finally(() => setTemplateLoading(false))
  }, [selectedEvent])

  const saveTemplate = async () => {
    if (!selectedEvent) return
    setTemplateSaving(true)
    try {
      await instance.put(`/admin/notification/templates/${selectedEvent}`, {
        channel: templateChannel,
        subject: customSubject,
        body: customBody,
      })
      Notification('Success', t('Template saved.'), 'success')
    } catch {
      Notification('Error', t('Failed to save template.'), 'warning')
    } finally {
      setTemplateSaving(false)
    }
  }

  const deleteTemplate = async () => {
    if (!selectedEvent) return
    setTemplateSaving(true)
    try {
      await instance.delete(`/admin/notification/templates/${selectedEvent}`)
      setCustomSubject('')
      setCustomBody('')
      setTemplateData(prev => prev ? { ...prev, custom_subject: '', custom_body: '' } : prev)
      Notification('Success', t('Custom template removed.'), 'success')
    } catch {
      Notification('Error', t('Failed to delete template.'), 'warning')
    } finally {
      setTemplateSaving(false)
    }
  }

  return (
    <Fragment>
      {/* ── Notification Preferences ── */}
      <Card>
        <CardHeader className="border-bottom py-1 d-flex align-items-center justify-content-between">
          <CardTitle tag="h5" className="mb-0">{t('Notification Preferences')}</CardTitle>
          <Button color="primary" size="sm" onClick={savePreferences} disabled={prefSaving}>
            {prefSaving ? <Spinner size="sm" /> : t('Save Preferences')}
          </Button>
        </CardHeader>
        <CardBody>
          {prefLoading ? (
            <div className="text-center p-4"><Spinner /></div>
          ) : (
            <Table bordered size="sm" responsive>
              <thead>
                <tr>
                  <th>{t('Event')}</th>
                  <th className="text-center">{t('Email')}</th>
                  <th className="text-center">{t('SMS')}</th>
                  <th className="text-center">{t('WhatsApp')}</th>
                </tr>
              </thead>
              <tbody>
                {SHIFT_EVENTS.map(evt => (
                  <tr key={evt.key}>
                    <td>{t(evt.label)}</td>
                    {CHANNELS.map(ch => (
                      <td key={ch} className="text-center">
                        <Input
                          type="checkbox"
                          checked={!!preferences[evt.key]?.[ch]}
                          onChange={() => togglePref(evt.key, ch)}
                          style={{ cursor: 'pointer' }}
                        />
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </Table>
          )}
        </CardBody>
      </Card>

      {/* ── Email / SMS Templates ── */}
      <Card>
        <CardHeader className="border-bottom py-1">
          <CardTitle tag="h5" className="mb-0">{t('Email / SMS Templates')}</CardTitle>
        </CardHeader>
        <CardBody>
          <Row>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Select Event')}</Label>
                <Input type="select" value={selectedEvent} onChange={e => setSelectedEvent(e.target.value)}>
                  <option value="">{t('-- Select event --')}</option>
                  {SHIFT_EVENTS.map(evt => (
                    <option key={evt.key} value={evt.key}>{t(evt.label)}</option>
                  ))}
                </Input>
              </FormGroup>
            </Col>
            <Col md={6}>
              <FormGroup>
                <Label>{t('Channel')}</Label>
                <Input type="select" value={templateChannel} onChange={e => setTemplateChannel(e.target.value)}>
                  <option value="email">{t('Email')}</option>
                  <option value="sms">{t('SMS')}</option>
                  <option value="whatsapp">{t('WhatsApp')}</option>
                </Input>
              </FormGroup>
            </Col>
          </Row>

          {templateLoading && <div className="text-center p-2"><Spinner size="sm" /></div>}

          {selectedEvent && !templateLoading && (
            <Fragment>
              {templateData?.system_subject && (
                <Alert color="light-secondary" className="mb-1">
                  <small className="d-block"><strong>{t('System Template (reference):')}</strong></small>
                  <small className="d-block"><strong>{t('Subject:')}</strong> {templateData.system_subject}</small>
                  <small className="d-block mt-25"><strong>{t('Body:')}</strong> {templateData.system_body}</small>
                </Alert>
              )}
              <FormGroup>
                <Label>{t('Subject')}</Label>
                <Input
                  value={customSubject}
                  onChange={e => setCustomSubject(e.target.value)}
                  placeholder={t('Custom subject line...')}
                />
              </FormGroup>
              <FormGroup>
                <Label>{t('Body')}</Label>
                <Input
                  type="textarea"
                  rows={6}
                  value={customBody}
                  onChange={e => setCustomBody(e.target.value)}
                  placeholder={t('Custom template body...')}
                />
              </FormGroup>
              <div className="d-flex gap-1">
                <Button color="primary" size="sm" onClick={saveTemplate} disabled={templateSaving}>
                  {templateSaving ? <Spinner size="sm" /> : t('Save Template')}
                </Button>
                <Button color="danger" size="sm" outline onClick={deleteTemplate} disabled={templateSaving}>
                  {t('Delete Custom Template')}
                </Button>
              </div>
            </Fragment>
          )}
        </CardBody>
      </Card>
    </Fragment>
  )
}

export default ShiftAdminPage
