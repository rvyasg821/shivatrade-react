import React, { Fragment, useEffect, useState, useCallback } from 'react'
import { useDispatch, useSelector } from 'react-redux'
import {
  Card, CardBody, CardHeader, CardTitle,
  Button, Badge, Row, Col, Spinner,
  Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Input,
  Nav, NavItem, NavLink, TabContent, TabPane, UncontrolledTooltip,
} from 'reactstrap'
import { Calendar, Clock, RefreshCw, CheckCircle, XCircle, ChevronLeft, ChevronRight } from 'react-feather'
import {
  getMyShifts, getTodayShift, getMySwapRequests, getSwapColleagues,
  requestSwap, respondSwap, cancelSwap, clearShiftActionFlag,
} from './store'
import { getMyLeaveRequests } from '@src/views/leave/store'
import Select from 'react-select'
import { getHolidaysForRange } from '@src/views/holiday-calendar/store'
import Notification from '@components/toast/notification'
import DatatablePagination from '@components/datatable/DatatablePagination'
import { formatDate, formatTimeStr } from '@src/utility/dateFormat'

const STATUS_COLORS = {
  scheduled: 'light-secondary',
  confirmed: 'light-success',
  swapped: 'light-info',
  cancelled: 'light-danger',
}

const SWAP_COLORS = {
  pending: 'light-warning',
  accepted: 'light-info',
  rejected: 'light-danger',
  admin_approved: 'light-success',
  admin_rejected: 'light-danger',
}

const startOfWeek = (offset = 0) => {
  const d = new Date()
  const day = d.getDay() || 7
  d.setDate(d.getDate() - day + 1 + offset * 7)
  return d.toISOString().split('T')[0]
}

const addDays = (dateStr, n) => {
  const d = new Date(dateStr)
  d.setDate(d.getDate() + n)
  return d.toISOString().split('T')[0]
}


