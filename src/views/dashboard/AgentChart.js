import React, { useCallback } from "react";
import { useNavigate } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
// import { wazuhIndexerSeverityCountData } from "./store/index";
import { useTranslation } from "react-i18next"

import Chart from "react-apexcharts";
import { CardBody, CardTitle, CardHeader } from "reactstrap";

const AgentChart = () => {
    const navigate = useNavigate();
    const { t } = useTranslation();


    const dispatch = useDispatch();
    // const store = useSelector((state) => state.dashboard);

    const handleGetWazuhIndexerCountData = useCallback((refreshType = "") => {
        const payload = {}
        if (refreshType) { payload.refresh_type = refreshType; }

        // dispatch(wazuhIndexerSeverityCountData(payload))
    }, [dispatch])

    // Get the dynamic data from the store

    //Required
    // const agentCounts = store?.wazuhSeverityCount?.agentCounts || { active: 0, disconnected: 0 };
    const agentCounts = { active: 15, disconnected: 8 };

    // Configure chart options
    const chartOptions = {
        series: [agentCounts.active, agentCounts.disconnected],
        labels: [t("Active"), t("Disconnected")],
        colors: ["#9cc904", "#ea5f16"], // Green for Active, Red for Disconnected
        chart: {
            type: "donut"
        },
        legend: {
            position: "bottom",
            markers: {
                radius: 12
            },
            labels: {
                colors: "#fff" // make legend label text white
            },
        },
        dataLabels: {
            enabled: true,
            formatter: (val) => `${val.toFixed(1)}%`,
            style: {
                colors: ["#fff"] // percentage text color inside chart white
            }
        },
        plotOptions: {
            pie: {
                donut: {
                    size: "70%",
                    labels: {
                        show: true,
                        name: {
                            color: "#fff"
                        },
                        value: {
                            color: "#fff"
                        }
                    }
                }
            }
        }
    }

    return (<>
        <CardHeader>
            <CardTitle tag="h3" className="cursor-pointer" onClick={() => navigate("/apps/configuration-assessment-chart")}>
                <span className="text-white">
                    <i className="tim-icons icon-alert-circle-exc text-primary" />
                    {t("Agents Summary")}               </span>

            </CardTitle>
        </CardHeader>

        <CardBody>
            <Chart
                options={chartOptions}
                series={chartOptions.series}
                type="donut"
                height={300}
            />

            {/* <div className="refresh-buttons mt-3">
                <div className="cursor-pointer" onClick={() => handleGetWazuhIndexerCountData("agent")}>
                    <i className="tim-icons icon-refresh-01"></i>Refresh
                </div>
            </div> */}
        </CardBody>
    </>)
}

export default AgentChart;
