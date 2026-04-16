import React, { useRef, useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
} from "chart.js";
import { CardBody, CardHeader, CardTitle } from "reactstrap";
import { useTranslation } from "react-i18next"

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

const IncidentByType = ({ isEmptyBlankDataDisplay }) => {
  const chartRef = useRef(null);

  // ✅ INITIAL SAFE CHART DATA (NO NULL)
  const [chartData, setChartData] = useState({
    labels: [],
    datasets: [
      {
        label: "",
        data: [],
        backgroundColor: "rgba(0,0,0,0)",
      },
    ],
  });

  // const majorBarchartData = isEmptyBlankDataDisplay ? [] : [12, 19, 3, 5, 2, 3];
  // const majorBarchartLabel = isEmptyBlankDataDisplay ? [] : ["Critical", "High", "Medium", "Low", "Info", "Other"];

  const majorBarchartData = [12, 119, 23, 45, 28, 73];
  const majorBarchartLabel = ["Critical", "High", "Medium", "Low", "Info", "Other"];

  useEffect(() => {
    if (!chartRef.current) return;

    const ctx = chartRef.current.ctx;

    const gradient = ctx.createLinearGradient(0, 230, 0, 50);
    gradient.addColorStop(1, "rgba(72,72,176,0.1)");
    gradient.addColorStop(0.4, "rgba(72,72,176,0.0)");
    gradient.addColorStop(0, "rgba(119,52,169,0)");

    setChartData({
      labels: majorBarchartLabel,
      datasets: [
        {
          label: "Count",
          fill: true,
          backgroundColor: gradient,
          borderColor: "#d048b6",
          borderWidth: 2,
          data: majorBarchartData,
        },
      ],
    });
  }, [isEmptyBlankDataDisplay]);
  const { t } = useTranslation();

  return (
    <>
      <CardHeader>
        <CardTitle tag="h3">
          <span className="text-white">
            <i className="tim-icons icon-alert-circle-exc text-primary" />{" "}
            Major Incident By Type
          </span>

        </CardTitle>
      </CardHeader>

      <CardBody>
        {isEmptyBlankDataDisplay ? (
          // <p className="text-center align-middle">N/A</p>
          <></>
        ) : null}

        <div className="chart-area">
          <Bar
            ref={chartRef}
            data={chartData}
            options={{
              maintainAspectRatio: false,
              responsive: true,
              plugins: {
                legend: { display: false },
                tooltip: { enabled: true },
              },
              scales: {
                y: {
                  beginAtZero: true,
                  ticks: { color: "#9e9e9e", padding: 10 },
                  grid: { color: "rgba(225,78,202,0.1)" },
                },
                x: {
                  ticks: { color: "#9e9e9e", padding: 20 },
                  grid: { color: "rgba(225,78,202,0.1)" },
                },
              },
            }}
          />
        </div>

      </CardBody>

    </>
  );
};

export default IncidentByType;
