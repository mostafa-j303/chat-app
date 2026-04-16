//npm start
import React, { useState, useEffect, useRef } from "react";
import { useHistory } from "react-router-dom";

import Head from "../layout/head/Head";
import classnames from "classnames";
import Content from "../layout/content/Content";
import { TabPane, TabContent, NavItem, NavLink, Nav, } from "reactstrap";
import {
    BlockDes, Icon,
    BlockHead,
    BlockHeadContent,
    BlockTitle,
    BlockBetween,
} from "../components/Component";
import { PreviewCard, } from "../components/preview/Preview";

import { useForm } from "react-hook-form";
import { MJnotificationData, notificationData } from "../components/partials/sales/notification/NotificationData";
import DataTable from "react-data-table-component";
import exportFromJSON from "export-from-json";
import CopyToClipboard from "react-copy-to-clipboard";
import { Col, Modal, ModalBody, Row, Button, Form, FormGroup, Label, Card, CardTitle, ModalHeader, ModalFooter, Input } from "reactstrap";
import { DataTablePagination } from "../components/Component";

import { MJdataTableColumns2, MJuserData, userData } from "./components/table/TableData";
import { Pagination, PaginationLink, PaginationItem, UncontrolledDropdown, DropdownItem, DropdownMenu, DropdownToggle } from "reactstrap";
import { isElement } from "react-dom/test-utils";
import { checkForm } from "../utils/Utils";

import RecentInvest from "../pages/RecentInvest";
import { MJevents } from "../components/partials/calender/MJCalenderData";

function generateUniqueId() {
    const timestamp = new Date().getTime();
    const randomPart = Math.floor(Math.random() * 10000); // Adjust the range as needed

    return parseInt(`${timestamp}${randomPart}`, 10);
}


const Export = ({ data }) => {
    const [modal, setModal] = useState(false);

    useEffect(() => {
        if (modal === true) {
            setTimeout(() => setModal(false), 2000);
        }
    }, [modal]);

    const fileName = "user-data";

    const exportCSV = () => {
        const exportType = exportFromJSON.types.csv;
        exportFromJSON({ data, fileName, exportType });
    };

    const exportExcel = () => {
        const exportType = exportFromJSON.types.xls;
        exportFromJSON({ data, fileName, exportType });
    };

    const copyToClipboard = () => {
        setModal(true);
    };

    return (
        <React.Fragment>
            <div className="dt-export-buttons d-flex align-center">
                <div className="dt-export-title d-none d-md-inline-block">Export</div>
                <div className="dt-buttons btn-group flex-wrap">
                    <CopyToClipboard text={JSON.stringify(data)}>
                        <Button className="buttons-copy buttons-html5" onClick={() => copyToClipboard()}>
                            <span>Copy</span>
                        </Button>
                    </CopyToClipboard>{" "}
                    <button className="btn btn-secondary buttons-csv buttons-html5" type="button" onClick={() => exportCSV()}>
                        <span>CSV</span>
                    </button>{" "}
                    <button className="btn btn-secondary buttons-excel buttons-html5" type="button" onClick={() => exportExcel()}>
                        <span>Excel</span>
                    </button>{" "}
                </div>
            </div>
            <Modal isOpen={modal} className="modal-dialog-centered text-center" size="sm">
                <ModalBody className="text-center m-2">
                    <h5>Copied to clipboard</h5>
                </ModalBody>
                <div className="p-3 bg-light">
                    <div className="text-center">Copied {data.length} rows to clipboard</div>
                </div>
            </Modal>
        </React.Fragment>
    );
};


const ExpandableRowComponent = ({ data }) => {
    return (
        <ul className="dtr-details p-2 border-bottom ml-1">
            <li className="d-block d-sm-none">
                <span className="dtr-title">Company</span> <span className="dtr-data">{data.company}</span>
            </li>
            <li className="d-block d-sm-none">
                <span className="dtr-title ">Gender</span> <span className="dtr-data">{data.gender}</span>
            </li>
            <li>
                <span className="dtr-title">Start Date</span> <span className="dtr-data">{data.startDate}</span>
            </li>
            <li>
                <span className="dtr-title">Salary</span> <span className="dtr-data">{data.salary}</span>
            </li>
        </ul>
    );
};


