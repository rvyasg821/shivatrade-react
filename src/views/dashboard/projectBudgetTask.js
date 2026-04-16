/* eslint-disable prefer-const */
import { CardBody, CardTitle, CardHeader } from "reactstrap";
import { Bar } from "react-chartjs-2";
import { useRef, useEffect, useState } from "react";
import { useTranslation } from "react-i18next"

const ProjectBudgetByTask = ({ isEmptyBlankDataDisplay }) => {
    const chartRef = useRef(null);
          const { t } = useTranslation();

    // ✅ Always initialize chartData with a SAFE default (not null)
    const [chartData, setChartData] = useState({
        labels: [],
        datasets: [
            {
                label: "",
                data: [],
                backgroundColor: "rgba(0,0,0,0)"
            }
        ]
    });

    const budgetTaskChartOptions = {
        maintainAspectRatio: false,
        responsive: true,
        plugins: {
            legend: { display: false }
        },
        scales: {
            y: {
                grid: {
                    display: true,
                    color: "rgba(225,78,202,0.1)"
                },
                ticks: {
                    padding: 20,
                    color: "#9e9e9e",
                    beginAtZero: true
                }
            },
            x: {
                grid: {
                    display: true,
                    color: "rgba(225,78,202,0.1)"
                },
                ticks: {
                    padding: 20,
                    color: "#9e9e9e"
                }
            }
        }
    };

    useEffect(() => {
        if (!chartRef.current) return;

        const ctx = chartRef.current.ctx;

        const gradient = ctx.createLinearGradient(0, 230, 0, 50);
        gradient.addColorStop(1, "rgba(72,72,176,0.1)");
        gradient.addColorStop(0.4, "rgba(72,72,176,0.0)");
        gradient.addColorStop(0, "rgba(119,52,169,0)");

        setChartData({
            labels: isEmptyBlankDataDisplay
                ? []
                : ["CIS", "SIEM", "VAS", "IPDF", "Pentest"],
            datasets: [
                {
                    label: "Budget",
                    fill: true,
                    backgroundColor: gradient,
                    borderColor: "#d048b6",
                    borderWidth: 2,
                    data: isEmptyBlankDataDisplay
                        ? []
                        : [10000, 15000, 25000, 1600, 26000]
                }
            ]
        });
    }, [isEmptyBlankDataDisplay]);

    return (
        <>
            <CardHeader>
                <CardTitle tag="h5" className="text-white">{t("Projected Budget by Task")}</CardTitle>
                {!isEmptyBlankDataDisplay && (
                    <CardTitle tag="h3">
                        <i className="tim-icons icon-coins text-primary" /> $776K
                    </CardTitle>
                )}
            </CardHeader>

            <CardBody>
                {isEmptyBlankDataDisplay && (
                    <p className="text-center align-middle">N/A</p>
                )}

                {!isEmptyBlankDataDisplay && (
                    <div className="chart-area">
                        <Bar ref={chartRef} data={chartData} options={budgetTaskChartOptions} />
                    </div>
                )}
            </CardBody>
        </>
    );
};

export default ProjectBudgetByTask;
