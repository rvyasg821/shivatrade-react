// ** React Imports
import {
  Fragment,
  useState,
  useEffect,
  useLayoutEffect,
  useCallback,
} from 'react';
import { Link, useNavigate } from 'react-router-dom';

// ** Store & Actions
import { useDispatch, useSelector } from 'react-redux';
import {
  deleteTool,
  getToolsList,
  cleanToolsMessage,
  updateToolStatus,
} from '../store';
import { startLoading, stopLoading } from '../../loadingstore';

// ** Reactstrap Imports
import {
  Col,
  Badge,
  Row,
  Card,
  Input,
  Button,
  CardBody,
  UncontrolledTooltip,
  DropdownMenu,
  DropdownItem,
  UncontrolledDropdown,
  DropdownToggle,
  Nav,
  NavItem,
  NavLink,
  TabContent,
  TabPane,
} from 'reactstrap';

// ** Custom Components
import Notification from '@components/toast/notification';
import DatatablePagination from '@components/datatable/DatatablePagination';

// ** Third Party Components
import { useTranslation } from 'react-i18next';
import Swal from 'sweetalert2';
import withReactContent from 'sweetalert2-react-content';

// ** Icons Import
import { Edit, Trash2, PlusCircle, MoreVertical } from 'react-feather';

// ** Constant
import {
  appsRoot,
  defaultPerPageRow,
  ENUM_TOOLS_STATUS,
  ENUM_TOOLS_STATUS_COLOR,
} from '@constant/defaultValues';

// ** Components
import ToolForm from '../components/ToolForm';
import ToolScheduleForm from '../components/ToolScheduleForm';