const Mostafa = ({ action, isCompact, className, actions, selectableRows }) => {
    const [sm, updateSm] = useState(false);

    const [file, setFile] = useState("");
    const history = useHistory();
    const calendarTabRefs = useRef({}); // Store references to calendar tabs by user ID



    const uniqueId = generateUniqueId();
    const [tableData, setTableData] = useState(MJuserData);
    const [searchText, setSearchText] = useState("");
    const [rowsPerPageS, setRowsPerPage] = useState(10);
    const [mobileView, setMobileView] = useState(false);
    // gpt tab

    const [activeTab, setActiveTab] = useState('0');
    const [selectedTabs, setSelectedTabs] = useState([]);
    const [checkTab, setCheckTab] = useState(Array(tableData.length + 1).fill(false)); // Adjusted length

    // gpt tab

    const [userInputValues, setUserInputValues] = useState(() => {
        const defaultValues = {};
        MJuserData.forEach(user => {

            const sortedNotifications = user.notification ? user.notification.sort((a, b) => {
                const dateComparison = new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time);
                return dateComparison !== 0 ? dateComparison : a.time.localeCompare(b.time);
            }) : [];
    

            defaultValues[user.id] = {
                name: user.name,
                email: user.email,
                phoneNumber: user.phone,
                company: user.company,
                source: user.source,
                status: user.status,
                googleMap: user.googleMap,
                notification: sortedNotifications || [],
                investData: user.investData || [],
                calendarEvents: user.calendarEvents || [],
            };
        });
        return defaultValues;
    });
    const [filteredData, setFilteredData] = useState(tableData);
    const dataWithIds = filteredData.map((data, index) => ({ ...data, id: data.id || index + 1 }));
    const [modalOpen, setModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState(null);
    const [selectedNotification, setSelectedNotification] = useState(null);

    // Use an object to track modal status for each user
    const [modalOpenPerUser, setModalOpenPerUser] = useState({});
    const [newNotification, setNewNotification] = useState({
        date: "",
        text: "",
        subtitle: "",
        time: "",
        fill: "bg-primary",
        outline: false,
    });
    const [isAddMode, setIsAddMode] = useState(false);
    //for calendar
    const [selectedUserEvents, setSelectedUserEvents] = useState([]);
    //end calendar

    useEffect(() => {
        let defaultData = [...tableData];
        if (searchText !== "") {
            defaultData = defaultData.filter((item) => {
                return item.name.toLowerCase().includes(searchText.toLowerCase())
                    || item.phone.toLowerCase().includes(searchText.toLowerCase())
                    || item.email.toLowerCase().includes(searchText.toLowerCase())
                    || item.company.toLowerCase().includes(searchText.toLowerCase())
                    || item.status.toLowerCase().includes(searchText.toLowerCase())
                    || item.source.toLowerCase().includes(searchText.toLowerCase());
            });
            setFilteredData(defaultData);
        }
        else { setFilteredData(defaultData) }
    }, [searchText, tableData]); // eslint-disable-line react-hooks/exhaustive-deps

    // function to change the design view under 1200 px
    const viewChange = () => {
        if (window.innerWidth < 960 && mobileView) {
            setMobileView(true);
        } else {
            setMobileView(false);
        }
    };

    //gpt tab
    const toggle = (tab) => {
        setActiveTab(tab);
    };
    const handleRowSelection = (row) => {
        const name = row.target.id;
        const id = parseInt(name.replace('select-row-', ''), 10);

        const newSelectedTabs = selectedTabs.includes(id)
            ? selectedTabs.filter((selectedTab) => selectedTab !== id)
            : [...selectedTabs, id];

        setSelectedTabs(newSelectedTabs);

        // Update the checkbox state for the selected user
        setCheckTab(prevCheckTab => ({
            ...prevCheckTab,
            [id]: newSelectedTabs.includes(id)
        }));
    };
    const closeTab = (tabId) => {
        // Check if the tab is selected
        const isTabSelected = selectedTabs.includes(parseInt(tabId, 10));

        if (isTabSelected) {
            // Filter out the closed tab from the selectedTabs state
            setSelectedTabs((prevSelectedTabs) => prevSelectedTabs.filter((selectedTab) => selectedTab.toString() !== tabId));

            // Turn off the switch for the closed tab
            setCheckTab(prevCheckTab => {
                const newCheckTab = { ...prevCheckTab };
                delete newCheckTab[tabId];
                return newCheckTab;
            });
        }

        // Reset activeTab if it matches the closed tab
        if (activeTab === tabId.toString()) {
            setActiveTab('0');
        }
    };
    useEffect(() => {
        window.addEventListener("load", viewChange);
        window.addEventListener("resize", viewChange);
        return () => {
            window.removeEventListener("resize", viewChange);
        };
    }, []); // eslint-disable-line react-hooks/exhaustive-deps

    // State to track the user being edited
    const [editingUser, setEditingUser] = useState(null);


    // Function to set the user to be edited
    const handleEditUser = (user) => {
        setActiveTab(user.id.toString());
        setEditingUser(user);
    }


    // Function to delete a user
    const handleDeleteUser = (userId) => {
        const updatedUsers = tableData.filter(user => user.id !== userId);
        setTableData(updatedUsers);
        setFilteredData(updatedUsers);
        // Clear the input values and editingUser
        setInputValues({
            name: "",
            email: "",
            phoneNumber: "",
            company: "",
            source: "",
            status: "",
            googleMap: "",
        });
        setEditingUser(null);
    };

    const [inputValues, setInputValues] = useState({
        name: "",
        email: "",
        phoneNumber: "",
        company: "",
        source: "",
        status: "",
        googleMap: "",
    });


    const handleInputChange = (e, userId) => {
        const { name, value } = e.target;
        setUserInputValues((prevValues) => ({
            ...prevValues,
            [userId]: {
                ...prevValues[userId],
                [name]: value,
            },
        }));
    };


    const handleInputChangeForADD = (e) => {


        const { name, value } = e.target;
        setInputValues((prevValues) => ({ ...prevValues, [name]: value }));
    };
    const handleAddUser = () => {
        const newUser = {
            //id: tableData.length + 1,
            id: uniqueId,
            name: inputValues.name,
            email: inputValues.email,
            phone: inputValues.phoneNumber,
            company: inputValues.company,
            source: inputValues.source,
            status: inputValues.status,
            googleMap: inputValues.googleMap,
            notification: [],
            investData: [],
            calendarEvents: MJevents[tableData.length % MJevents.length]
        };
        setTableData(prevData => [...prevData, newUser]);
        setFilteredData((prevData) => [...prevData, newUser]);



        // Clear the input values
        setInputValues({
            name: "",
            email: "",
            phoneNumber: "",
            company: "",
            source: "",
            status: "",
            googleMap: "",
        });

        // Add the new user to userInputValues
        setUserInputValues(prevValues => ({
            ...prevValues,
            [newUser.id]: newUser,
        }));
    };

    const handleUpdateUser = (userId) => {
        console.log('Before Update:', userInputValues[userId]); // Log the values before the update

        const updatedUsers = tableData.map((user) =>
            user.id === userId
                ? {
                    ...user,
                    name: userInputValues[userId]?.name || user.name,
                    email: userInputValues[userId]?.email || user.email,
                    phone: userInputValues[userId]?.phoneNumber || user.phone,
                    company: userInputValues[userId]?.company || user.company,
                    source: userInputValues[userId]?.source || user.source,
                    status: userInputValues[userId]?.status || user.status,
                    googleMap: userInputValues[userId]?.googleMap || user.googleMap,
                    //notifications: userInputValues[userId]?.notifications || user.notifications,
                }
                : user
        );
        console.log('After Update:', userInputValues[userId]); // Log the values after the update

        setTableData(updatedUsers);
        setFilteredData(updatedUsers);
        setEditingUser(null);
    };
    const restUser = () => {
        // Reset userInputValues to its initial state
        setUserInputValues((prevUserInputValues) => {
            const defaultValues = {};
            tableData.forEach((user) => {
                defaultValues[user.id] = {
                    name: user.name,
                    email: user.email,
                    phoneNumber: user.phone,
                    company: user.company,
                    source: user.source,
                    status: user.status,
                    googleMap: user.googleMap,
                    notification: user.notification || [],
                    investData: user.investData || [],

                };
            });
            return defaultValues;
        });
    };
    const toggleForm = (userID) => {
        setModalOpenPerUser((prev) => ({
            ...prev,
            [userID]: !prev[userID],
        }));
        setSelectedNotification(null);

    };
    const editNotification = (userId, notification) => {
        setSelectedUserId(userId);
        toggleForm(userId, notification.id);
        setSelectedNotification(notification);
    };



    const handleNotificationInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        setSelectedNotification((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };
    const handleNewNotificationInputChange = (e) => {
        const { name, value, type, checked } = e.target;

        setNewNotification((prev) => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value,
        }));
    };

    const handleSaveChanges = () => {
        if (isAddMode) {
            setTableData((prevData) => {
                const newData = [...prevData];
                newData.forEach((user) => {
                    if (user.id === selectedUserId) {
                        const newNotificationData = {
                            // id: user.notification.length + 1, // Generate a unique ID for the new notification
                            id: uniqueId,
                            ...newNotification,
                        };
                        user.notification.push(newNotificationData);
                    }
                });
                console.log(newData)
                return newData;
            });

        }
        else {
            setTableData((prevData) => {
                const newData = [...prevData];
                newData.forEach((user) => {
                    if (user.id === selectedUserId) {
                        const updatedNotifications = user.notification.map((notification) =>
                            notification.id === selectedNotification.id ? selectedNotification : notification
                        );
                        user.notification = updatedNotifications;
                    }
                });
                return newData;
            });
        }
        toggleForm(selectedUserId);
    };


    const handleDeleteNotification = (userId, notificationId) => {
        setTableData((prevData) => {
            const newData = [...prevData];
            newData.forEach((user) => {
                if (user.id === userId) {
                    const updatedNotifications = user.notification.filter(
                        (notification) => notification.id !== notificationId
                    );
                    user.notification = updatedNotifications;
                }
            });
            return newData;
        });
    };
    //for calendar

    const handleViewCalendar = (userId, userN, e) => {
        e.preventDefault(); // Prevent default form submission behavior
        const selectedUser = userInputValues[userId];
        setSelectedUserEvents(selectedUser.calendarEvents);
        const url = `${process.env.PUBLIC_URL}/MY_HR/MJCalendarApp/${userId}/${userN}`;

        // Check if the calendar tab is closed or not initialized for the user
        if (!calendarTabRefs.current[userId] || calendarTabRefs.current[userId].closed) {
            // If closed or not initialized, open a new tab and store its reference
            calendarTabRefs.current[userId] = window.open(url, '_blank');
        } else {
            // If tab is open, focus on it
            calendarTabRefs.current[userId].focus();
        }
    };

    //end calendar
    return (

        <React.Fragment >
            <Head title="Mostafa PRJ" />
            <Content>
                <BlockHead size="sm">
                    <BlockBetween>
                        <BlockHeadContent>
                            <BlockTitle page>Mostafa Project</BlockTitle>
                            <BlockDes className="text-soft">
                                <p>Welcome to Mostafa Test</p>
                            </BlockDes>

                        </BlockHeadContent>

                    </BlockBetween>
                </BlockHead>
                <div className={`dataTables_wrapper dt-bootstrap4 no-footer ${className ? className : ""}`}>
                    {/* tab start  */}
                    <PreviewCard>

                        <Nav tabs className="mt-n3">
                            <NavItem>
                                <NavLink
                                    tag="a"
                                    href="#tab"
                                    className={classnames({ active: activeTab === "0" })}
                                    onClick={(ev) => {
                                        ev.preventDefault();
                                        toggle("0");
                                    }}
                                >
                                    Main
                                </NavLink>
                            </NavItem>
                            <NavItem>
                                <NavLink
                                    tag="a"
                                    href="#tabForm"
                                    className={classnames({ active: activeTab === "-1" })}
                                    onClick={(ev) => {
                                        ev.preventDefault();
                                        toggle("-1");
                                    }}
                                >
                                    Form
                                </NavLink>
                            </NavItem>
                            {tableData
                                .filter((user) => selectedTabs.includes(user.id))
                                .map((user) => (
                                    <NavItem key={user.id}>
                                        <NavLink
                                            tag="a"
                                            href={`#tab${user.id}`}
                                            className={activeTab === user.id.toString() ? 'active' : ''}
                                            onClick={(ev) => {
                                                ev.preventDefault();
                                                toggle(user.id.toString());
                                            }}
                                        >
                                            {user.name}
                                        </NavLink>

                                        <Button className="ml-1" close onClick={() => { closeTab(user.id.toString()); }} />
                                    </NavItem>
                                ))}
                        </Nav>

                        <TabContent activeTab={activeTab}>
                            <TabPane tabId="-1">

                                <div className="p-4 mt-3 rounded bg-white">
                                    <Form>
                                        <h6 className="title mb-3">Default Mode</h6>
                                        <Row className="gy-4">
                                            <Col sm="6">
                                                <FormGroup>
                                                    <Label htmlFor="default-2" className="form-label">
                                                        Name
                                                    </Label>
                                                    <div className="form-control-wrap">
                                                        <div className="form-icon form-icon-left">
                                                            <Icon name="user" />
                                                        </div>
                                                        <input
                                                            name="name"
                                                            onChange={handleInputChangeForADD}
                                                            value={inputValues.name}
                                                            className="form-control" type="text" id="default-2" placeholder="Enter Your Full Name" />
                                                    </div>
                                                </FormGroup>
                                            </Col>
                                            <Col sm="6">
                                                <FormGroup>
                                                    <Label htmlFor="default-2" className="form-label">
                                                        Email
                                                    </Label>
                                                    <div className="form-control-wrap">
                                                        <div className="form-icon form-icon-left">
                                                            <Icon name="mail" />
                                                        </div>
                                                        <input
                                                            name="email"
                                                            value={inputValues.email}
                                                            onChange={handleInputChangeForADD}
                                                            className="form-control" type="text" id="default-2" placeholder="Enter Your Email" />
                                                    </div>
                                                </FormGroup>
                                            </Col>
                                            <Col sm="6">
                                                <FormGroup>
                                                    <Label htmlFor="default-2" className="form-label">
                                                        Phone Number
                                                    </Label>
                                                    <div className="form-control-wrap">

                                                        <input
                                                            name="phoneNumber"
                                                            value={inputValues.phoneNumber}
                                                            onChange={handleInputChangeForADD}
                                                            className="form-control" type="number" id="default-2" placeholder="Enter Your Phone Number" />
                                                    </div>
                                                </FormGroup>
                                            </Col>
                                            <Col sm="6">
                                                <FormGroup>
                                                    <Label htmlFor="default-1" className="form-label">
                                                        Company
                                                    </Label>
                                                    <div className="form-control-wrap">

                                                        <input
                                                            name="company"
                                                            value={inputValues.company}
                                                            onChange={handleInputChangeForADD}
                                                            className="form-control" type="text" id="default-1" placeholder="Enter Your Company" />
                                                    </div>
                                                </FormGroup>
                                            </Col>
                                            <Col sm="6">
                                                <FormGroup>
                                                    <Label htmlFor="default-1" className="form-label">
                                                        Source
                                                    </Label>
                                                    <div className="form-control-wrap">

                                                        <input
                                                            name="source"
                                                            value={inputValues.source}
                                                            onChange={handleInputChangeForADD}
                                                            className="form-control" type="text" id="default-1" placeholder="Enter Your Source" />
                                                    </div>
                                                </FormGroup>
                                            </Col>
                                            <Col sm="6">
                                                <FormGroup>
                                                    <Label htmlFor="default-1" className="form-label">
                                                        Status
                                                    </Label>
                                                    <div className="form-control-wrap">
                                                        <ul className="custom-control-group">
                                                            <li>
                                                                <div className="custom-control custom-radio custom-control-pro no-control">
                                                                    <input
                                                                        type="radio"
                                                                        className="custom-control-input"
                                                                        name="status"
                                                                        id="btnRadio1"
                                                                        value="Active"
                                                                        checked={inputValues.status === "Active"}
                                                                        onChange={handleInputChangeForADD}
                                                                    />
                                                                    <label className="custom-control-label bg-success-dim text-success" htmlFor="btnRadio1">
                                                                        Active
                                                                    </label>
                                                                </div>
                                                            </li>
                                                            <li>
                                                                <div className="custom-control custom-radio custom-control-pro no-control">
                                                                    <input
                                                                        type="radio"
                                                                        className="custom-control-input"
                                                                        name="status"
                                                                        id="btnRadio2"
                                                                        value="Inactive"
                                                                        checked={inputValues.status === "Inactive"}
                                                                        onChange={handleInputChangeForADD}
                                                                    />
                                                                    <label className="custom-control-label bg-danger-dim text-danger" htmlFor="btnRadio2">
                                                                        Inactive
                                                                    </label>
                                                                </div>
                                                            </li>
                                                            <li>
                                                                <div className="custom-control custom-radio custom-control-pro no-control">
                                                                    <input
                                                                        type="radio"
                                                                        className="custom-control-input"
                                                                        name="status"
                                                                        id="btnRadio3"
                                                                        value="Pending"
                                                                        checked={inputValues.status === "Pending"}
                                                                        onChange={handleInputChangeForADD}
                                                                    />
                                                                    <label className="custom-control-label bg-warning-dim text-warning" htmlFor="btnRadio3">
                                                                        Pending
                                                                    </label>
                                                                </div>
                                                            </li>
                                                            <li>
                                                                <div className="custom-control custom-radio custom-control-pro no-control">
                                                                    <input
                                                                        type="radio"
                                                                        className="custom-control-input"
                                                                        name="status"
                                                                        id="btnRadio4"
                                                                        value="Suspend"
                                                                        checked={inputValues.status === "Suspend"}
                                                                        onChange={handleInputChangeForADD}
                                                                    />
                                                                    <label className="custom-control-label bg-danger-dim text-danger" htmlFor="btnRadio4">
                                                                        Suspend
                                                                    </label>
                                                                </div>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </FormGroup>
                                            </Col>
                                            <Col sm="6">
                                                <FormGroup>
                                                    <Label htmlFor="default-1" className="form-label">
                                                        location
                                                    </Label>
                                                    <div className="form-control-wrap">

                                                        <input
                                                            name="googleMap"
                                                            value={inputValues.googleMap}
                                                            onChange={handleInputChangeForADD}
                                                            className="form-control" type="text" id="default-1" placeholder="Enter Your location" />
                                                    </div>
                                                </FormGroup>
                                            </Col>

                                        </Row>

                                    </Form>

                                    <Col className="text-right mt-2" sm="12">
                                        <Button color="primary" onClick={handleAddUser}>
                                            <Icon name="plus"></Icon>
                                            <span>ADD</span>
                                        </Button>
                                    </Col>


                                </div>



                            </TabPane>
                            <TabPane tabId={"0"}>

                                <Row className={`justify-between g-2 ${actions ? "with-export" : ""}`}>
                                    <Col className="col-7 text-left" sm="4">
                                        <div id="DataTables_Table_0_filter" className="dataTables_filter">
                                            <label>
                                                <input
                                                    type="search"
                                                    className="form-control form-control-sm"
                                                    placeholder="Search"
                                                    onChange={(ev) => setSearchText(ev.target.value)}
                                                />
                                            </label>
                                        </div>
                                    </Col>
                                    <Col className="col-5 text-right" sm="8">

                                        <div className="datatable-filter">
                                            <div className="d-flex justify-content-end g-2">
                                                {actions && <Export data={filteredData} />}
                                                <div className="dataTables_length" id="DataTables_Table_0_length">
                                                    <label>
                                                        <span className="d-none d-sm-inline-block">Show</span>
                                                        <div className="form-control-select">
                                                            {" "}
                                                            <select
                                                                name="DataTables_Table_0_length"
                                                                className="custom-select custom-select-sm form-control form-control-sm"
                                                                onChange={(e) => setRowsPerPage(e.target.value)}
                                                                value={rowsPerPageS}
                                                            >
                                                                <option value="10">10</option>
                                                                <option value="25">25</option>
                                                                <option value="40">40</option>
                                                                <option value="50">50</option>
                                                            </select>{" "}
                                                        </div>
                                                    </label>
                                                </div>
                                            </div>
                                        </div>
                                    </Col>
                                </Row>
                                <DataTable
                                    data={dataWithIds} // Use the specific data for the user
                                    columns={MJdataTableColumns2(handleDeleteUser, handleEditUser)}
                                    className={className}
                                    selectableRows

                                    selectableRowsComponent={React.forwardRef((props, ref) => (
                                        <CustomCheckbox  {...props} ref={ref}
                                            checkTab={checkTab}
                                            handleRowSelection={(e) => handleRowSelection(e)}
                                        />
                                    ))}
                                    expandableRowsComponent={ExpandableRowComponent}
                                    expandableRows={mobileView}
                                    noDataComponent={<div className="p-2">There are no records found</div>}
                                    sortIcon={<div><span>&darr;</span><span>&uarr;</span></div>}
                                    pagination={Pagination}
                                    paginationComponent={({ currentPage, rowsPerPage, rowCount, onChangePage, onChangeRowsPerPage }) => (
                                        <DataTablePagination
                                            customItemPerPage={rowsPerPageS}
                                            itemPerPage={rowsPerPage}
                                            totalItems={rowCount}
                                            paginate={onChangePage}
                                            currentPage={currentPage}
                                            onChangeRowsPerPage={onChangeRowsPerPage}
                                            setRowsPerPage={setRowsPerPage}
                                        />
                                    )}
                                ></DataTable>

                            </TabPane>

                            {filteredData.map((user) =>
                            (
                                <TabPane key={user.id} tabId={user.id.toString()}>

                                    <h3>{user.name}</h3>

                                    <Form className="p-4 mt-3 rounded bg-white">
                                        <h6 className="title mb-3">Default Mode</h6>
                                        <Row className="gy-4">
                                            <Col sm="3">
                                                <FormGroup>
                                                    <Label htmlFor="default-2" className="form-label">
                                                        Name
                                                    </Label>
                                                    <div className="form-control-wrap">
                                                        <div className="form-icon form-icon-left">
                                                            <Icon name="user" />
                                                        </div>
                                                        <input
                                                            name="name"
                                                            value={userInputValues[user.id]?.name || ""}
                                                            onChange={(e) => handleInputChange(e, user.id)}
                                                            className="form-control" type="text" id={`name-${user.id}`} placeholder="Enter Your Full Name" />
                                                    </div>
                                                </FormGroup>
                                            </Col>
                                            <Col sm="3">
                                                <FormGroup>
                                                    <Label htmlFor="default-2" className="form-label">
                                                        Email
                                                    </Label>
                                                    <div className="form-control-wrap">
                                                        <div className="form-icon form-icon-left">
                                                            <Icon name="mail" />
                                                        </div>
                                                        <input
                                                            name="email"
                                                            value={userInputValues[user.id]?.email || ""}
                                                            onChange={(e) => handleInputChange(e, user.id)}
                                                            className="form-control" type="text" id={`email-${user.id}`} placeholder="Enter Your Email" />
                                                    </div>
                                                </FormGroup>
                                            </Col>
                                            <Col sm="3">
                                                <FormGroup>
                                                    <Label htmlFor="default-2" className="form-label">
                                                        Phone Number
                                                    </Label>
                                                    <div className="form-control-wrap">

                                                        <input
                                                            name="phoneNumber"
                                                            value={userInputValues[user.id]?.phoneNumber || ""}
                                                            onChange={(e) => handleInputChange(e, user.id)}
                                                            className="form-control" type="number" id={`phone-${user.id}`} placeholder="Enter Your Phone Number" />
                                                    </div>
                                                </FormGroup>
                                            </Col>
                                            <Col sm="3">
                                                <FormGroup>
                                                    <Label htmlFor="default-1" className="form-label">
                                                        Company
                                                    </Label>
                                                    <div className="form-control-wrap">

                                                        <input
                                                            name="company"
                                                            value={userInputValues[user.id]?.company || ""}
                                                            onChange={(e) => handleInputChange(e, user.id)}
                                                            className="form-control" type="text" id={`company-${user.id}`} placeholder="Enter Your Company" />
                                                    </div>
                                                </FormGroup>
                                            </Col>
                                            <Col sm="3">
                                                <FormGroup>
                                                    <Label htmlFor="default-1" className="form-label">
                                                        Source
                                                    </Label>
                                                    <div className="form-control-wrap">

                                                        <input
                                                            name="source"
                                                            value={userInputValues[user.id]?.source || ""}
                                                            onChange={(e) => handleInputChange(e, user.id)}
                                                            className="form-control" type="text" id={`source-${user.id}`} placeholder="Enter Your Source" />
                                                    </div>
                                                </FormGroup>
                                            </Col>
                                            <Col sm="3">
                                                <FormGroup>
                                                    <Label htmlFor="default-1" className="form-label">
                                                        location
                                                    </Label>
                                                    <div className="form-control-wrap">

                                                        <input
                                                            name="googleMap"
                                                            value={userInputValues[user.id]?.googleMap || ""}
                                                            onChange={(e) => handleInputChange(e, user.id)}
                                                            className="form-control" type="text" id={`googleMap-${user.id}`} placeholder="Enter Your location" />
                                                    </div>
                                                </FormGroup>
                                            </Col>
                                            <Col sm="6">
                                                <FormGroup>
                                                    <Label htmlFor={`status-${user.id}`} className="form-label">
                                                        Status
                                                    </Label>
                                                    <div className="form-control-wrap">
                                                        <ul className="custom-control-group">
                                                            <li>
                                                                <div className="custom-control custom-radio custom-control-pro no-control">
                                                                    <input
                                                                        type="radio"
                                                                        className="custom-control-input"
                                                                        name="status"
                                                                        id={`btnRadio${user.id}-1`}
                                                                        value="Active"
                                                                        checked={
                                                                            userInputValues[user.id]?.status === "Active"}
                                                                        onChange={(e) => handleInputChange(e, user.id)}
                                                                    />
                                                                    <label className="custom-control-label bg-success-dim text-success" htmlFor={`btnRadio${user.id}-1`}>
                                                                        Active
                                                                    </label>
                                                                </div>
                                                            </li>
                                                            <li>
                                                                <div className="custom-control custom-radio custom-control-pro no-control">
                                                                    <input
                                                                        type="radio"
                                                                        className="custom-control-input"
                                                                        name="status"
                                                                        id={`btnRadio${user.id}-2`}
                                                                        value="Inactive"
                                                                        checked={
                                                                            userInputValues[user.id]?.status === "Inactive"}
                                                                        onChange={(e) => handleInputChange(e, user.id)}
                                                                    />
                                                                    <label className="custom-control-label bg-danger-dim text-danger" htmlFor={`btnRadio${user.id}-2`}>
                                                                        Inactive
                                                                    </label>
                                                                </div>
                                                            </li>
                                                            <li>
                                                                <div className="custom-control custom-radio custom-control-pro no-control">
                                                                    <input
                                                                        type="radio"
                                                                        className="custom-control-input"
                                                                        name="status"
                                                                        id={`btnRadio${user.id}-3`}
                                                                        value="Pending"
                                                                        checked={
                                                                            userInputValues[user.id]?.status === "Pending"}
                                                                        onChange={(e) => handleInputChange(e, user.id)}
                                                                    />
                                                                    <label className="custom-control-label bg-warning-dim text-warning" htmlFor={`btnRadio${user.id}-3`}>
                                                                        Pending
                                                                    </label>
                                                                </div>
                                                            </li>
                                                            <li>
                                                                <div className="custom-control custom-radio custom-control-pro no-control">
                                                                    <input
                                                                        type="radio"
                                                                        className="custom-control-input"
                                                                        name="status"
                                                                        id={`btnRadio${user.id}-4`}
                                                                        value="Suspend"
                                                                        checked={
                                                                            userInputValues[user.id]?.status === "Suspend"}
                                                                        onChange={(e) => handleInputChange(e, user.id)}
                                                                    />
                                                                    <label className="custom-control-label bg-danger-dim text-danger" htmlFor={`btnRadio${user.id}-4`}>
                                                                        Suspend
                                                                    </label>
                                                                </div>
                                                            </li>
                                                        </ul>
                                                    </div>
                                                </FormGroup>
                                            </Col>


                                        </Row>

                                    </Form>

                                    <Col className="text-right mt-2" sm="12">
                                        <Button color="primary" onClick={() => restUser(user.id)}>
                                            <span>Rest</span>
                                        </Button>
                                        <Button color="primary" className="ml-2" onClick={() => handleUpdateUser(user.id)}>
                                            <span>Update</span>
                                        </Button>
                                    </Col>
                                    <hr />
                                    <Row className="d-flex g-1">
                                        <Col xl="4">
                                            <Card className="card-bordered">

                                                <div className="card-inner border-bottom">
                                                    <div className="card-title-group">
                                                        <CardTitle>
                                                            <h6 className="title">Notifications</h6>
                                                        </CardTitle>
                                                        <div className="card-tools">
                                                            <Button color="primary" onClick={() => {
                                                                setIsAddMode(true);
                                                                setSelectedUserId(user.id)
                                                                toggleForm(user.id);
                                                                setNewNotification({
                                                                    date: "",
                                                                    text: "",
                                                                    subtitle: "",
                                                                    time: "",
                                                                    fill: "bg-primary",
                                                                    outline: false,
                                                                });
                                                            }}>
                                                                <span>ADD</span>
                                                            </Button>
                                                        </div>
                                                    </div>
                                                </div>
                                                <div className="card-inner">
                                                    <div className="timeline">
                                                        <h6 className="timeline-head">November, 2019</h6>
                                                        <ul className="timeline-list">
                                                            {Array.isArray(user.notification) &&
                                                                user.notification
                                                                    // Sort notifications by date and time
                                                                    .sort((a, b) => {
                                                                        const dateComparison = new Date(a.date + 'T' + a.time) - new Date(b.date + 'T' + b.time);
                                                                        return dateComparison !== 0 ? dateComparison : a.time.localeCompare(b.time);
                                                                    })
                                                                    .map((item, index) => {
                                                                        return (
                                                                            <li className="timeline-item d-flex justify-content-between" key={item.id}>
                                                                                < div className="d-flex justify-content-between">
                                                                                    <div className={`timeline-status ${item.fill} ${item.outline ? "is-outline" : ""}`}></div>
                                                                                    <div className="timeline-date">
                                                                                        {item.date} <Icon name="alarm-alt"></Icon>
                                                                                    </div>
                                                                                    <div className="timeline-data">
                                                                                        <h6 className="timeline-title">{item.text}</h6>
                                                                                        <div className="timeline-des">
                                                                                            <p>{item.subtitle}</p>
                                                                                            <span className="time">{item.time}</span>
                                                                                        </div>
                                                                                    </div>
                                                                                </div>
                                                                                <UncontrolledDropdown style={{ position: 'relative', top: "-13.3px", left: "15px" }} >
                                                                                    <DropdownToggle tag="a" className="text-soft dropdown-toggle btn btn-icon btn-trigger">
                                                                                        <Icon name="more-h"></Icon>
                                                                                    </DropdownToggle>
                                                                                    <DropdownMenu right>
                                                                                        <ul className="link-list-plain">
                                                                                            <li>
                                                                                                <DropdownItem
                                                                                                    tag="a"
                                                                                                    href="#tabForm"
                                                                                                    onClick={(e) => {
                                                                                                        e.preventDefault()
                                                                                                        setIsAddMode(false)
                                                                                                        editNotification(user.id, item)
                                                                                                    }}
                                                                                                >
                                                                                                    Edit
                                                                                                </DropdownItem>
                                                                                            </li>
                                                                                            <li>
                                                                                                <DropdownItem
                                                                                                    tag="a"
                                                                                                    href="#dropdownitem"
                                                                                                    onClick={(e) => {
                                                                                                        e.preventDefault()
                                                                                                        handleDeleteNotification(user.id, item.id)
                                                                                                    }
                                                                                                    }
                                                                                                >
                                                                                                    Delete
                                                                                                </DropdownItem>
                                                                                            </li>
                                                                                        </ul>
                                                                                    </DropdownMenu>
                                                                                </UncontrolledDropdown>
                                                                            </li>
                                                                        );
                                                                    })}
                                                        </ul>
                                                    </div>
                                                </div>
                                                <Modal
                                                    isOpen={modalOpenPerUser[user.id] || false}
                                                    toggle={() => toggleForm(user.id)}
                                                    centered
                                                    size="xl"
                                                >
                                                    <ModalHeader toggle={() => toggleForm(user.id)}>
                                                        {user.name} Notifications
                                                    </ModalHeader>
                                                    {isAddMode ? (
                                                        <ModalBody>
                                                            <Row>
                                                                <Col sm={4}>
                                                                    <FormGroup>
                                                                        <Label className="form-label">Date</Label>
                                                                        <Input
                                                                            value={newNotification.date}
                                                                            onChange={handleNewNotificationInputChange}
                                                                            type="date"
                                                                            name="date"
                                                                        />
                                                                    </FormGroup>
                                                                </Col>
                                                                <Col sm={4}>
                                                                    <FormGroup>
                                                                        <Label className="form-label">Text</Label>
                                                                        <Input
                                                                            value={newNotification.text}
                                                                            onChange={handleNewNotificationInputChange}
                                                                            type="text"
                                                                            name="text"
                                                                        />
                                                                    </FormGroup>
                                                                </Col>
                                                                <Col sm={4}>
                                                                    <FormGroup>
                                                                        <Label className="form-label">Subtitle</Label>
                                                                        <Input
                                                                            value={newNotification.subtitle}
                                                                            onChange={handleNewNotificationInputChange}
                                                                            type="text"
                                                                            name="subtitle"
                                                                        />
                                                                    </FormGroup>
                                                                </Col>
                                                                <Col sm={4}>
                                                                    <FormGroup>
                                                                        <Label className="form-label">Time</Label>
                                                                        <Input
                                                                            value={newNotification.time}
                                                                            onChange={handleNewNotificationInputChange}
                                                                            type="time"
                                                                            name="time"
                                                                        />
                                                                    </FormGroup>
                                                                </Col>

                                                                <Col sm={4}>
                                                                    <FormGroup>
                                                                        <Label className="form-label">Fill</Label>
                                                                        <Input className="link-list-opt p-0 "
                                                                            type="select"
                                                                            name="fill"
                                                                            checked={newNotification.fill}
                                                                            onChange={handleNewNotificationInputChange}
                                                                        >
                                                                            <option value="bg-primary" className="bg-primary">
                                                                                Active

                                                                            </option>
                                                                            <option value="bg-danger" className="bg-danger">
                                                                                Inactive
                                                                            </option>
                                                                            <option value="bg-warning" className="bg-warning">
                                                                                Pending
                                                                            </option>
                                                                            <option value="bg-danger-dim" className="bg-danger">
                                                                                Suspend
                                                                            </option>
                                                                        </Input>
                                                                    </FormGroup>
                                                                </Col>
                                                                <Col sm={4}>
                                                                    <FormGroup className="d-flex flex-column mt-1">
                                                                        <Label className="form-label">Outline</Label>
                                                                        <div className="custom-control custom-checkbox">
                                                                            <Input type="checkbox" className="custom-control-input form-control" id="check2"
                                                                                name="outline" checked={newNotification.outline}
                                                                                onChange={handleNewNotificationInputChange}
                                                                            />
                                                                            <Label className="custom-control-label" htmlFor="check2">
                                                                                True/False
                                                                            </Label>
                                                                        </div>
                                                                    </FormGroup>
                                                                </Col>
                                                            </Row>
                                                        </ModalBody>
                                                    ) : (
                                                        <ModalBody>
                                                            <Row>
                                                                <Col sm="12" className="d-flex justify-content-between">
                                                                    <Row>
                                                                        <Icon style={{ position: 'relative', top: '3px' }} name="label-fill" />
                                                                        <h5>#{selectedNotification ? selectedNotification.id : ""}</h5>
                                                                    </Row>

                                                                </Col>
                                                            </Row>
                                                            <Row>
                                                                <Col sm={4}>
                                                                    <FormGroup>
                                                                        <Label className="form-label">Date</Label>
                                                                        <Input
                                                                            value={selectedNotification ? selectedNotification.date : ''}
                                                                            onChange={handleNotificationInputChange}
                                                                            type="date"
                                                                            name="date"
                                                                        />
                                                                    </FormGroup>
                                                                </Col>
                                                                <Col sm={4}>
                                                                    <FormGroup>
                                                                        <Label className="form-label">Text</Label>
                                                                        <Input
                                                                            value={selectedNotification ? selectedNotification.text : ''}
                                                                            onChange={handleNotificationInputChange}
                                                                            type="text"
                                                                            name="text"
                                                                        />
                                                                    </FormGroup>
                                                                </Col>
                                                                <Col sm={4}>
                                                                    <FormGroup>
                                                                        <Label className="form-label">Subtitle</Label>
                                                                        <Input
                                                                            value={selectedNotification ? selectedNotification.subtitle : ''}
                                                                            onChange={handleNotificationInputChange}
                                                                            type="text"
                                                                            name="subtitle"
                                                                        />
                                                                    </FormGroup>
                                                                </Col>
                                                                <Col sm={4}>
                                                                    <FormGroup>
                                                                        <Label className="form-label">Time</Label>
                                                                        <Input
                                                                            value={selectedNotification ? selectedNotification.time : ''}
                                                                            onChange={handleNotificationInputChange}
                                                                            type="time"
                                                                            name="time"
                                                                        />
                                                                    </FormGroup>
                                                                </Col>
                                                                <Col sm={4}>
                                                                    <FormGroup>
                                                                        <Label className="form-label">Fill</Label>
                                                                        <Input className="link-list-opt p-0 "
                                                                            type="select"
                                                                            name="fill"
                                                                            value={selectedNotification ? selectedNotification.fill : ""}
                                                                            onChange={handleNotificationInputChange}
                                                                        >
                                                                            <option value="bg-primary" className="bg-primary">
                                                                                Active

                                                                            </option>
                                                                            <option value="bg-danger" className="bg-danger">
                                                                                Inactive
                                                                            </option>
                                                                            <option value="bg-warning" className="bg-warning">
                                                                                Pending
                                                                            </option>
                                                                            <option value="bg-danger-dim" className="bg-danger">
                                                                                Suspend
                                                                            </option>
                                                                        </Input>
                                                                    </FormGroup>
                                                                </Col>

                                                                <Col sm={4}>
                                                                    <FormGroup className="d-flex flex-column mt-1">
                                                                        <Label className="form-label">Outline</Label>
                                                                        <div className="custom-control custom-checkbox">
                                                                            <Input type="checkbox" className="custom-control-input form-control" id="check1"
                                                                                name="outline" checked={selectedNotification ? selectedNotification.outline : false}
                                                                                onChange={handleNotificationInputChange}
                                                                            />
                                                                            <Label className="custom-control-label" htmlFor="check1">
                                                                                True/False
                                                                            </Label>
                                                                        </div>
                                                                    </FormGroup>
                                                                </Col>
                                                            </Row>
                                                        </ModalBody>
                                                    )}

                                                    <ModalFooter>
                                                        <Button color="secondary" onClick={() => toggleForm(user.id)}>
                                                            Close
                                                        </Button>
                                                        <Button color="primary" onClick={
                                                            handleSaveChanges
                                                        }>
                                                            {isAddMode ? "Add" : "Save"}
                                                        </Button>

                                                    </ModalFooter>
                                                </Modal>
                                            </Card>
                                        </Col>
                                        <Col xl={8} >
                                            <Card className="card-bordered">
                                                <RecentInvest data={user} className="card-bordered h-100" />
                                            </Card>
                                        </Col>

                                    </Row>
                                    <hr />
                                    <Row>
                                        <Col className="text-center">
                                            <Button className="pl-3 pr-3 pt-2 pb-2" color="primary" onClick={(e) => handleViewCalendar(user.id, user.name, e)}>
                                                View Calendar Events
                                            </Button>
                                        </Col>
                                    </Row>
                                </TabPane>
                            ))}
                        </TabContent>
                    </PreviewCard>
                    {/* tab end  */}

                </div>

            </Content>
        </React.Fragment >
    );
};

