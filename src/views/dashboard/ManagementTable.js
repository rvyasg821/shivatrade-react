// ** Reactstrap Imports
import {
    Table,
    Progress,
    CardBody,
    CardTitle,
    CardHeader,
    DropdownMenu,
    DropdownItem,
    DropdownToggle,
    UncontrolledDropdown
} from "reactstrap";
import { ManagementTaskData } from "./sampleData/mockData";
import { useTranslation } from "react-i18next"

const ManagementTable = ({

    isEmptyBlankDataDisplay
}) => {
    const managementTasks = isEmptyBlankDataDisplay ? [] : ManagementTaskData;
    const { t } = useTranslation();


    return (<>
        <CardHeader>
            {/* <ExportPdf className="d-flex justify-content-end" /> */}
            {!isEmptyBlankDataDisplay ? (
                <div className="tools float-right">
                    <UncontrolledDropdown>
                        <DropdownToggle
                            caret
                            className="btn-icon"
                            color="link"
                            data-toggle="dropdown"
                            type="button"
                        >
                            <i className="tim-icons icon-settings-gear-63" />
                        </DropdownToggle>
                        <DropdownMenu right>
                            <DropdownItem href="#pablo" onClick={(e) => e.preventDefault()}>
                                {t("Action")}
                            </DropdownItem>
                            <DropdownItem href="#pablo" onClick={(e) => e.preventDefault()}>
                                {t("Another action")}
                            </DropdownItem>
                            <DropdownItem href="#pablo" onClick={(e) => e.preventDefault()}>
                                {t("Something else")}
                            </DropdownItem>
                            <DropdownItem
                                className="text-danger"
                                href="#pablo"
                                onClick={(e) => e.preventDefault()}
                            >
                                {t("Remove Data")}
                            </DropdownItem>
                        </DropdownMenu>
                    </UncontrolledDropdown>
                </div>
            ) : null}
            <CardTitle tag="h5">{t("Management Table")}</CardTitle>
        </CardHeader>
        <CardBody>
            {isEmptyBlankDataDisplay ? (
                <p className="text-center align-middle">N/A</p>
            ) : null}

            {!isEmptyBlankDataDisplay ? (
                <Table responsive>
                    <thead className="text-primary">
                        <tr>
                            <th className="text-center">#</th>
                            <th>{t("Task Name")}</th>
                            <th>{t("PM")}</th>
                            <th>{t("Projected End Date")}
                            </th>
                            <th>{t("Milestone")}
                            </th>
                            <th className="text-right">{t("Spent")}</th>
                        </tr>
                    </thead>
                    <tbody>
                        {managementTasks.map((val, index) => (
                            <tr key={index}>
                                <td className="text-center">{val.Index}</td>
                                <td>{val.TaskName}</td>
                                <td>{val.Owner}</td>
                                <td>{val.ProjectedDate}</td>
                                <td>
                                    <div className="progress-container progress-sm">
                                        <Progress multi>
                                            <Progress bar max="100" value={val.Milestone} />
                                        </Progress>
                                        <span
                                            className="progress-value"
                                            style={{ fontSize: "0.62475rem" }}
                                        >
                                            {val.Milestone} %
                                        </span>
                                    </div>
                                </td>
                                <td className="text-right">${val.Spent}</td>
                            </tr>
                        ))}
                    </tbody>
                </Table>
            ) : null}
        </CardBody>
    </>)
}

export default ManagementTable