import React from 'react';
import { Card, CardBody, CardHeader, Spinner, Row, Col } from 'reactstrap';
import Chart from 'react-apexcharts';
import { AlertCircle } from 'react-feather';
import './DashboardCharts.scss';

const DashboardCharts = ({ chartData, loading, error }) => {
    if (loading) {
        return (
            <Row>
                <Col lg={6}>
                    <Card className="chart-card">
                        <CardBody className="d-flex justify-content-center align-items-center" style={{ minHeight: '350px' }}>
                            <Spinner color="primary" />
                        </CardBody>
                    </Card>
                </Col>
                <Col lg={6}>
                    <Card className="chart-card">
                        <CardBody className="d-flex justify-content-center align-items-center" style={{ minHeight: '350px' }}>
                            <Spinner color="primary" />
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        );
    }

    if (error) {
        return (
            <Card className="chart-card">
                <CardBody className="text-center text-danger py-5">
                    <AlertCircle size={32} className="mb-2" />
                    <p>{error}</p>
                </CardBody>
            </Card>
        );
    }

    if (!chartData) {
        return null;
    }

    // Revenue Chart Options
    const revenueChartOptions = {
        chart: {
            type: 'area',
            toolbar: { show: false },
            sparkline: { enabled: false },
        },
        colors: ['#7367f0'],
        fill: {
            type: 'gradient',
            gradient: {
                shadeIntensity: 0.9,
                opacityFrom: 0.7,
                opacityTo: 0.5,
                stops: [0, 80, 100],
            },
        },
        stroke: {
            curve: 'smooth',
            width: 2,
        },
        xaxis: {
            categories: chartData.revenueByMonth?.map((d) => d.month) || [],
            labels: {
                style: { colors: '#6e6b7b', fontSize: '12px' },
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                style: { colors: '#6e6b7b', fontSize: '12px' },
                formatter: (val) => `£${val.toLocaleString()}`,
            },
        },
        tooltip: {
            y: {
                formatter: (val) => `£${val.toLocaleString()}`,
            },
        },
        grid: {
            borderColor: '#ebe9f1',
            strokeDashArray: 5,
        },
        dataLabels: { enabled: false },
    };

    const revenueChartSeries = [
        {
            name: 'Revenue',
            data: chartData.revenueByMonth?.map((d) => d.revenue) || [],
        },
    ];

    // Subscriptions Chart Options
    const subscriptionChartOptions = {
        chart: {
            type: 'bar',
            stacked: true,
            toolbar: { show: false },
        },
        colors: ['#28c76f', '#ff9f43', '#ea5455'],
        plotOptions: {
            bar: {
                horizontal: false,
                columnWidth: '50%',
                borderRadius: 4,
            },
        },
        xaxis: {
            categories: chartData.subscriptionsByMonth?.map((d) => d.month) || [],
            labels: {
                style: { colors: '#6e6b7b', fontSize: '12px' },
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                style: { colors: '#6e6b7b', fontSize: '12px' },
            },
        },
        legend: {
            position: 'top',
            horizontalAlign: 'left',
            labels: { colors: '#6e6b7b' },
        },
        grid: {
            borderColor: '#ebe9f1',
            strokeDashArray: 5,
        },
        dataLabels: { enabled: false },
    };

    const subscriptionChartSeries = [
        {
            name: 'Active',
            data: chartData.subscriptionsByMonth?.map((d) => d.active) || [],
        },
        {
            name: 'Trial',
            data: chartData.subscriptionsByMonth?.map((d) => d.trial) || [],
        },
        {
            name: 'Expired',
            data: chartData.subscriptionsByMonth?.map((d) => d.expired) || [],
        },
    ];

    // Signups Chart Options (Line chart for weekly signups)
    const signupsChartOptions = {
        chart: {
            type: 'line',
            toolbar: { show: false },
        },
        colors: ['#00cfe8'],
        stroke: {
            curve: 'smooth',
            width: 3,
        },
        markers: {
            size: 4,
            colors: ['#00cfe8'],
            strokeColors: '#fff',
            strokeWidth: 2,
        },
        xaxis: {
            categories: chartData.signupsByWeek?.map((d) => d.week) || [],
            labels: {
                style: { colors: '#6e6b7b', fontSize: '12px' },
            },
            axisBorder: { show: false },
            axisTicks: { show: false },
        },
        yaxis: {
            labels: {
                style: { colors: '#6e6b7b', fontSize: '12px' },
            },
        },
        grid: {
            borderColor: '#ebe9f1',
            strokeDashArray: 5,
        },
        dataLabels: { enabled: false },
    };

    const signupsChartSeries = [
        {
            name: 'Signups',
            data: chartData.signupsByWeek?.map((d) => d.count) || [],
        },
    ];

    return (
        <div className="dashboard-charts">
            <Row>
                <Col lg={6} className="mb-2">
                    <Card className="chart-card">
                        <CardHeader>
                            <h5 className="mb-0">Revenue Trend</h5>
                            <small className="text-muted">Monthly revenue over time</small>
                        </CardHeader>
                        <CardBody>
                            <Chart
                                options={revenueChartOptions}
                                series={revenueChartSeries}
                                type="area"
                                height={280}
                            />
                        </CardBody>
                    </Card>
                </Col>
                <Col lg={6} className="mb-2">
                    <Card className="chart-card">
                        <CardHeader>
                            <h5 className="mb-0">Subscriptions Overview</h5>
                            <small className="text-muted">Active, Trial & Expired by month</small>
                        </CardHeader>
                        <CardBody>
                            <Chart
                                options={subscriptionChartOptions}
                                series={subscriptionChartSeries}
                                type="bar"
                                height={280}
                            />
                        </CardBody>
                    </Card>
                </Col>
            </Row>
            <Row>
                <Col lg={12}>
                    <Card className="chart-card">
                        <CardHeader>
                            <h5 className="mb-0">Weekly Signups</h5>
                            <small className="text-muted">New company signups over the last 8 weeks</small>
                        </CardHeader>
                        <CardBody>
                            <Chart
                                options={signupsChartOptions}
                                series={signupsChartSeries}
                                type="line"
                                height={250}
                            />
                        </CardBody>
                    </Card>
                </Col>
            </Row>
        </div>
    );
};

export default DashboardCharts;
