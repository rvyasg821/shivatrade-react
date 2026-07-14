// ** React Imports
import { Fragment, useEffect, useState, useCallback, useRef } from 'react'
import useFormLoading from '@src/hooks/useFormLoading'
import { useDispatch, useSelector } from 'react-redux'
import {
  getLeaveTypeList, createLeaveType, updateLeaveType, deleteLeaveType,
  getLeavePolicy, updateLeavePolicy,
  getUserEntitlements, updateEntitlement,
  getLeaveRequestList, approveLeaveRequest, rejectLeaveRequest,
  adminCreateLeaveRequest, changeLeaveStatus, deleteLeaveRequest,
  getLeaveConflicts, clearLeaveMessages, clearConflictData, clearEntitlementItems,
} from '../store'
import { getEmployeeList } from '@src/views/employees/store'
import { formatDate, formatDateTime } from '@src/utility/dateFormat'

// ** Reactstrap
import {
  Row, Col, Card, CardBody, CardHeader, CardTitle, Button, Badge,
  Nav, NavItem, NavLink, TabContent, TabPane,
  Modal, ModalHeader, ModalBody, ModalFooter,
  FormGroup, Label, Input, Form, Spinner, UncontrolledTooltip,
} from 'reactstrap'

// ** Components
import Notification from '@components/toast/notification'
import DatatablePagination from '@components/datatable/DatatablePagination'

// ** Third Party
import { useTranslation } from 'react-i18next'
import Select from 'react-select'
import Swal from 'sweetalert2'
import withReactContent from 'sweetalert2-react-content'
import { Calendar, Edit2, Trash2, Plus, CheckCircle, XCircle, RefreshCw, User, AlertTriangle, Edit3 } from 'react-feather'

// ** Constants
import { defaultPerPageRow } from '@constant/defaultValues'
import DateInput from '@components/date-input'
import SetupReturnBanner from '@src/components/SetupReturnBanner'
import instance from '@src/utility/AxiosConfig'

const MySwal = withReactContent(Swal)

const statusBadgeClass = {
  pending: 'doc-badge-orange',
  approved: 'doc-badge-green',
  rejected: 'doc-badge-red',
  cancelled: 'doc-badge-gray',
}

const accrualOptions = [
  { value: 'annual', label: 'Annual (all at once)' },
  { value: 'monthly', label: 'Monthly (accrual)' },
  { value: 'none', label: 'None' },
]

const statusOptions = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'rejected', label: 'Rejected' },
  { value: 'cancelled', label: 'Cancelled' },
]

const defaultLeaveTypeForm = {
  name: '',
  color: '#0ea5e9',
  is_paid: true,
  requires_approval: true,
  max_days_per_year: '',
  carry_over_allowed: false,
  max_carry_over_days: '',
  accrual_method: 'annual',
  notice_days: 0,
  documentation_required: false,
  documentation_after_days: 3,
  is_active: true,
}

// ─── Review Modal Content ────────────────────────────────────────────────────