export default Mostafa;


const CustomCheckbox = React.forwardRef(({ onClick, onChange, checked, closeTab, checkTab, handleRowSelection, ...rest }, ref) => {
    const id = rest.name ? parseInt(rest.name.replace('select-row-', ''), 10) : 0 // Extract ID from the name attribute

    const handleClick = (e) => {
        e.preventDefault();
        handleRowSelection(e);
        if (onClick) onClick(e);
        console.log(id)
        console.log(rest.name)
        console.log(checkTab)
    };
    if (rest.name === 'select-all-rows') {
        // If it's the "select-all-rows" checkbox, return null to hide it from rendering
        return <Icon style={{ position: 'absolute', right: '13px', fontSize: "20px" }} name="target"> </Icon>;
    }

    return (
        <div className="custom-control custom-control-sm custom-switch notext">
            <input
                id={rest.name}
                className="custom-control-input form-control"
                ref={ref}
                checked={checkTab[id]}
                onChange={handleClick}
                {...rest}
            />
            <label className="custom-control-label" htmlFor={rest.name} />
        </div>
    );
});
/*
const toggleForm = (userId) => {
    setModalOpen((prevState) => ({
        ...prevState,
        [userId]: !prevState[userId],
    }));
    if (!modalOpen[userId]) {
        // Opened the modal, set the selected user
        setSelectedUserId(userId);
    } else {
        // Closed the modal, reset the selected user
        setSelectedUserId(null);
        setUserInputValues((prevValues) => ({
            ...prevValues,
            [userId]: {
                ...prevValues[userId],
                notification: prevValues[userId]?.notification || [],
            },
        }));
    }
};

const handleNotificationInputChange = (e, userId, notificationIndex, field) => {
    const { value } = e.target;
    setUserInputValues((prevValues) => ({
        ...prevValues,
        [userId]: {
            ...prevValues[userId],
            notification: prevValues[userId]?.notification.map((item, index) =>
                index === notificationIndex
                    ? {
                        ...item,
                        [field]: value === undefined ? '' : value,
                    }
                    : item
            ),
        },
    }));
};
const handleSaveChanges = () => {
    // Apply the changes to the tableData and filteredData
    const updatedUsers = tableData.map((user) =>
        user.id === selectedUserId
            ? {
                ...user,
                notification: userInputValues[selectedUserId]?.notification || user.notification,
            }
            : user
    );

    setTableData(updatedUsers);
    setFilteredData(updatedUsers);
    setEditingUser(null);
    setModalOpen((prev) => ({ ...prev, [selectedUserId]: false }));
};
const handleDeleteNotification = (userId, notificationIndex) => {
    setUserInputValues((prevValues) => ({
        ...prevValues,
        [userId]: {
            ...prevValues[userId],
            notification: prevValues[userId]?.notification.filter((_, index) => index !== notificationIndex),
        },
    }));
};
*/
/*
<Modal
isOpen={modalOpen[user.id] || false}
toggle={() => toggleForm(user.id)}
centered
size="xl"
>
<ModalHeader toggle={() => toggleForm(user.id)}>
    {user.name} Notifications
</ModalHeader>
<ModalBody>
    {selectedUserId === user.id &&
        userInputValues[user.id]?.notification.map((item, index) => (

            <div key={item.id}>

                <Row>
                    <Col sm="12" className="d-flex justify-content-between">
                        <Row>
                            <Icon style={{ position: 'relative', top: '3px' }} name="label-fill" />
                            <h5>#{item.id}</h5>
                        </Row>

                        <Button className="btn-dim m-1" color="danger" onClick={() => handleDeleteNotification(user.id, index)}>
                            <Icon className={"fs-1px"} name="trash" />
                        </Button>

                    </Col>
                </Row>
                <Row>
                    <Col sm={4}>
                        <FormGroup>
                            <Label className="form-label">Date</Label>
                            <Input
                                type="text"
                                value={userInputValues[user.id]?.notification[index]?.date || ""}
                                onChange={(e) => handleNotificationInputChange(e, user.id, index, 'date')}
                                name="date"
                            />
                        </FormGroup>
                    </Col>
                    <Col sm={4}>
                        <FormGroup>
                            <Label className="form-label">Text</Label>
                            <Input
                                type="text"
                                value={userInputValues[user.id]?.notification[index]?.text || ""}
                                onChange={(e) => handleNotificationInputChange(e, user.id, index, 'text')}
                                name="text"
                            />
                        </FormGroup>
                    </Col>
                    <Col sm={4}>
                        <FormGroup>
                            <Label className="form-label">Subtitle</Label>
                            <Input
                                type="text"
                                value={userInputValues[user.id]?.notification[index]?.subtitle || ""}
                                onChange={(e) => handleNotificationInputChange(e, user.id, index, 'subtitle')}
                                name="subtitle"
                            />
                        </FormGroup>
                    </Col>
                    <Col sm={4}>
                        <FormGroup>
                            <Label className="form-label">Time</Label>
                            <Input
                                type="text"
                                value={userInputValues[user.id]?.notification[index]?.time || ""}
                                onChange={(e) => handleNotificationInputChange(e, user.id, index, 'time')}
                                name="time"
                            />
                        </FormGroup>
                    </Col>
                    <Col sm={4}>
                        <FormGroup>
                            <Label className="form-label">Fill</Label>
                            <Input
                                type="text"
                                value={userInputValues[user.id]?.notification[index]?.fill || ""}
                                onChange={(e) => handleNotificationInputChange(e, user.id, index, 'fill')}
                                name="fill"
                            />
                        </FormGroup>
                    </Col>
                    <Col sm={4}>
                        <FormGroup>
                            <Label className="form-label">Outline</Label>
                            <Input
                                type="text"
                                value={userInputValues[user.id]?.notification[index]?.outline}
                                onChange={(e) => handleNotificationInputChange(e, user.id, index, 'outline')}
                                name="outline"
                            />
                        </FormGroup>
                    </Col>
                </Row>
                <hr style={{ margin: '1rem 0' }} />


            </div>
        ))}
</ModalBody>
<ModalFooter>
    <Button color="primary" onClick={handleSaveChanges}>
        Save
    </Button>
    <Button color="secondary" onClick={() => toggleForm(user.id)}>
        Close
    </Button>
</ModalFooter>
</Modal>


*/




