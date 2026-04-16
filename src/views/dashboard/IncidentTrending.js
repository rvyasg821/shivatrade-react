/* eslint-disable object-shorthand */
/* eslint-disable array-callback-return */
import React, { useState, useEffect, useCallback, useLayoutEffect, useMemo } from "react";

import { useDispatch, useSelector } from "react-redux";
// import { incidentTrendWazuhStatsData } from "./store/index";

import {
  Dropdown,
  CardBody,
  CardTitle,
  CardHeader,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Card
} from "reactstrap";

import Chart from "react-apexcharts";
import { useTranslation } from "react-i18next"

const OptionsForSIEMGraph = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" }
]

const IncidentTrending = () => {
  const dispatch = useDispatch();
  // const store = useSelector((state) => state.dashboard);
      const { t } = useTranslation();
  

  const [timeInterval, setTimeInterval] = useState({ label: "Year", value: "year" });

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const toggleDropdown = useCallback(() => setDropdownOpen((prevState) => !prevState), []);

  const handleIncidentTrendWazuhStatsData = useCallback((filterType = timeInterval) => {
    // dispatch(incidentTrendWazuhStatsData({ timeRange: filterType?.value || "" }));
  }, [dispatch, timeInterval]);

  useLayoutEffect(() => {
    handleIncidentTrendWazuhStatsData();
  }, [handleIncidentTrendWazuhStatsData]);

  const [lowTrending, setLowTrending] = useState([]);
  const [mediumTrending, setMediumTrending] = useState([]);
  const [highTrending, setHighTrending] = useState([]);
  const [criticalTrending, setCriticalTrending] = useState([]);

  const handleGetIncidentTrendWazuhData = useCallback(() => {
    // dispatch(incidentTrendWazuhStatsData({ timeRange: "month" }));
  }, [dispatch]);

  useLayoutEffect(() => {
    handleGetIncidentTrendWazuhData();
  }, [handleGetIncidentTrendWazuhData]);

  const handleFilterGraphData = (values = null) => {
    setTimeInterval(values);
    handleIncidentTrendWazuhStatsData(values);
  };

  // useEffect(() => {
  //   if (store?.actionFlag === "INCDT_TRND_WZH_GRPH_SCS" || store?.actionFlag === "INCDT_TRND_WZH_GRPH_ERR") {
  //     const lowTrend = [];
  //     const mediumTrend = [];
  //     const highTrend = [];
  //     const criticalTrend = [];
  //     if (store?.incidentTrendWazuhData?.low_date_histogram_aggregation_buckets?.length) {
  //       store.incidentTrendWazuhData.low_date_histogram_aggregation_buckets.map((item) => {
  //         if (item?.key && item?.doc_count) {
  //           const arr = [];
  //           arr.push(item.key);
  //           arr.push(item.doc_count);
  //           lowTrend.push(arr);
  //         }
  //       });
  //     }

  //     if (store?.incidentTrendWazuhData?.medium_date_histogram_aggregation_buckets?.length) {
  //       store.incidentTrendWazuhData.medium_date_histogram_aggregation_buckets.map((item) => {
  //         if (item?.key && item?.doc_count) {
  //           const arr = [];
  //           arr.push(item.key);
  //           arr.push(item.doc_count);
  //           mediumTrend.push(arr);
  //         }
  //       });
  //     }

  //     if (store?.incidentTrendWazuhData?.high_date_histogram_aggregation_buckets?.length) {
  //       store.incidentTrendWazuhData.high_date_histogram_aggregation_buckets.map((item) => {
  //         if (item?.key && item?.doc_count) {
  //           const arr = [];
  //           arr.push(item.key);
  //           arr.push(item.doc_count);
  //           highTrend.push(arr);
  //         }
  //       });
  //     }

  //     if (store?.incidentTrendWazuhData?.critical_date_histogram_aggregation_buckets?.length) {
  //       store.incidentTrendWazuhData.critical_date_histogram_aggregation_buckets.map((item) => {
  //         if (item?.key && item?.doc_count) {
  //           const arr = [];
  //           arr.push(item.key);
  //           arr.push(item.doc_count);
  //           criticalTrend.push(arr);
  //         }
  //       });
  //     }

  //     setLowTrending(lowTrend);
  //     setMediumTrending(mediumTrend);
  //     setHighTrending(highTrend);
  //     setCriticalTrending(criticalTrend);
  //   }
  // }, [store.actionFlag, store.incidentTrendWazuhData]);

  const siemTrendingOptions = useMemo(() => (
    {
      series: [
        { name: "Low", data: lowTrending },
        { name: "Medium", data: mediumTrending },
        { name: "High", data: highTrending },
        { name: "Critical", data: criticalTrending }
      ],
      chart: {
        type: "area",
        stacked: false,
        height: 350,
        zoom: {
          type: "x",
          enabled: true,
          autoScaleYaxis: true
        },
        toolbar: {
          autoSelected: "zoom"
        }
      },
      colors: ["#00FF00", "#FFFF00", "#FFA500", "#FF0000"], // Define colors for each series
      stroke: {
        curve: "smooth", // Smooth line curves
        width: [2, 2, 2, 2], // Set line width for each series
        dashArray: [0, 5, 10, 15], // Solid line for first series, dashed line for second
      },
      dataLabels: {
        enabled: false
      },
      markers: {
        size: 0
      },
      fill: {
        type: "gradient",
        gradient: {
          shadeIntensity: 1,
          inverseColors: false,
          opacityFrom: 0.5,
          opacityTo: 0,
          stops: [0, 90, 100]
        }
      },
      yaxis: {
        labels: {
          formatter: function (val) {
            return val.toFixed(0);
          },
          style: {
            colors: "#aab8c5",
            fontSize: "12px"
          }
        },
        title: {
text: t("# of Incidents"),
          style: {
            fontWeight: 450,
            color: "#aab8c5"
          }
        }
      },
      xaxis: {
        type: "datetime",
        labels: {
          style: {
            colors: "#aab8c5",
            fontSize: "12px"
          }
        }
      },
      tooltip: {
        shared: false,
        y: {
          formatter: function (val) {
            return val;
          }
        }
      },
      grid: {
        show: true,
        borderColor: "rgba(128, 128, 128, 0.3)"
      }
    }
  ))

  return (<Card>
    <CardHeader className="mb-2">
      {/* <ExportPdf className="d-flex justify-content-end" /> */}
      <CardTitle tag="h3" className="cursor-pointer">
        <span className="text-white">
          <i className="tim-icons icon-alert-circle-exc text-primary" />
{t("SIEM Incident Trending")}
        </span>
      </CardTitle>
      <div>
        <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
          <DropdownToggle
            className="btn btn-secondary btn-sm"
            caret>{timeInterval?.label}</DropdownToggle>
          <DropdownMenu className="navlink-dropdown">
            {OptionsForSIEMGraph &&
              OptionsForSIEMGraph.map((option) => (
                <DropdownItem
                  key={option.value}
                  onClick={() => handleFilterGraphData(option)}
                >
                  {option.label}
                </DropdownItem>
              ))}
          </DropdownMenu>
        </Dropdown>
      </div>

    </CardHeader>

    <CardBody>
      <Chart
        type="area"
        height="350"
        stacked="false"
        options={siemTrendingOptions}
        series={siemTrendingOptions.series}
      />

    </CardBody>
  </Card>)
}

export default IncidentTrending;
