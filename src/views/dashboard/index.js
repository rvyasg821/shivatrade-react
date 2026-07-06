/* eslint-disable object-shorthand */
/* eslint-disable prefer-const */
import { useEffect, useState, useCallback, Fragment } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import {
    Row, Col, Card, CardBody, CardHeader, CardTitle, Spinner, Badge, Button, Progress,
    Modal, ModalHeader, ModalBody, ModalFooter, FormGroup, Label, Input,
} from 'reactstrap';
import { useTranslation } from 'react-i18next';
import Select from 'react-select';
import { Users, MapPin, CheckCircle, XCircle, Clock, AlertTriangle, Calendar, Coffee, ArrowRight, Settings, BarChart2, Plus, Camera } from 'react-feather';
import Notification from '@components/toast/notification';
import useFormLoading from '@src/hooks/useFormLoading';
import { useNavigate } from 'react-router-dom';
import { appsRoot } from '@constant/defaultValues';
import { APP_MODE } from '@src/configs/appMode';
import instance from '@src/utility/AxiosConfig';
import { API_ENDPOINTS } from '@src/utility/ApiEndPoints';
import { getCompanyData, setSubscriptionTools } from '@src/redux/authentication';

// Returns true if the company subscription includes the given tool slug.
// Used to hide dashboard widgets/tools the user hasn't paid for.
const hasTool = (slug) => {
    const tools = getCompanyData()?.tools || [];
    return tools.some((t) => t?.slug === slug || t?._id === slug);
};

// Components
import SubscriptionCard from './SubscriptionCard';
import StatsCard from './StatsCard';
import RecentActivity from './RecentActivity';
import DashboardCharts from './DashboardCharts';
import CompanyQuickList from './CompanyQuickList';
import ErpDashboard, { hasErpAccess } from './ErpDashboard';

// Styles
import './SubscriptionCard.scss';
import './StatsCard.scss';
import './RecentActivity.scss';
import './DashboardCharts.scss';
import './CompanyQuickList.scss';

// Store
import {
    fetchAdminDashboardStats,
    fetchRecentActivity,
    fetchChartData,
    fetchRecentCompanies,
    fetchCompanyDashboardStats,
} from './store';
import { getMyLeaveBalance, getMyLeaveRequests, getLeaveTypeList } from '../leave/store';

// Employee attendance page (full clock in/out + records)
import AttendancePage from '../attendance';

// Utils

const StatCard = ({ icon: Icon, color, label, value, onClick }) => (
    <Card className="mb-1" onClick={onClick} style={onClick ? { cursor: 'pointer' } : {}}>
        <CardBody className="py-1 px-1">
            <div className="d-flex align-items-center">
                <div className={`avatar avatar-stats p-50 m-0 bg-light-${color} me-1`}>
                    <div className="avatar-content"><Icon size={20} /></div>
                </div>
                <div>
                    <h2 className="fw-bolder mb-0">{value ?? '—'}</h2>
                    <p className="card-text mb-0 small text-muted">{label}</p>
                </div>
            </div>
        </CardBody>
    </Card>
);

