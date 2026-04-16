// ** React Imports
import React, { useState, useEffect, useCallback, useLayoutEffect } from "react";
import { useLocation, useNavigate } from "react-router-dom";

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
// import { cleanDashboardMessage, wazuhSeverityDashboardGraphData } from "../store";

// ** Reactstrap Imports
import {
  Dropdown,
  DropdownMenu,
  DropdownItem,
  DropdownToggle
} from "reactstrap";

// ** Custom Components
// import SimpleSpinner from "components/spinner/simple-spinner";

// ** Third Party Components
import { Bar } from "react-chartjs-2"; // Import Bar instead of Line
import {
  Chart as ChartJS,
  Title,
  Legend,
  Tooltip,
  BarElement,
  LinearScale,
  CategoryScale
} from "chart.js";
import ReactSnackBar from "react-js-snackbar";
import { TiMessages } from "react-icons/ti";

// ** Constant

const OptionsForGraph = [
  { label: "Day", value: "day" },
  { label: "Week", value: "week" },
  { label: "Month", value: "month" },
  { label: "Year", value: "year" },
]

// Register the necessary chart components for Bar chart
ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

const SeverityGraph = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { severity } = location.state || "";

  const dispatch = useDispatch();
  // const store = useSelector((state) => state.dashboard);

  const [data, setData] = useState();
  const [timeInterval, setTimeInterval] = useState({ label: "Auto", value: "day" })
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const [showSnackBar, setshowSnackbar] = useState(false)
  const [snakebarMessage, setSnakbarMessage] = useState("")

  const toggleDropdown = useCallback(() => setDropdownOpen((prevState) => !prevState), [])

  // const handleWazuhSeverityDashboardGraphData = useCallback((severityType = severity, filterType = timeInterval) => {
  //   dispatch(wazuhSeverityDashboardGraphData({
  //     severity: severityType,
  //     timeRange: filterType?.value || ""
  //   }))
  // }, [dispatch, severity, timeInterval])

  // useLayoutEffect(() => {
  //   handleWazuhSeverityDashboardGraphData()
  // }, [handleWazuhSeverityDashboardGraphData])

  // useEffect(() => {
  //   if (store?.actionFlag === "WZH_INXR_GRPH_SCS" || store?.actionFlag === "WZH_INXR_GRPH_ERR") {
  //     setData(store.wazuhSeverityGraphData?.date_histogram_aggregation_buckets || [])
  //   }

  //   if (store?.actionFlag || store?.error) {
  //     dispatch(cleanDashboardMessage());
  //   }

  //   if (store.error) {
  //     setshowSnackbar(true)
  //     setSnakbarMessage(store.error)
  //   }
  // }, [store?.actionFlag, store.error, store.wazuhSeverityGraphData, dispatch])

  useEffect(() => {
    setTimeout(() => {
      setshowSnackbar(false);
      setSnakbarMessage('')
    }, 6000);
  }, [showSnackBar])

  const handleFilterGraphData = (values = null) => {
    setTimeInterval(values)
    // handleWazuhSeverityDashboardGraphData(severity, values)
  }

  const chartData = {
    labels: data?.length > 0 && data.map((item) => new Date(item.key).toLocaleString()), // Format the timestamps
    datasets: [
      {
        label: "Document Count",
        data: data?.length > 0 && data.map((item) => item.doc_count), // Document counts for the y-axis
        backgroundColor: "rgba(75,192,192,0.4)", // Bar color
        borderColor: "rgba(75,192,192,1)", // Bar border color
        borderWidth: 1 // Bar border width
      }
    ]
  }

  // Chart options (customize as needed)
  const options = {
    responsive: true,
    // onClick: (e, elements) => {
    //     console.log('clicked event ')
    // },
    plugins: {
      title: {
        display: true,
        text: "Document Counts by Time Interval"
      },
      tooltip: {
        mode: "index",
        intersect: false
      }
    },
    scales: {
      x: {
        title: {
          display: true,
          text: `Time per ${timeInterval?.value}`
        },
        ticks: {
          autoSkip: true,
          maxTicksLimit: 10
        }
      },
      y: {
        title: {
          display: true,
          text: "Document Count"
        },
        beginAtZero: true // Ensure Y axis starts from zero
      }
    }
  }

  return (
    <div>
      <h3>{`Wazuh ${severity.charAt(0).toUpperCase() + severity.slice(1)
        } Severity Event Counts Over Time `}</h3>
      <div className="d-flex justify-content-between mt-3">
        <Dropdown isOpen={dropdownOpen} toggle={toggleDropdown}>
          <DropdownToggle caret>{timeInterval?.label}</DropdownToggle>
          <DropdownMenu>
            {OptionsForGraph &&
              OptionsForGraph.map((option) => (
                <DropdownItem
                  key={option.value}
                  onClick={() => handleFilterGraphData(option)}
                >
                  {option.label}
                </DropdownItem>
              ))}
          </DropdownMenu>
        </Dropdown>
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => navigate(-1)}
        >
          Back
          {/* <TiArrowLeft size={25} title="Back" className="" /> */}
        </button>
      </div>
      {showSnackBar && (
        <ReactSnackBar
          Icon={(<span><TiMessages size={25} /></span>)}
          Show={showSnackBar}
        >
          {snakebarMessage}
        </ReactSnackBar>
      )}

      <div className="d-flex justify-content-between mt-1">
        <h3 className="text-white">Hits : 0
          {/* {store.wazuhSeverityGraphData?.totalSeverityCount || */}
        </h3>
      </div>
      <Bar data={chartData} options={options} />
    </div>
    // <div className="content">
    //   {!store?.loading ? <SimpleSpinner /> : null}
    //   {showSnackBar && (
    //     <ReactSnackBar
    //       Icon={(<span><TiMessages size={25} /></span>)}
    //       Show={showSnackBar}
    //     >
    //       {snakebarMessage}
    //     </ReactSnackBar>
    //   )}

    //   </div>
    //   <div className="d-flex justify-content-between">
    //     <h3>Hits :{store.wazuhSeverityGraphData?.totalSeverityCount || 0}</h3>
    //   </div>
    //   <Bar data={chartData} options={options} /> Use Bar component
    // </div>
  );
};

export default SeverityGraph;
