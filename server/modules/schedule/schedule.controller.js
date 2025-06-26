const { isEmpty, head, isUndefined } = require('lodash');
const jwt = require('jsonwebtoken');
const ObjectId = require('mongodb').ObjectID;
const moment = require('moment');
const CronJob = require('cron').CronJob;
const NodeGeocoder = require('node-geocoder');

const DataAccess = require('../../helpers/DataAccess');
const Schedule = require('../schedule/schedule.model.js');
const RoutePlanModel = require('../routePlan/routePlan.model');
const Audit = require('../audit/audit.model.js');
const Notes = require('../notes/notes.model.js');
const Config = require('../../config/config');
const ConvertDate = require('../../config/dateutil');
const { getCurrentUserInfo } = require('../shared/shared.controller');
const { getLocationName } = require('../shared/shared.model');
const { getPermissions } = require('../group/group.model');

// color code of schedule list based on type (mobile app)
const schedule_FA_color = '#9c27b0'; // '#5d6d7e'; //'#ff9800';
const schedule_TASK_color = '#ff9800'; // '#2196f3'; //'#2196f3';
const schedule_MEETING_color = '#4caf50'; // '#FA8072';


// icons of schedule list based on status(mobile app)
const schedule_inProgress_Icon = 'fa-spinner';
const schedule_cancelled_Icon = 'fa-times';
const schedule_not_started_Icon = 'fa-clock-o';
const schedule_overDue_Icon = 'fa-exclamation-triangle';
const schedule_completed_Icon = 'fa-check-circle-o';

// status icons for schedul details (mobile app)
const schedule_inProgress_Icon_mobile = 'refresh-circle';
const schedule_not_started_Icon_mobile = 'clock';
const schedule_overDue_Icon_mobile = 'alert';
const schedule_completed_Icon_mobile = 'done-all';

// icon color of schedule list based on icon(mobile app)
const schedule_inProgress_Icon_color = '#0000cd';
const schedule_not_started_Icon_color = '#d3d3d3';
const schedule_overDue_Icon_color = '#ff0000';
const schedule_completed_Icon_color = '#90EE90';

// mobile list: icons based on category
const schedule_FA_icon = 'map';
const schedule_email_icon = 'mail';
const schedule_meeting_icon = 'people';
const schedule_TODO_icon = 'clipboard';
const schedule_call_icon = 'call';


const isCurrentUserScheduleOwner = (loggedUser, schedule) => { return JSON.stringify(loggedUser._id) === JSON.stringify(schedule.created_by) ? 1 : 0; };

const gdistance = (latitude1, longitude1, latitude2, longitude2, radius) => {
    if (!latitude1 || !longitude1 || !latitude2 || !longitude2) {
        return null;
    }

    const lat1 = Number(latitude1);
    const lon1 = Number(longitude1);
    const lat2 = Number(latitude2);
    const lon2 = Number(longitude2);

    radius = (radius === undefined) ? 6371e3 : Number(radius);

    var R = radius;
    var φ1 = (lat1 * Math.PI / 180),
        λ1 = (lon1 * Math.PI / 180);
    var φ2 = (lat2 * Math.PI / 180),
        λ2 = (lon2 * Math.PI / 180);
    var Δφ = φ2 - φ1;
    var Δλ = λ2 - λ1;

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    var d = R * c; // Meters
    var d2 = d / 1000; // Meters to KM
    return d2;
};

const getCardIcon = (key) => {
    let card_icon;
    if (key == '5addcaeb4a3802c94e2fba60') {
        card_icon = schedule_FA_icon;
    } else if (key == '5addcb084a3802c94e2fba62') {
        card_icon = schedule_call_icon;
    } else if (key == '5addcb0d4a3802c94e2fba63') {
        card_icon = schedule_email_icon;
    } else if (key == '5addcb184a3802c94e2fba64') {
        card_icon = schedule_TODO_icon;
    } else if (key == '5afa9c9a68062170124f93d6') {
        card_icon = schedule_meeting_icon;
    } else if (key == '5afa9ca368062170124f93d7') {
        card_icon = schedule_meeting_icon;
    } else if (key == '5addcb014a3802c94e2fba61') {
        card_icon = schedule_FA_icon;
    } else if (key == '5b3d9db215789cbb6768175c') {
        card_icon = schedule_FA_icon;
    } else if (key == '5b3d9dc615789cbb6768175d') {
        card_icon = schedule_FA_icon;
    } else if (key == '5a8eb11662a646e65f27a500' || key == '5b6184d9c60a5e49ade7ef1b') {
        card_icon = schedule_completed_Icon;
    } else if (key == '5a8eb10b62a646e65f27a4ff') {
        card_icon = schedule_inProgress_Icon;
    } else if (key == '5a8eb11e62a646e65f27a501') {
        card_icon = schedule_not_started_Icon;
    } else if (key == '5af09ba1c94cc441b55524f2') {
        card_icon = schedule_overDue_Icon;
    }

    return card_icon;
};

const getCardColor = (type) => {
    let card_color;
    if (type == '5a93a2c4152426c79f4bbdc5') {
        card_color = schedule_FA_color;
    } else if (type == '5aab8d4a9eaf9bce829b5c3c') {
        card_color = schedule_TASK_color;
    } else if (type == '5afbd730fc9609813663b0c2') {
        card_color = schedule_MEETING_color;
    }
    return card_color;
};

const getStatusIcon = (status) => {
    let status_icon;
    if (status == '5a8eb11662a646e65f27a500' || status == '5b6184d9c60a5e49ade7ef1b') {
        status_icon = schedule_completed_Icon;
    } else if (status == '5a8eb10b62a646e65f27a4ff') {
        status_icon = schedule_inProgress_Icon;
    } else if (status == '5a8eb11e62a646e65f27a501') {
        status_icon = schedule_not_started_Icon;
    } else if (status == '5af09ba1c94cc441b55524f2') {
        status_icon = schedule_overDue_Icon;
    }
    return status_icon;
};

