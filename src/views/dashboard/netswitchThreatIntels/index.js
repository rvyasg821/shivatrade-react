
// ** React Imports
import React, { useCallback, useEffect, useLayoutEffect, useState } from 'react';

// ** Store & Actions
import { useDispatch, useSelector } from "react-redux";
// import { getNetswitchThreatIntelList, cleanNetswitchThreatIntelMessage } from './store';

import {
    Col,
    Row,
    Card,
    CardBody,
    InputGroup
} from 'reactstrap';
import Select from "react-select";

// ** Custom Components
// import SimpleSpinner from 'components/spinner/simple-spinner';

// import {DatatablePagination} from '../../../@core/components/datatable'
// ** Third Party Components
import ReactSnackBar from "react-js-snackbar";
import { TiMessages } from "react-icons/ti";

// ** SVG Icons
import { BiSearch } from '../../components/SVGIcons/index'
import DatatablePagination from '../../../@core/components/datatable/DatatablePagination';

const defaultPerPageRow = 10;

const NetswitchThreatIntelList = () => {
    // ** Store vars
    const dispatch = useDispatch();
    // const store = useSelector((state) => state.netswitchThreatIntel);
    // const loginStore = useSelector((state) => state.login);

    // ** States
    const [showSnackBar, setshowSnackbar] = useState(false);
    const [snackMessage, setSnackMessage] = useState("");
    const [countryOptions, setCountryOptions] = useState([])

    /* Pagination */
    const [sort, setSort] = useState("desc");
    const [sortColumn, setSortColumn] = useState("_id");
    const [currentPage, setCurrentPage] = useState(1);
    const [rowsPerPage, setRowsPerPage] = useState(defaultPerPageRow);
    const [searchInput, setSearchInput] = useState("");
    const [selectedCountry, setSelectedCountry] = useState(null)

    const handleNetswitchThreatIntelLists = useCallback((sorting = sort,
        sortCol = sortColumn, page = currentPage, perPage = rowsPerPage, search = searchInput, countryOpt = selectedCountry) => {
        const query = {
            sort: sorting,
            sortColumn: sortCol,
            page,
            limit: perPage,
            search: search
        }

        if (countryOpt?.value) {
            query.country = countryOpt.value;
        }

        // dispatch(getNetswitchThreatIntelList(query));
    }, [sort, sortColumn, currentPage, rowsPerPage, searchInput, dispatch])

    const handleSort = (column, sortDirection) => {
        setSort(sortDirection);
        setSortColumn(column.sortField);
        handleNetswitchThreatIntelLists(sortDirection, column.sortField, currentPage, rowsPerPage, searchInput, selectedCountry)
    }

    const handlePagination = (page) => {
        setCurrentPage(page + 1);
        handleNetswitchThreatIntelLists(sort, sortColumn, page + 1, rowsPerPage, searchInput, selectedCountry)
    }

    const handlePerPage = (value) => {
        setRowsPerPage(value);
        handleNetswitchThreatIntelLists(sort, sortColumn, currentPage, value, searchInput, selectedCountry)
    }

    const onSearchKey = (value) => {
        setSearchInput(value);
        handleNetswitchThreatIntelLists(sort, sortColumn, currentPage, rowsPerPage, value, selectedCountry)
    }

    const handleSelectCountry = (value = null) => {
        setSelectedCountry(value || null)
        handleNetswitchThreatIntelLists(sort, sortColumn, currentPage, rowsPerPage, searchInput, value)
    }

    useLayoutEffect(() => {
        handleNetswitchThreatIntelLists();
    }, [handleNetswitchThreatIntelLists])

    // useEffect(() => {
    //     if (store?.actionFlag || store?.success || store?.error) {
    //         dispatch(cleanNetswitchThreatIntelMessage(null));
    //     }

    //     if (store?.actionFlag === "NTSWT_THRT_INTL_LST" || store?.actionFlag === "NTSWT_THRT_INTL_LST_ERR") {
    //         let countries = []
    //         let selectedOpt = selectedCountry || null;
    //         if (store?.threatCountries?.length) {
    //             countries = store.threatCountries.map((item) => {
    //                 return {
    //                     label: item,
    //                     value: item
    //                 }
    //             })
    //         }

    //         if (store?.selectedCountry) {
    //             selectedOpt = {
    //                 label: store.selectedCountry,
    //                 value: store.selectedCountry
    //             }
    //         }

    //         setCountryOptions(countries)
    //         setSelectedCountry(selectedOpt)
    //     }

    //     if (store?.success) {
    //         setshowSnackbar(true);
    //         setSnackMessage(store.success);
    //     }

    //     if (store?.error) {
    //         setshowSnackbar(true);
    //         setSnackMessage(store.error);
    //     }
    // }, [store.actionFlag, store.success, store.error, dispatch])

    useEffect(() => {
        setTimeout(() => {
            setshowSnackbar(false);
        }, 6000);
    }, [showSnackBar])

    const columns = [
        {
            name: 'IP Address',
            sortField: "ip_address",
            sortable: true,
            selector: (row) => (row?.ip_address || "")
        },
        {
            name: 'AS Number',
            sortField: "as_number",
            sortable: true,
            selector: (row) => (row?.as_number || "")
        },
        {
            name: 'Country',
            sortField: "country",
            sortable: true,
            selector: (row) => (row?.country || "")
        },
        {
            name: 'Company',
            sortField: "company",
            sortable: true,
            selector: (row) => (
                <p className="text-wrap">
                    {row?.company || ""}
                </p>
            )
        }
    ]

    return (
        <div>
            {/* {!store?.loading ? (
                <SimpleSpinner />
            ) : null} */}

            <div className='container-fluid'>
                <ReactSnackBar Icon={(
                    <span><TiMessages size={25} /></span>
                )} Show={showSnackBar}>
                    {snackMessage}
                </ReactSnackBar>

                <Row className='row-row'>
                    <Card >
                        {/* <div className="d-flex justify-content-between p-0 border-bottom card-header">
                            <h3 className="card-title">Netswitch Threat Intels</h3>
                        </div> */}

                        <CardBody>
                            <Row>
                                <Col sm="6">
                                    <InputGroup className="d-none">
                                        <input
                                            type="search"
                                            aria-label="Search"
                                            placeholder="Search"
                                            value={searchInput}
                                            className="col-input "
                                            onChange={(event) => onSearchKey(event?.target?.value)}
                                        />
                                        <span className="edit2-icons position-absolute">
                                            <BiSearch />
                                        </span>
                                    </InputGroup>
                                </Col>

                                <Col sm="6" className='text-right'>
                                    <Select
                                        name="country"
                                        classNamePrefix="react-select"
                                        options={countryOptions}
                                        placeholder="Select Country"
                                        value={selectedCountry || null}
                                        className="react-select col-select text-left mx-1"
                                        onChange={(val) => handleSelectCountry(val)}
                                    />
                                </Col>
                            </Row>

                            <Row className="eventLogManagement mt-2 event-table">
                                <Col className="pb-2" md="12">
                                    <DatatablePagination
                                        // data={store?.netswitchThreatIntelItems || []}
                                        data={[]}
                                        columns={columns}
                                        rowsPerPage={rowsPerPage}
                                        // pagination={store?.pagination}
                                        handleSort={handleSort}
                                        handleRowPerPage={handlePerPage}
                                        handlePagination={handlePagination}
                                    />
                                </Col>
                            </Row>
                        </CardBody>
                    </Card>
                </Row>
            </div>
        </div>
    )
}

export default NetswitchThreatIntelList;
