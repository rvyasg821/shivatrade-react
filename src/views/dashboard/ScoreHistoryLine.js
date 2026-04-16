/* eslint-disable array-callback-return */

import React, { useState, useEffect, useCallback, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";

import { useDispatch, useSelector } from "react-redux";
// import { configureAssessmentStatsData } from "views/dashboard/store";

import {
  CardBody,
  Dropdown,
  CardTitle,
  CardHeader,
  DropdownMenu,
  DropdownItem,
  DropdownToggle,
  Card
} from "reactstrap";

import ReactApexChart from "react-apexcharts";
// import { OptionsForConfigrationAssessmentGraph } from "utility/reduxConstant";
import { useTranslation } from "react-i18next"

const OptionsForConfigrationAssessmentGraph = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
];

const ScoreHistoryLineChart = (props) => {
  const { t } = useTranslation();

  const navigate = useNavigate();

  const dispatch = useDispatch();
  // const store = useSelector((state) => state.dashboard);

  const [timeInterval, setTimeInterval] = useState({ label: "Year", value: "year" })

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const toggleDropdown = useCallback(
    () => setDropdownOpen((prevState) => !prevState),
    []
  );
  const handleConfigureAssessmentStatsData = useCallback((filterType = timeInterval) => {
    // dispatch(configureAssessmentStatsData({ timeRange: filterType?.value || "" }))
  }, [dispatch, timeInterval])

  useLayoutEffect(() => {
    handleConfigureAssessmentStatsData();
  }, [handleConfigureAssessmentStatsData]);

  let categories = [];
  let values = [];
  const [labelsData, setLabelsData] = useState([]);
  const [valuesData, setValuesData] = useState([]);

  props.data.forEach((element) => {
    categories.push(element.name);
    values.push(element.value);
  })

  const handleGetConfigureAssessmentData = useCallback((refreshType = "") => {
    const payload = { timeRange: "year" }
    if (refreshType) { payload.refresh_type = refreshType; }

    // dispatch(configureAssessmentStatsData(payload))
  }, [dispatch])

  useLayoutEffect(() => {
    handleGetConfigureAssessmentData();
  }, [handleGetConfigureAssessmentData]);

  const handleFilterGraphData = (values = null) => {
    setTimeInterval(values);
    handleGetConfigureAssessmentData(values);
  }

  // useEffect(() => {
  //   if (
  //     store?.actionFlag === "CNFG_ASMNT_STATS_SCS" ||
  //     store?.actionFlag === "CNFG_ASMNT_STATS_ERR"
  //   ) {
  //     const lblData = [];
  //     const valData = [];
  //     if (store?.configureAssesmntStatsData?.length) {
  //       store.configureAssesmntStatsData.map((item) => {
  //         if (item?.name) {
  //           lblData.push(item.name);
  //           valData.push(item?.value || 0);
  //         }
  //       });
  //     }

  //     setLabelsData(lblData);
  //     setValuesData(valData);
  //   }
  // }, [store.actionFlag, store.configureAssesmntStatsData]);

  const options = {
    annotations: {
      yaxis: [
        {
          y: 93,
          borderColor: "#00E396",
          label: {
            borderColor: "#00E396",
            offsetX: -500,
            offsetY: 6,
            style: {
              color: "#0042da",
              background: "#00E396",
              cssClass: "apexcharts-yaxis-annotation-label",
              padding: {
                left: 5,
                right: 5,
                top: 0,
                bottom: 0,
              },
            },
            // text: "Industry Average"
          },
        },
      ],
    },
    dataLabels: {
      enabled: false,
    },
    colors: ["rgb(0, 196, 159)", "rgb(255, 90, 90)", "rgb(255, 187, 40)"], // Define colors for each series
    stroke: {
      curve: "smooth", // Smooth line curves
      width: [2, 2, 2], // Set line width for each series
      dashArray: [0, 5, 10], // Solid line for first series, dashed line for second
    },
    grid: {
      show: true,
      borderColor: "rgba(128, 128, 128, 0.3)",
    },
    theme: {
      palette: "palette1",
    },
    xaxis: {
      categories: labelsData,
      labels: {
        style: {
          colors: "#aab8c5",
          fontSize: "12px",
        },
        rotate: -45,
        rotateAlways: true,
      },
    },
    yaxis: {
      title: {
        text: t("Total Checks"),
        style: {
          fontWeight: 450,
          color: "#aab8c5",
        },
      },
      labels: {
        style: {
          colors: "#aab8c5",
        },
      },
    },
  }

  let series = [{
    name: t("Total Checks"),
    data: valuesData
  }]

  return (<Card>
    <CardHeader className="mb-2">
      <CardTitle
        tag="h3"
        className="cursor-pointer"
        onClick={() => navigate("/apps/configuration-assessment-chart")}
      >
        <span className="text-white">
          <i className="tim-icons icon-alert-circle-exc text-primary" />
          {t("Configuration Assessment")}
        </span>
      </CardTitle>
      <div>
        <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
          <DropdownToggle
            className="btn btn-secondary btn-sm"
            caret>{timeInterval?.label}</DropdownToggle>
          <DropdownMenu className="navlink-dropdown">
            {OptionsForConfigrationAssessmentGraph &&
              OptionsForConfigrationAssessmentGraph.map((option) => (
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
      <ReactApexChart
        type="line"
        series={series}
        options={options}
        height={props.height}
      />

      {/* <div className="refresh-buttons mt-3">
        <div
          className="cursor-pointer"
          onClick={() => handleGetConfigureAssessmentData("configuration")}
        >
          <i className="tim-icons icon-refresh-01 text-white"></i>Refresh
        </div>
      </div> */}
    </CardBody>
  </Card>)
}

export default ScoreHistoryLineChart;