const getStatusIcon_MobileApp = (status) => {
    let status_icon_mobile;
    if (status == '5a8eb11662a646e65f27a500' || status == '5b6184d9c60a5e49ade7ef1b') {
        status_icon_mobile = schedule_completed_Icon_mobile;
    } else if (status == '5a8eb10b62a646e65f27a4ff') {
        status_icon_mobile = schedule_inProgress_Icon_mobile;
    } else if (status == '5a8eb11e62a646e65f27a501') {
        status_icon_mobile = schedule_not_started_Icon_mobile;
    } else if (status == '5af09ba1c94cc441b55524f2') {
        status_icon_mobile = schedule_overDue_Icon_mobile;
    }
    return status_icon_mobile;
};

const getCardPriority = (priority) => {
    let card_priority;
    if (!isEmpty(priority)) {
        if (priority == '5a8eb09762a646e65f27a4fb') {
            card_priority = 'H';
        } else if (priority == '5a8eb0a262a646e65f27a4fc') {
            card_priority = 'M';
        } else if (priority == '5a8eb0ab62a646e65f27a4fd') {
            card_priority = 'L';
        } else if (priority == '5be92836070340cfe2e23032') {
            card_priority = 'H';
        } else if (priority == '5be92841070340cfe2e23033') {
            card_priority = 'M';
        } else if (priority == '5be9284a070340cfe2e23034') {
            card_priority = 'L';
        } else {
            card_priority = 'M';
        }
    } else {
        card_priority = '';
    }
    return card_priority;
};

const getCardIconColor = (key) => {
    let card_icon_color;
    if (key == '5a8eb11662a646e65f27a500' || key == '5b6184d9c60a5e49ade7ef1b') {
        card_icon_color = schedule_completed_Icon_color;
    } else if (key == '5a8eb10b62a646e65f27a4ff') {
        card_icon_color = schedule_inProgress_Icon_color;
    } else if (key == '5a8eb11e62a646e65f27a501') {
        card_icon_color = schedule_not_started_Icon_color;
    } else if (key == '5af09ba1c94cc441b55524f2' || key == "5db2cb63b612365bf1c30793") {
        card_icon_color = schedule_overDue_Icon_color;
    }
    return card_icon_color;
};

const setPermissions = async (loggedUser, schedule) => {
    schedule.permissions = {
        canDelete: false
    };
    if (schedule.status == '5a8eb11e62a646e65f27a501') {
        schedule.permissions = {
            canDelete: true
        };
    }
    if (loggedUser && loggedUser.group.indexOf('admin') != -1) {
        if (schedule.status == '5a8eb10b62a646e65f27a4ff' ||
            schedule.status == '5a8eb11662a646e65f27a500' ||
            schedule.status == '5af09ba1c94cc441b55524f2') {
            schedule.permissions = {
                canDelete: true
            };
        }
    }
};

function getDatesForMobileCalenderMarkers(startDate, endDate) {
    var dateArray = [];
    var currentDate = moment(startDate);
    var stopDate = moment(endDate);
    while (currentDate <= stopDate) {
        let date = moment(currentDate).format('YYYY-MM-DD')
        dateArray.push({ d: date, color: '#1A5276' })
        currentDate = moment(currentDate).add(1, 'days');
    }
    return dateArray;
}

const listAll = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const page = req.query.page;
        const limit = req.query.limit;
        Schedule.all(page, limit, currentLoggedUser)
            .then((result) => {
                if (isEmpty(result)) {
                    res.status(404).json({ message: 'No data found', status: 404 });
                } else {
                    res.json(result, 200, next);
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};


const MobileShowMarkers = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        console.log('mobile list req: ', 'params =>: ', req.query, ' :: body =>: ', req.body);
        const result = await Schedule.showMarkers(req.body, currentLoggedUser)
        res.json({ 'total data': result.length, data: result }, 200, next);
    } catch (error) {
        next(error);
    }
};

const mobileList = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        console.log('mobile list req: ', 'params =>: ', req.query, ' :: body =>: ', req.body);
        const result = await Schedule.mobileList(req.query, req.body, currentLoggedUser)

        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            let markers = [];
            result.forEach(currentElement => {
                if (!isEmpty(currentElement.associatedWith_customer_details)) {
                    currentElement.associated_with = currentElement.associatedWith_customer_details[0].customer_name;
                } else if (!isEmpty(currentElement.associatedWith_lead_details)) {
                    currentElement.associated_with = currentElement.associatedWith_lead_details[0].lead_name;
                } else if (!isEmpty(currentElement.associatedWith_contact_details)) {
                    currentElement.associated_with = currentElement.associatedWith_contact_details[0].contact_name;
                } else if (!isEmpty(currentElement.associatedWith_scheduler_details)) {
                    currentElement.associated_with = currentElement.associatedWith_scheduler_details[0].subject;
                } else if (!isEmpty(currentElement.associatedWith_supplier_details)) {
                    currentElement.associated_with = currentElement.associatedWith_supplier_details[0].supplier_name;
                } else if (!isEmpty(currentElement.associatedWith_dealer_details)) {
                    currentElement.associated_with = currentElement.associatedWith_dealer_details[0].name;
                }

                if (currentElement.start_date) { currentElement.start_date = ConvertDate.getDateMonthYearTime(currentElement.start_date); /* currentElement.start_date = moment(currentElement.start_date).toString(); */ }
                if (currentElement.end_date) { currentElement.end_date = ConvertDate.getDateMonthYearTime(currentElement.end_date); /* currentElement.end_date = moment(currentElement.end_date).toString(); */ }
                if (currentElement.due_date) { currentElement.due_date = ConvertDate.getDateMonthYearTime(currentElement.due_date);  /* currentElement.due_date = moment(currentElement.due_date).toString(); */ }
                if (currentElement.visit_date) { currentElement.visit_date = ConvertDate.getDateMonthYearTime(currentElement.visit_date); /* currentElement.visit_date = moment(currentElement.visit_date).toString(); */ }
                if (currentElement.call_start_date) { currentElement.call_start_date = ConvertDate.getDateMonthYearTime(currentElement.call_start_date); /* currentElement.call_start_date = moment(currentElement.call_start_date).toString(); */ }
                if (currentElement.meeting_date) { currentElement.meeting_date = ConvertDate.getDateMonthYearTime(currentElement.meeting_date); /* currentElement.meeting_date = moment(currentElement.meeting_date).toString(); */ }
                if (currentElement.deadline) { currentElement.deadline = ConvertDate.getDateMonthYearTime(currentElement.deadline); /* currentElement.deadline = moment(currentElement.deadline).toString(); */ }

                if (currentElement.due_date) {
                    currentElement.start_date = currentElement.due_date;
                    currentElement.end_date = currentElement.due_date;
                }
                if (currentElement.call_start_date) {
                    currentElement.start_date = currentElement.call_start_date;
                    currentElement.end_date = currentElement.call_start_date;
                }
                if (currentElement.visit_date) {
                    currentElement.start_date = currentElement.visit_date;
                    currentElement.end_date = currentElement.visit_date;
                }
                if (currentElement.meeting_date) {
                    currentElement.start_date = currentElement.meeting_date;
                    currentElement.end_date = currentElement.deadline;
                }

                // currentElement.allDates = ConvertDate.getDates(currentElement.start_date, currentElement.end_date);
                let allDates = getDatesForMobileCalenderMarkers(currentElement.start_date, currentElement.end_date);
                markers = [...markers, ...allDates]

                delete currentElement.assignee_details;
                delete currentElement.associatedWith_customer_details;
                delete currentElement.associatedWith_dealer_details;
                delete currentElement.associatedWith_lead_details, delete currentElement.associatedWith_contact_details;
                delete currentElement.associatedWith_scheduler_details, delete currentElement.associatedWith_supplier_details;

            });
            const uniqueMarkers = getUniqueMarkers(markers);
            res.json(
                {
                    markers: uniqueMarkers,
                    'total data': result.length,
                    data: result
                },
                200, next
            );
        }
    } catch (error) {
        next(error)
    }

};


