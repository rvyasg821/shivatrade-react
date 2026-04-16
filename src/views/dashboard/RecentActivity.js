import React from 'react';
import { Card, CardBody, CardHeader, Spinner } from 'reactstrap';
import { UserPlus, DollarSign, CreditCard, AlertCircle } from 'react-feather';
import './RecentActivity.scss';

const RecentActivity = ({ activities, loading, error }) => {
    const getActivityIcon = (type) => {
        switch (type) {
            case 'signup':
                return <UserPlus size={16} className="text-success" />;
            case 'payment':
                return <DollarSign size={16} className="text-info" />;
            case 'subscription':
                return <CreditCard size={16} className="text-primary" />;
            default:
                return <AlertCircle size={16} className="text-secondary" />;
        }
    };

    const getActivityBgClass = (type) => {
        switch (type) {
            case 'signup':
                return 'bg-light-success';
            case 'payment':
                return 'bg-light-info';
            case 'subscription':
                return 'bg-light-primary';
            default:
                return 'bg-light-secondary';
        }
    };

    const formatDate = (date) => {
        const d = new Date(date);
        const now = new Date();
        const diffMs = now - d;
        const diffMins = Math.floor(diffMs / 60000);
        const diffHours = Math.floor(diffMs / 3600000);
        const diffDays = Math.floor(diffMs / 86400000);

        if (diffMins < 1) return 'Just now';
        if (diffMins < 60) return `${diffMins}m ago`;
        if (diffHours < 24) return `${diffHours}h ago`;
        if (diffDays < 7) return `${diffDays}d ago`;
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const formatAmount = (amount) => {
        if (!amount) return null;
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
        }).format(amount);
    };

    if (loading) {
        return (
            <Card className="recent-activity-card">
                <CardHeader>
                    <h5 className="mb-0">Recent Activity</h5>
                </CardHeader>
                <CardBody className="d-flex justify-content-center align-items-center" style={{ minHeight: '300px' }}>
                    <Spinner color="primary" />
                </CardBody>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="recent-activity-card">
                <CardHeader>
                    <h5 className="mb-0">Recent Activity</h5>
                </CardHeader>
                <CardBody className="text-center text-danger">
                    <AlertCircle size={32} className="mb-2" />
                    <p>{error}</p>
                </CardBody>
            </Card>
        );
    }

    return (
        <Card className="recent-activity-card">
            <CardHeader>
                <h5 className="mb-0">Recent Activity</h5>
            </CardHeader>
            <CardBody className="activity-list-body">
                {activities.length === 0 ? (
                    <div className="text-center text-muted py-4">
                        No recent activity
                    </div>
                ) : (
                    <ul className="activity-list">
                        {activities.map((activity, index) => (
                            <li key={activity.id || index} className="activity-item">
                                <div className={`activity-icon ${getActivityBgClass(activity.type)}`}>
                                    {getActivityIcon(activity.type)}
                                </div>
                                <div className="activity-content">
                                    <div className="activity-header">
                                        <span className="activity-title">{activity.title}</span>
                                        <span className="activity-time">{formatDate(activity.date)}</span>
                                    </div>
                                    <div className="activity-description">
                                        {activity.description}
                                        {activity.amount && (
                                            <span className="activity-amount">
                                                {formatAmount(activity.amount)}
                                            </span>
                                        )}
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </CardBody>
        </Card>
    );
};

export default RecentActivity;
