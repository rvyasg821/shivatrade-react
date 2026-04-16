import React from 'react';
import { Card, CardBody, CardHeader, Spinner, Badge, Table } from 'reactstrap';
import { AlertCircle } from 'react-feather';
import './CompanyQuickList.scss';

const CompanyQuickList = ({ companies, loading, error }) => {
    const formatDate = (date) => {
        if (!date) return 'N/A';
        return new Date(date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        });
    };

    const getSubscriptionBadge = (subscription) => {
        if (!subscription) {
            return <Badge color="light-secondary">No Subscription</Badge>;
        }

        if (subscription.trial) {
            return <Badge color="light-warning">Trial</Badge>;
        }

        if (subscription.status) {
            return <Badge color="light-success">Active</Badge>;
        }

        return <Badge color="light-danger">Expired</Badge>;
    };

    if (loading) {
        return (
            <Card className="company-list-card">
                <CardHeader>
                    <h5 className="mb-0">Recent Companies</h5>
                </CardHeader>
                <CardBody className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                    <Spinner color="primary" />
                </CardBody>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="company-list-card">
                <CardHeader>
                    <h5 className="mb-0">Recent Companies</h5>
                </CardHeader>
                <CardBody className="text-center text-danger py-5">
                    <AlertCircle size={32} className="mb-2" />
                    <p>{error}</p>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card className="company-list-card">
            <CardHeader className="d-flex justify-content-between align-items-center">
                <h5 className="mb-0">Recent Companies</h5>
                <small className="text-muted">Latest registered companies</small>
            </CardHeader>
            <CardBody className="p-0">
                {companies.length === 0 ? (
                    <div className="text-center text-muted py-5">
                        No companies found
                    </div>
                ) : (
                    <div className="table-responsive">
                        <Table className="custom-table mb-0">
                            <thead>
                                <tr>
                                    <th>Company</th>
                                    <th>Plan</th>
                                    <th>Status</th>
                                    <th>Joined</th>
                                </tr>
                            </thead>
                            <tbody>
                                {companies.slice(0, 5).map((company) => (
                                    <tr key={company._id}>
                                        <td>
                                            <div className="company-info">
                                                <div className="company-avatar">
                                                    {company.name?.charAt(0)?.toUpperCase() || 'C'}
                                                </div>
                                                <div className="company-details">
                                                    <span className="company-name">{company.name}</span>
                                                    <span className="company-email">{company.email}</span>
                                                </div>
                                            </div>
                                        </td>
                                        <td>
                                            <span className="plan-name">
                                                {company.subscription?.plan_name || 'N/A'}
                                            </span>
                                        </td>
                                        <td>
                                            {getSubscriptionBadge(company.subscription)}
                                        </td>
                                        <td>
                                            <span className="join-date">
                                                {formatDate(company.createdAt)}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </Table>
                    </div>
                )}
            </CardBody>
        </Card>
    );
};

export default CompanyQuickList;
