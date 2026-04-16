import React, {
  useEffect,
  useState,
  useCallback,
  useLayoutEffect,
  Fragment,
} from "react";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
// import {
//   getConfigurationAssessmentList,
//   cleanConfigurationAssessmentMessage,
// } from "./store";
// import { getAgentList, cleanAgentMessage } from "views/agents/store";
import { Col, Row, Card, CardBody, UncontrolledTooltip, CardHeader } from "reactstrap";
import Select from "react-select";
// import { getFormatDate } from "utility/Utils";
// import SimpleSpinner from "components/spinner/simple-spinner";
import ReactSnackBar from "react-js-snackbar";
import { TiMessages, TiArrowLeft, TiInfoLarge } from "react-icons/ti";
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Legend,
  Tooltip,
} from "recharts";
import "bootstrap/dist/css/bootstrap.min.css";
import { useTranslation } from "react-i18next"

const ConfigurationAssessmentChart = () => {
      const { t } = useTranslation();
  
  const navigate = useNavigate();
  const dispatch = useDispatch();
  // const store = useSelector((state) => state.configurationAssessment);
  // const agentStore = useSelector((state) => state.agent);
  const [agentOptions, setAgentOptions] = useState([]);
  const [agentOption, setAgentOption] = useState(null);
  const [showSnackBar, setShowSnackbar] = useState(false);
  const [snakebarMessage, setSnakbarMessage] = useState("");

  const handleGetConfigurationAssessment = useCallback((agntOptn = agentOption, refreshType = "") => {
    const payload = {
      page: 1,
      limit: 2,
      sortColumn: "_id",
      sort: "desc",
      status: "active",
      agent_ref_id: agntOptn?.ref_id || ""
    }

    if (refreshType) { payload.refresh_type = refreshType; }

    // dispatch(getConfigurationAssessmentList(payload))
  }, [dispatch, agentOption])

  const handleSelectAgent = useCallback((value = null) => {
    setAgentOption(value);
    handleGetConfigurationAssessment(value);
  }, [handleGetConfigurationAssessment])

  // useLayoutEffect(() => {
  //   dispatch(getAgentList({ status: "active" }))
  // }, [dispatch])

  // useEffect(() => {
  //   if (store?.actionFlag || store?.success || store?.error) {
  //     dispatch(cleanConfigurationAssessmentMessage());
  //   }

  //   if (store?.error) {
  //     setShowSnackbar(true);
  //     setSnakbarMessage(store.error);
  //   }
  // }, [dispatch, store.actionFlag, store.success, store.error])

  // useEffect(() => {
  //   if (agentStore?.actionFlag === "AGNT_LST" || agentStore?.actionFlag === "AGNT_LST_ERR") {
  //     let agntOptions = [];
  //     if (agentStore?.agentItems?.length) {
  //       agntOptions = agentStore.agentItems.map((item) => {
  //         return {
  //           ...item,
  //           value: item?._id || "",
  //           label: item?.name || ""
  //         }
  //       })
  //     }

  //     setAgentOptions(agntOptions);
  //     if (!agentOption || !agentOption?.value) {
  //       handleSelectAgent(agntOptions[0]);
  //     }
  //   }

  //   if (agentStore?.actionFlag || agentStore?.success || agentStore?.error) {
  //     dispatch(cleanAgentMessage());
  //   }

  //   if (agentStore?.error) {
  //     setShowSnackbar(true);
  //     setSnakbarMessage(agentStore.error);
  //   }
  // }, [dispatch, handleSelectAgent, agentStore.actionFlag, agentStore.success, agentStore.error, agentStore.agentItems, agentOption])

  useEffect(() => {
    setTimeout(() => {
      setShowSnackbar(false);
    }, 6000);
  }, [showSnackBar]);

  //OLD
  // const chartData = store?.configurationAssessmentItems?.length ? [{
  //   name: `Passed (${store.configurationAssessmentItems[0]?.pass || 0})`,
  //   value: store.configurationAssessmentItems[0]?.pass || 0,
  //   color: "#9cc904",
  // },
  // {
  //   name: `Failed (${store.configurationAssessmentItems[0]?.fail || 0})`,
  //   value: store.configurationAssessmentItems[0]?.fail || 0,
  //   color: "#ea5f16",
  // },
  // {
  //   name: `Not applicable (${store.configurationAssessmentItems[0]?.invalid || 0
  //     })`,
  //   value: store.configurationAssessmentItems[0]?.invalid || 0,
  //   color: "#FFBB28",
  // }] : []

  const chartData = [{
    name: `Passed (0)`,
    value: 0,
    color: "#9cc904",
  },
  {
    name: `Failed (0)`,
    value: 0,
    color: "#ea5f16",
  },
  {
    name: `Not applicable (0)`,
    value: 0,
    color: "#FFBB28",
  }] 

  return (
    <div>
      <div className="container-fluid">
        {/* {!store?.loading ? <SimpleSpinner /> : null} */}

        {showSnackBar && (
          <ReactSnackBar
            Icon={
              <span>
                <TiMessages size={25} />
              </span>
            }
            Show={showSnackBar}
          >
            {snakebarMessage}
          </ReactSnackBar>
        )}

        <div className="row-row">
          <Card>
            {/* <CardHeader> */}
            <div className="d-flex justify-content-between card-header">
              <h3 className="m-0 text-white">{t("Configuration Assessment")}
</h3>

              <button
                type="button"
                className="btn btn-primary"
                onClick={() => navigate("/apps/dashboard")}
              >
                {t("Back")}

                <TiArrowLeft size={25} title="Back" className="" />
              </button>
            </div>
            {/* </CardHeader> */}
          </Card>

          <Row>
            <Col md="4" className="mt-2">
              <Card className="h-100 mb-0">
                <CardBody className="pl-0 pr-0">
                  <Select
                    name="agent_id"
                    value={agentOption}
                    options={agentOptions}
                    placeholder="Select Agent"
                    className="react-select mx-1"
                    classNamePrefix="react-select"
                    onChange={(value) => handleSelectAgent(value)}
                  />

                </CardBody>
              </Card>
            </Col>

            <Col md="8" className="mt-2">
              <Card className="h-100 mb-0">
                <CardBody className="pl-0 pr-0">
                  {/* {!store?.configurationAssessmentItems?.length ? (
                    <p className="text-warning">
                      There is no configuration assessment available or change
                      agent.
                    </p>
                  ) : null} */}

                  {/* {store?.configurationAssessmentItems?.length ? (
                    <Fragment>
                      <h4>
                        {store.configurationAssessmentItems[0]?.name || ""}
                        <TiInfoLarge
                          size={25}
                          className="ms-1"
                          id={`assessment-info`}
                        />

                        <UncontrolledTooltip
                          placement="top"
                          target={`assessment-info`}
                        >
                          <p className="text-dark">
                            <span className="fw-bolder">
                              Policy description:{" "}
                            </span>
                            <span>
                              {store.configurationAssessmentItems[0]
                                ?.description || ""}
                            </span>
                          </p>

                          <p className="text-dark">
                            <span className="fw-bolder">Policy checksum: </span>
                            <span>
                              {store.configurationAssessmentItems[0]
                                ?.hash_file || ""}
                            </span>
                          </p>
                        </UncontrolledTooltip>
                      </h4>

                      <Row className="justify-content-center">
                        <Col className="content-box pass text-center">
                          <h4>Passed</h4>
                          <h4 className="count">
                            {store.configurationAssessmentItems[0]?.pass || 0}
                          </h4>
                        </Col>
                        <Col className="content-box fail text-center">
                          <h4>Failed</h4>
                          <h4 className="count">
                            {store.configurationAssessmentItems[0]?.fail || 0}
                          </h4>
                        </Col>
                        <Col className="content-box not-applicable text-center">
                          <h4>Not applicable</h4>
                          <h4 className="count">
                            {store.configurationAssessmentItems[0]?.invalid ||
                              0}
                          </h4>
                        </Col>
                        <Col className="content-box score text-center">
                          <h4>Score</h4>
                          <h4 className="count">
                            {store.configurationAssessmentItems[0]?.score || 0}%
                          </h4>
                        </Col>
                        <Col className="content-box date-time text-center">
                          <h4>End scan</h4>
                          <h4 className="count">
                            {store.configurationAssessmentItems[0]?.end_scan
                              ? getFormatDate(
                                store.configurationAssessmentItems[0]
                                  .end_scan,
                                "MMM DD, YYYY @ HH:mm:ss"
                              )
                              : null}
                          </h4>
                        </Col>
                      </Row>

                      <div className="refresh-buttons mt-3">
                        <div
                          className="cursor-pointer"
                          onClick={() =>
                            handleGetConfigurationAssessment(agentOption, "configuration")
                          }
                        >
                          <i className="tim-icons icon-refresh-01" />
                          Refresh
                        </div>
                      </div>
                    </Fragment>
                  ) : null} */}

                  {(
                    <Fragment>
                      <h4>
                        {/* {store.configurationAssessmentItems[0]?.name || ""} */}
                        {"Test"}
                        <TiInfoLarge
                          size={25}
                          className="ms-1"
                          id={`assessment-info`}
                        />

                        <UncontrolledTooltip
                          placement="top"
                          target={`assessment-info`}
                        >
                          <p className="text-dark">
                            <span className="fw-bolder">
                              {t("Policy description")}:{" "}
                            </span>
                            <span>
                              { "Test Descriptions!!"}
                            </span>
                          </p>

                          <p className="text-white">
                            <span className="fw-bolder">Policy checksum: </span>
                            <span>
                              {/* {store.configurationAssessmentItems[0]
                                ?.hash_file || ""} */}
                                {"Test HasFiles"}
                            </span>
                          </p>
                        </UncontrolledTooltip>
                      </h4>

                      <Row className="justify-content-center">
                        <Col className="content-box pass text-center">
                          <h4>{t('Passed')}</h4>
                          <h4 className="count">
                            {/* {store.configurationAssessmentItems[0]?.pass || 0} */}
                            0
                          </h4>
                        </Col>
                        <Col className="content-box fail text-center">
                          <h4>{t('Failed')}</h4>
                          <h4 className="count">
                            {/* {store.configurationAssessmentItems[0]?.fail || 0} */}
                            10
                          </h4>
                        </Col>
                        <Col className="content-box not-applicable text-center">
                          <h4>{t('Not applicable')}</h4>
                          <h4 className="count">
                            {/* {store.configurationAssessmentItems[0]?.invalid ||
                              0} */} 15
                          </h4>
                        </Col>
                        <Col className="content-box score text-center">
                          <h4>{t('Score')}</h4>
                          <h4 className="count">
                            {/* {store.configurationAssessmentItems[0]?.score || 0}% */}
                            25%
                          </h4>
                        </Col>
                        <Col className="content-box date-time text-center">
                          <h4>{t('End scan')}</h4>
                          <h4 className="count">
                            {/* {store.configurationAssessmentItems[0]?.end_scan
                              ? getFormatDate(
                                store.configurationAssessmentItems[0]
                                  .end_scan,
                                "MMM DD, YYYY @ HH:mm:ss"
                              )
                              : null} */}
                          </h4>
                        </Col>
                      </Row>

                      <div className="refresh-buttons mt-3">
                        <div
                          className="cursor-pointer"
                          onClick={() =>
                            handleGetConfigurationAssessment(agentOption, "configuration")
                          }
                        >
                          <i className="tim-icons icon-refresh-01" />
                          {t(`Refresh`)}
                        </div>
                      </div>
                    </Fragment>
                  ) 
                  }
                </CardBody>
              </Card>
            </Col>
          </Row>
        </div>
      </div>
    </div>
  )
}

export default ConfigurationAssessmentChart;