// filter (used for list as well. list api is not used anywhere) 
const filter = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await Schedule.filter(req.body, currentLoggedUser);
        if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
            result[0].data.forEach(currentElement => {
                currentElement.checked_in_message = [];
                if (currentElement.checkIn_audit_details && currentElement.location && currentElement.type_name === "Field Activity") {
                    const checkedInDetails = getCheckedInRequiredDetails(currentElement.location, currentElement.checkIn_audit_details);
                    currentElement.checked_in_message = checkedInDetails;
                }
                setPermissions(currentLoggedUser, currentElement);
                currentElement.isOwner = isCurrentUserScheduleOwner(currentLoggedUser, currentElement);
                currentElement.card_priority = getCardPriority(currentElement.priority);
                currentElement.card_icon_color = getCardIconColor(currentElement.status);


                if (!isEmpty(currentElement.associatedWith_customer_details)) {
                    currentElement.associated_with_details = currentElement.associatedWith_customer_details;
                } else if (!isEmpty(currentElement.associatedWith_lead_details)) {
                    currentElement.associated_with_details = currentElement.associatedWith_lead_details;
                } else if (!isEmpty(currentElement.associatedWith_contact_details)) {
                    currentElement.associated_with_details = currentElement.associatedWith_contact_details;
                } else if (!isEmpty(currentElement.associatedWith_scheduler_details)) {
                    currentElement.associated_with_details = currentElement.associatedWith_scheduler_details;
                } else if (!isEmpty(currentElement.associatedWith_supplier_details)) {
                    currentElement.associated_with_details = currentElement.associatedWith_supplier_details;
                }

                if (!isEmpty(currentElement.associated_with_details)) {
                    if (currentElement.associated_with_details[0].lead_name) {
                        currentElement.associated_with = currentElement.associated_with_details[0].lead_name;
                    } else if (currentElement.associated_with_details[0].customer_name) {
                        currentElement.associated_with = currentElement.associated_with_details[0].customer_name;
                    } else if (currentElement.associated_with_details[0].contact_name) {
                        currentElement.associated_with = currentElement.associated_with_details[0].contact_name;
                    } else if (currentElement.associated_with_details[0].subject) {
                        currentElement.associated_with = currentElement.associated_with_details[0].subject;
                    } else if (currentElement.associated_with_details[0].supplier_name) {
                        currentElement.associated_with = currentElement.associated_with_details[0].supplier_name;
                    }
                }

                if (currentElement.start_date) { currentElement.start_date = ConvertDate.getDateMonthYearTime(currentElement.start_date); }
                if (currentElement.end_date) { currentElement.end_date = ConvertDate.getDateMonthYearTime(currentElement.end_date); }
                if (currentElement.due_date) { currentElement.due_date = ConvertDate.getDateMonthYearTime(currentElement.due_date); }
                if (currentElement.visit_date) { currentElement.visit_date = ConvertDate.getDateMonthYearTime(currentElement.visit_date); }
                if (currentElement.call_start_date) { currentElement.call_start_date = ConvertDate.getDateMonthYearTime(currentElement.call_start_date); }
                if (currentElement.meeting_date) { currentElement.meeting_date = ConvertDate.getDateMonthYearTime(currentElement.meeting_date); }
                if (currentElement.deadline) { currentElement.deadline = ConvertDate.getDateMonthYearTime(currentElement.deadline); }

                if (currentElement.meeting_date) {
                    currentElement.start_date = currentElement.meeting_date;
                    currentElement.end_date = currentElement.deadline;
                }
                if (currentElement.due_date) {
                    currentElement.start_date = currentElement.due_date;
                    currentElement.end_date = currentElement.due_date;
                }
                if (currentElement.call_start_date) {
                    currentElement.start_date = currentElement.call_start_date;
                    currentElement.end_date = currentElement.call_start_date;
                }
                if (currentElement.visit_date) {
                    currentElement.start_date = currentElement.visit_date;
                    currentElement.end_date = currentElement.visit_date;
                }


                delete currentElement.assignee_details;
                delete currentElement.created_by_details;
                delete currentElement.schedule_types;
                delete currentElement.associatedWith_customer_details;
                delete currentElement.associatedWith_lead_details;
                delete currentElement.associatedWith_supplier_details;
                delete currentElement.associatedWith_contact_details;
                delete currentElement.status_details;
                delete currentElement.associated_with_details;
                delete currentElement.associatedWith_scheduler_details;
                delete currentElement.checkIn_audit_details;

            });

            let response = {
                data: result[0].data,
                total: result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0
            };
            res.json(response, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

/* const checkIn = (req, res, next) => {

    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        req.body.status = '5a8eb11662a646e65f27a500';
        const latitude = req.body.lat;
        const longitude = req.body.lng;
        getLocationName(latitude, longitude).then((data) => {
            Schedule.updateScheduleStatus(req.params.id, req.body, currentLoggedUser, data[0].formattedAddress, latitude, longitude)
                .then(result => {
                    if (result > 0) {
                        res.json({ message: 'Status has been updated successfully!', status: 200 });
                    } else {
                        res.json({ message: 'no updates, nothing to change' });
                    }
                })
                .catch(e => next(e));
        });
    }).catch(e => next(e));
}; */


const checkIn = async (req, res, next) => {

    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const getLocation = await getLocationName(req.body.lat, req.body.lng)
        console.log('location: ', getLocation);
        const result = await Schedule.updateScheduleStatus(req.params.id, req.body, currentLoggedUser, !isUndefined(getLocation[0]) ? getLocation[0].formattedAddress : null)
        if (result > 0) {
            res.json({ message: 'Status has been updated successfully!!!', status: 200 });
        } else {
            res.json({ message: 'No updates, Nothing to change' });
        }
    } catch (error) {
        next(error)
    }
};



