import React from 'react';
import { Card, CardBody, Spinner } from 'reactstrap';
import { Briefcase, CreditCard, DollarSign, UserPlus, Clock, XCircle, FileText, TrendingUp } from 'react-feather';
import './StatsCard.scss';

const StatsCard = ({ stats, loading, error }) => {
    if (loading) {
        return (
            <div className="stats-loading">
                <Spinner color="primary" />
                <p>Loading dashboard statistics...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className="stats-error">
                <XCircle size={48} className="text-danger" />
                <p>{error}</p>
            </div>
        );
    }

    if (!stats) {
        return null;
    }

    const formatCurrency = (amount) => {
        return new Intl.NumberFormat('en-GB', {
            style: 'currency',
            currency: 'GBP',
            minimumFractionDigits: 2,
        }).format(amount || 0);
    };

    const statCards = [
        {
            title: 'Total Companies',
            value: stats.totalCompanies || 0,
            icon: Briefcase,
            color: 'primary',
            bgClass: 'bg-light-primary',
        },
        {
            title: 'Active Subscriptions',
            value: stats.activeSubscriptions || 0,
            icon: CreditCard,
            color: 'success',
            bgClass: 'bg-light-success',
        },
        {
            title: 'Total Revenue',
            value: formatCurrency(stats.totalRevenue),
            icon: DollarSign,
            color: 'info',
            bgClass: 'bg-light-info',
            isCurrency: true,
        },
        {
            title: 'New Signups (7 days)',
            value: stats.newSignups || 0,
            icon: UserPlus,
            color: 'warning',
            bgClass: 'bg-light-warning',
        },
    ];

    const additionalStats = [
        {
            title: 'Trial Subscriptions',
            value: stats.trialSubscriptions || 0,
            icon: Clock,
            color: 'secondary',
            bgClass: 'bg-light-secondary',
        },
        {
            title: 'Expired Subscriptions',
            value: stats.expiredSubscriptions || 0,
            icon: XCircle,
            color: 'danger',
            bgClass: 'bg-light-danger',
        },
        {
            title: 'Total Payments',
            value: stats.totalPayments || 0,
            icon: FileText,
            color: 'dark',
            bgClass: 'bg-light-dark',
        },
        {
            title: 'Revenue This Month',
            value: formatCurrency(stats.revenueThisMonth),
            icon: TrendingUp,
            color: 'success',
            bgClass: 'bg-light-success',
            isCurrency: true,
        },
    ];

    return (
        <div className="stats-container">
            <h4 className="stats-section-title">Overview</h4>
            <div className="stats-grid">
                {statCards.map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                        <Card key={index} className="stats-card">
                            <CardBody>
                                <div className="stats-card-content">
                                    <div className={`stats-icon ${stat.bgClass}`}>
                                        <IconComponent size={24} className={`text-${stat.color}`} />
                                    </div>
                                    <div className="stats-info">
                                        <h2 className={`stats-value text-${stat.color}`}>
                                            {stat.value}
                                        </h2>
                                        <p className="stats-title">{stat.title}</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    );
                })}
            </div>

            <h4 className="stats-section-title mt-2">Subscription & Payment Details</h4>
            <div className="stats-grid">
                {additionalStats.map((stat, index) => {
                    const IconComponent = stat.icon;
                    return (
                        <Card key={index} className="stats-card">
                            <CardBody>
                                <div className="stats-card-content">
                                    <div className={`stats-icon ${stat.bgClass}`}>
                                        <IconComponent size={24} className={`text-${stat.color}`} />
                                    </div>
                                    <div className="stats-info">
                                        <h2 className={`stats-value text-${stat.color}`}>
                                            {stat.value}
                                        </h2>
                                        <p className="stats-title">{stat.title}</p>
                                    </div>
                                </div>
                            </CardBody>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
};

export default StatsCard;