const formatClockTime = (isoStr) => {
    if (!isoStr) return '—';
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

// ── COMPANY / LOCATION ADMIN DASHBOARD ───────────────────────────────────────
const CompanyDashboard = ({ stats, loading, showSetupChecklist = false, onRefresh, currentUser }) => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    // ── Manual Entry Modal ──
    const todayStr = () => new Date().toISOString().split('T')[0];
    const [manualModal, setManualModal] = useState(false);
    const [manualData, setManualData] = useState({ user_id: '', date: todayStr(), clock_in: '', clock_out: '', status: '', notes: '' });
    const [manualSubmitting, setManualSubmitting] = useState(false);
    const [employeeOptions, setEmployeeOptions] = useState([]);
    useFormLoading(manualSubmitting);

    const openManualEntry = () => {
        setManualData({ user_id: '', date: todayStr(), clock_in: '', clock_out: '', status: '', notes: '' });
        // Load employees for dropdown
        if (employeeOptions.length === 0) {
            instance.get(API_ENDPOINTS.employees.list, { params: { perPage: 500, page: 1 } })
                .then(res => {
                    const list = res.data?.data || [];
                    setEmployeeOptions(list.map(e => ({
                        value: e._id,
                        label: `${e.first_name || ''} ${e.last_name || ''}`.trim() + (e.employee_code ? ` (${e.employee_code})` : ''),
                    })));
                })
                .catch(() => {});
        }
        setManualModal(true);
    };

    const handleManualSubmit = async () => {
        if (!manualData.user_id || !manualData.date) return;
        setManualSubmitting(true);
        try {
            const payload = { ...manualData };
            if (!payload.clock_in) delete payload.clock_in;
            if (!payload.clock_out) delete payload.clock_out;
            if (!payload.status) delete payload.status;
            if (!payload.notes) delete payload.notes;
            await instance.post(API_ENDPOINTS.attendance.manual, payload);
            Notification('Success', t('Manual entry saved'), 'success');
            setManualModal(false);
            if (onRefresh) onRefresh();
        } catch (err) {
            Notification('Error', err?.response?.data?.message || t('Failed to save'), 'warning');
        } finally {
            setManualSubmitting(false);
        }
    };

    if (loading) {
        return <div className="text-center py-5"><Spinner color="primary" /></div>;
    }

    if (!stats) {
        return <div className="text-center text-muted py-3">{t("No data available")}</div>;
    }

    return (
        <>
            {/* Row 1: 4 Stat Cards */}
            <Row className="match-height">
                <Col xl={3} md={6} sm={6} xs={12}>
                    <StatCard icon={Users} color="primary" label={t("Total Employees")} value={stats.totalEmployees}
                        onClick={() => navigate(`${appsRoot}/employees`)} />
                </Col>
                <Col xl={3} md={6} sm={6} xs={12}>
                    <StatCard icon={MapPin} color="info" label={t("Locations")} value={stats.totalLocations} />
                </Col>
                {hasTool('hrm-attendance') && (
                    <Col xl={3} md={6} sm={6} xs={12}>
                        <StatCard icon={CheckCircle} color="success" label={t("Present Today")} value={stats.presentToday}
                            onClick={() => navigate(`${appsRoot}/attendance/admin`)} />
                    </Col>
                )}
                {hasTool('hrm-attendance') && (
                    <Col xl={3} md={6} sm={6} xs={12}>
                        <StatCard icon={XCircle} color="danger" label={t("Absent Today")} value={stats.absentToday} />
                    </Col>
                )}
            </Row>

            {/* Row 2: 4 Stat Cards */}
            <Row className="match-height">
                {hasTool('hrm-attendance') && (
                    <Col xl={3} md={6} sm={6} xs={12}>
                        <StatCard icon={AlertTriangle} color="warning" label={t("Late Today")} value={stats.lateToday} />
                    </Col>
                )}
                {hasTool('hrm-leave') && (
                    <Col xl={3} md={6} sm={6} xs={12}>
                        <StatCard icon={Calendar} color="secondary" label={t("On Leave Today")} value={stats.onLeaveToday} />
                    </Col>
                )}
                {hasTool('hrm-leave') && (
                    <Col xl={3} md={6} sm={6} xs={12}>
                        <StatCard icon={Clock} color="warning" label={t("Pending Leaves")} value={stats.pendingLeaves}
                            onClick={() => navigate(`${appsRoot}/leave/admin`)} />
                    </Col>
                )}
                {hasTool('hrm-attendance') && (
                    <Col xl={3} md={6} sm={6} xs={12}>
                        <StatCard icon={CheckCircle} color="success" label={t("Attendance Rate")} value={`${stats.attendanceRate}%`} />
                    </Col>
                )}
            </Row>

            {/* Row 3: Clock-ins (left) + Completeness & Checklist (right) */}
            <Row className="match-height">
                {hasTool('hrm-attendance') && (
                <Col xl={7} lg={12}>
                    <Card className="mb-2" style={{ height: 'calc(100% - 1rem)' }}>
                        <CardHeader className="border-bottom py-1">
                            <div className="d-flex align-items-center justify-content-between w-100">
                                <CardTitle tag="h5" className="mb-0">
                                    <Clock size={15} className="me-75" />{t("Today Clock-ins")} — {new Date().toLocaleDateString('en-US', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' })}
                                </CardTitle>
                                <div className="d-flex gap-50">
                                    <Button color="primary" size="sm" onClick={openManualEntry}>
                                        <Plus size={14} className="me-50" />{t("Manual Entry")}
                                    </Button>
                                </div>
                            </div>
                        </CardHeader>
                        <CardBody className="p-0">
                            {stats.recentActivity?.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-hover mb-0">
                                        <thead>
                                            <tr>
                                                <th>{t("Employee")}</th>
                                                <th className="text-center">{t("Clock In")}</th>
                                                <th className="text-center">{t("Clock Out")}</th>
                                                <th className="text-center">{t("Status")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {stats.recentActivity.map((r, i) => (
                                                <tr key={i}>
                                                    <td className="fw-semibold">{r.user_name}</td>
                                                    <td className="text-center">{formatClockTime(r.clock_in)}</td>
                                                    <td className="text-center">{formatClockTime(r.clock_out)}</td>
                                                    <td className="text-center">
                                                        <Badge color={r.status === 'present' ? 'light-success' : 'light-secondary'} pill className="text-capitalize">
                                                            {r.status?.replace(/_/g, ' ')}
                                                        </Badge>
                                                        {r.is_late && <Badge color="light-warning" pill className="ms-50">Late</Badge>}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-muted py-3">{t("No clock-ins today")}</div>
                            )}
                        </CardBody>
                    </Card>
                </Col>
                )}

                <Col xl={hasTool('hrm-attendance') ? 5 : 12} lg={12}>
                    {/* Setup Checklist — Company Admin only (dynamic, tool-aware) */}
                    {showSetupChecklist && stats.setupChecklist?.items && (
                        <Card className="mb-1">
                            <CardHeader className="border-bottom py-75">
                                <div className="d-flex align-items-center justify-content-between w-100">
                                    <CardTitle tag="h6" className="mb-0">
                                        <Settings size={14} className="me-50" />{t("Setup Checklist")}
                                    </CardTitle>
                                    <Badge color={stats.setupChecklist.completedCount === stats.setupChecklist.totalCount ? 'success' : 'warning'} pill>
                                        {stats.setupChecklist.completedCount}/{stats.setupChecklist.totalCount}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardBody className="p-0">
                                {/* Progress bar */}
                                <div className="px-1 pt-75 pb-50">
                                    <div className="progress" style={{ height: '6px' }}>
                                        <div className="progress-bar bg-success" style={{ width: `${Math.round((stats.setupChecklist.completedCount / stats.setupChecklist.totalCount) * 100)}%` }} />
                                    </div>
                                </div>
                                {stats.setupChecklist.items.map(item => (
                                    <div key={item.key} className="d-flex align-items-center justify-content-between px-1 py-50 border-bottom"
                                        style={!item.done ? { cursor: 'pointer' } : {}}
                                        onClick={() => !item.done && navigate(item.link)}>
                                        <div className="d-flex align-items-center gap-50">
                                            {item.done
                                                ? <CheckCircle size={14} className="text-success" />
                                                : <XCircle size={14} className="text-danger" />
                                            }
                                            <div>
                                                <span className={`small ${item.done ? 'text-muted' : 'fw-semibold'}`}>{t(item.label)}</span>
                                                {!item.done && item.description && (
                                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>{t(item.description)}</div>
                                                )}
                                            </div>
                                        </div>
                                        {!item.done && <ArrowRight size={12} className="text-primary" />}
                                    </div>
                                ))}
                            </CardBody>
                        </Card>
                    )}
                </Col>
            </Row>

            {/* ── Manual Entry Modal ── */}
            <Modal isOpen={manualModal} toggle={() => setManualModal(false)} centered backdrop='static' keyboard={false}>
                <ModalHeader toggle={() => setManualModal(false)} style={{ backgroundColor: '#09418B', padding: '1.25rem 1.5rem' }}
                    close={<button type='button' className='btn-close btn-close-white' aria-label='Close' onClick={() => setManualModal(false)} />}>
                    <span style={{ color: '#fff', fontSize: '1.15rem' }}>{t('Manual Attendance Entry')}</span>
                </ModalHeader>
                <ModalBody className='py-2'>
                    <FormGroup>
                        <Label>{t('Employee')} <span className='text-danger'>*</span></Label>
                        <Select
                            options={employeeOptions}
                            value={employeeOptions.find(o => o.value === manualData.user_id) || null}
                            onChange={(opt) => setManualData(d => ({ ...d, user_id: opt?.value || '' }))}
                            placeholder={t('Search employee...')}
                            isClearable isSearchable
                        />
                    </FormGroup>
                    <FormGroup>
                        <Label>{t('Date')} <span className='text-danger'>*</span></Label>
                        <Input type='date' value={manualData.date} onChange={(e) => setManualData(d => ({ ...d, date: e.target.value }))} />
                    </FormGroup>
                    <Row>
                        <Col md={6}>
                            <FormGroup>
                                <Label>{t('Clock In')}</Label>
                                <Input type='time' value={manualData.clock_in}
                                    onChange={(e) => setManualData(d => ({ ...d, clock_in: e.target.value }))} />
                            </FormGroup>
                        </Col>
                        <Col md={6}>
                            <FormGroup>
                                <Label>{t('Clock Out')}</Label>
                                <Input type='time' value={manualData.clock_out}
                                    onChange={(e) => setManualData(d => ({ ...d, clock_out: e.target.value }))} />
                            </FormGroup>
                        </Col>
                    </Row>
                    <FormGroup>
                        <Label>{t('Status')}</Label>
                        <Input type='select' value={manualData.status} onChange={(e) => setManualData(d => ({ ...d, status: e.target.value }))}>
                            <option value=''>{t('Auto-calculate')}</option>
                            <option value='present'>{t('Present')}</option>
                            <option value='absent'>{t('Absent')}</option>
                            <option value='half_day'>{t('Half Day')}</option>
                            <option value='on_leave'>{t('On Leave')}</option>
                            <option value='holiday'>{t('Holiday')}</option>
                        </Input>
                    </FormGroup>
                    <FormGroup>
                        <Label>{t('Notes')}</Label>
                        <Input type='textarea' rows={2} value={manualData.notes}
                            onChange={(e) => setManualData(d => ({ ...d, notes: e.target.value }))} />
                    </FormGroup>
                </ModalBody>
                <ModalFooter>
                    <Button color='secondary' outline onClick={() => setManualModal(false)}>{t('Cancel')}</Button>
                    <Button color='primary' onClick={handleManualSubmit}
                        disabled={manualSubmitting || !manualData.user_id || !manualData.date}>
                        {manualSubmitting ? <Spinner size='sm' /> : t('Save Entry')}
                    </Button>
                </ModalFooter>
            </Modal>
        </>
    );
};

// ── EMPLOYEE DASHBOARD ───────────────────────────────────────────────────────
const EmployeeDashboard = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();
    const leaveStore = useSelector((s) => s.leave);
    const authStore = useSelector((s) => s.auth);
    const user = authStore?.authUserItem;

    useEffect(() => {
        dispatch(getLeaveTypeList());
        dispatch(getMyLeaveBalance(new Date().getFullYear()));
        dispatch(getMyLeaveRequests(new Date().getFullYear()));
    }, [dispatch]);

    const leaveBalance = leaveStore?.myBalance || [];
    const leaveRequests = leaveStore?.myRequests || [];
    const leaveTypes = leaveStore?.leaveTypeItems || [];

    // Build leave type name map
    const leaveTypeMap = {};
    leaveTypes.forEach((lt) => { leaveTypeMap[lt._id] = lt.name; });

    return (
        <Fragment>
                {/* Whole HR block (Clock-In + Leave Balance + My Leave Requests)
                    hidden on the employee dashboard per request 2026-07-06.
                    Flip `false` to true to restore. */}
                {false && (
                <Fragment>
                <AttendancePage hideRecords />

                <Row className="mt-2">
                <Col lg={6}>
                    <Card className="mb-2">
                        <CardHeader className="border-bottom py-1 d-flex justify-content-between align-items-center">
                            <CardTitle tag="h5" className="mb-0">
                                <Calendar size={15} className="me-75" />{t("Leave Balance")}
                            </CardTitle>
                            <Button color="flat-primary" size="sm" onClick={() => navigate(`${appsRoot}/leave`)}>
                                {t("View All")} <ArrowRight size={14} />
                            </Button>
                        </CardHeader>
                        <CardBody>
                            {leaveBalance.length > 0 ? (
                                leaveBalance.map((lb, i) => {
                                    const used = lb.used ?? 0;
                                    const total = lb.total_entitlement ?? 0;
                                    const remaining = lb.balance ?? (total - used);
                                    const pct = total > 0 ? Math.round((used / total) * 100) : 0;
                                    const typeName = leaveTypeMap[lb.leave_type_id] || 'Leave';
                                    return (
                                        <div key={i} className="mb-1">
                                            <div className="d-flex justify-content-between mb-25">
                                                <span className="fw-semibold small">{typeName}</span>
                                                <span className="small text-muted">{remaining} / {total} {t("remaining")}</span>
                                            </div>
                                            <Progress value={pct} color={pct > 80 ? 'danger' : pct > 50 ? 'warning' : 'success'} style={{ height: '6px' }} />
                                        </div>
                                    );
                                })
                            ) : (
                                <div className="text-center text-muted py-1">{t("No leave balance data")}</div>
                            )}
                        </CardBody>
                    </Card>
                </Col>

                {/* Leave Requests */}
                <Col lg={6}>
                    <Card className="mb-2">
                        <CardHeader className="border-bottom py-1">
                            <CardTitle tag="h5" className="mb-0">
                                <Clock size={15} className="me-75" />{t("My Leave Requests")}
                            </CardTitle>
                        </CardHeader>
                        <CardBody>
                            {leaveRequests.length > 0 ? (
                                <div className="table-responsive">
                                    <table className="table table-sm mb-0">
                                        <thead>
                                            <tr>
                                                <th>{t("Type")}</th>
                                                <th>{t("Dates")}</th>
                                                <th className="text-center">{t("Status")}</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {leaveRequests.slice(0, 5).map((r, i) => (
                                                <tr key={i}>
                                                    <td className="small">{leaveTypeMap[r.leave_type_id] || '—'}</td>
                                                    <td className="small">{r.start_date} — {r.end_date}</td>
                                                    <td className="text-center">
                                                        <Badge color={
                                                            r.status === 'approved' ? 'light-success' :
                                                            r.status === 'pending' ? 'light-warning' :
                                                            r.status === 'rejected' ? 'light-danger' : 'light-secondary'
                                                        } pill className="text-capitalize">{r.status}</Badge>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            ) : (
                                <div className="text-center text-muted py-1">{t("No leave requests")}</div>
                            )}
                        </CardBody>
                    </Card>
                </Col>
                </Row>
                </Fragment>
                )}
        </Fragment>
    );
};

// ── MAIN DASHBOARD ───────────────────────────────────────────────────────────
const Dashboard = () => {
    const { t } = useTranslation();
    const dispatch = useDispatch();
    const navigate = useNavigate();

    const authStore = useSelector((s) => s.auth);
    const roleName = (authStore?.authUserItem?.role?.name || '').toLowerCase();
    const isSuperAdmin = roleName.includes('super') || roleName === 'admin' || roleName.includes('superadmin');
    const isCompanyAdmin = roleName === 'company admin';
    const isLocationAdmin = roleName === 'location admin';


    const {
        adminStats, adminStatsLoading, adminStatsError,
        recentActivity, recentActivityLoading, recentActivityError,
        chartData, chartDataLoading, chartDataError,
        recentCompanies, recentCompaniesLoading, recentCompaniesError,
        companyStats, companyStatsLoading,
    } = useSelector((state) => state.DashboardWidgets);

    useEffect(() => {
        if (isSuperAdmin) {
            dispatch(fetchAdminDashboardStats());
            dispatch(fetchRecentActivity(15));
            dispatch(fetchChartData(6));
            dispatch(fetchRecentCompanies(5));
        }

        if (isCompanyAdmin || isLocationAdmin) {
            dispatch(fetchCompanyDashboardStats());
        }

        // Subscription gate (Company Admin only) — runs BEFORE setup status check
        // so an inactive subscription always wins. Inactive → upgrade page.
        // Also refreshes the localStorage flag so PrivateRoute / RoleWrapper see
        // the latest state (e.g. after a fresh upgrade in a different tab).
        // Skipped entirely in single-tenant mode (no subscriptions; the upgrade
        // page is hidden so a redirect would dead-end on a 404).
        if (isCompanyAdmin && APP_MODE !== 'single') {
            instance.get(API_ENDPOINTS.subscription.myStatus)
                .then(res => {
                    const data = res.data?.data;
                    if (data) {
                        // Always refresh the cached flag + tools so the rest of
                        // the app reflects the truth, not stale login data.
                        dispatch(setSubscriptionTools({
                            tools: data.tools || [],
                            isActive: data.is_active,
                        }));

                        if (data.is_active === false) {
                            navigate(`${appsRoot}/profile/subscription/upgrade`, { replace: true });
                            return;
                        }
                    }
                    // Subscription active → check setup status next
                    instance.get(API_ENDPOINTS.companySettings.setupStatus)
                        .then(setupRes => {
                            if (setupRes.data?.data && !setupRes.data.data.setup_completed) {
                                // navigate(`${appsRoot}/setup`, { replace: true });
                            }
                        })
                        .catch(() => {});
                })
                .catch(() => {
                    // On error fetching subscription status, fall back to setup check
                    instance.get(API_ENDPOINTS.companySettings.setupStatus)
                        .then(setupRes => {
                            if (setupRes.data?.data && !setupRes.data.data.setup_completed) {
                                // navigate(`${appsRoot}/setup`, { replace: true });
                            }
                        })
                        .catch(() => {});
                });
        }

    }, [dispatch, isSuperAdmin, isCompanyAdmin, isLocationAdmin]);

    // Welcome banner removed — replaced by setup wizard

    const renderContent = () => {
        if (isSuperAdmin) {
            return (
                <div className="super-admin-dashboard">
                    <StatsCard stats={adminStats} loading={adminStatsLoading} error={adminStatsError} />
                    <div className="mt-2">
                        <DashboardCharts chartData={chartData} loading={chartDataLoading} error={chartDataError} />
                    </div>
                    <Row className="mt-2">
                        <Col lg={5} md={12} className="mb-2">
                            <RecentActivity activities={recentActivity} loading={recentActivityLoading} error={recentActivityError} />
                        </Col>
                        <Col lg={7} md={12} className="mb-2">
                            <CompanyQuickList companies={recentCompanies} loading={recentCompaniesLoading} error={recentCompaniesError} />
                        </Col>
                    </Row>
                </div>
            );
        }

        if (isCompanyAdmin) {
            return (
                <div className="company-admin-dashboard">
                    <ErpDashboard />
                </div>
            );
        }

        if (isLocationAdmin) {
            return (
                <div className="location-admin-dashboard">
                    <ErpDashboard />
                </div>
            );
        }

        // Employee or any other role. The personal Attendance & Leave block
        // comes first (every employee needs it), then the role-aware ERP cards
        // underneath for staff who have ERP module permissions. Pure HR
        // employees just get the attendance / leave view.
        if (hasErpAccess(authStore?.authUserItem)) {
            return (
                <Fragment>
                    <EmployeeDashboard />
                    <h5 className="text-muted fw-bolder mb-1 pt-1 border-top">
                        {t("Business Overview")}
                    </h5>
                    <ErpDashboard />
                </Fragment>
            );
        }
        return <EmployeeDashboard />;
    };

    return (
        <div className='main-content dashboard'>
            <div className="d-flex align-items-center justify-content-between mb-2">
                <h3 className='mb-0'>{t("Dashboard")}</h3>
            </div>
            {renderContent()}
        </div>
    );
};

export default Dashboard;