const details = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        Schedule.findById(req.params.id)
            .then((result) => {
                if (isEmpty(result)) {
                    res.status(404).json({ message: 'No data found', status: 404 });
                } else {
                    result.forEach(element => {
                        // console.log('ELEMENT: ', element);

                        setPermissions(currentLoggedUser, element);

                        element.isOwner = isCurrentUserScheduleOwner(currentLoggedUser, element);
                        // element.isDelete = element.type == '5aab8d4a9eaf9bce829b5c3c' ? 0 : 1;
                        element.isDelete = 1;
                        element.card_color = getCardColor(element.type);
                        element.card_icon = getCardIcon(element.category);
                        element.status_icon = getStatusIcon(element.status);
                        element.mobile_status_icon = getStatusIcon_MobileApp(element.status);

                        element.type_name = element.schedule_types[0].type;
                        if (JSON.stringify(element.category_tag)) {
                            if (element.schedule_types[0].tags !== undefined) {
                                element.schedule_types[0].tags.forEach(tag => {
                                    if (JSON.stringify(element.category_tag) == JSON.stringify(tag._id)) {
                                        element.category_name = element.category_types[0].category + ' ' + tag.name;
                                    }
                                });
                            } else {
                                element.category_name = element.category_types[0].category;
                            }
                        } else {
                            element.category_name = element.category_types[0].category;
                        }

                        if (!isEmpty(element.priority_details)) { element.priority_name = element.priority_details[0].priority; }
                        if (!isEmpty(element.status_details)) { element.status_name = element.status_details[0].type; }
                        element.created_by = element.task_creator_details[0].first_name + ' ' + element.task_creator_details[0].last_name;
                        element.created_at = ConvertDate.getDateMonthYearTime(element.created_at); // = convertDate(element.created_at);

                        if (element.start_date) { element.start_date = ConvertDate.getDateMonthYearTime(element.start_date); /* currentElement.start_date = moment(currentElement.start_date).toString(); */ }
                        if (element.end_date) { element.end_date = ConvertDate.getDateMonthYearTime(element.end_date); /* currentElement.end_date = moment(currentElement.end_date).toString(); */ }
                        if (element.due_date) { element.due_date = ConvertDate.getDateMonthYearTime(element.due_date);  /* currentElement.due_date = moment(currentElement.due_date).toString(); */ }
                        if (element.visit_date) { element.visit_date = ConvertDate.getDateMonthYearTime(element.visit_date); /* currentElement.visit_date = moment(currentElement.visit_date).toString(); */ }
                        if (element.call_start_date) { element.call_start_date = ConvertDate.getDateMonthYearTime(element.call_start_date); /* currentElement.call_start_date = moment(currentElement.call_start_date).toString(); */ }
                        if (element.meeting_date) { element.meeting_date = ConvertDate.getDateMonthYearTime(element.meeting_date); /* currentElement.meeting_date = moment(currentElement.meeting_date).toString(); */ }
                        if (element.deadline) { element.deadline = ConvertDate.getDateMonthYearTime(element.deadline); /* currentElement.deadline = moment(currentElement.deadline).toString(); */ }


                        if (!isEmpty(element.associatedWith_customer_details)) {
                            element.associated_with_details = element.associatedWith_customer_details;
                            element.associated_with_name = element.associated_with_details.customer_name;
                        } else if (!isEmpty(element.associatedWith_lead_details)) {
                            element.associated_with_details = element.associatedWith_lead_details;
                            element.associated_with_name = element.associated_with_details.lead_name;
                        } else if (!isEmpty(element.associatedWith_contact_details)) {
                            element.associated_with_details = element.associatedWith_contact_details;
                            element.associated_with_name = element.associated_with_details.contact_name;
                        } else if (!isEmpty(element.associatedWith_scheduler_details)) {
                            element.associated_with_details = element.associatedWith_scheduler_details;
                            element.associated_with_name = element.associatedWith_scheduler_details.subject;
                        } else if (!isEmpty(element.associatedWith_supplier_details)) {
                            element.associated_with_details = element.associatedWith_supplier_details;
                            element.associated_with_name = element.associatedWith_supplier_details.supplier_name;
                        } else if (!isEmpty(element.associatedWith_dealer_details)) {
                            element.associated_with_details = element.associatedWith_dealer_details;
                            element.associated_with_name = element.associatedWith_dealer_details.name;
                        }

                        if (!isEmpty(element.associated_with_details)) {
                            if (element.associated_with_details[0].lead_name) {
                                element.associated_with_name = element.associated_with_details[0].lead_name;
                            } else if (element.associated_with_details[0].customer_name) {
                                element.associated_with_name = element.associated_with_details[0].customer_name;
                            } else if (element.associated_with_details[0].contact_name) {
                                element.associated_with_name = element.associated_with_details[0].contact_name;
                            } else if (element.associated_with_details[0].subject) {
                                element.associated_with_name = element.associated_with_details[0].subject;
                            } else if (element.associated_with_details[0].supplier_name) {
                                element.associated_with_name = element.associated_with_details[0].supplier_name;
                            } else if (element.associated_with_details[0].name) {
                                element.associated_with_name = element.associated_with_details[0].name;
                            }
                        }

                        let deliverable = [];
                        if (element.deliverables) {
                            let DeliverablesUser = [];
                            element.deliverables.forEach(element => {
                                DeliverablesUser.push(element.userId);
                            });
                            element.assignee_details.forEach(ele => {

                                if (JSON.stringify(DeliverablesUser).indexOf(JSON.stringify(ele._id)) != -1) {
                                } else {
                                    let roleArray = [];
                                    let ACLArray = [];
                                    for (let i = 0; i < ele.role_access_reports_mapping.length; i += 1) {
                                        const roleDetails = result[0].assignee_role_details.find((resp) => { return resp._id == ele.role_access_reports_mapping[i].role; });
                                        if (roleDetails) { roleArray.push(roleDetails.role); }

                                        const ACLDetails = result[0].assignee_access_level_details.find((resp) => { return resp._id == ele.role_access_reports_mapping[i].access_level; });
                                        if (ACLDetails) { ACLArray.push(ACLDetails.access_level); }
                                    }
                                    deliverable.push({ role: roleArray, access_level: ACLArray, department: ele.department, userId: ele._id, name: ele.first_name + ' ' + ele.last_name, deliverable_title: '', deliverable_description: '', deliverable_date: '', deliverable_status: '', deliverable_priority: '', deliverable_icon: 'add' });
                                }
                            });

                            element.deliverables.forEach((ele) => {
                                const singleDeliverable = element.deliverable_task_details.find((task) => {
                                    return JSON.stringify(task._id) == JSON.stringify(ele.scheduleId);
                                });
                                if (singleDeliverable) {
                                    singleDeliverable.userId = ele.userId;
                                    singleDeliverable.deliverable_title = singleDeliverable.subject;
                                    singleDeliverable.deliverable_description = singleDeliverable.description;
                                    singleDeliverable.deliverable_date = ConvertDate.getDateMonthYearTime(singleDeliverable.due_date);
                                    singleDeliverable.deliverable_time = singleDeliverable.due_time;
                                    singleDeliverable.deliverable_status = singleDeliverable.status;
                                    singleDeliverable.deliverable_priority = singleDeliverable.priority;
                                    singleDeliverable.scheduleId = singleDeliverable._id;
                                    delete singleDeliverable.subject, delete singleDeliverable.type, delete singleDeliverable.category;
                                    delete singleDeliverable.description, delete singleDeliverable.associated_with, delete singleDeliverable.associated_radio_with;
                                    delete singleDeliverable.deleted, delete singleDeliverable.deliverable_task, delete singleDeliverable.due_date;
                                    delete singleDeliverable._id, delete singleDeliverable.created_at, delete singleDeliverable.created_by;
                                    delete singleDeliverable.status, delete singleDeliverable.priority;
                                    deliverable.push(singleDeliverable);
                                }
                            });
                            element.assignee_name = deliverable.slice();

                            element.assignee_name.forEach((ele) => {

                                const statuDetails = result[0].deliverable_status_details.find(status => {
                                    return JSON.stringify(ele.deliverable_status) == JSON.stringify(status._id);
                                });
                                if (statuDetails) {
                                    ele.deliverable_status_name = statuDetails.type;
                                }

                                const priorityDetails = result[0].deliverable_priority_details.find(priority => {
                                    return JSON.stringify(ele.deliverable_priority) == JSON.stringify(priority._id);
                                });
                                if (priorityDetails) {
                                    ele.deliverable_priority_name = priorityDetails.priority;
                                }

                                let ass5bc591508533a06d9a0257a0ignedToArray = {};
                                if (ele.assigned_to) {
                                    for (let i = 0; i < ele.assigned_to.length; i += 1) {
                                        const singleDeliverable = element.deliverable_task_assignedTo_details.find((task) => {
                                            return JSON.stringify(task._id) == JSON.stringify(ele.assigned_to[i]);
                                        });

                                        if (singleDeliverable) {
                                            ele.name = singleDeliverable.first_name + ' ' + singleDeliverable.last_name;
                                            let roleArray = [];
                                            let ACLArray = [];
                                            for (let i = 0; i < singleDeliverable.role_access_reports_mapping.length; i += 1) {
                                                const roleDetails = element.role_details.find((resp) => {
                                                    return resp._id == singleDeliverable.role_access_reports_mapping[i].role;
                                                });
                                                if (roleDetails) {
                                                    roleArray.push(roleDetails.role);
                                                }

                                                const ACLDetails = element.access_level_details.find((resp) => {
                                                    return resp._id == singleDeliverable.role_access_reports_mapping[i].access_level;
                                                });
                                                if (ACLDetails) {
                                                    ACLArray.push(ACLDetails.access_level);
                                                }
                                            }
                                            ele.role = roleArray;
                                            ele.access_level = ACLArray;
                                            ele.department = singleDeliverable.department;
                                            ele.deliverable_icon = 'create';

                                        }
                                    }
                                }
                            });

                        } else {
                            let assignees_names = [];
                            element.assigned_to.forEach(user => {
                                const userNames = element.assignee_details.find((resp) => {
                                    return JSON.stringify(user) == JSON.stringify(resp._id);
                                });
                                if (userNames) {
                                    assignees_names.push({ id: userNames._id, name: userNames.first_name + ' ' + userNames.last_name, deliverable_title: '', deliverable_description: '', deliverable_date: '', deliverable_status: '', deliverable_priority: '', deliverable_icon: 'add' });
                                }
                            });
                            element.assignee_name = assignees_names;
                        }

                        if (!isEmpty(element.linked_schedule)) {
                            element.linked_schedule.forEach(linkedSchedule => {

                                linkedSchedule.card_color = getCardColor(linkedSchedule.type);
                                linkedSchedule.card_icon = getCardIcon(linkedSchedule.category);
                                // linkedSchedule.card_icon_color = getCardIconColor(linkedSchedule.status);

                                const linkedScheduleType = element.linked_schedule_typeDetails.find((scheduletypeDetails) => {
                                    return JSON.stringify(linkedSchedule.type) == JSON.stringify(scheduletypeDetails._id);
                                });
                                if (linkedScheduleType) {
                                    linkedSchedule.type_name = linkedScheduleType.type;
                                }

                                const linkedScheduleCategory = element.linked_schedule_categoryDetails.find((scheduleCategoryDetails) => {
                                    return JSON.stringify(linkedSchedule.category) == JSON.stringify(scheduleCategoryDetails._id);
                                });
                                if (linkedScheduleCategory) {
                                    linkedSchedule.category_name = linkedScheduleCategory.category;
                                }

                                let linkedAssignedTo = [];
                                linkedSchedule.assigned_to.forEach(assignedToEle => {
                                    const linkedScheduleAssignedTo = element.linked_schedule_assignedToDetails.find((assignedToDetails) => {

                                        return JSON.stringify(assignedToEle) == JSON.stringify(assignedToDetails._id);
                                    });

                                    if (linkedScheduleAssignedTo) {
                                        linkedAssignedTo.push({ id: assignedToEle, name: linkedScheduleAssignedTo.first_name + ' ' + linkedScheduleAssignedTo.last_name });
                                    }
                                });
                                linkedSchedule.assigned_to = linkedAssignedTo;

                                if (linkedSchedule.start_date) { linkedSchedule.start_date = ConvertDate.getDateMonthYearTime(linkedSchedule.start_date); /* currentElement.start_date = moment(currentElement.start_date).toString(); */ }
                                if (linkedSchedule.end_date) { linkedSchedule.end_date = ConvertDate.getDateMonthYearTime(linkedSchedule.end_date); /* currentElement.end_date = moment(currentElement.end_date).toString(); */ }
                                if (linkedSchedule.due_date) { linkedSchedule.due_date = ConvertDate.getDateMonthYearTime(linkedSchedule.due_date);  /* currentElement.due_date = moment(currentElement.due_date).toString(); */ }
                                if (linkedSchedule.visit_date) { linkedSchedule.visit_date = ConvertDate.getDateMonthYearTime(linkedSchedule.visit_date); /* currentElement.visit_date = moment(currentElement.visit_date).toString(); */ }
                                if (linkedSchedule.call_start_date) { linkedSchedule.call_start_date = ConvertDate.getDateMonthYearTime(linkedSchedule.call_start_date); /* currentElement.call_start_date = moment(currentElement.call_start_date).toString(); */ }
                                if (linkedSchedule.meeting_date) { linkedSchedule.meeting_date = ConvertDate.getDateMonthYearTime(linkedSchedule.meeting_date); /* currentElement.meeting_date = moment(currentElement.meeting_date).toString(); */ }
                                if (linkedSchedule.deadline) { linkedSchedule.deadline = ConvertDate.getDateMonthYearTime(linkedSchedule.deadline); /* currentElement.deadline = moment(currentElement.deadline).toString(); */ }

                                if (linkedSchedule.meeting_date) {
                                    linkedSchedule.start_date = linkedSchedule.meeting_date;
                                    linkedSchedule.end_date = linkedSchedule.deadline;
                                }
                                if (linkedSchedule.due_date) {
                                    linkedSchedule.start_date = linkedSchedule.due_date;
                                    linkedSchedule.end_date = linkedSchedule.due_date;
                                }
                                if (linkedSchedule.call_start_date) {
                                    linkedSchedule.start_date = linkedSchedule.call_start_date;
                                    linkedSchedule.end_date = linkedSchedule.call_start_date;
                                }
                                if (linkedSchedule.visit_date) {
                                    linkedSchedule.start_date = linkedSchedule.visit_date;
                                    linkedSchedule.end_date = linkedSchedule.visit_date;
                                }

                                if (!isEmpty(element.linked_schedule_statusDetails)) {
                                    const statusDetails = element.linked_schedule_statusDetails.find((statusInfo) => {
                                        return JSON.stringify(linkedSchedule.status) == JSON.stringify(statusInfo._id);
                                    });

                                    if (statusDetails) {
                                        linkedSchedule.status_name = statusDetails.type;
                                    }
                                }

                                if (!isEmpty(element.linked_schedule_priorityDetails)) {
                                    // linkedSchedule.priority = element.linked_schedule_priorityDetails[0].priority;
                                    const priorityDetails = element.linked_schedule_priorityDetails.find((priorityInfo) => {
                                        return JSON.stringify(linkedSchedule.priority) == JSON.stringify(priorityInfo._id);
                                    });

                                    if (priorityDetails) {
                                        linkedSchedule.priority = priorityDetails.priority;
                                    }
                                }
                            });
                        }

                        if (!isEmpty(element.recurrence_parentSchedule_details)) {
                            element.recurrence_parentSchedule = {
                                _id: element.recurrence_parentSchedule_details[0]._id,
                                subject: element.recurrence_parentSchedule_details[0].subject
                            };
                            // element.recurrence_parentSchedule = recurrenceSchedule;
                        }

                        // if ( element.venue_name) {
                        if (!isEmpty(element.venue_details)) {
                            element.venue_name = {
                                id: element.venue_name,
                                venue_name: element.venue_details[0].venue_title
                            };
                        } else {
                            element.venue_name = {
                                id: '',
                                venue_name: element.venue_name
                            };
                        }

                        // if (element.venue_area) {
                        if (!isEmpty(element.venue_area_details)) {
                            element.venue_area = {
                                id: element.venue_area,
                                venue_area_name: element.venue_area_details[0].area_name
                            };
                        } else {
                            element.venue_area = {
                                id: '',
                                venue_area_name: element.venue_area
                            };
                        }

                        delete element.venue_details, delete element.venue_area_details;
                        delete element.recurrence_parentSchedule_details;
                        delete element.deliverables_user_details;
                        delete element.role_details, delete element.access_level_details, delete element.assignee_role_details, delete element.assignee_access_level_details;
                        delete element.status_details, delete element.priority_details;
                        delete element.schedule_types, delete element.category_types;
                        delete element.assignee_details;
                        delete element.deliverables, delete element.deliverable_status_details, delete element.deliverable_priority_details;
                        delete element.deliverable_task_details, delete element.deliverable_task_assignedTo_details;
                        delete element.associated_with_details, delete element.task_creator_details;
                        delete element.associatedWith_customer_details, delete element.associatedWith_lead_details;
                        delete element.associatedWith_contact_details, delete element.associatedWith_scheduler_details;
                        delete element.associatedWith_supplier_details;
                        delete element.associatedWith_dealer_details;
                        // if (isEmpty(element.linked_schedule)) { delete element.linked_schedule; }
                        if (element.linked_schedule_typeDetails) { delete element.linked_schedule_typeDetails; }
                        if (element.linked_schedule_categoryDetails) { delete element.linked_schedule_categoryDetails; }
                        if (element.linked_schedule_assignedToDetails) { delete element.linked_schedule_assignedToDetails; }
                        if (element.linked_schedule_statusDetails) { delete element.linked_schedule_statusDetails; }
                        if (element.linked_schedule_priorityDetails) { delete element.linked_schedule_priorityDetails; }
                        //  element.linked_schedule_statusDetails
                        // element.linked_schedule_priorityDetails
                    });



                    res.json(result, 200, next);
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const getByAssignee = (req, res, next) => {
    Schedule.findByAssignee(req.query.getByAssignee)
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const create = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        // req.assert("email", "Email is not valid").isEmail();
        if (req.body.deliverables) {
            req.body.deliverables.forEach(element => {
                element.userId = ObjectId(element.userId);
                element.deliverable_priority = ObjectId(element.deliverable_priority);
                element.deliverable_status = ObjectId(element.deliverable_status);
            });
        }

        let assignee = [];
        for (let index = 0; index < req.body.assigned_to.length; index++) {
            assignee.push(ObjectId(req.body.assigned_to[index]));
        }
        req.body.assigned_to = assignee;

        if (req.body.venue_name && !isEmpty(req.body.venue_name)) {
            if (req.body.venue_name.match(/^[0-9a-fA-F]{24}$/)) {
                req.body.venue_name = ObjectId(req.body.venue_name);
            }
        }
        if (!isEmpty(req.body.venue_area)) { req.body.venue_area = ObjectId(req.body.venue_area); }
        if (!isEmpty(req.body.priority)) { req.body.priority = ObjectId(req.body.priority); }
        if (!isEmpty(req.body.status)) { req.body.status = ObjectId(req.body.status); }
        if (!isEmpty(req.body.type)) { req.body.type = ObjectId(req.body.type); }
        if (!isEmpty(req.body.category)) { req.body.category = ObjectId(req.body.category); }
        if (req.body.due_date) { req.body.due_date = new Date(req.body.due_date); }
        if (req.body.start_date) { req.body.start_date = new Date(req.body.start_date); }
        if (req.body.end_date) { req.body.end_date = new Date(req.body.end_date); }
        if (req.body.visit_date) { req.body.visit_date = new Date(req.body.visit_date); }
        if (req.body.call_start_date) { req.body.call_start_date = new Date(req.body.call_start_date); }
        if (req.body.meeting_date) { req.body.meeting_date = new Date(req.body.meeting_date); }
        if (req.body.deadline) { req.body.deadline = new Date(req.body.deadline); }

        if (isEmpty(req.body.route_plan)) { delete req.body.route_plan; }

        req.body.created_by = ObjectId(currentLoggedUser._id);
        req.body.created_at = new Date();
        const userId = currentLoggedUser._id;
        delete req.body.customer_name;
        const result = await Schedule.create(req.body, userId, req.query, currentLoggedUser)
        console.log('result: ', result);
        if (result !== 0) {
            res.json({ message: 'Schedule created successfully', status: 200, scheduleId: result._id });
        } else {
            res.json({ message: 'Schedule not created successfully', status: 500 });
        }
    } catch (error) {
        next(error)
    }

};

const update = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const id = req.params.id;
        try {


            if (req.body.deliverables) {
                req.body.deliverables.forEach(element => {
                    element.userId = ObjectId(element.userId);
                    element.deliverable_status = ObjectId(element.deliverable_status);
                    element.deliverable_priority = ObjectId(element.deliverable_priority);
                    if (element.scheduleId) { element.scheduleId = ObjectId(element.scheduleId); }
                });
            }

            const assignee = [];
            for (let index = 0; index < req.body.assigned_to.length; index++) {
                assignee.push(ObjectId(req.body.assigned_to[index]));
            }
            req.body.assigned_to = assignee;


            if (req.body.venue_name && !isEmpty(req.body.venue_name)) {
                if (req.body.venue_name.match(/^[0-9a-fA-F]{24}$/)) {
                    req.body.venue_name = ObjectId(req.body.venue_name);
                }
            }
            if (!isEmpty(req.body.venue_area)) { req.body.venue_area = ObjectId(req.body.venue_area); }

            if (req.body.priority) { req.body.priority = ObjectId(req.body.priority); }
            if (req.body.status) { req.body.status = ObjectId(req.body.status); }

            if (req.body.type) { req.body.type = ObjectId(req.body.type); }
            if (req.body.category) { req.body.category = ObjectId(req.body.category); }



            // if (isEmpty(req.body.route_plan)) { delete req.body.route_plan; }


            console.log('CONTROLLER::schedule update:: req body : ', req.body);


            // type = 1 // delete current event,
            // type = 2 // delete current event and following event,
            // type = 3 // delete all recurence event,
        } catch (error) {

        }
        const type = req.query.type;
        const result = await Schedule.update(id, req.body, currentLoggedUser, type)
        if (result == 1) {
            res.json({ message: 'Schedule updated successfully', status: 200, scheduleId: id });
        } else {
            res.json({ message: 'Schedule not updated successfully', status: 500 });
        }
    } catch (error) {
        next(error)
    }
};