const ToolsSettings = () => {
  // ** Hooks
  const { t } = useTranslation();
  const navigate = useNavigate();
  const mySwal = withReactContent(Swal);

  // ** Store vars
  const dispatch = useDispatch();
  const store = useSelector((state) => state.tools);
  const authStore = useSelector((state) => state.auth);
  const authUserItem = authStore?.authUserItem || null;

  // ** States
  const [activeTab, setActiveTab] = useState('settings');

  /* Pagination */
  const [sort, setSort] = useState('desc');
  const [sortColumn, setSortColumn] = useState('_id');
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
  const [searchInput, setSearchInput] = useState('');

  // ** Toggle Tab
  const toggleTab = (tab) => {
    if (activeTab !== tab) {
      setActiveTab(tab);
    }
  };

  const handleToolsLists = useCallback(
    (
      sorting = sort,
      sortCol = sortColumn,
      page = currentPage,
      perPage = rowsPerPage,
      search = searchInput,
    ) => {
      dispatch(
        getToolsList({
          orderBy: sortCol,
          orderDirection: sorting,
          page,
          perPage,
          search,
        }),
      );
    },
    [sort, sortColumn, currentPage, rowsPerPage, searchInput, dispatch],
  );

  const handleSort = (column, sortDirection) => {
    setSort(sortDirection);
    setSortColumn(column.sortField);
    setCurrentPage(1);

    handleToolsLists(
      sortDirection,
      column.sortField,
      1,
      rowsPerPage,
      searchInput,
    );
  };

  const handlePagination = (page) => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
    setCurrentPage(page + 1);
    handleToolsLists(sort, sortColumn, page + 1, rowsPerPage, searchInput);
  };

  const handlePerPage = (value) => {
    setRowsPerPage(value);
    setCurrentPage(1);
    handleToolsLists(sort, sortColumn, 1, value, searchInput);
  };

  const handleSearch = (value) => {
    setSearchInput(value);
  };

  useEffect(() => {
    let handler;
    if (searchInput) {
      handler = setTimeout(() => {
        setCurrentPage(1);
        handleToolsLists(sort, sortColumn, 1, rowsPerPage, searchInput);
      }, 500);
    } else {
      handleToolsLists(sort, sortColumn, 1, rowsPerPage, searchInput);
    }

    return () => {
      clearTimeout(handler);
    };
  }, [searchInput]);

  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  useEffect(() => {
    if (store?.actionFlag || store?.success || store?.error) {
      dispatch(cleanToolsMessage(null));
    }

    if (store?.actionFlag === 'TOOL_DLT') {
      handleToolsLists();
    }

    if (store?.success) {
      // Notification('Success', store.success, 'success');
    }

    if (store?.error) {
      Notification('Error', store.error, 'warning');
    }
  }, [store.actionFlag, store.success, store.error]);

  const handleDelete = (id = '') => {
    mySwal
      .fire({
        title: t('Are you sure?'),
        text: t("You won't be able to revert this!"),
        icon: 'warning',
        showCancelButton: true,
        confirmButtonText: t('Yes, delete it!'),
        customClass: {
          confirmButton: 'btn btn-primary',
          cancelButton: 'btn btn-outline-danger ms-1',
        },
        buttonsStyling: false,
      })
      .then(function (result) {
        if (result.isConfirmed) {
          dispatch(deleteTool(id));
        }
      });
  };

  const handleStatusChange = (id, currentStatus) => {
    const newStatus = currentStatus === 1 ? 2 : 1;
    dispatch(updateToolStatus({ id, status: newStatus }));
  };

  // ✅ Permission Checks
  const isSystemAdmin =
    authUserItem?.role?.type === 'system' &&
    authUserItem?.role?.name === 'Admin';

  const canAddTool =
    isSystemAdmin || authUserItem?.role?.permissions?.tools?.can_add;

  const canEditToolGlobal =
    isSystemAdmin || authUserItem?.role?.permissions?.tools?.can_update;

  const canDeleteToolGlobal =
    isSystemAdmin || authUserItem?.role?.permissions?.tools?.can_delete;

  // ✅ Columns
  const columns = [
    {
      name: t('Name'),
      sortField: 'name',
      sortable: true,
      selector: (row) => (
        <span
          onClick={() => navigate(`${appsRoot}/tools/edit/${row?._id || ''}`)}
          className="text-capitalize text-wrap cursor-pointer text-primary"
        >
          {row?.name || ''}
        </span>
      ),
    },
    {
      name: t('Description'),
      sortField: 'description',
      sortable: false,
      selector: (row) => (
        <span className="text-wrap">{row?.description || ''}</span>
      ),
    },
    {
      name: t('Status'),
      sortField: 'status',
      sortable: false,
      selector: (row) => (
        <Badge color={ENUM_TOOLS_STATUS_COLOR?.[row?.status]}>
          {t(ENUM_TOOLS_STATUS?.[row?.status]) || ''}
        </Badge>
      ),
    },
  ];

  // ✅ Add Action column only if allowed
  if (canEditToolGlobal || canDeleteToolGlobal) {
    columns.push({
      name: t('Action'),
      center: true,
      cell: (row) => {
        const canEditTool =
          isSystemAdmin || authUserItem?.role?.permissions?.tools?.can_update;

        const canDeleteTool =
          isSystemAdmin || authUserItem?.role?.permissions?.tools?.can_delete;

        return (
          <div className="d-flex column-action align-items-center table-icon">
            {canEditTool && (
              <span
                className="me-50 cursor-pointer"
                id={`tool-edit-tooltip-${row?._id || ''}`}
                onClick={() =>
                  navigate(`${appsRoot}/tools/edit/${row?._id || ''}`)
                }
              >
                <UncontrolledTooltip
                  placement="top"
                  target={`tool-edit-tooltip-${row?._id || ''}`}
                >
                  {t('Edit')}
                </UncontrolledTooltip>
                <Edit size={20} />
              </span>
            )}

            {canDeleteTool && (
              <>
                <Trash2
                  size={20}
                  className="cursor-pointer"
                  id={`tool-delete-tooltip-${row?._id || ''}`}
                  onClick={() => handleDelete(row?._id)}
                />
                <UncontrolledTooltip
                  placement="top"
                  target={`tool-delete-tooltip-${row?._id || ''}`}
                >
                  {t('Delete')}
                </UncontrolledTooltip>
              </>
            )}
          </div>
        );
      },
    });
  }

  useEffect(() => {
    if (!store?.loading) {
      dispatch(startLoading());
    } else {
      dispatch(stopLoading());
    }
  }, [store?.loading]);

  return (
    <Fragment>
      <div className="main-content">
        <div className="d-flex align-items-center justify-content-between mb-2">
          <h3 className="mb-0">{t('Tools Settings')}</h3>
        </div>

        <Card>
          <CardBody>
            <Nav tabs>
              <NavItem>
                <NavLink
                  active={activeTab === 'settings'}
                  onClick={() => toggleTab('settings')}
                >
                  {t('Settings')}
                </NavLink>
              </NavItem>
              <NavItem>
                <NavLink
                  active={activeTab === 'schedule'}
                  onClick={() => toggleTab('schedule')}
                >
                  {t('Schedule')}
                </NavLink>
              </NavItem>
            </Nav>

            <TabContent activeTab={activeTab}>
              <TabPane tabId="settings">
                <Row className="mt-3">
                  <Col sm="12">
                    <div className="d-flex align-items-center justify-content-between mb-2">
                      <h4 className="mb-0">{t('Tools')}</h4>

                      {canAddTool && (
                        <Button
                          color="primary"
                          className="ms-2"
                          onClick={() => navigate(`${appsRoot}/tools/add`)}
                        >
                          {t('Add Tool')} <PlusCircle size={16} />
                        </Button>
                      )}
                    </div>

                    <Card className="overflow-hidden">
                      <CardBody>
                        <Row>
                          <Col sm="4" className="">
                            <div className="d-flex align-items-center mb-sm-0 mb-1 ">
                              <Input
                                type="text"
                                id="search-tool"
                                value={searchInput}
                                className="w-100 select"
                                placeholder={t('Search Tools')}
                                onChange={(event) =>
                                  handleSearch(event?.target?.value)
                                }
                              />
                            </div>
                          </Col>
                        </Row>

                        <Row className="mt-2">
                          <Col
                            md="12 "
                            className="user-table five-row-table"
                          >
                            <DatatablePagination
                              columns={columns}
                              data={store?.toolsItems || []}
                              currentPage={currentPage}
                              rowsPerPage={rowsPerPage}
                              pagination={store?.pagination}
                              handleSort={handleSort}
                              handleRowPerPage={handlePerPage}
                              handlePagination={handlePagination}
                            />
                          </Col>
                        </Row>
                      </CardBody>
                    </Card>
                  </Col>
                </Row>
              </TabPane>
              <TabPane tabId="schedule">
                <Row className="mt-3">
                  <Col sm="12">
                    <ToolScheduleForm />
                  </Col>
                </Row>
              </TabPane>
            </TabContent>
          </CardBody>
        </Card>
      </div>
    </Fragment>
  );
};

export default ToolsSettings;
