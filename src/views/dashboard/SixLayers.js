// ** React Imports
import React from "react";
import { Link } from "react-router-dom";

// ** Reactstrap Imports
import { CardHeader, CardTitle, CardBody } from "reactstrap";
import { SixlayerData } from "../dashboard/sampleData/mockData";

const Sixlayers = ({
  isEmptyBlankDataDisplay
}) => {
  const handleLayersAction = (title) => {
    //do something here when click on the the layer
  };

  const selectColor = (value) => {
    let color = "";
    SixlayerData.SixLayersGraphData.forEach((item) => {
      if (item.Cat === value) {
        let val = item.Percent;
        if (val >= 0 && val <= 10) return (color = "#fa5335");
        else if (val >= 11 && val <= 30) return (color = "#ea5e13");
        else if (val >= 31 && val <= 50) return (color = "#e5b40f");
        else if (val >= 51 && val <= 70) return (color = "#e5d70f");
        else if (val >= 71 && val <= 90) return (color = "#9cc904");
        else if (val >= 91 && val <= 100) return (color = "#3cc904");
      }
    });

    return isEmptyBlankDataDisplay ? "transparent" : color;
  }

  const sixLayerGraphData = SixlayerData?.SixLayersGraphData || [];

  return (<>
    <CardHeader>
      {/* <ExportPdf className="d-flex justify-content-end" /> */}
      <CardTitle tag="h3">Defense in depth overview</CardTitle>
    </CardHeader>
    <CardBody>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        xmlnsXlink="http://www.w3.org/1999/xlink"
        width="90%"
        height="348px"
        viewBox="0 0 368.009 198.329"
      >
        <defs>
          <filter
            id="a"
            x="84.395"
            y="34.867"
            width="72.258"
            height="76.173"
            filterUnits="userSpaceOnUse"
          >
            <feOffset input="SourceAlpha" />
            <feGaussianBlur stdDeviation="2" result="b" />
            <feFlood floodColor="#fff" floodOpacity="0.475" />
            <feComposite operator="in" in2="b" />
            <feComposite in="SourceGraphic" />
          </filter>
          <filter
            id="c"
            x="141.591"
            y="5.205"
            width="135.474"
            height="92.044"
            filterUnits="userSpaceOnUse"
          >
            <feOffset input="SourceAlpha" />
            <feGaussianBlur stdDeviation="2" result="d" />
            <feFlood floodColor="#fff" floodOpacity="0.537" />
            <feComposite operator="in" in2="d" />
            <feComposite in="SourceGraphic" />
          </filter>
          <filter
            id="e"
            x="167.056"
            y="92.975"
            width="85.505"
            height="83.975"
            filterUnits="userSpaceOnUse"
          >
            <feOffset input="SourceAlpha" />
            <feGaussianBlur stdDeviation="2" result="f" />
            <feFlood floodColor="#fff" floodOpacity="0.537" />
            <feComposite operator="in" in2="f" />
            <feComposite in="SourceGraphic" />
          </filter>
          <filter
            id="g"
            x="79.735"
            y="106.407"
            width="102.22"
            height="78.862"
            filterUnits="userSpaceOnUse"
          >
            <feOffset input="SourceAlpha" />
            <feGaussianBlur stdDeviation="2" result="h" />
            <feFlood floodColor="#fff" floodOpacity="0.553" />
            <feComposite operator="in" in2="h" />
            <feComposite in="SourceGraphic" />
          </filter>
          <filter
            id="i"
            x="172.84"
            y="9.101"
            width="110.702"
            height="130.435"
            filterUnits="userSpaceOnUse"
          >
            <feOffset input="SourceAlpha" />
            <feGaussianBlur stdDeviation="2" result="j" />
            <feFlood floodColor="#fff" floodOpacity="0.569" />
            <feComposite operator="in" in2="j" />
            <feComposite in="SourceGraphic" />
          </filter>
          <filter
            id="k"
            x="74.794"
            y="92.182"
            width="75.343"
            height="88.006"
            filterUnits="userSpaceOnUse"
          >
            <feOffset input="SourceAlpha" />
            <feGaussianBlur stdDeviation="2" result="l" />
            <feFlood floodColor="#fff" floodOpacity="0.545" />
            <feComposite operator="in" in2="l" />
            <feComposite in="SourceGraphic" />
          </filter>
        </defs>
        <g transform="translate(-42.991 -101.047)">
          <g transform="translate(191.956 138.117) rotate(-164)">
            <line
              x2="36"
              y2="14"
              fill="none"
              stroke="#707070"
              strokeWidth="1"
            />
            <line
              y1="13.475"
              x2="47.849"
              transform="translate(36 0.525)"
              fill="none"
              stroke="#707070"
              strokeWidth="1"
            />
          </g>
          <g transform="matrix(0.891, -0.454, 0.454, 0.891, 71.5, 202.5)">
            <line
              x2="33.858"
              y2="17.252"
              fill="none"
              stroke="#707070"
              strokeWidth="1"
            />
            <path
              d="M0,0H28.983"
              transform="matrix(0.995, 0.105, -0.105, 0.995, 33.317, 17.062)"
              fill="none"
              stroke="#707070"
              strokeWidth="1"
            />
          </g>
          <g transform="translate(226.5 271.5)">
            <line
              x2="36"
              y2="14"
              fill="none"
              stroke="#707070"
              strokeWidth="1"
            />
            <line
              x2="43"
              transform="translate(36 14)"
              fill="none"
              stroke="#707070"
              strokeWidth="1"
            />
          </g>
          <g transform="translate(42.991 273.5)">
            <path
              d="M30.327,24.163H89.837"
              transform="translate(-30.327 -15.163)"
              fill="none"
              stroke="#707070"
              strokeWidth="1"
            />
            <line
              y1="9"
              x2="22"
              transform="translate(59.509)"
              fill="none"
              stroke="#707070"
              strokeWidth="1"
            />
          </g>
          <g transform="matrix(0.999, -0.035, 0.035, 0.999, 129.5, 280.5)">
            <line
              x2="30.423"
              y2="17.072"
              fill="none"
              stroke="#707070"
              strokeWidth="1"
            />
            <line
              x2="51.968"
              y2="1.815"
              transform="translate(30.423 17.072)"
              fill="none"
              stroke="#707070"
              strokeWidth="1"
            />
          </g>
          <g transform="translate(292.5 233.5)">
            <line
              x2="36"
              y2="14"
              fill="none"
              stroke="#707070"
              strokeWidth="1"
            />
            <line
              x2="72"
              transform="translate(36 14)"
              fill="none"
              stroke="#707070"
              strokeWidth="1"
            />
          </g>
          <g
            transform="translate(6.913 -20.555)"
            className="triangle-shapes"
          >
            <rect
              width="198.428"
              height="170.08"
              transform="translate(116.416 131.181)"
              fill="none"
            />
            <Link to={`/apps/resilience-index`}>
              <g
                filter="url(#a)"
                transform="matrix(1, 0, 0, 1, 36.08, 121.6)"
                onClick={() => handleLayersAction("Recovery")}
              >
                <path
                  d="M126.473,213.251l50.822-50.782,9.436,64.173Z"
                  transform="translate(-36.08 -121.6)"
                  fill={selectColor("Recovery")}
                  stroke={isEmptyBlankDataDisplay ? "white" : "none"}
                  strokeWidth={isEmptyBlankDataDisplay ? 2 : 0}
                />
              </g>
            </Link>

            <Link to={`/apps/resilience-index`}>
              <g
                filter="url(#c)"
                transform="matrix(1, 0, 0, 1, 36.08, 121.6)"
                onClick={() => handleLayersAction("Defence")}
              >
                <path
                  d="M307.143,132.806,207.083,212.85l-23.414-54.013Z"
                  transform="translate(-36.08 -121.6)"
                  fill={selectColor("Defence")}
                  stroke={isEmptyBlankDataDisplay ? "white" : "none"}
                  strokeWidth={isEmptyBlankDataDisplay ? 2 : 0}
                />
              </g>
            </Link>

            <Link to={`/apps/resilience-index`}>
              <g
                filter="url(#e)"
                transform="matrix(1, 0, 0, 1, 36.08, 121.6)"
                onClick={() => handleLayersAction("Governance")}
              >
                <path
                  d="M282.639,260.667l-63.771,31.885-9.734-71.975Z"
                  transform="translate(-36.08 -121.6)"
                  fill={selectColor("Governance")}
                  stroke={isEmptyBlankDataDisplay ? "white" : "none"}
                  strokeWidth={isEmptyBlankDataDisplay ? 2 : 0}
                />
              </g>
            </Link>

            <Link to={`/apps/resilience-index`}>
              <g
                filter="url(#g)"
                transform="matrix(1, 0, 0, 1, 36.08, 121.6)"
                onClick={() => handleLayersAction("Risk Mitigation")}
              >
                <path
                  d="M212.032,294.427l-90.22,6.443,66.868-66.862Z"
                  transform="translate(-36.08 -121.6)"
                  fill={selectColor("Risk Mitigation")}
                  stroke={isEmptyBlankDataDisplay ? "white" : "none"}
                  strokeWidth={isEmptyBlankDataDisplay ? 2 : 0}
                />
              </g>
            </Link>

            <Link to={`/apps/resilience-index`}>
              <g
                filter="url(#i)"
                transform="matrix(1, 0, 0, 1, 36.08, 121.6)"
                onClick={() => handleLayersAction("Asset Management")}
              >
                <path
                  d="M287.3,255.138l-72.382-39.479,98.7-78.956Z"
                  transform="translate(-36.08 -121.6)"
                  fill={selectColor("Asset Management")}
                  stroke={isEmptyBlankDataDisplay ? "white" : "none"}
                  strokeWidth={isEmptyBlankDataDisplay ? 2 : 0}
                />
              </g>
            </Link>

            <Link to={`/apps/resilience-index`}>
              <g
                transform="matrix(1, 0, 0, 1, 36.08, 121.6)"
                filter="url(#k)"
                onClick={() => handleLayersAction("Business Continuity")}
              >
                <path
                  d="M180.214,232.452,116.871,295.79l6.334-76.006Z"
                  transform="translate(-36.08 -121.6)"
                  fill={selectColor("Business Continuity")}
                  stroke={isEmptyBlankDataDisplay ? "white" : "none"}
                  strokeWidth={isEmptyBlankDataDisplay ? 2 : 0}
                />
              </g>
            </Link>

            {sixLayerGraphData.map(
              ({ Percent, valueLabel, Cat, id }) => (
                <text
                  transform={valueLabel}
                  fill="#fff"
                  fontSize="9"
                  key={id}
                  fontFamily="sans-serif,HelveticaNeue, Helvetica Neue"
                  onClick={() => handleLayersAction(Cat)}
                >
                  <tspan x="0" y="0">
                    {isEmptyBlankDataDisplay ? ("N/A") : (`${Percent}%`)}
                  </tspan>
                </text>
              )
            )}
          </g>
          {sixLayerGraphData.map(
            ({ Cat, labelTransform, id }) => (
              <text
                transform={labelTransform}
                fill="#fff"
                fontSize="7"
                key={id}
                fontFamily="sans-serif, Segoe UI, HelveticaNeue, Helvetica Neue"
              >
                <tspan x="0" y="0">
                  {Cat}
                </tspan>
              </text>
            )
          )}
        </g>
      </svg>
    </CardBody>
  </>)
}

export default Sixlayers;