const ShiftPage = () => {
  const dispatch = useDispatch()
  const store = useSelector((s) => s.shift)
  const authStore = useSelector((s) => s.auth)
  const currentUserId = authStore?.authUserItem?._id
  const holidayCalendarStore = useSelector((s) => s.holidayCalendar)

  const [weekOffset, setWeekOffset] = useState(0)
  const [tab, setTab] = useState('schedule')

  // Swap request modal
  const [swapModal, setSwapModal] = useState(false)
  const [swapData, setSwapData] = useState({ requester_assignment_id: '', target_id: '', reason: '' })
  const [submitting, setSubmitting] = useState(false)

  const monday = startOfWeek(weekOffset)
  const sunday = addDays(monday, 6)

  const pendingSwaps = store.mySwapRequests.filter((s) => s.status === 'pending').length

  const leaveStore = useSelector((s) => s.leave)

  const load = useCallback(() => {
    dispatch(getTodayShift())
    dispatch(getMyShifts({ startDate: monday, endDate: sunday }))
    dispatch(getMySwapRequests())
    dispatch(getSwapColleagues())
    dispatch(getHolidaysForRange({ start_date: monday, end_date: sunday, _limit: 100 }))
    dispatch(getMyLeaveRequests(new Date(monday).getFullYear()))
  }, [dispatch, monday, sunday])

  useEffect(() => { load() }, [load])

  // Build employee dropdown options from colleagues
  const colleagueOptions = (store.swapColleagues || []).map((emp) => ({
    value: emp._id,
    label: `${emp.first_name || ''} ${emp.last_name || ''}`.trim() +
           (emp.employee_code ? ` (${emp.employee_code})` : ''),
  }))

  useEffect(() => {
    if (['REQUEST_SWAP', 'RESPOND_SWAP', 'CANCEL_SWAP'].includes(store.actionFlag)) {
      Notification('Success', 'Action completed successfully.', 'success')
      setSwapModal(false)
      setSwapData({ requester_assignment_id: '', target_id: '', reason: '' })
      setSubmitting(false)
      dispatch(getMySwapRequests())
    }
    if (store.error) { Notification('Error', store.error, 'warning'); setSubmitting(false) }
    if (store.actionFlag) dispatch(clearShiftActionFlag())
  }, [store.actionFlag, store.error, dispatch])

  const today = store.todayShift

  // Build holidayMap for the current week
  const holidayMap = {}
  for (const h of (holidayCalendarStore?.rangeHolidays || [])) {
    const dateStr = (h.date || '').split('T')[0]
    if (dateStr) {
      if (!holidayMap[dateStr]) holidayMap[dateStr] = []
      holidayMap[dateStr].push(h)
    }
  }

  // Build leaveMap for approved leaves
  const leaveDates = new Set()
  for (const req of (leaveStore?.myRequests || [])) {
    if (req.status !== 'approved') continue
    const start = new Date(req.start_date)
    const end = new Date(req.end_date)
    const cur = new Date(start)
    while (cur <= end) {
      leaveDates.add(cur.toISOString().split('T')[0])
      cur.setDate(cur.getDate() + 1)
    }
  }

  // ── Column definitions ──────────────────────────────────────────────────────

  const shiftColumns = [
    {
      name: 'Date',
      minWidth: '160px',
      cell: (a) => (
        <span className='fw-semibold text-body'>{formatDate(a.date)}</span>
      ),
    },
    {
      name: 'Time',
      minWidth: '180px',
      center: true,
      cell: (a) => (
        <span>{formatTimeStr(a.start_time)} – {formatTimeStr(a.end_time)}</span>
      ),
    },
    {
      name: 'Status',
      minWidth: '150px',
      center: true,
      cell: (a) => {
        const dateStr = (a.date || '').split('T')[0]
        const dayHolidays = holidayMap[dateStr]
        const isOnLeave = leaveDates.has(dateStr)

        if (isOnLeave) {
          return <span className='doc-badge' style={{ backgroundColor: '#09418b', color: '#fff' }}>On Leave</span>
        }
        if (dayHolidays && dayHolidays.length > 0) {
          return <span className='doc-badge' style={{ backgroundColor: '#28a745', color: '#fff' }}>{dayHolidays.map(h => h.name).join(', ')}</span>
        }
        return <span className={`doc-badge ${a.status === 'scheduled' ? 'doc-badge-gray' : a.status === 'confirmed' ? 'doc-badge-green' : a.status === 'swapped' ? 'doc-badge-orange' : 'doc-badge-red'}`}>
          {(a.status || '—').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      },
    },
    {
      name: 'Published',
      minWidth: '120px',
      center: true,
      cell: (a) => a.published
        ? <CheckCircle size={15} className='text-success' />
        : <XCircle size={15} className='text-muted' />,
    },
    {
      name: 'Notes',
      minWidth: '180px',
      cell: (a) => <span className='small text-muted'>{a.notes || '—'}</span>,
    },
    {
      name: 'Action',
      minWidth: '160px',
      center: true,
      cell: (a) => {
        if (a.status !== 'scheduled' || !a.published) return null
        const dateStr = (a.date || '').split('T')[0]
        const isOnLeave = leaveDates.has(dateStr)
        const isHoliday = !!(holidayMap[dateStr]?.length)
        const isBlocked = isOnLeave || isHoliday

        return (
          <Button
            size='sm'
            color='warning'
            outline
            disabled={isBlocked}
            onClick={() => {
              setSwapData((d) => ({ ...d, requester_assignment_id: a._id }))
              setSwapModal(true)
            }}
            title={isOnLeave ? 'On leave — swap not available' : isHoliday ? 'Holiday — swap not available' : ''}
          >
            <RefreshCw size={12} className='me-50' />Request Swap
          </Button>
        )
      },
    },
  ]

  const swapColumns = [
    {
      name: 'Requested By',
      minWidth: '160px',
      cell: (s) => {
        const isRequester = s.requester_id === currentUserId
        return (
          <div>
            <div className='fw-semibold'>{isRequester ? 'You' : (s.requester_name || '—')}</div>
            {!isRequester && s.requester_email && <div className='small text-muted'>{s.requester_email}</div>}
          </div>
        )
      },
    },
    {
      name: 'Requester Shift',
      minWidth: '160px',
      cell: (s) => (
        <div>
          <div className='fw-semibold'>{s.requester_shift_date ? formatDate(s.requester_shift_date) : '—'}</div>
          {s.requester_shift_start && <div className='small text-muted'>{formatTimeStr(s.requester_shift_start)} – {formatTimeStr(s.requester_shift_end)}</div>}
        </div>
      ),
    },
    {
      name: 'Swap With',
      minWidth: '160px',
      cell: (s) => {
        if (!s.target_id) return <span className='text-muted'>Open swap</span>
        const isTarget = s.target_id === currentUserId
        return (
          <div>
            <div className='fw-semibold'>{isTarget ? 'You' : (s.target_name || '—')}</div>
            {!isTarget && s.target_email && <div className='small text-muted'>{s.target_email}</div>}
          </div>
        )
      },
    },
    {
      name: 'Target Shift',
      minWidth: '160px',
      cell: (s) => s.target_shift_date ? (
        <div>
          <div className='fw-semibold'>{formatDate(s.target_shift_date)}</div>
          {s.target_shift_start && <div className='small text-muted'>{formatTimeStr(s.target_shift_start)} – {formatTimeStr(s.target_shift_end)}</div>}
        </div>
      ) : <span className='text-muted'>—</span>,
    },
    {
      name: 'Status',
      minWidth: '130px',
      center: true,
      cell: (s) => <Badge color={SWAP_COLORS[s.status] || 'light-secondary'}>{s.status?.replace('_', ' ')}</Badge>,
    },
    {
      name: 'Reason',
      minWidth: '140px',
      cell: (s) => <span className='small text-muted'>{s.reason || '—'}</span>,
    },
    {
      name: 'Actions',
      minWidth: '200px',
      center: true,
      cell: (s) => {
        const isRequester = s.requester_id === currentUserId
        const isTarget = s.target_id === currentUserId
        return (
          <div className='d-flex gap-50 align-items-center justify-content-center'>
            {/* Target sees Accept / Decline when pending */}
            {s.status === 'pending' && isTarget && (
              <>
                <Button size='sm' color='success' onClick={() => dispatch(respondSwap({ id: s._id, data: { accept: true } }))}>
                  Accept
                </Button>
                <Button size='sm' color='danger' outline onClick={() => dispatch(respondSwap({ id: s._id, data: { accept: false } }))}>
                  Decline
                </Button>
              </>
            )}
            {/* Requester sees Cancel when pending or accepted (before admin decision) */}
            {['pending', 'accepted'].includes(s.status) && isRequester && (
              <Button size='sm' color='secondary' outline onClick={() => dispatch(cancelSwap(s._id))}>
                Cancel
              </Button>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <Fragment>
      {/* ── Page Header ── */}
      <div className='d-flex align-items-center justify-content-between mb-2'>
        <h3 className='mb-0'>
          <Calendar size={18} className='me-1' />
          My Shifts
        </h3>
      </div>

      {/* ── Today's Shift Banner ── */}
      {today && (
        <Card className='mb-2 border-left-primary'>
          <CardBody className='py-1'>
            <Row className='align-items-center'>
              <Col>
                <div className='d-flex align-items-center gap-75'>
                  <Clock size={15} className='text-primary' />
                  <span className='fw-semibold'>Today's Shift:</span>
                  <span className='text-muted'>{formatTimeStr(today.start_time)} – {formatTimeStr(today.end_time)}</span>
                </div>
              </Col>
              <Col xs='auto' className='d-flex gap-50'>
                <Badge color={STATUS_COLORS[today.status] || 'light-secondary'} pill>{today.status}</Badge>
                {!today.published && <Badge color='light-warning' pill>Unpublished</Badge>}
              </Col>
            </Row>
          </CardBody>
        </Card>
      )}

      {/* ── Tabs ── */}
      <Card className='mb-0'>
        <CardBody className='pb-0 pt-2 px-2'>
          <Nav tabs className='mb-0'>
            <NavItem>
              <NavLink active={tab === 'schedule'} onClick={() => setTab('schedule')} style={{ cursor: 'pointer' }}>
                Schedule
              </NavLink>
            </NavItem>
            <NavItem>
              <NavLink active={tab === 'swaps'} onClick={() => setTab('swaps')} style={{ cursor: 'pointer' }}>
                Swap Requests
                {pendingSwaps > 0 && (
                  <Badge color='danger' className='ms-50' pill>{pendingSwaps}</Badge>
                )}
              </NavLink>
            </NavItem>
          </Nav>
        </CardBody>
      </Card>

      <TabContent activeTab={tab} className='mt-2'>

        {/* ── SCHEDULE TAB ── */}
        <TabPane tabId='schedule'>
          <Card>
            <CardHeader className='border-bottom py-1 d-flex align-items-center justify-content-between'>
              <CardTitle tag='h5' className='mb-0'>Week: {formatDate(monday)} – {formatDate(sunday)}</CardTitle>
              <div className='d-flex gap-50'>
                <Button size='sm' outline onClick={() => setWeekOffset((w) => w - 1)}>
                  <ChevronLeft size={14} />Prev
                </Button>
                <Button size='sm' outline color='secondary' onClick={() => setWeekOffset(0)}>
                  This Week
                </Button>
                <Button size='sm' outline onClick={() => setWeekOffset((w) => w + 1)}>
                  Next<ChevronRight size={14} />
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              <DatatablePagination
                columns={shiftColumns}
                data={store.myShifts}
                loading={store.loading}
                disablePagination
              />
            </CardBody>
          </Card>
        </TabPane>

        {/* ── SWAPS TAB ── */}
        <TabPane tabId='swaps'>
          <Card>
            <CardHeader className='border-bottom py-1'>
              <CardTitle tag='h5' className='mb-0'>My Swap Requests</CardTitle>
            </CardHeader>
            <CardBody>
              <DatatablePagination
                columns={swapColumns}
                data={store.mySwapRequests}
                loading={store.loading}
                disablePagination
              />
            </CardBody>
          </Card>
        </TabPane>

      </TabContent>

      {/* ── Swap Request Modal ── */}
      <Modal isOpen={swapModal} toggle={() => setSwapModal(false)} centered>
        <ModalHeader toggle={() => setSwapModal(false)}>Request Shift Swap</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>Target Employee <span className='text-muted small'>(optional — leave blank for open swap)</span></Label>
            <Select
              isClearable
              placeholder='Select employee...'
              options={colleagueOptions}
              value={colleagueOptions.find((o) => o.value === swapData.target_id) || null}
              onChange={(opt) => setSwapData((d) => ({ ...d, target_id: opt?.value || '' }))}
              className='react-select'
              classNamePrefix='select'
            />
          </FormGroup>
          <FormGroup>
            <Label>Reason <span className='text-muted small'>(optional)</span></Label>
            <Input
              type='textarea'
              rows={2}
              value={swapData.reason}
              onChange={(e) => setSwapData((d) => ({ ...d, reason: e.target.value }))}
            />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' outline onClick={() => setSwapModal(false)}>Cancel</Button>
          <Button color='warning' onClick={() => { setSubmitting(true); dispatch(requestSwap(swapData)) }} disabled={submitting}>
            {submitting ? <Spinner size='sm' /> : 'Submit Request'}
          </Button>
        </ModalFooter>
      </Modal>
    </Fragment>
  )
}

export default ShiftPage