const changeScheduleStatus = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        if (!isEmpty(req.body.status)) { req.body.status = ObjectId(req.body.status); }
        console.log('changeScheduleStatus: ', req.body);

        Schedule.updateScheduleStatus(req.params.id, req.body, currentLoggedUser).then(result => {
            res.json(result, 200, next);
        });
    }).catch((e) => next(e));
};

const addNotes = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {

        console.log('NOTES::req: ', req.body);

        const id = req.params.taskId;

        if (req.body.files) {
            let uploadedFile = [];
            req.body.files.forEach(element => {
                uploadedFile.push(ObjectId(element.id));
            });
            req.body.files = uploadedFile;
        }

        if (!isEmpty(req.body.tagged_users)) {
            let t_users = [];
            req.body.tagged_users.forEach(element => {
                t_users.push(ObjectId(element));
            });
            req.body.tagged_users = t_users;
        } else {
            req.body.tagged_users = [];
        }

        req.body.userId = ObjectId(currentLoggedUser._id);
        req.body.date = new Date();

        Notes.addNotes(id, req.body, currentLoggedUser, 'scheduler')
            .then((result) => {
                result[0].notes.forEach(element1 => {
                    result[0].notes_user_details.forEach(element2 => {
                        if (JSON.stringify(element1.userId) == JSON.stringify(element2._id)) {
                            element1.username = element2.first_name + ' ' + element2.last_name;
                        }
                    });
                    let filesDetails = [];
                    if (!isEmpty(element1.files)) {
                        element1.files.forEach(element => {
                            result[0].file_details.forEach(fileElement => {
                                if (JSON.stringify(element) == JSON.stringify(fileElement._id)) {
                                    filesDetails.push({ id: element, file_name: fileElement.file_name, url: Config.imageURL + element });
                                }
                            });
                        });
                        element1.files = filesDetails;
                    }
                });
                res.json(head(result).notes);
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

/* const deleteSchedule = (req, res, next) => {
    const currentLoggedUser = getCurrentUserInfo(req.headers.authorization);
    const id = req.params.id;
    Schedule.deleteById(id, currentLoggedUser)
        .then((result) => {
            if (result == 1) {
                res.json({ message: 'Schedule deleted successfully', status: 200, scheduleId: id });
            } else {
                res.json({ message: 'Schedule not deleted successfully', status: 500 });
            }
        })
        .catch((e) => next(e));
}; */

// recurrence task as well
const deleteSchedule = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const id = req.params.id;
        /* type = 1 // delete current event,
        type = 2 // delete current event and following event,
        type = 3 // delete all recurence event, */
        const type = req.params.type;

        const result = await Schedule.deleteById(id, type, currentLoggedUser);
        if (result == 1) {
            res.json({ message: 'Schedule deleted successfully', status: 200, scheduleId: id });
        } else {
            res.json({ message: 'Schedule not deleted.', status: 500, Error: result });
        }
    } catch (error) {
        next(error);
    }
};

/********************Schedule Types/Fields *********************************************** */
const listAllTaskTypes = (req, res, next) => {

    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {

        Schedule.getTaskTypes(currentLoggedUser)
            .then((result) => {
                // console.log('log: ', result);
                if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                    result.forEach(element => {
                        if (element._id == '5a93a2c4152426c79f4bbdc5') {
                            element.color = schedule_FA_color;
                            // by defalut tag selcetd 0th id
                            // element.categories.forEach(categoryEle => { categoryEle.category = categoryEle.category + ' ' + element.tags[0].name; });
                        } else if (element._id == '5aab8d4a9eaf9bce829b5c3c') {
                            element.color = schedule_TASK_color;
                        } else if (element._id == '5afbd730fc9609813663b0c2') {
                            element.color = schedule_MEETING_color;
                        }


                        element.linked_status_details.forEach((status, i) => {
                            if (status._id == '5af09ba1c94cc441b55524f2') {
                                element.linked_status_details.splice(i, 1);
                            }
                        });


                    });

                    res.json(result, 200, next);
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const scheduleTypeDetails = (req, res, next) => {
    Schedule.scheduleTypeDetails(req.params.id)
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                result.forEach(element => {
                    if (element._id == '5a93a2c4152426c79f4bbdc5') {
                        element.color = schedule_FA_color;
                    } else if (element._id == '5aab8d4a9eaf9bce829b5c3c') {
                        element.color = schedule_TASK_color;
                    } else if (element._id == '5afbd730fc9609813663b0c2') {
                        element.color = schedule_MEETING_color;
                    }

                    // by defalut tag selcetd 0th id
                    // element.categories.forEach(elementCategory => {
                    //     elementCategory.category = elementCategory.category + ' ' + element.tags[0].name;
                    // });

                });
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const listScheduleCategories = (req, res, next) => {
    Schedule.listScheduleCategories()
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                result.forEach(element => {
                    if (!isEmpty(element.schedule_type_details)) { element.schedule_type = element.schedule_type_details[0].type; }
                    delete element.schedule_type_details;
                });
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const listAllTaskFields = (req, res, next) => {
    Schedule.listAllTaskFields()
        .then((result) => {


            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const createTaskTypes = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        req.body.created_by = ObjectId(currentLoggedUser._id);
        req.body.created_at = new Date();
        Schedule.createTaskTypes(req.body)
            .then((result) => {
                res.json(result);
            }).catch(e => next(e));
    }).catch(e => next(e));
};

const createTaskFields = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        req.body.created_by = ObjectId(currentLoggedUser._id);
        req.body.task_type_id = ObjectId(req.body.task_type_id);
        req.body.created_at = new Date();
        Schedule.createTaskFields(req.body)
            .then((result) => {
                res.json(result);
            }).catch(e => next(e));
    }).catch(e => next(e));
};

const schedule_options_list = (req, res, next) => {
    Schedule.getOptionsList(req.body)
        .then((result) => {
            res.json(result);
        })
        .catch(e => next(e));
};

module.exports = {
    listAll,
    mobileList,
    filter,
    details,
    checkIn,
    getByAssignee,
    create,
    update,
    changeScheduleStatus,
    addNotes,
    deleteSchedule,
    listAllTaskTypes,
    scheduleTypeDetails,
    listScheduleCategories,
    listAllTaskFields,
    createTaskTypes,
    createTaskFields,
    schedule_options_list,
    MobileShowMarkers,
};

function getUniqueMarkers(markers) {
    const unique = [];
    const map = new Map();
    for (const item of markers) {
        if (!map.has(item.d)) {
            map.set(item.d, true); // set any value to Map
            unique.push({
                d: item.d,
                color: item.color
            });
        }
    }
    return unique;
}

// Response for checked in details
const getCheckedInRequiredDetails = (scheduleLocationDetails, checkedInLocationDetails) => {
    const [scheduleLat, scheduleLng] = scheduleLocationDetails;
    const result = [];
    checkedInLocationDetails.forEach(detail => {
        const { data: { lat: checkedInLat, long: checkedInLng }, message, date, userName } = detail;
        // Calculate distance
        const distance = calculateDistance(scheduleLat, scheduleLng, checkedInLat, checkedInLng);
        // Format Date
        const formattedDate = ConvertDate.getDateMonthYearTime(date);
        const combinedMessage = `${userName} ${message} on ${formattedDate}`;
        result.push({
            message: combinedMessage,
            distance: distance.toFixed(2)
        });
    });

    return result;
};

// Calculate distace from coordinates
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const toRadians = (degree) => degree * (Math.PI / 180);

    const R = 6371; // Radius of the Earth in km
    const dLat = toRadians(lat2 - lat1);
    const dLon = toRadians(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
};