const ReviewModalContent = ({ store, employeeMap, leaveTypeMap, t }) => {
  const conflictData = store?.conflictData
  if (!conflictData?.request) {
    return (
      <div className='text-center py-3'>
        <Spinner size='sm' className='me-1' />
        <span className='text-muted'>{t('Loading conflict data...')}</span>
      </div>
    )
  }

  const req = conflictData.request
  const overlaps = conflictData.overlapping_leaves || []
  const shifts = conflictData.affected_shifts || []
  const emp = employeeMap[req.user_id]
  const lt = leaveTypeMap[req.leave_type_id]

  return (
    <>
      {/* Request Details */}
      <div className='mb-2 p-2 rounded' style={{ backgroundColor: '#f8f9fa' }}>
        <Row>
          <Col md={6}>
            <p className='mb-50'><strong>{t('Employee')}:</strong> {emp ? `${emp.first_name || emp.firstName} ${emp.last_name || emp.lastName}` : req.user_id?.substring(0, 8)}</p>
            <p className='mb-50'><strong>{t('Leave Type')}:</strong> {lt?.name || '—'}</p>
          </Col>
          <Col md={6}>
            <p className='mb-50'><strong>{t('Dates')}:</strong> {formatDate(req.start_date)} — {formatDate(req.end_date)}</p>
            <p className='mb-50'><strong>{t('Total Days')}:</strong> {req.total_days}</p>
          </Col>
        </Row>
        {req.reason && <p className='mb-0 small text-muted'><strong>{t('Reason')}:</strong> {req.reason}</p>}
      </div>

      {/* Overlapping Leaves */}
      {overlaps.length > 0 && (
        <div className='mb-2'>
          <h6 className='d-flex align-items-center gap-50 text-warning'>
            <AlertTriangle size={16} />
            {t('Other Employees on Leave')} ({overlaps.length})
          </h6>
          <div className='table-responsive'>
            <table className='table table-sm table-bordered mb-0'>
              <thead style={{ backgroundColor: '#fff3cd' }}>
                <tr>
                  <th>{t('Employee')}</th>
                  <th>{t('Leave Type')}</th>
                  <th>{t('Dates')}</th>
                  <th>{t('Days')}</th>
                  <th>{t('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {overlaps.map((ol) => {
                  const olEmp = employeeMap[ol.user_id]
                  const olLt = leaveTypeMap[ol.leave_type_id]
                  return (
                    <tr key={ol._id}>
                      <td className='small'>{olEmp ? `${olEmp.first_name || olEmp.firstName} ${olEmp.last_name || olEmp.lastName}` : ol.user_id?.substring(0, 8)}</td>
                      <td className='small'>{olLt?.name || '—'}</td>
                      <td className='small'>{formatDate(ol.start_date)} — {formatDate(ol.end_date)}</td>
                      <td className='small text-center'>{ol.total_days}</td>
                      <td><span className={`doc-badge ${statusBadgeClass[ol.status] || 'doc-badge-gray'}`} style={{ fontSize: '0.7rem' }}>{(ol.status || '—').replace(/\b\w/g, c => c.toUpperCase())}</span></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Affected Shifts */}
      {shifts.length > 0 && (
        <div className='mb-2'>
          <h6 className='d-flex align-items-center gap-50 text-danger'>
            <AlertTriangle size={16} />
            {t('Shift Conflicts')} ({shifts.length})
          </h6>
          <div className='table-responsive'>
            <table className='table table-sm table-bordered mb-0'>
              <thead style={{ backgroundColor: '#f8d7da' }}>
                <tr>
                  <th>{t('Date')}</th>
                  <th>{t('Shift')}</th>
                  <th>{t('Status')}</th>
                </tr>
              </thead>
              <tbody>
                {shifts.map((sh) => (
                  <tr key={sh._id}>
                    <td className='small'>{formatDate(sh.date)}</td>
                    <td className='small'>{sh.start_time && sh.end_time ? `${sh.start_time.slice(0, 5)} – ${sh.end_time.slice(0, 5)}` : t('Custom')}</td>
                    <td className='small'>{sh.status || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* No conflicts */}
      {overlaps.length === 0 && shifts.length === 0 && (
        <div className='text-center py-2'>
          <CheckCircle size={24} className='text-success mb-1' />
          <p className='text-success fw-semibold mb-0'>{t('No conflicts found')}</p>
        </div>
      )}
    </>
  )
}

// ─── TAB: Leave Requests ─────────────────────────────────────────────────────

const RequestsTab = ({ leaveTypeMap, employeeMap, canWrite }) => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const store = useSelector((s) => s.leave)
  const locationCtx = useSelector((s) => s.locationContext)
  const { selectedLocationId } = locationCtx || {}

  const [submitting, setSubmitting] = useState(false)
  useFormLoading(submitting)

  const [currentPage, setCurrentPage] = useState(1)
  const [perPage, setPerPage] = useState(defaultPerPageRow)
  const [statusFilter, setStatusFilter] = useState(null)
  const [rejectModal, setRejectModal] = useState(false)
  const [rejectId, setRejectId] = useState(null)
  const [rejectReason, setRejectReason] = useState('')
  const [reviewModal, setReviewModal] = useState(false)
  const [reviewId, setReviewId] = useState(null)

  // Status change modal
  const [statusModal, setStatusModal] = useState(false)
  const [statusChangeId, setStatusChangeId] = useState(null)
  const [statusChangeCurrentStatus, setStatusChangeCurrentStatus] = useState('')
  const [statusChangeValue, setStatusChangeValue] = useState('')
  const [statusChangeReason, setStatusChangeReason] = useState('')

  const openStatusChange = (row) => {
    setStatusChangeId(row._id)
    setStatusChangeCurrentStatus(row.status)
    setStatusChangeValue('')
    setStatusChangeReason('')
    setStatusModal(true)
  }

  const handleStatusChange = async () => {
    if (!statusChangeId || !statusChangeValue) return
    setSubmitting(true)
    try {
      await dispatch(changeLeaveStatus({ id: statusChangeId, status: statusChangeValue, reason: statusChangeReason }))
    } finally {
      setSubmitting(false)
    }
  }

  const handleDeleteRequest = (id) => {
    MySwal.fire({
      title: t('Delete Leave Request?'),
      text: t('This will permanently delete the request and release any used/pending balance.'),
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('Yes, delete'),
      cancelButtonText: t('Cancel'),
      customClass: { confirmButton: 'btn btn-danger', cancelButton: 'btn btn-outline-secondary ms-1' },
      buttonsStyling: false,
    }).then((result) => {
      if (result.isConfirmed) dispatch(deleteLeaveRequest(id))
    })
  }

  // Create leave on behalf modal
  const [createModal, setCreateModal] = useState(false)
  const [createData, setCreateData] = useState({
    user_id: '', leave_type_id: '', start_date: '', end_date: '',
    start_half: 'full', end_half: 'full', reason: '', auto_approve: true,
  })
  const leaveTypeOptions = Object.values(leaveTypeMap).map((lt) => ({ value: lt._id, label: lt.name }))
  const employeeOptions = Object.values(employeeMap).map((e) => ({
    value: e._id, label: `${e.first_name || e.firstName || ''} ${e.last_name || e.lastName || ''}`.trim() || e.email,
  }))
  const halfDayOptions = [
    { value: 'full', label: t('Full Day') },
    { value: 'am', label: t('AM (Morning)') },
    { value: 'pm', label: t('PM (Afternoon)') },
  ]

  const handleCreateChange = (field, value) => setCreateData((prev) => ({ ...prev, [field]: value }))

  const handleCreateSubmit = async () => {
    if (!createData.user_id || !createData.leave_type_id || !createData.start_date || !createData.end_date) {
      Notification('Error', t('Please fill all required fields'), 'warning')
      return
    }
    setSubmitting(true)
    try {
      dispatch(adminCreateLeaveRequest({
        ...createData,
        location_id: selectedLocationId || undefined,
      }))
    } finally {
      setSubmitting(false)
    }
  }

  const prevLocationRef = useRef(selectedLocationId)

  const loadData = useCallback((page, limit, status, locId) => {
    const params = { _limit: limit, _offset: (page - 1) * limit }
    if (status) params._status = status
    if (locId) params._locationId = locId
    dispatch(getLeaveRequestList(params))
  }, [dispatch])

  useEffect(() => { loadData(1, perPage, '', selectedLocationId) }, [])

  useEffect(() => {
    if (prevLocationRef.current !== selectedLocationId) {
      prevLocationRef.current = selectedLocationId
      setCurrentPage(1)
      loadData(1, perPage, statusFilter?.value || '', selectedLocationId)
    }
  }, [selectedLocationId])

  useEffect(() => {
    if (['LR_APV_SCS', 'LR_REJ_SCS', 'ADMIN_LR_CRT_SCS', 'LR_STATUS_SCS', 'LR_DEL_SCS'].includes(store?.actionFlag)) {
      Notification('Success', store.success || 'Done', 'success')
      loadData(currentPage, perPage, statusFilter?.value || '', selectedLocationId)
      setRejectModal(false)
      setRejectReason('')
      setReviewModal(false)
      setReviewId(null)
      setCreateModal(false)
      setCreateData({ user_id: '', leave_type_id: '', start_date: '', end_date: '', start_half: 'full', end_half: 'full', reason: '', auto_approve: true })
      setStatusModal(false)
      setStatusChangeId(null)
    }
    if (store?.actionFlag === 'LR_CONFLICT_SCS') {
      setReviewModal(true)
      dispatch(clearLeaveMessages())
    }
    if (store?.actionFlag === 'ERROR') Notification('Error', store.error || 'Error', 'warning')
    if (store?.actionFlag && store?.actionFlag !== 'LR_CONFLICT_SCS') dispatch(clearLeaveMessages())
  }, [store?.actionFlag])

  const handleApprove = (id) => {
    setReviewId(id)
    dispatch(getLeaveConflicts(id))
  }

  const confirmApprove = async () => {
    if (reviewId) {
      setSubmitting(true)
      try {
        dispatch(approveLeaveRequest(reviewId))
      } finally {
        setSubmitting(false)
      }
    }
  }

  const handleReviewReject = () => {
    if (reviewId) {
      setReviewModal(false)
      openReject(reviewId)
    }
  }

  const openReject = (id) => { setRejectId(id); setRejectReason(''); setRejectModal(true) }
  const handleReject = async () => {
    if (!rejectReason.trim()) return
    setSubmitting(true)
    try {
      dispatch(rejectLeaveRequest({ id: rejectId, reason: rejectReason }))
    } finally {
      setSubmitting(false)
    }
  }

  const columns = [
    {
      name: t('Employee'),
      width: '200px',
      cell: (row) => {
        const emp = employeeMap[row.user_id]
        return emp ? (
          <div>
            <div className='fw-semibold text-body'>{emp.first_name || emp.firstName} {emp.last_name || emp.lastName}</div>
            {emp.email && <div className='small text-muted'>{emp.email}</div>}
          </div>
        ) : <small className='text-muted'>{row.user_id?.substring(0, 8)}…</small>
      },
    },
    {
      name: t('Leave Type'),
      width: '150px',
      cell: (row) => {
        const lt = leaveTypeMap[row.leave_type_id]
        return lt ? (
          <div className='d-flex align-items-center gap-1'>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: lt.color || '#6c757d', display: 'inline-block' }} />
            <span>{lt.name}</span>
          </div>
        ) : <small className='text-muted'>—</small>
      },
    },
    { name: t('Start'), width: '150px', selector: (row) => row.start_date, cell: (row) => <span className='small'>{formatDate(row.start_date)}</span> },
    { name: t('End'), width: '150px', selector: (row) => row.end_date, cell: (row) => <span className='small'>{formatDate(row.end_date)}</span> },
    { name: t('Days'), cell: (row) => <strong>{row.total_days}</strong>, width: '100px', center: true },
    {
      name: t('Status'),
      center: true,
      width: '100px',
      cell: (row) => (
        <span className={`doc-badge ${statusBadgeClass[row.status] || 'doc-badge-gray'}`}>
          {(row.status || '—').replace(/\b\w/g, c => c.toUpperCase())}
        </span>
      ),
    },
    {
      name: t('Submitted'),
      width: '150px',
      cell: (row) => row.createdAt
        ? <span className='small'>{formatDate(row.createdAt)}</span>
        : '—',
      hide: 'md',
    },
    ...(canWrite ? [{
      name: t('Actions'),
      width: '160px',
      cell: (row) => (
        <div className='d-flex gap-25'>
          {row.status === 'pending' && (
            <>
              <Button id={`apv-${row._id}`} size='sm' color='flat-success' className='btn-icon' onClick={() => handleApprove(row._id)}>
                <CheckCircle size={14} />
              </Button>
              <UncontrolledTooltip target={`apv-${row._id}`}>{t('Approve')}</UncontrolledTooltip>
              <Button id={`rej-${row._id}`} size='sm' color='flat-danger' className='btn-icon' onClick={() => openReject(row._id)}>
                <XCircle size={14} />
              </Button>
              <UncontrolledTooltip target={`rej-${row._id}`}>{t('Reject')}</UncontrolledTooltip>
            </>
          )}
          <Button id={`chg-${row._id}`} size='sm' color='flat-primary' className='btn-icon' onClick={() => openStatusChange(row)}>
            <Edit3 size={14} />
          </Button>
          <UncontrolledTooltip target={`chg-${row._id}`}>{t('Change Status')}</UncontrolledTooltip>
          <Button id={`del-${row._id}`} size='sm' color='flat-danger' className='btn-icon' onClick={() => handleDeleteRequest(row._id)}>
            <Trash2 size={14} />
          </Button>
          <UncontrolledTooltip target={`del-${row._id}`}>{t('Delete')}</UncontrolledTooltip>
        </div>
      ),
    }] : []),
  ]

  return (
    <>
      <CardHeader className='border-bottom py-1 d-flex align-items-center justify-content-between flex-wrap gap-1'>
        <CardTitle tag='h5' className='mb-0'>{t('Leave Requests')}</CardTitle>
        <div className='d-flex align-items-center gap-1 listing-toolbar-filters listing-toolbar-actions'>
          <div style={{ minWidth: 180 }}>
            <Select
              isClearable
              placeholder={t('Filter by status...')}
              options={statusOptions}
              value={statusFilter}
              onChange={(opt) => {
                setStatusFilter(opt)
                setCurrentPage(1)
                loadData(1, perPage, opt?.value || '', selectedLocationId)
              }}
              styles={{ control: (base) => ({ ...base, minHeight: 32 }), indicatorsContainer: (base) => ({ ...base, height: 32 }) }}
            />
          </div>
          {canWrite && (
            <Button size='sm' color='primary' onClick={() => setCreateModal(true)}>
              <Plus size={14} className='me-1' />{t('Create Leave')}
            </Button>
          )}
          <Button size='sm' color='secondary' onClick={() => loadData(currentPage, perPage, statusFilter?.value || '', selectedLocationId)}>
            <RefreshCw size={14} className='me-1' />{t('Refresh')}
          </Button>
        </div>
      </CardHeader>
      <CardBody>
        <DatatablePagination
          data={store?.requestItems || []}
          columns={columns}
          pagination={{ total: store?.requestTotal || 0, perPage }}
          rowsPerPage={perPage}
          currentPage={currentPage}
          handlePagination={(page) => {
            setCurrentPage(page + 1)
            loadData(page + 1, perPage, statusFilter?.value || '', selectedLocationId)
          }}
          handleRowPerPage={(rows) => {
            setPerPage(rows)
            setCurrentPage(1)
            loadData(1, rows, statusFilter?.value || '', selectedLocationId)
          }}
          loading={store?.loading}
        />
      </CardBody>

      <Modal isOpen={rejectModal} toggle={() => setRejectModal(false)} centered>
        <ModalHeader toggle={() => setRejectModal(false)}>{t('Reject Leave Request')}</ModalHeader>
        <ModalBody>
          <FormGroup>
            <Label>{t('Reason for rejection')} <span className='text-danger'>*</span></Label>
            <Input type='textarea' rows={3} value={rejectReason} onChange={(e) => setRejectReason(e.target.value)} placeholder={t('Enter reason...')} />
          </FormGroup>
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' outline onClick={() => setRejectModal(false)}>{t('Cancel')}</Button>
          <Button color='danger' onClick={handleReject} disabled={!rejectReason.trim()}>{t('Reject')}</Button>
        </ModalFooter>
      </Modal>

      {/* ── Change Status Modal ── */}
      <Modal isOpen={statusModal} toggle={() => setStatusModal(false)} centered backdrop='static' keyboard={false}>
        <ModalHeader toggle={() => setStatusModal(false)}>{t('Change Leave Status')}</ModalHeader>
        <ModalBody>
          <div className='mb-1'>
            <small className='text-muted'>{t('Current Status')}:</small>{' '}
            <span className={`doc-badge ${statusBadgeClass[statusChangeCurrentStatus] || 'doc-badge-gray'}`}>
              {t(statusChangeCurrentStatus)}
            </span>
          </div>
          <FormGroup>
            <Label>{t('New Status')}</Label>
            <Input type='select' value={statusChangeValue} onChange={(e) => setStatusChangeValue(e.target.value)}>
              <option value=''>{t('-- Select new status --')}</option>
              {statusChangeCurrentStatus !== 'approved' && <option value='approved'>{t('Approved')}</option>}
              {statusChangeCurrentStatus !== 'rejected' && <option value='rejected'>{t('Rejected')}</option>}
              {statusChangeCurrentStatus !== 'cancelled' && <option value='cancelled'>{t('Cancelled')}</option>}
            </Input>
          </FormGroup>
          {(statusChangeValue === 'rejected' || statusChangeValue === 'cancelled') && (
            <FormGroup>
              <Label>{t('Reason')}</Label>
              <Input type='textarea' rows={2} value={statusChangeReason} onChange={(e) => setStatusChangeReason(e.target.value)} placeholder={t('Enter reason...')} />
            </FormGroup>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' outline onClick={() => setStatusModal(false)}>{t('Cancel')}</Button>
          <Button color='primary' onClick={handleStatusChange} disabled={!statusChangeValue}>{t('Update Status')}</Button>
        </ModalFooter>
      </Modal>

      {/* ── Create Leave on Behalf Modal ── */}
      <Modal isOpen={createModal} toggle={() => setCreateModal(false)} size='lg' centered>
        <ModalHeader toggle={() => setCreateModal(false)}>{t('Create Leave on Behalf of Employee')}</ModalHeader>
        <ModalBody>
          <Row>
            <Col md={6} className='mb-1'>
              <Label>{t('Employee')} <span className='text-danger'>*</span></Label>
              <Select
                options={employeeOptions}
                value={employeeOptions.find((o) => o.value === createData.user_id) || null}
                onChange={(opt) => handleCreateChange('user_id', opt?.value || '')}
                placeholder={t('Select employee...')}
                classNamePrefix='select'
              />
            </Col>
            <Col md={6} className='mb-1'>
              <Label>{t('Leave Type')} <span className='text-danger'>*</span></Label>
              <Select
                options={leaveTypeOptions}
                value={leaveTypeOptions.find((o) => o.value === createData.leave_type_id) || null}
                onChange={(opt) => handleCreateChange('leave_type_id', opt?.value || '')}
                placeholder={t('Select leave type...')}
                classNamePrefix='select'
              />
            </Col>
            <Col md={3} className='mb-1'>
              <Label>{t('Start Date')} <span className='text-danger'>*</span></Label>
              <DateInput value={createData.start_date} onChange={(dates, str, iso) => {
                handleCreateChange('start_date', iso)
                if (!createData.end_date || iso > createData.end_date) {
                  handleCreateChange('end_date', iso)
                }
              }} id='leaveStartDate' />
            </Col>
            <Col md={3} className='mb-1'>
              <Label>{t('Start Half')}</Label>
              <Input type='select' value={createData.start_half} onChange={(e) => handleCreateChange('start_half', e.target.value)}>
                {halfDayOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Input>
            </Col>
            <Col md={3} className='mb-1'>
              <Label>{t('End Date')} <span className='text-danger'>*</span></Label>
              <DateInput value={createData.end_date} onChange={(dates, str, iso) => handleCreateChange('end_date', iso)} id='leaveEndDate' minDate={createData.start_date || undefined} />
            </Col>
            <Col md={3} className='mb-1'>
              <Label>{t('End Half')}</Label>
              <Input type='select' value={createData.end_half} onChange={(e) => handleCreateChange('end_half', e.target.value)}>
                {halfDayOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </Input>
            </Col>
            <Col md={12} className='mb-1'>
              <Label>{t('Reason')}</Label>
              <Input type='textarea' rows={2} value={createData.reason} onChange={(e) => handleCreateChange('reason', e.target.value)} placeholder={t('Optional reason...')} />
            </Col>
            <Col md={12} className='mb-1'>
              <FormGroup check>
                <Input type='checkbox' id='auto-approve-check' checked={createData.auto_approve} onChange={(e) => handleCreateChange('auto_approve', e.target.checked)} />
                <Label check for='auto-approve-check'>{t('Auto-approve this request')}</Label>
                <small className='text-muted d-block'>{t('If unchecked, the request will follow the normal approval workflow')}</small>
              </FormGroup>
            </Col>
          </Row>
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' outline onClick={() => setCreateModal(false)}>{t('Cancel')}</Button>
          <Button color='primary' onClick={handleCreateSubmit} disabled={!store?.loading}>{t('Submit')}</Button>
        </ModalFooter>
      </Modal>

      {/* ── Conflict Review Modal ── */}
      <Modal isOpen={reviewModal} toggle={() => { setReviewModal(false); dispatch(clearConflictData()) }} size='lg' centered>
        <ModalHeader toggle={() => { setReviewModal(false); dispatch(clearConflictData()) }} style={{ backgroundColor: '#09418B', padding: '1.25rem 1.5rem' }} close={<button type='button' className='btn-close btn-close-white' aria-label='Close' onClick={() => { setReviewModal(false); dispatch(clearConflictData()) }} />}>
          <span style={{ color: '#fff', fontSize: '1.15rem' }}>{t('Review Leave Request')}</span>
        </ModalHeader>
        <ModalBody className='py-3'>
          <ReviewModalContent store={store} employeeMap={employeeMap} leaveTypeMap={leaveTypeMap} t={t} />
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' outline onClick={() => { setReviewModal(false); dispatch(clearConflictData()) }}>{t('Cancel')}</Button>
          <Button color='danger' outline onClick={handleReviewReject}>{t('Reject')}</Button>
          <Button color='success' onClick={confirmApprove} disabled={!store?.loading}>
            {!store?.loading ? <Spinner size='sm' /> : t('Approve')}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

// ─── TAB: Leave Types ────────────────────────────────────────────────────────

const LeaveTypesTab = ({ canManageTypes }) => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const store = useSelector((s) => s.leave)

  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultLeaveTypeForm)

  useEffect(() => { dispatch(getLeaveTypeList()) }, [])

  useEffect(() => {
    if (['LT_CRT_SCS', 'LT_UPD_SCS', 'LT_DEL_SCS'].includes(store?.actionFlag)) {
      Notification('Success', store.success || 'Done', 'success')
      dispatch(getLeaveTypeList())
      setModal(false)
    }
    if (store?.actionFlag === 'ERROR') Notification('Error', store.error || 'Error', 'warning')
    if (store?.actionFlag) dispatch(clearLeaveMessages())
  }, [store?.actionFlag])

  const openCreate = () => { setEditItem(null); setForm(defaultLeaveTypeForm); setModal(true) }

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      name: item.name || '',
      color: item.color || '#0ea5e9',
      is_paid: item.is_paid ?? true,
      requires_approval: item.requires_approval ?? true,
      max_days_per_year: item.max_days_per_year ?? '',
      carry_over_allowed: item.carry_over_allowed ?? false,
      max_carry_over_days: item.max_carry_over_days ?? '',
      accrual_method: item.accrual_method || 'annual',
      notice_days: item.notice_days ?? 0,
      documentation_required: item.documentation_required ?? false,
      documentation_after_days: item.documentation_after_days ?? 3,
      is_active: item.is_active ?? true,
    })
    setModal(true)
  }

  const handleDelete = (item) => {
    if (item.is_system) return Notification('Warning', 'System leave types cannot be deleted', 'warning')
    MySwal.fire({
      title: t('Delete leave type?'),
      text: `"${item.name}" will be removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('Yes, delete'),
      confirmButtonColor: '#ea5455',
    }).then((r) => { if (r.isConfirmed) dispatch(deleteLeaveType(item._id)) })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      max_days_per_year: form.max_days_per_year !== '' ? parseFloat(form.max_days_per_year) : null,
      max_carry_over_days: form.max_carry_over_days !== '' ? parseFloat(form.max_carry_over_days) : null,
      notice_days: parseInt(form.notice_days) || 0,
      documentation_after_days: parseInt(form.documentation_after_days) || 3,
    }
    if (editItem) dispatch(updateLeaveType({ id: editItem._id, data: payload }))
    else dispatch(createLeaveType(payload))
  }

  const f = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((p) => ({ ...p, [field]: val }))
  }

  const columns = [
    {
      name: t('Name'),
      width: '300px',
      cell: (lt) => (
        <div className='d-flex align-items-center gap-2 py-1'>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: lt.color || '#6c757d', display: 'inline-block', flexShrink: 0 }} />
          <span className='fw-semibold text-body'>{lt.name}</span>
          {lt.is_system && <Badge color='light-secondary' pill style={{ fontSize: '0.6rem' }}>System</Badge>}
        </div>
      ),
    },
    {
      name: t('Paid'),
      width: '100px',
      center: true,
      cell: (lt) => <Badge color={lt.is_paid ? 'light-success' : 'light-secondary'} pill>{lt.is_paid ? 'Paid' : 'Unpaid'}</Badge>,
    },
    {
      name: t('Approval'),
      width: '150px',
      center: true,
      cell: (lt) => <Badge color={lt.requires_approval ? 'light-warning' : 'light-success'} pill>
        {lt.requires_approval ? 'Requires Approval' : 'Auto-approve'}
      </Badge>,
    },
    {
      name: t('Max Days/Year'),
      width: '150px',
      center: true,
      cell: (lt) => lt.max_days_per_year ?? <span className='text-muted'>Unlimited</span>,
    },
    {
      name: t('Carry Over'),
      width: '150px',
      center: true,
      cell: (lt) => lt.carry_over_allowed
        ? <span className='text-success small'>{lt.max_carry_over_days ? `Max ${lt.max_carry_over_days}d` : 'Allowed'}</span>
        : <span className='text-muted small'>No</span>,
    },
    {
      name: t('Accrual'),
      width: '120px',
      center: true,
      cell: (lt) => <span className='text-capitalize small'>{lt.accrual_method || '—'}</span>,
    },
    {
      name: t('Status'),
      width: '120px',
      center: true,
      cell: (lt) => <Badge color={lt.is_active ? 'light-success' : 'light-danger'} pill>{lt.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    ...(canManageTypes ? [{
      name: t('Actions'),
      cell: (lt) => (
        <div className='d-flex gap-50'>
          <span id={`edit-lt-${lt._id}`} className='cursor-pointer' onClick={() => openEdit(lt)}>
            <Edit2 size={14} className='text-primary' />
          </span>
          <UncontrolledTooltip target={`edit-lt-${lt._id}`}>{t('Edit')}</UncontrolledTooltip>
          {!lt.is_system && (
            <>
              <span id={`del-lt-${lt._id}`} className='cursor-pointer' onClick={() => handleDelete(lt)}>
                <Trash2 size={14} className='text-danger' />
              </span>
              <UncontrolledTooltip target={`del-lt-${lt._id}`}>{t('Delete')}</UncontrolledTooltip>
            </>
          )}
        </div>
      ),
    }] : []),
  ]

  return (
    <>
      <DatatablePagination
        columns={columns}
        data={store?.leaveTypeItems || []}
        loading={store?.loading}
        disablePagination
      />

      {/* Create/Edit Modal */}
      <Modal isOpen={modal} toggle={() => setModal(false)} size='lg' centered>
        <ModalHeader toggle={() => setModal(false)}>
          {editItem ? t('Edit Leave Type') : t('Add Leave Type')}
        </ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalBody>
            <Row>
              <Col md={8}>
                <FormGroup>
                  <Label>{t('Name')} <span className='text-danger'>*</span></Label>
                  <Input value={form.name} onChange={f('name')} placeholder='Annual Leave' required />
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <Label>{t('Colour')}</Label>
                  <div className='d-flex align-items-center gap-2'>
                    <Input type='color' value={form.color} onChange={f('color')} style={{ width: 50, height: 38, padding: 2 }} />
                    <Input value={form.color} onChange={f('color')} placeholder='#0ea5e9' />
                  </div>
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <Label>{t('Max Days / Year')}</Label>
                  <Input type='number' step='0.5' min='0' value={form.max_days_per_year} onChange={f('max_days_per_year')} placeholder='Unlimited' />
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <Label>{t('Accrual Method')}</Label>
                  <Input type='select' value={form.accrual_method} onChange={f('accrual_method')}>
                    {accrualOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Input>
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <Label>{t('Min Notice Days')}</Label>
                  <Input type='number' min='0' value={form.notice_days} onChange={f('notice_days')} />
                </FormGroup>
              </Col>
              <Col md={6}>
                <div className='form-check form-switch mt-1'>
                  <Input type='checkbox' className='form-check-input' id='isPaid' checked={form.is_paid} onChange={f('is_paid')} />
                  <Label className='form-check-label ms-75' htmlFor='isPaid'>{t('Paid Leave')}</Label>
                </div>
                <div className='form-check form-switch mt-1'>
                  <Input type='checkbox' className='form-check-input' id='reqApproval' checked={form.requires_approval} onChange={f('requires_approval')} />
                  <Label className='form-check-label ms-75' htmlFor='reqApproval'>{t('Requires Manager Approval')}</Label>
                </div>
                <div className='form-check form-switch mt-1'>
                  <Input type='checkbox' className='form-check-input' id='isActive' checked={form.is_active} onChange={f('is_active')} />
                  <Label className='form-check-label ms-75' htmlFor='isActive'>{t('Active')}</Label>
                </div>
              </Col>
              <Col md={6}>
                <div className='form-check form-switch mt-1'>
                  <Input type='checkbox' className='form-check-input' id='carryOver' checked={form.carry_over_allowed} onChange={f('carry_over_allowed')} />
                  <Label className='form-check-label ms-75' htmlFor='carryOver'>{t('Allow Carry Over')}</Label>
                </div>
                {form.carry_over_allowed && (
                  <FormGroup className='mt-1'>
                    <Label>{t('Max Carry Over Days')}</Label>
                    <Input type='number' step='0.5' min='0' value={form.max_carry_over_days} onChange={f('max_carry_over_days')} placeholder='No limit' />
                  </FormGroup>
                )}
                <div className='form-check form-switch mt-1'>
                  <Input type='checkbox' className='form-check-input' id='docReq' checked={form.documentation_required} onChange={f('documentation_required')} />
                  <Label className='form-check-label ms-75' htmlFor='docReq'>{t('Documentation Required')}</Label>
                </div>
                {form.documentation_required && (
                  <FormGroup className='mt-1'>
                    <Label>{t('After how many days?')}</Label>
                    <Input type='number' min='1' value={form.documentation_after_days} onChange={f('documentation_after_days')} />
                  </FormGroup>
                )}
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button color='secondary' outline onClick={() => setModal(false)}>{t('Cancel')}</Button>
            <Button color='primary' type='submit' disabled={!store?.loading}>
              {!store?.loading ? <Spinner size='sm' /> : editItem ? t('Update') : t('Create')}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </>
  )
}

// ─── TAB: Policy Settings ────────────────────────────────────────────────────

const PolicyTab = ({ canManagePolicy }) => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const store = useSelector((s) => s.leave)
  const [form, setForm] = useState(null)

  useEffect(() => { dispatch(getLeavePolicy()) }, [])

  useEffect(() => {
    if (store?.leavePolicy && !form) setForm({ ...store.leavePolicy })
  }, [store?.leavePolicy])

  useEffect(() => {
    if (store?.actionFlag === 'LP_UPD_SCS') Notification('Success', 'Policy updated', 'success')
    if (store?.actionFlag === 'ERROR') Notification('Error', store.error || 'Error', 'warning')
    if (store?.actionFlag) dispatch(clearLeaveMessages())
  }, [store?.actionFlag])

  const f = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((p) => ({ ...p, [field]: val }))
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    dispatch(updateLeavePolicy({
      ...form,
      default_annual_entitlement: parseFloat(form.default_annual_entitlement) || 28,
      bradford_factor_threshold: parseFloat(form.bradford_factor_threshold) || 150,
      leave_year_start_month: parseInt(form.leave_year_start_month) || 1,
    }))
  }

  if (!form) {
    return <div className='text-center py-4'>{!store?.loading ? <Spinner /> : <span className='text-muted'>{t('Loading policy...')}</span>}</div>
  }

  const monthOptions = [
    { value: 1, label: 'January' }, { value: 2, label: 'February' }, { value: 3, label: 'March' },
    { value: 4, label: 'April' }, { value: 5, label: 'May' }, { value: 6, label: 'June' },
    { value: 7, label: 'July' }, { value: 8, label: 'August' }, { value: 9, label: 'September' },
    { value: 10, label: 'October' }, { value: 11, label: 'November' }, { value: 12, label: 'December' },
  ]

  return (
    <Form onSubmit={handleSubmit}>
      <Row>
        <Col md={6}>
          <Card className='border shadow-none'>
            <CardBody>
              <h6 className='mb-2'>{t('Leave Year Settings')}</h6>
              <FormGroup>
                <Label>{t('Leave Year Start Month')}</Label>
                <Input type='select' value={form.leave_year_start_month || 1} onChange={f('leave_year_start_month')}>
                  {monthOptions.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                </Input>
                <small className='text-muted'>{t('The month when the leave year resets')}</small>
              </FormGroup>
              <FormGroup>
                <Label>{t('Default Annual Entitlement (days)')}</Label>
                <Input type='number' step='0.5' min='0' value={form.default_annual_entitlement ?? 28} onChange={f('default_annual_entitlement')} />
                <small className='text-muted'>{t('UK statutory minimum is 28 days (including bank holidays)')}</small>
              </FormGroup>
              <div className='form-check form-switch mt-1'>
                <Input type='checkbox' className='form-check-input' id='inclBH' checked={form.include_bank_holidays ?? true} onChange={f('include_bank_holidays')} />
                <Label className='form-check-label ms-75' htmlFor='inclBH'>{t('Include bank holidays in annual entitlement')}</Label>
              </div>
            </CardBody>
          </Card>
        </Col>

        <Col md={6}>
          <Card className='border shadow-none'>
            <CardBody>
              <h6 className='mb-2'>{t('Approval & Automation')}</h6>
              <div className='form-check form-switch mb-1'>
                <Input type='checkbox' className='form-check-input' id='autoApprove' checked={form.auto_approve_enabled ?? false} onChange={f('auto_approve_enabled')} />
                <Label className='form-check-label ms-75' htmlFor='autoApprove'>{t('Enable auto-approve for certain leave types')}</Label>
              </div>
              <div className='form-check form-switch mb-1'>
                <Input type='checkbox' className='form-check-input' id='toilEnable' checked={form.toil_enabled ?? false} onChange={f('toil_enabled')} />
                <Label className='form-check-label ms-75' htmlFor='toilEnable'>{t('Enable Time Off in Lieu (TOIL)')}</Label>
              </div>
            </CardBody>
          </Card>

          <Card className='border shadow-none mt-1'>
            <CardBody>
              <h6 className='mb-2'>{t('Bradford Factor')}</h6>
              <div className='form-check form-switch mb-1'>
                <Input type='checkbox' className='form-check-input' id='bradfordEnable' checked={form.bradford_factor_enabled ?? false} onChange={f('bradford_factor_enabled')} />
                <Label className='form-check-label ms-75' htmlFor='bradfordEnable'>{t('Enable Bradford Factor monitoring')}</Label>
              </div>
              {form.bradford_factor_enabled && (
                <FormGroup>
                  <Label>{t('Alert Threshold (B = S × S × D)')}</Label>
                  <Input type='number' min='0' value={form.bradford_factor_threshold ?? 150} onChange={f('bradford_factor_threshold')} />
                  <small className='text-muted'>{t('Standard threshold is 150. Trigger alert when exceeded.')}</small>
                </FormGroup>
              )}
            </CardBody>
          </Card>
        </Col>
      </Row>

      {canManagePolicy && (
        <div className='d-flex justify-content-end mt-1'>
          <Button color='primary' type='submit' disabled={!store?.loading}>
            {!store?.loading ? <Spinner size='sm' /> : t('Save Policy')}
          </Button>
        </div>
      )}
    </Form>
  )
}

// ─── TAB: Entitlements ───────────────────────────────────────────────────────

const EntitlementsTab = ({ leaveTypeMap, employeeOptions, canWrite }) => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const store = useSelector((s) => s.leave)

  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [year, setYear] = useState(new Date().getFullYear())
  const [editModal, setEditModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [editForm, setEditForm] = useState({ total_entitlement: '', additional: '', carried_over: '' })

  const loadEntitlements = (empId, yr) => { if (empId) dispatch(getUserEntitlements({ userId: empId, year: yr })) }

  const handleEmployeeChange = (opt) => {
    setSelectedEmployee(opt)
    if (!opt) dispatch(clearEntitlementItems())
  }

  useEffect(() => { if (selectedEmployee) loadEntitlements(selectedEmployee.value, year) }, [selectedEmployee, year])

  useEffect(() => {
    if (store?.actionFlag === 'ENT_UPD_SCS') {
      Notification('Success', 'Entitlement updated', 'success')
      setEditModal(false)
      if (selectedEmployee) loadEntitlements(selectedEmployee.value, year)
    }
    if (store?.actionFlag === 'ERROR') Notification('Error', store.error || 'Error', 'warning')
    if (store?.actionFlag) dispatch(clearLeaveMessages())
  }, [store?.actionFlag])

  const openEdit = (ent) => {
    setEditItem(ent)
    setEditForm({ total_entitlement: ent.total_entitlement ?? '', additional: ent.additional ?? 0, carried_over: ent.carried_over ?? 0 })
    setEditModal(true)
  }

  const handleSaveEdit = () => {
    dispatch(updateEntitlement({
      id: editItem._id,
      data: {
        total_entitlement: parseFloat(editForm.total_entitlement) || 0,
        additional: parseFloat(editForm.additional) || 0,
        carried_over: parseFloat(editForm.carried_over) || 0,
      },
    }))
  }

  const ef = (field) => (e) => setEditForm((p) => ({ ...p, [field]: e.target.value }))

  const columns = [
    {
      name: t('Leave Type'),
      width: '250px',
      cell: (ent) => {
        const lt = leaveTypeMap[ent.leave_type_id]
        return (
          <div className='d-flex align-items-center gap-1 py-1'>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: lt?.color || '#6c757d', display: 'inline-block' }} />
            <span className='fw-semibold'>{lt?.name || '—'}</span>
          </div>
        )
      },
    },
    { name: t('Entitlement'), center: true, cell: (ent) => <strong>{ent.total_entitlement}</strong> },
    { name: t('Carry Over'), center: true, cell: (ent) => ent.carried_over || 0 },
    { name: t('Additional'), center: true, cell: (ent) => ent.additional || 0 },
    { name: t('Used'), center: true, cell: (ent) => <span className='text-danger'>{ent.used || 0}</span> },
    { name: t('Pending'), center: true, cell: (ent) => <span className='text-warning'>{ent.pending || 0}</span> },
    {
      name: t('Balance'),
      center: true,
      cell: (ent) => <Badge color={ent.balance > 0 ? 'light-success' : 'light-danger'} pill>{ent.balance || 0}</Badge>,
    },
    ...(canWrite ? [{
      name: t('Actions'),
      center: true,
      cell: (ent) => (
        <>
          <span id={`edit-ent-${ent._id}`} className='cursor-pointer' onClick={() => openEdit(ent)}>
            <Edit2 size={14} className='text-primary' />
          </span>
          <UncontrolledTooltip target={`edit-ent-${ent._id}`}>{t('Adjust')}</UncontrolledTooltip>
        </>
      ),
    }] : []),
  ]

  return (
    <>
      <CardHeader className='border-bottom py-1 d-flex align-items-center justify-content-between flex-wrap gap-1'>
        <CardTitle tag='h5' className='mb-0'>{t('Entitlements')}</CardTitle>
        <div className='d-flex align-items-center gap-1 listing-toolbar-filters'>
          <div style={{ minWidth: 220 }}>
            <Select
              options={employeeOptions}
              value={selectedEmployee}
              onChange={handleEmployeeChange}
              placeholder={t('Search employee...')}
              isClearable
              styles={{ control: (base) => ({ ...base, minHeight: 32 }), indicatorsContainer: (base) => ({ ...base, height: 32 }) }}
            />
          </div>
          <Input type='number' value={year} min={2020} max={2030} onChange={(e) => setYear(parseInt(e.target.value))} style={{ width: 90, height: 32 }} />
        </div>
      </CardHeader>
      <CardBody>

        {!selectedEmployee ? (
          <div className='text-center py-4 text-muted'>
            <User size={32} className='mb-2 opacity-50' />
            <p>{t('Select an employee to view their leave entitlements')}</p>
          </div>
        ) : (
          <DatatablePagination
            columns={columns}
            data={store?.entitlementItems || []}
            loading={store?.loading}
            disablePagination
          />
        )}
      </CardBody>

      <Modal isOpen={editModal} toggle={() => setEditModal(false)} centered modalClassName='modal-lg'>
        <ModalHeader toggle={() => setEditModal(false)} style={{ backgroundColor: '#09418B', padding: '1.25rem 1.5rem' }} close={<button type='button' className='btn-close btn-close-white' aria-label='Close' onClick={() => setEditModal(false)} />}><span style={{ color: '#fff', fontSize: '1.15rem' }}>{t('Adjust Entitlement')}</span></ModalHeader>
        <ModalBody className='py-3'>
          {editItem && (
            <>
              <p className='text-muted mb-2'>
                <strong>{leaveTypeMap[editItem.leave_type_id]?.name || 'Leave'}</strong> — {year}
              </p>
              <FormGroup>
                <Label>{t('Total Entitlement (days)')}</Label>
                <Input type='number' step='0.5' min='0' value={editForm.total_entitlement} onChange={ef('total_entitlement')} />
              </FormGroup>
              <FormGroup>
                <Label>{t('Carried Over (days)')}</Label>
                <Input type='number' step='0.5' min='0' value={editForm.carried_over} onChange={ef('carried_over')} />
              </FormGroup>
              <FormGroup>
                <Label>{t('Additional Allowance (days)')}</Label>
                <Input type='number' step='0.5' min='0' value={editForm.additional} onChange={ef('additional')} />
                <small className='text-muted'>{t('Extra days granted outside standard entitlement')}</small>
              </FormGroup>
            </>
          )}
        </ModalBody>
        <ModalFooter>
          <Button color='secondary' outline onClick={() => setEditModal(false)}>{t('Cancel')}</Button>
          <Button color='primary' onClick={handleSaveEdit} disabled={!store?.loading}>
            {!store?.loading ? <Spinner size='sm' /> : t('Save Changes')}
          </Button>
        </ModalFooter>
      </Modal>
    </>
  )
}

// ─── Main Admin View ─────────────────────────────────────────────────────────

const LeaveAdminView = () => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const leaveStore = useSelector((s) => s.leave)
  const employeeStore = useSelector((s) => s.employee)
  const locationCtx = useSelector((s) => s.locationContext)
  const { selectedLocationId } = locationCtx || {}
  const authStore = useSelector((s) => s.auth)
  const roleName = authStore?.authUserItem?.role?.name
  const modulePerms = authStore?.authUserItem?.role?.permissions?.['leave'] || {}
  const isCompanyAdmin = roleName === 'Company Admin'
  const canWrite = !!(modulePerms.can_update || modulePerms.can_add)
  const canManageTypes = isCompanyAdmin
  const canManagePolicy = isCompanyAdmin

  const [activeTab, setActiveTab] = useState('requests')

  useEffect(() => {
    dispatch(getLeaveTypeList())
    const empParams = { _limit: 500 }
    if (selectedLocationId) empParams.location_id = selectedLocationId
    dispatch(getEmployeeList(empParams))
  }, [dispatch])

  const leaveTypeMap = {}
    ; (leaveStore?.leaveTypeItems || []).forEach((lt) => { leaveTypeMap[lt._id] = lt })

  const employeeMap = {}
    ; (employeeStore?.employeeItems || []).forEach((e) => { employeeMap[e._id] = e })

  const employeeOptions = (employeeStore?.employeeItems || []).map((e) => ({
    value: e._id,
    label: `${e.firstName || ''} ${e.lastName || ''}`.trim() || e.email,
  }))

  const tabCards = {
    requests: {
      title: t('Leave Requests'),
      action: null,
    },
    types: {
      title: t('Leave Types'),
      action: canManageTypes ? (
        <Button color='primary' size='sm' onClick={() => document.getElementById('__lt-add-trigger')?.click()}>
          <Plus size={14} className='me-25' />{t('Add Leave Type')}
        </Button>
      ) : null,
    },
    policy: { title: t('Policy Settings'), action: null },
    entitlements: { title: t('Entitlements'), action: null },
    ...(canWrite ? { settings: { title: t('Settings'), action: null } } : {}),
  }

  return (
    <Fragment>
      <SetupReturnBanner />
      {/* ── Page Header ── */}
      <div className='d-flex align-items-center justify-content-between mb-2'>
        <h3 className='mb-0'>
          <Calendar size={18} className='me-1' />
          {t('Leave Management')}
        </h3>
      </div>

      {/* ── Tabs ── */}
      <Card className='mb-0'>
        <CardBody className='pb-0 pt-50'>
          <Nav tabs className='mb-0'>
            {[
              { id: 'requests', label: t('Leave Requests') },
              { id: 'types', label: t('Leave Types') },
              { id: 'policy', label: t('Policy Settings') },
              { id: 'entitlements', label: t('Entitlements') },
              ...(canWrite ? [{ id: 'settings', label: t('Settings') }] : []),
            ].map((tab) => (
              <NavItem key={tab.id}>
                <NavLink active={activeTab === tab.id} onClick={() => setActiveTab(tab.id)} style={{ cursor: 'pointer' }}>
                  {tab.label}
                </NavLink>
              </NavItem>
            ))}
          </Nav>
        </CardBody>
      </Card>

      <TabContent activeTab={activeTab} className='mt-2'>

        {/* ── REQUESTS TAB ── */}
        <TabPane tabId='requests'>
          <Card>
            <RequestsTab leaveTypeMap={leaveTypeMap} employeeMap={employeeMap} canWrite={canWrite} />
          </Card>
        </TabPane>

        {/* ── LEAVE TYPES TAB ── */}
        <TabPane tabId='types'>
          <Card>
            <CardHeader className='border-bottom py-1 d-flex align-items-center justify-content-between'>
              <CardTitle tag='h5' className='mb-0'>{t('Leave Types')}</CardTitle>
              {canManageTypes && (
                <Button color='primary' size='sm' id='__lt-add-trigger' onClick={() => {
                  // Trigger via a custom event that LeaveTypesTab listens for
                  document.dispatchEvent(new CustomEvent('leave-type-add'))
                }}>
                  <Plus size={14} className='me-25' />{t('Add Leave Type')}
                </Button>
              )}
            </CardHeader>
            <CardBody>
              <LeaveTypesTabWithTrigger canManageTypes={canManageTypes} />
            </CardBody>
          </Card>
        </TabPane>

        {/* ── POLICY TAB ── */}
        <TabPane tabId='policy'>
          <Card>
            <CardHeader className='border-bottom py-1'>
              <CardTitle tag='h5' className='mb-0'>{t('Policy Settings')}</CardTitle>
            </CardHeader>
            <CardBody>
              <PolicyTab canManagePolicy={canManagePolicy} />
            </CardBody>
          </Card>
        </TabPane>

        {/* ── ENTITLEMENTS TAB ── */}
        <TabPane tabId='entitlements'>
          <Card>
            <EntitlementsTab leaveTypeMap={leaveTypeMap} employeeOptions={employeeOptions} canWrite={canWrite} />
          </Card>
        </TabPane>

        {/* ── SETTINGS TAB ── */}
        {canWrite && (
          <TabPane tabId='settings'>
            <Card>
              <CardHeader className='border-bottom py-1'>
                <CardTitle tag='h5' className='mb-0'>{t('Settings')}</CardTitle>
              </CardHeader>
              <CardBody>
                <LeaveNotificationSettings />
              </CardBody>
            </Card>
          </TabPane>
        )}

      </TabContent>
    </Fragment>
  )
}

// Wrapper that listens for the custom event to open the add modal
const LeaveTypesTabWithTrigger = ({ canManageTypes }) => {
  const { t } = useTranslation()
  const dispatch = useDispatch()
  const store = useSelector((s) => s.leave)

  const [modal, setModal] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [form, setForm] = useState(defaultLeaveTypeForm)

  useEffect(() => {
    const handler = () => { setEditItem(null); setForm(defaultLeaveTypeForm); setModal(true) }
    document.addEventListener('leave-type-add', handler)
    return () => document.removeEventListener('leave-type-add', handler)
  }, [])

  useEffect(() => { dispatch(getLeaveTypeList()) }, [])

  useEffect(() => {
    if (['LT_CRT_SCS', 'LT_UPD_SCS', 'LT_DEL_SCS'].includes(store?.actionFlag)) {
      Notification('Success', store.success || 'Done', 'success')
      dispatch(getLeaveTypeList())
      setModal(false)
    }
    if (store?.actionFlag === 'ERROR') Notification('Error', store.error || 'Error', 'warning')
    if (store?.actionFlag) dispatch(clearLeaveMessages())
  }, [store?.actionFlag])

  const openEdit = (item) => {
    setEditItem(item)
    setForm({
      name: item.name || '',
      color: item.color || '#0ea5e9',
      is_paid: item.is_paid ?? true,
      requires_approval: item.requires_approval ?? true,
      max_days_per_year: item.max_days_per_year ?? '',
      carry_over_allowed: item.carry_over_allowed ?? false,
      max_carry_over_days: item.max_carry_over_days ?? '',
      accrual_method: item.accrual_method || 'annual',
      notice_days: item.notice_days ?? 0,
      documentation_required: item.documentation_required ?? false,
      documentation_after_days: item.documentation_after_days ?? 3,
      is_active: item.is_active ?? true,
    })
    setModal(true)
  }

  const handleDelete = (item) => {
    if (item.is_system) return Notification('Warning', 'System leave types cannot be deleted', 'warning')
    MySwal.fire({
      title: t('Delete leave type?'),
      text: `"${item.name}" will be removed.`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonText: t('Yes, delete'),
      confirmButtonColor: '#ea5455',
    }).then((r) => { if (r.isConfirmed) dispatch(deleteLeaveType(item._id)) })
  }

  const handleSubmit = (e) => {
    e.preventDefault()
    const payload = {
      ...form,
      max_days_per_year: form.max_days_per_year !== '' ? parseFloat(form.max_days_per_year) : null,
      max_carry_over_days: form.max_carry_over_days !== '' ? parseFloat(form.max_carry_over_days) : null,
      notice_days: parseInt(form.notice_days) || 0,
      documentation_after_days: parseInt(form.documentation_after_days) || 3,
    }
    if (editItem) dispatch(updateLeaveType({ id: editItem._id, data: payload }))
    else dispatch(createLeaveType(payload))
  }

  const f = (field) => (e) => {
    const val = e.target.type === 'checkbox' ? e.target.checked : e.target.value
    setForm((p) => ({ ...p, [field]: val }))
  }

  const columns = [
    {
      name: t('Name'),
      width: '300px',
      cell: (lt) => (
        <div className='d-flex align-items-center gap-2 py-1'>
          <span style={{ width: 12, height: 12, borderRadius: '50%', background: lt.color || '#6c757d', display: 'inline-block', flexShrink: 0 }} />
          <span className='fw-semibold text-body'>{lt.name}</span>
          {lt.is_system && <Badge color='light-secondary' pill style={{ fontSize: '0.6rem' }}>System</Badge>}
        </div>
      ),
    },
    {
      name: t('Paid'),
      width: '100px',
      center: true,
      cell: (lt) => <Badge color={lt.is_paid ? 'light-success' : 'light-secondary'} pill>{lt.is_paid ? 'Paid' : 'Unpaid'}</Badge>,
    },
    {
      name: t('Approval'),
      width: '150px',
      center: true,
      cell: (lt) => <Badge color={lt.requires_approval ? 'light-warning' : 'light-success'} pill>
        {lt.requires_approval ? 'Requires Approval' : 'Auto-approve'}
      </Badge>,
    },
    {
      name: t('Max Days/Year'),
      width: '150px',
      center: true,
      cell: (lt) => lt.max_days_per_year ?? <span className='text-muted'>Unlimited</span>,
    },
    {
      name: t('Carry Over'),
      width: '150px',
      center: true,
      cell: (lt) => lt.carry_over_allowed
        ? <span className='text-success small'>{lt.max_carry_over_days ? `Max ${lt.max_carry_over_days}d` : 'Allowed'}</span>
        : <span className='text-muted small'>No</span>,
    },
    {
      name: t('Accrual'),
      width: '120px',
      center: true,
      cell: (lt) => <span className='text-capitalize small'>{lt.accrual_method || '—'}</span>,
    },
    {
      name: t('Status'),
      width: '120px',
      center: true,
      cell: (lt) => <Badge color={lt.is_active ? 'light-success' : 'light-danger'} pill>{lt.is_active ? 'Active' : 'Inactive'}</Badge>,
    },
    ...(canManageTypes ? [{
      name: t('Actions'),
      cell: (lt) => (
        <div className='d-flex gap-50'>
          <span id={`edit-lt-${lt._id}`} className='cursor-pointer' onClick={() => openEdit(lt)}>
            <Edit2 size={14} className='text-primary' />
          </span>
          <UncontrolledTooltip target={`edit-lt-${lt._id}`}>{t('Edit')}</UncontrolledTooltip>
          {!lt.is_system && (
            <>
              <span id={`del-lt-${lt._id}`} className='cursor-pointer' onClick={() => handleDelete(lt)}>
                <Trash2 size={14} className='text-danger' />
              </span>
              <UncontrolledTooltip target={`del-lt-${lt._id}`}>{t('Delete')}</UncontrolledTooltip>
            </>
          )}
        </div>
      ),
    }] : []),
  ]

  return (
    <>
      <DatatablePagination
        columns={columns}
        data={store?.leaveTypeItems || []}
        loading={store?.loading}
        disablePagination
      />

      <Modal isOpen={modal} toggle={() => setModal(false)} size='lg' centered>
        <ModalHeader toggle={() => setModal(false)}>
          {editItem ? t('Edit Leave Type') : t('Add Leave Type')}
        </ModalHeader>
        <Form onSubmit={handleSubmit}>
          <ModalBody>
            <Row>
              <Col md={8}>
                <FormGroup>
                  <Label>{t('Name')} <span className='text-danger'>*</span></Label>
                  <Input value={form.name} onChange={f('name')} placeholder='Annual Leave' required />
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <Label>{t('Colour')}</Label>
                  <div className='d-flex align-items-center gap-2'>
                    <Input type='color' value={form.color} onChange={f('color')} style={{ width: 50, height: 38, padding: 2 }} />
                    <Input value={form.color} onChange={f('color')} placeholder='#0ea5e9' />
                  </div>
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <Label>{t('Max Days / Year')}</Label>
                  <Input type='number' step='0.5' min='0' value={form.max_days_per_year} onChange={f('max_days_per_year')} placeholder='Unlimited' />
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <Label>{t('Accrual Method')}</Label>
                  <Input type='select' value={form.accrual_method} onChange={f('accrual_method')}>
                    {accrualOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </Input>
                </FormGroup>
              </Col>
              <Col md={4}>
                <FormGroup>
                  <Label>{t('Min Notice Days')}</Label>
                  <Input type='number' min='0' value={form.notice_days} onChange={f('notice_days')} />
                </FormGroup>
              </Col>
              <Col md={6}>
                <div className='form-check form-switch mt-1'>
                  <Input type='checkbox' className='form-check-input' id='ltIsPaid' checked={form.is_paid} onChange={f('is_paid')} />
                  <Label className='form-check-label ms-75' htmlFor='ltIsPaid'>{t('Paid Leave')}</Label>
                </div>
                <div className='form-check form-switch mt-1'>
                  <Input type='checkbox' className='form-check-input' id='ltReqApproval' checked={form.requires_approval} onChange={f('requires_approval')} />
                  <Label className='form-check-label ms-75' htmlFor='ltReqApproval'>{t('Requires Manager Approval')}</Label>
                </div>
                <div className='form-check form-switch mt-1'>
                  <Input type='checkbox' className='form-check-input' id='ltIsActive' checked={form.is_active} onChange={f('is_active')} />
                  <Label className='form-check-label ms-75' htmlFor='ltIsActive'>{t('Active')}</Label>
                </div>
              </Col>
              <Col md={6}>
                <div className='form-check form-switch mt-1'>
                  <Input type='checkbox' className='form-check-input' id='ltCarryOver' checked={form.carry_over_allowed} onChange={f('carry_over_allowed')} />
                  <Label className='form-check-label ms-75' htmlFor='ltCarryOver'>{t('Allow Carry Over')}</Label>
                </div>
                {form.carry_over_allowed && (
                  <FormGroup className='mt-1'>
                    <Label>{t('Max Carry Over Days')}</Label>
                    <Input type='number' step='0.5' min='0' value={form.max_carry_over_days} onChange={f('max_carry_over_days')} placeholder='No limit' />
                  </FormGroup>
                )}
                <div className='form-check form-switch mt-1'>
                  <Input type='checkbox' className='form-check-input' id='ltDocReq' checked={form.documentation_required} onChange={f('documentation_required')} />
                  <Label className='form-check-label ms-75' htmlFor='ltDocReq'>{t('Documentation Required')}</Label>
                </div>
                {form.documentation_required && (
                  <FormGroup className='mt-1'>
                    <Label>{t('After how many days?')}</Label>
                    <Input type='number' min='1' value={form.documentation_after_days} onChange={f('documentation_after_days')} />
                  </FormGroup>
                )}
              </Col>
            </Row>
          </ModalBody>
          <ModalFooter>
            <Button color='secondary' outline onClick={() => setModal(false)}>{t('Cancel')}</Button>
            <Button color='primary' type='submit' disabled={!store?.loading}>
              {!store?.loading ? <Spinner size='sm' /> : editItem ? t('Update') : t('Create')}
            </Button>
          </ModalFooter>
        </Form>
      </Modal>
    </>
  )
}

// ─── LEAVE EVENTS ───────────────────────────────────────────────────────────

const LEAVE_EVENTS = [
  { key: 'LEAVE_REQUESTED', label: 'Leave Requested' },
  { key: 'LEAVE_APPROVED', label: 'Leave Approved' },
  { key: 'LEAVE_REJECTED', label: 'Leave Rejected' },
  { key: 'LEAVE_CANCELLED_BY_EMPLOYEE', label: 'Leave Cancelled by Employee' },
  { key: 'LEAVE_CANCELLED_BY_ADMIN', label: 'Leave Cancelled by Admin' },
]

// ─── LeaveNotificationSettings ──────────────────────────────────────────────
import NotificationSettingsPanel from '@components/notification-settings'

const LeaveNotificationSettings = () => (
  <NotificationSettingsPanel events={LEAVE_EVENTS} />
)

export default LeaveAdminView
