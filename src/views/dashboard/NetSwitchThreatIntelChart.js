// ** React Imports
import React, { useState, useEffect, useCallback, useLayoutEffect } from "react";
import { useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
// import { netSwitchThreatIntelCountryCount } from "./store/index";

// ** Reactstrap Imports
import {
  CardBody,
  Dropdown,
  CardTitle,
  CardHeader,
  DropdownItem,
  DropdownMenu,
  DropdownToggle,
  Card
} from "reactstrap";

// ** Third Party Components
import { Chart } from "react-google-charts";
import { useTranslation } from "react-i18next"

// ** Constant
// import { OptionsForNetSwitchThreatIntelGraph } from "utility/reduxConstant";

// ** SVG Icons
// import downloadIcon from "assets/img/download.svg";

const OptionsForNetSwitchThreatIntelGraph = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" }
]


const NetSwitchThreatIntelChart = () => {
  // ** Hooks
  const navigate = useNavigate();
            const { t } = useTranslation();

  // ** Store Vars
  const dispatch = useDispatch();
  // const store = useSelector((state) => state.dashboard);
  // const link = store?.netSwitchThreatIntelCount?.link || "";

  const defaultChartData = [["Country", "Threat Count"]]

  // ** States
  const [timeInterval, setTimeInterval] = useState({ label: "Day", value: "day" });
  const [chartData, setChartData] = useState(defaultChartData);
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const toggleDropdown = useCallback(() => setDropdownOpen((prevState) => !prevState), [])

  const handleNetSwitchThreatIntelCountData = useCallback((filterType = timeInterval, refreshType = "") => {
    const payload = { timeRange: filterType?.value || "" }
    if (refreshType) { payload.refresh_type = refreshType; }

    // dispatch(netSwitchThreatIntelCountryCount(payload))
  }, [dispatch, timeInterval])

  useLayoutEffect(() => {
    handleNetSwitchThreatIntelCountData();
  }, [handleNetSwitchThreatIntelCountData]);

  const handleFilterGraphData = (values) => {
    setTimeInterval(values);
    handleNetSwitchThreatIntelCountData(values);
  }

  // useEffect(() => {
  //   if (store?.actionFlag === "NSTI_CNT_SCS" || store?.actionFlag === "NSTI_CNT_ERR") {
  //     let newChartData = defaultChartData;
  //     const threatData = store?.netSwitchThreatIntelCount?.data;

  //     if (Array.isArray(threatData) && threatData.length > 1) {
  //       newChartData = [
  //         ["Country", "Threat Count"],
  //         ...threatData.map((item) => [item.country_name, item.count]),
  //       ];
  //       setChartData(newChartData);
  //     } else {
  //       setChartData(defaultChartData);
  //     }
  //   }
  // }, [store?.actionFlag, store?.netSwitchThreatIntelCount?.data]);

  const options = {
    title: t("Top 7 Attacking Country"),
    pieHole: 0.4, // Makes it a donut chart
    is3D: true,
    // legend: {position: 'top', textStyle: {color: 'black', fontSize: 8},alignment :'end'},
    legend: {
      position: "labeled",
      alignment: "end",
      textStyle: { color: "white", fontSize: 8, bold: true },
    },
    titleTextStyle: {
      position: "top",
      color: "white", // Set the title color (change this to any color you want)
      bold: true, // Make title bold
    },
    chartArea: { width: "85%", height: "70%" },
    backgroundColor: "transparent",
    colors: [
      "#4285F4",
      "#EA4335",
      "#FBBC05",
      "#34A853",
      "#FF6D00",
      "#8E44AD",
      "#1ABC9C"
    ]
  }

  return (<Card>
    <CardHeader>
      <CardTitle tag="h3"
        className="cursor-pointer"
        onClick={() => navigate("/apps/netswitch-threat-intels")}
      >
        <span className="text-white">
          <i className="tim-icons icon-alert-circle-exc text-primary" />
          {t("Threat Intel")}

        </span>
      </CardTitle>
      <div>
        <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
          <DropdownToggle
            className="btn btn-secondary btn-sm"
            caret>{timeInterval?.label}</DropdownToggle>
          <DropdownMenu className="navlink-dropdown">
            {OptionsForNetSwitchThreatIntelGraph &&
              OptionsForNetSwitchThreatIntelGraph.map((option) => (
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
        chartType="PieChart"
        width="100%"
        height="300px"
        data={chartData}
        options={options}
      />

      {/* <div className="refresh-buttons mt-3">
        <div className="cursor-pointer" onClick={() => handleNetSwitchThreatIntelCountData(timeInterval, "threat_intel")}>
          <i className="tim-icons icon-refresh-01"></i>Refresh
        </div>
      </div> */}

      {/* {chartData ? (<>
        <Chart
          chartType="PieChart"
          width="100%"
          height="300px"
          data={chartData}
          options={options}
        />

        <div className="refresh-buttons mt-3">
          <div className="cursor-pointer" onClick={() => handleNetSwitchThreatIntelCountData(timeInterval, "threat_intel")}>
            <i className="tim-icons icon-refresh-01"></i>Refresh
          </div>
        </div>
      </>) : (
        <div className="d-flex justify-content-center align-items-center w-100 h-100">
          <p>No data available.</p>
        </div>
      )} */}
    </CardBody>
  </Card>)
}

export default NetSwitchThreatIntelChart;