/* <Col >
                                             <FormGroup>
                                                 <Label htmlFor="default-2" className="form-label">
                                                     Color
                                                 </Label>
                                                 <div className="form-control-wrap">
                                                     <ul className="custom-control-group g-1">
                                                         <li>
                                                             <div className="custom-control color-control">
                                                                 <input
                                                                     type="radio"
                                                                     className="custom-control-input"
                                                                     id="productColor1"
                                                                     name="productColor"
                                                                     defaultChecked={true}
                                                                 />
                                                                 <label
                                                                     className="custom-control-label dot dot-xl"
                                                                     htmlFor="productColor1"
                                                                     style={{ background: "rgb(117, 76, 36)" }}
                                                                 ></label>
                                                             </div>
                                                         </li>
                                                         <li>
                                                             <div className="custom-control color-control">
                                                                 <input type="radio" className="custom-control-input" id="productColor2" name="productColor" />
                                                                 <label
                                                                     className="custom-control-label dot dot-xl"
                                                                     htmlFor="productColor2"
                                                                     style={{ background: "rgb(99, 99, 99)" }}
                                                                 ></label>
                                                             </div>
                                                         </li>
                                                         <li>
                                                             <div className="custom-control color-control checked">
                                                                 <input type="radio" className="custom-control-input" id="productColor3" name="productColor" />
                                                                 <label
                                                                     className="custom-control-label dot dot-xl"
                                                                     htmlFor="productColor3"
                                                                     style={{ background: "rgb(186, 110, 212)" }}
                                                                 ></label>
                                                             </div>
                                                         </li>
                                                         <li>
                                                             <div className="custom-control color-control">
                                                                 <input type="radio" className="custom-control-input" id="productColor4" name="productColor" />
                                                                 <label
                                                                     className="custom-control-label dot dot-xl"
                                                                     htmlFor="productColor4"
                                                                     style={{ background: "rgb(255, 135, 163)" }}
                                                                 ></label>
                                                             </div>
                                                         </li>
                                                         <li>
                                                             <div className="custom-control color-control">
                                                                 <input type="radio" className="custom-control-input" id="productColor5" name="productColor" />
                                                                 <label className="custom-control-label dot dot-xl bg-danger" htmlFor="productColor5"></label>
                                                             </div>
                                                         </li>
                                                         <li>
                                                             <div className="custom-control color-control">
                                                                 <input type="radio" className="custom-control-input" id="productColor6" name="productColor" />
                                                                 <label className="custom-control-label dot dot-xl bg-indigo" htmlFor="productColor6"></label>
                                                             </div>
                                                         </li>
                                                         <li>
                                                             <div className="custom-control color-control">
                                                                 <input type="radio" className="custom-control-input" id="productColor7" name="productColor" />
                                                                 <label className="custom-control-label dot dot-xl bg-info" htmlFor="productColor7"></label>
                                                             </div>
                                                         </li>
                                                         <li>
                                                             <div className="custom-control color-control">
                                                                 <input type="radio" className="custom-control-input" id="productColor8" name="productColor" />
                                                                 <label className="custom-control-label dot dot-xl bg-warning" htmlFor="productColor8"></label>
                                                             </div>
                                                         </li>
                                                         <li>
                                                             <div className="custom-control color-control">
                                                                 <input type="radio" className="custom-control-input" id="productColor9" name="productColor" />
                                                                 <label className="custom-control-label dot dot-xl bg-teal" htmlFor="productColor9"></label>
                                                             </div>
                                                         </li>
                                                         <li>
                                                             <div className="custom-control color-control">
                                                                 <input type="radio" className="custom-control-input" id="productColor10" name="productColor" />
                                                                 <label className="custom-control-label dot dot-xl bg-purple" htmlFor="productColor10"></label>
                                                             </div>
                                                         </li>
                                                         <li>
                                                             <div className="custom-control color-control">
                                                                 <input type="radio" className="custom-control-input" id="productColor11" name="productColor" />
                                                                 <label className="custom-control-label dot dot-xl bg-pink" htmlFor="productColor11"></label>
                                                             </div>
                                                         </li>
                                                     </ul>
                                                 </div>

                                             </FormGroup>
</Col>*/

