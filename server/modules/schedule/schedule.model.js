const ObjectId = require('mongodb').ObjectID;
const { isEmpty } = require('lodash');
const Moment = require('moment');

const DataAccess = require('../../helpers/DataAccess');
const { getDayName, getDateMonthYearTime,
    getTodayStartTime,
    getTodayEndTime,
    getWeekFirstDay,
    getWeekLastDay,
    getMonthFirstDay,
    getDates,
    getMonthLastDay, } = require('../../config/dateutil');
const database = require('../../service/database');
const Audit = require('../audit/audit.model.js');
const Notes = require('../notes/notes.model.js');
const acl = require('../../service/acl');
const { deleteNotes } = require('../shared/shared.controller');
const { auditActions, Modules, formatDate } = require('../shared/shared.model');
const Config = require('../../config/config');
const collection_name = 'scheduler';
let mydb;
database.getDb().then(res => { mydb = res; ensureIndex(); });

const collection = (collectionName) => mydb.collection(collectionName);


const ensureIndex = () => {
    let locCollection = collection(collection_name);
    locCollection.ensureIndex("subject", (err, name) => {
        console.log("ensureIndex subject ", err, name);
    });
    locCollection.ensureIndex("start_date", (err, name) => {
        console.log("ensureIndex start_date ", err, name);
    });
    locCollection.ensureIndex("end_date", (err, name) => {
        console.log("ensureIndex end_date ", err, name);
    });
    locCollection.ensureIndex("meeting_date", (err, name) => {
        console.log("ensureIndex meeting_date ", err, name);
    });
    locCollection.ensureIndex("due_date", (err, name) => {
        console.log("ensureIndex due_date ", err, name);
    });
    locCollection.ensureIndex("visit_date", (err, name) => {
        console.log("ensureIndex visit_date ", err, name);
    });
}


const auditUpdateStatusAction = auditActions().change_status;
const auditUpdateAction = auditActions().update;
const auditCreateAction = auditActions().create;
const auditDeleteAction = auditActions().Delete;
const auditLinkAction = auditActions().link;
const auditUnLinkAction = auditActions().unlink;
const shcedulerModule = Modules().shceduler;
const userModule = Modules().user;


const schedule_CardIcons = {
    FA: 'map',
    email: 'mail',
    meeting: 'people',
    todo: 'clipboard',
    call: 'call',
    inProgress: 'fa-spinner',
    notStarted: 'fa-clock-o',
    overdue: 'fa-exclamation-triangle',
    completed: 'fa-check-circle-o',
    cancelled: 'fa-times',
};

const schedule_CardColor = {
    FA: '#9c27b0',
    TASK: '#ff9800',
    MEETING: '#4caf50',
};



let saveSchedulerActivity = (body) => {
    body.date = new Date();
    Audit.addLog(body);
};

const logActivity = (module, action, id, userId, doc, msg) => {
    saveSchedulerActivity({
        module: module,
        action: action,
        documentId: ObjectId(id),
        userId: ObjectId(userId),
        data: doc,
        message: msg
    });
}

const addNote = (module, documentId, notes, user) => {
    console.log('module: ', module);

    try {
        if (isEmpty(notes)) { notes = []; } else {
            notes = [{
                data: notes,
                userId: ObjectId(user),
                date: new Date()
            }];
        }
        const body = {
            module: module,
            documentId: ObjectId(documentId),
            notes: notes
        };
        Notes.create(body);
    } catch (error) {
        console.log('scheduler notes add error: ', error);

    }
};

const DEFAULT_PAGE = 1;
const DEFAULT_LIMIT = 10;

const pageOrDefault = (page) => {
    const result = !page ? DEFAULT_PAGE : parseInt(page);
    return result;
};

const limitOrDefault = (limit) => {
    return !limit ? DEFAULT_LIMIT : parseInt(limit);
};

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


const checkStatusUpdated = async (prevData, id, currentData, loggedUser) => {
    try {
        if (JSON.stringify(prevData.status) != JSON.stringify(currentData.status)) {
            currentData.oldStatus = prevData.status;
            currentData.newStatus = currentData.status;
            currentData.modified_At = new Date();
            logActivity(shcedulerModule, auditUpdateStatusAction, id, loggedUser._id, currentData, 'changed the status from: ')
        }
    } catch (error) {
        throw new Error(error);
    }
};


function auditUpdatedDeatils(loggedUser, id, currentData, prevData) {
    let updatedData = {};
    try {
        if (JSON.stringify(prevData.status) != JSON.stringify(currentData.status)) {
            updatedData.status = currentData.status;
        }
        if (JSON.stringify(prevData.category) != JSON.stringify(currentData.category)) {
            updatedData.category = currentData.category;
        }
        if (currentData.subject != prevData.subject) {
            updatedData.subject = currentData.subject;
        }
        if (currentData.description != prevData.description) {
            updatedData.description = currentData.description;
        }
        if (currentData.start_date && String(currentData.start_date) !== String(prevData.start_date)) {
            updatedData.start_date = currentData.start_date;
        }
        if (currentData.end_date && String(currentData.end_date) !== String(prevData.end_date)) {
            updatedData.end_date = currentData.end_date;
        }
        if (currentData.due_date && String(currentData.due_date) !== String(prevData.due_date)) {
            updatedData.due_date = currentData.due_date;
        }
        if (currentData.meeting_date && String(currentData.meeting_date) !== String(prevData.meeting_date)) {
            updatedData.meeting_date = currentData.meeting_date;
        }
        if (currentData.call_start_date && String(currentData.call_start_date) !== String(prevData.call_start_date)) {
            updatedData.call_start_date = currentData.call_start_date;
        }
        if (currentData.visit_date && String(currentData.visit_date) !== String(prevData.visit_date)) {
            updatedData.visit_date = currentData.visit_date;
        }
        if (currentData.deadline && String(currentData.deadline) !== String(prevData.deadline)) {
            updatedData.deadline = currentData.deadline;
        }
    } catch (error) {
        throw new Error(error)
    } finally {
        currentData.UpdatedData = updatedData;
        logActivity(shcedulerModule, auditUpdateAction, id, loggedUser._id, currentData, 'updated the');
    }
}

// createRecurrenceSchedule
const createRecurrenceSchedule = (length, body, parentScheduleId, userId, frequencyIncrement, options) => {
    let jsondata = [];
    for (let i = 1; i <= length; i++) {

        const json = {
            subject: body.subject,
            description: body.description,
            type: body.type,
            category: body.category,
            category_tag: body.category_tag,
            assigned_to: body.assigned_to,
            associated_with: body.associated_with,
            associated_radio_with: body.associated_radio_with,
            priority: body.priority,
            status: body.status,
            activity: !isEmpty(body.activity) ? body.activity : '',
            recurrence_schedule: 1,
            recurrence_parentSchedule: ObjectId(parentScheduleId),
            created_by: ObjectId(userId),
            created_at: new Date()
        };
        if (body.start_date && body.end_date) {
            json.start_date = new Date(Moment(body.start_date).add(parseInt(i), frequencyIncrement));
            json.end_date = new Date(Moment(body.end_date).add(parseInt(i), frequencyIncrement));
            json.start_time = !isEmpty(body.start_time) ? body.start_time : '';
            json.end_time = !isEmpty(body.end_time) ? body.end_time : '';
            json.location = !isEmpty(body.location) ? body.location : '';
            json.location_radio = !isEmpty(body.location_radio) ? body.location_radio : '';
        } else if (body.visit_date) {
            json.visit_date = new Date(Moment(body.visit_date).add(parseInt(i), frequencyIncrement));
            json.visit_time = !isEmpty(body.visit_time) ? body.visit_time : '';
            json.location = !isEmpty(body.location) ? body.location : '';
            json.location_radio = !isEmpty(body.location_radio) ? body.location_radio : '';
        } else if (body.due_date) {
            json.due_date = new Date(Moment(body.due_date).add(parseInt(i), frequencyIncrement));
            json.due_time = !isEmpty(body.due_time) ? body.due_time : '';
        } else if (body.call_start_date) {
            json.call_start_date = new Date(Moment(body.call_start_date).add(parseInt(i), frequencyIncrement));
            json.call_start_time = !isEmpty(body.call_start_time) ? body.call_start_time : '';
            json.duration = !isEmpty(body.duration) ? body.duration : '';
            json.call_result = !isEmpty(body.call_result) ? body.call_result : '';
        } else if (body.meeting_date) {
            json.meeting_date = new Date(Moment(body.meeting_date).add(parseInt(i), frequencyIncrement));
            json.deadline = new Date(Moment(body.deadline).add(parseInt(i), frequencyIncrement));
            json.meeting_time = !isEmpty(body.meeting_time) ? body.meeting_time : '';
            json.meeting_end_time = !isEmpty(body.meeting_end_time) ? body.meeting_end_time : '';
            json.venue_area = body.venue_area;
            json.venue_name = body.venue_name;
            json.location_venue_radio = body.location_venue_radio;
            // do not show deliverables on recurrence child schedule
            // if (body.deliverables) json.deliverables = body.deliverables
            /* if (body.deliverables) {
                console.log('deliverablesIds 2: ', deliverablesIds);
                // console.log('deliverablesIds 3: ', body.deliverables);

                body.deliverables.forEach(currentDelivarables => {
                    console.log('currentDelivarables: ', currentDelivarables);
                    const deliverableDetails = deliverablesIds.find((firstDeliv) => {
                        console.log('firstDeliv: ', firstDeliv);
                        return JSON.stringify(currentDelivarables.userId) == JSON.stringify(firstDeliv.userId.toString());
                    })
                    if (deliverableDetails) {
                        console.log('deliverableDetails: ', deliverableDetails);
                        DataAccess.UpdateOne(collection_name, { _id: ObjectId(newTask[0]._id), 'deliverables.userId': ObjectId(element.userId) }, { $set: { 'deliverables.$.scheduleId': ObjectId(deliverableTask[0]._id) } });
                        DataAccess.UpdateOne(collection_name)
                    }
                });
            } */
        }
        if (options.weekdays == true) {
            if (((Moment(json.start_date).isoWeekday() != 6) && (Moment(json.start_date).isoWeekday() != 7)) &&
                ((Moment(json.visit_date).isoWeekday() != 6) && (Moment(json.visit_date).isoWeekday() != 7)) &&
                ((Moment(json.due_date).isoWeekday() != 6) && (Moment(json.due_date).isoWeekday() != 7)) &&
                ((Moment(json.meeting_date).isoWeekday() != 6) && (Moment(json.meeting_date).isoWeekday() != 7)) &&
                ((Moment(json.call_start_date).isoWeekday() != 6) && (Moment(json.call_start_date).isoWeekday() != 7))
            ) {
                jsondata.push(json);
            }
        } else {
            jsondata.push(json);
        }
    }

    DataAccess.InsertMany(collection_name, jsondata).then((resp) => {
        resp.insertedIds.forEach(eachId => {
            body.recurrence_parentSchedule = ObjectId(parentScheduleId);
            body.recurrence_schedule = 1;
            saveSchedulerActivity({
                module: shcedulerModule,
                action: auditCreateAction,
                documentId: ObjectId(eachId),
                userId: ObjectId(userId),
                data: body,
                message: 'created a reccurence'
            });
            addNote('scheduler', ObjectId(eachId), body.notes, userId);
            // do not show deliverables on recurrence child schedule
            /* if (body.deliverables) {
                body.deliverables.forEach(currentDelivarables => {
                    const deliverableDetails = options.deliverablesIds.find((firstDeliv) => {
                        firstDeliv.userId = firstDeliv.userId.toString();
                        return JSON.stringify(currentDelivarables.userId) == JSON.stringify(firstDeliv.userId);
                    })
                    if (deliverableDetails) {
                        DataAccess.UpdateOne(collection_name, { _id: ObjectId(eachId), 'deliverables.userId': ObjectId(deliverableDetails.userId) }, { $set: { 'deliverables.$.scheduleId': ObjectId(deliverableDetails.deliverableId) } });
                    }
                });
            } */
        });
    });
};

// checkRecurrenceId(body.options.repeat, body, newTask[0]._id, userId, options)
const checkRecurrenceId = (recurrenceId, body, parentScheduleId, userId, options) => {

    console.log('a1: ', body.call_start_date, ' :: ', body.options.display_to);

    // const d1 = Moment(body.start_date) || Moment(body.meeting_date) || Moment(body.visit_date) || Moment(body.call_start_date) || Moment(body.due_date); // new Date('2018-10-23')
    const d1 = Moment(body.start_date || body.visit_date || body.call_start_date || body.meeting_date || body.due_date); // new Date('2018-10-23')
    const d2 = Moment(getTodayEndTime(body.options.display_to));
    console.log('a1: ', d1, ' :: ', d2);
    const diff_days = d2.diff(d1, 'days');
    const diff_weeks = d2.diff(d1, 'weeks');
    const diff_months = d2.diff(d1, 'months');
    const diff_years = d2.diff(d1, 'years');
    if (recurrenceId == '5ba9d699c232208334f0006d') {
        createRecurrenceSchedule(diff_days, body, parentScheduleId, userId, 'days', options);
    } else if (recurrenceId == '5ba9d6a0c232208334f0006e') {
        createRecurrenceSchedule(diff_weeks, body, parentScheduleId, userId, 'weeks', options);
    } else if (recurrenceId == '5ba9d6a6c232208334f0006f') {
        createRecurrenceSchedule(diff_months, body, parentScheduleId, userId, 'months', options);
    } else if (recurrenceId == '5bab5b1b2d109f9c1d51fb4e') {
        createRecurrenceSchedule(diff_years, body, parentScheduleId, userId, 'years', options);
    } else if (recurrenceId == '5bbb3c23a976469717f5208c') {
        options.weekdays = true;
        createRecurrenceSchedule(diff_days, body, parentScheduleId, userId, 'days', options);
    }
};


const addDeliverableTask = (id, body, prevData, loggedUser) => {
    body.deliverables.forEach(element => {
        const jsonDataToUpdateDelverableTask = {
            subject: element.deliverable_title != '' ? element.deliverable_title : 'Deliverable for ' + body.subject,
            description: element.deliverable_description,
            due_date: element.deliverable_date != '' ? new Date(element.deliverable_date) : new Date(body.deadline),
            priority: ObjectId(element.deliverable_priority),
            status: ObjectId(element.deliverable_status),
        };
        DataAccess.UpdateOne(collection_name, { _id: ObjectId(element.scheduleId) }, { $set: jsonDataToUpdateDelverableTask });
        if (!element.scheduleId) {
            const jsonDataToCreateNewTask = {
                type: ObjectId('5aab8d4a9eaf9bce829b5c3c'),
                category: ObjectId('5addcb184a3802c94e2fba64'),
                associated_radio_with: 'custom',
                associated_with: ObjectId(id),
                subject: element.deliverable_title != '' ? element.deliverable_title : 'Deliverable for ' + body.subject,
                description: element.deliverable_description,
                assigned_to: [ObjectId(element.userId)],
                due_date: element.deliverable_date != '' ? new Date(element.deliverable_date) : new Date(body.deadline),
                due_time: element.deliverable_time != '' ? element.deliverable_time : '',
                priority: ObjectId(element.deliverable_priority),
                status: ObjectId(element.deliverable_status),
                deliverable_task: 1,
                deleted: 0,
                created_by: ObjectId(loggedUser._id),
                created_at: new Date()
            };
            DataAccess.InsertOne(collection_name, jsonDataToCreateNewTask).then((newDeliverableTask) => {
                // saveSchedulerActivity({ action: auditCreateAction, documentId: newDeliverableTask[0]._id, userId: auditLoggedUser, data: newDeliverableTask, message: 'created a' });
                saveSchedulerActivity({
                    module: shcedulerModule,
                    action: auditCreateAction,
                    documentId: ObjectId(newDeliverableTask[0]._id),
                    userId: ObjectId(loggedUser._id),
                    data: newDeliverableTask[0],
                    message: 'created a'
                });
                DataAccess.UpdateOne(collection_name, { _id: ObjectId(id), 'deliverables.userId': ObjectId(element.userId) }, { $set: { 'deliverables.$.scheduleId': ObjectId(newDeliverableTask[0]._id) } });
                addNote('scheduler', newDeliverableTask[0]._id, newDeliverableTask[0].notes, loggedUser._id);
            });
        }
    });
    let presentDeliverablesScheduleId = [];
    body.deliverables.forEach(element => {
        if (element.scheduleId != undefined) {
            presentDeliverablesScheduleId.push(element.scheduleId);
        }
    });
    if (prevData.deliverables) {
        prevData.deliverables.forEach(ele => {
            if (JSON.stringify(presentDeliverablesScheduleId).indexOf(JSON.stringify(ele.scheduleId)) != -1) {
            } else {
                DataAccess.UpdateOne(collection_name, { _id: ObjectId(ele.scheduleId) }, { $set: { deleted: 1 } });
            }
        });
    }
}


const convertStringToDate = (body) => {
    if (body.due_date) { body.due_date = new Date(body.due_date); }
    if (body.start_date) { body.start_date = new Date(body.start_date); }
    if (body.end_date) { body.end_date = new Date(body.end_date); }
    if (body.visit_date) { body.visit_date = new Date(body.visit_date); }
    if (body.call_start_date) { body.call_start_date = new Date(body.call_start_date); }
    if (body.meeting_date) { body.meeting_date = new Date(body.meeting_date); }
    if (body.deadline) { body.deadline = new Date(body.deadline); }
};

const removeUnUsedDates = (body) => {
    let unset = {};
    // deleting the unwanted fields on change of schedule type
    if (body.start_date) {
        unset = { due_date: 1, visit_date: 1, call_start_date: 1, meeting_date: 1, deadline: 1 };
    } else if (body.due_date) {
        unset = { call_start_date: 1, visit_date: 1, start_date: 1, end_date: 1, meeting_date: 1, deadline: 1 };
    } else if (body.visit_date) {
        unset = { start_date: 1, end_date: 1, due_date: 1, call_start_date: 1, meeting_date: 1, deadline: 1 };
    } else if (body.call_start_date) {
        unset = { start_date: 1, end_date: 1, due_date: 1, visit_date: 1, meeting_date: 1, deadline: 1 };
    } else if (body.meeting_date) {
        unset = { start_date: 1, end_date: 1, due_date: 1, visit_date: 1, call_start_date: 1 };
    }else{
        unset=undefined;
    }
    return unset;
};

const deleteRecurrenceChildSchedules = (id) => {
    DataAccess.DeleteMany(collection_name, { recurrence_parentSchedule: ObjectId(id) });
};

const model = {
    filter: async (filter, loggedUser) => {
        try {
            let query = mapFilterQuery(loggedUser, filter);
            let sixMonthsAgo = new Date();
            sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
            query["created_at"] = { "$gte": sixMonthsAgo };

            const crieteria = ([
                {
                    $facet: {
                        data: [
                            { $addFields: { loggedUser: ObjectId(loggedUser._id) } },
                            { $match: query },
                            ...common_queries.filter
                        ],
                        totalCount: [
                            { $match: query },
                            // ...common_queries.filter,
                        ]
                    }
                }
            ]);

            if (filter.options && !isEmpty(filter.options)) {
                let params = filter.options

                if (params.filters && Object.keys(params.filters).length > 0) {
                    let filterKeys = Object.keys(params.filters)
                    let filter = {

                    };
                    for (let i = 0; i < filterKeys.length; i++) {
                        filter[filterKeys[i]] = { "$regex": params.filters[filterKeys[i]].value, "$options": "i" }
                    }
                    crieteria[0]["$facet"]["data"].push({ "$match": filter });
                    crieteria[0]["$facet"]["totalCount"].push({ "$match": filter });
                }

                if (params.sortField) {
                    let sort = {};
                    sort[params.sortField] = params.sortOrder
                    crieteria[0]["$facet"]["data"].push({ "$sort": sort });
                }

                console.log('params: ', params.first, ' :: ', params.rows)

                if (params.first >= 0 && params.rows >= 0) {
                    crieteria[0]["$facet"]["data"].push({ "$limit": params.first + params.rows });
                    crieteria[0]["$facet"]["data"].push({ "$skip": params.first })
                }
            }

            crieteria[0]["$facet"]["totalCount"].push({ "$count": "count" });
            console.log('SCHEDULER FILTER QUERY =>: ', crieteria);

            return DataAccess.aggregate(collection_name, crieteria);
        } catch (error) {
            throw new Error(error)
        }
    },

    // details 
    findById: (id) => {
        const crieteria = ([
            { $match: { _id: ObjectId(id) } },
            { $lookup: { from: 'users', localField: 'assigned_to', foreignField: '_id', as: 'assignee_details' } },
            { $lookup: { from: 'priority', localField: 'priority', foreignField: '_id', as: 'priority_details' } },
            { $lookup: { from: 'status', localField: 'status', foreignField: '_id', as: 'status_details' } },
            { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'task_creator_details' } },
            { $lookup: { from: 'task_types', localField: 'type', foreignField: '_id', as: 'schedule_types' } },
            { $lookup: { from: 'scheduler_categories', localField: 'category', foreignField: '_id', as: 'category_types' } },
            { $lookup: { from: 'contacts', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_contact_details' } },
            { $lookup: { from: 'lead', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_lead_details' } },
            { $lookup: { from: 'customer', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_customer_details' } },
            { $lookup: { from: 'dealer', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_dealer_details' } },
            { $lookup: { from: 'supplier', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_supplier_details' } },
            { $lookup: { from: 'scheduler', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_scheduler_details' } },
            { $lookup: { from: 'users', localField: 'deliverables.userId', foreignField: '_id', as: 'deliverables_user_details' } },
            { $lookup: { from: 'role', localField: 'deliverables_user_details.role_access_reports_mapping.role', foreignField: '_id', as: 'role_details' } },
            { $lookup: { from: 'access_level', localField: 'deliverables_user_details.role_access_reports_mapping.access_level', foreignField: '_id', as: 'access_level_details' } },
            { $lookup: { from: 'scheduler', localField: 'deliverables.scheduleId', foreignField: '_id', as: 'deliverable_task_details' } },
            { $lookup: { from: 'users', localField: 'deliverable_task_details.assigned_to', foreignField: '_id', as: 'deliverable_task_assignedTo_details' } },
            { $lookup: { from: 'status', localField: 'deliverable_task_details.status', foreignField: '_id', as: 'deliverable_status_details' } },
            { $lookup: { from: 'priority', localField: 'deliverable_task_details.priority', foreignField: '_id', as: 'deliverable_priority_details' } },
            { $lookup: { from: 'role', localField: 'assignee_details.role_access_reports_mapping.role', foreignField: '_id', as: 'assignee_role_details' } },
            { $lookup: { from: 'access_level', localField: 'assignee_details.role_access_reports_mapping.access_level', foreignField: '_id', as: 'assignee_access_level_details' } },
            { $lookup: { from: 'venues', localField: 'venue_name', foreignField: '_id', as: 'venue_details' } },
            { $lookup: { from: 'venue_areas', localField: 'venue_area', foreignField: '_id', as: 'venue_area_details' } },
            {
                '$lookup': {
                    from: 'customer',
                    let: { id: '$associated_dealers_customer', },
                    pipeline: [
                        {
                            $addFields: {
                                _id: {
                                    $convert: {
                                        input: '$_id',
                                        to: 'string',
                                        onError: 0
                                    }
                                },
                            }
                        },
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$_id', '$$id']
                                        },
                                    ],
                                }
                            }
                        }
                    ],
                    as: 'associated_dealers_customer_details'
                }
            },
            {
                $addFields: {
                    route_plan: {
                        $convert: {
                            input: '$route_plan',
                            to: 'objectId',
                            onError: 0
                        }
                    },
                    associated_dealers_customer_name: { $arrayElemAt: ['$associated_dealers_customer_details.customer_name', 0] }
                }
            },
            {
                '$lookup': {
                    from: 'routePlan',
                    let: { scheduleId: '$route_plan', },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $eq: ['$_id', '$$scheduleId']
                                        },
                                    ],
                                }
                            }
                        }
                    ],
                    as: 'routePlan_details'
                }
            },
            { $addFields: { route_plan: { $arrayElemAt: ['$routePlan_details', 0] } } },
            {
                '$lookup': {
                    from: 'scheduler',
                    let: {
                        scheduleId: '$_id',
                        associatedId: '$associated_with',

                    },
                    pipeline: [
                        {
                            $match: {
                                $expr: {
                                    $and: [
                                        {
                                            $or: [
                                                {
                                                    $eq: ['$associated_with', '$$scheduleId']
                                                },
                                                {
                                                    $eq: ['$_id', '$$associatedId']
                                                },
                                            ]
                                        },
                                        {
                                            $ne: ['$deleted', 1]
                                        },
                                        {
                                            $ne: ['$recurrence_schedule', 1]
                                        },
                                    ],
                                }
                            }
                        }
                    ],
                    as: 'linked_schedule'
                }
            },
            { $lookup: { from: 'task_types', localField: 'linked_schedule.type', foreignField: '_id', as: 'linked_schedule_typeDetails' } },
            { $lookup: { from: 'scheduler_categories', localField: 'linked_schedule.category', foreignField: '_id', as: 'linked_schedule_categoryDetails' } },
            { $lookup: { from: 'users', localField: 'linked_schedule.assigned_to', foreignField: '_id', as: 'linked_schedule_assignedToDetails' } },
            { $lookup: { from: 'status', localField: 'linked_schedule.status', foreignField: '_id', as: 'linked_schedule_statusDetails' } },
            { $lookup: { from: 'priority', localField: 'linked_schedule.priority', foreignField: '_id', as: 'linked_schedule_priorityDetails' } },
            { $lookup: { from: 'scheduler', localField: 'recurrence_parentSchedule', foreignField: '_id', as: 'recurrence_parentSchedule_details' } },
            {
                $project: {
                    associated_dealers_customer_details: 0,
                    routePlan_details: 0,
                    'task_creator_details.phone': 0,
                    'task_creator_details.email': 0,
                    'task_creator_details.role': 0,
                    'task_creator_details.staffList': 0,
                    'task_creator_details.address': 0,
                    'task_creator_details.city': 0,
                    'task_creator_details.state': 0,
                    'task_creator_details.region': 0,
                    'task_creator_details.password': 0,
                    'task_creator_details.isActive': 0,
                    'task_creator_details.created_at': 0,

                    'assignee_details.phone': 0,
                    'assignee_details.email': 0,
                    'assignee_details.role': 0,
                    'assignee_details.staffList': 0,
                    'assignee_details.address': 0,
                    'assignee_details.city': 0,
                    'assignee_details.state': 0,
                    'assignee_details.region': 0,
                    'assignee_details.password': 0,
                    'assignee_details.isActive': 0,
                    'assignee_details.roles': 0,
                    'assignee_details.created_at': 0,

                    'priority_details.created_at': 0,
                    'status_details.created_at': 0,

                    // 'linked_schedule.status': 0,
                    // 'linked_schedule.priority': 0,
                    'linked_schedule.location': 0,
                    'linked_schedule.location_radio': 0,
                    'linked_schedule.associated_radio_with': 0,
                    'linked_schedule.associated_with': 0,
                    'linked_schedule.created_by': 0,
                    'linked_schedule.created_at': 0,
                    'linked_schedule.description': 0,
                }
            },
            { $sort: { 'created_at': -1 } }
        ]);
        return DataAccess.aggregate(collection_name, crieteria);
    },
    updateFieldActivityByAssignee: (assignee, locations) => {
        return new Promise((resolve, reject) => {
            let temp = [];
            for (let key in assignee) {
                temp[key] = ObjectId(assignee[key]);
            }
            const taskTypesCollections = collection('task_types').find({}).toArray(function (err, result) {
                if (err) throw err;
                let typeKeys = [];
                for (let i = 0; i < result.length; i++) {
                    typeKeys.push(result[i]._id);
                }
                const collections = collection(collection_name);
                collections.find({ assigned_to: { $in: temp } }).toArray(function (err, result2) {
                    console.log('schedule', result2.length);
                    var count = 0;
                    for (let i = 0; i < result2.length; i++) {
                        for (let j = 0; j < locations.length; j++) {
                            let location = locations[j];
                            if (location && !result2[i].canCheckIn && result2[i].location) {

                                var distance = gdistance(result2[i].location[0], result2[i].location[1], location.lat, location.lng) * 1000;
                                if (distance < 250) {
                                    count++;
                                    var newvalues = { $set: { canCheckIn: true } };
                                    collections.updateOne({ '_id': result2[i]._id }, newvalues, function (err, res) {
                                        if (err) throw err;
                                        console.log('document updated', result2[i], res.result);

                                    });
                                    break;
                                }

                            }
                            // console.log("distance", distance);
                        }
                    }
                    resolve({ count: count });
                });

            });
        });
    },
    findByAssignee: (assignee) => {
        let temp = [];
        for (let key in assignee) { temp[key] = ObjectId(assignee[key]); }
        if (mydb) {
            const collections = collection(collection_name);
            return collections
                .aggregate([
                    { $match: { assigned_to: { $in: temp } } },
                    { $lookup: { from: 'users', localField: 'assigned_to', foreignField: '_id', as: 'assignee_details' } },
                    { $lookup: { from: 'priority', localField: 'priority', foreignField: '_id', as: 'priority_details' } },
                    { $lookup: { from: 'status', localField: 'status', foreignField: '_id', as: 'status_details' } },
                    { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'task_creator_details' } },
                    { $lookup: { from: 'task_types', localField: 'type', foreignField: '_id', as: 'task_type_details' } },
                    { $project: { 'assignee_details.password': 0, 'task_creator_details.password': 0 } },
                    { $lookup: { from: 'contacts', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_contact_details' } },
                    { $lookup: { from: 'lead', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_lead_details' } },
                    { $lookup: { from: 'customer', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_customer_details' } },
                    { $sort: { 'created_at': -1 } }
                ])
                .toArray()
                .then((result) => { return result; });
        }
    },
    // list all
    all: (page, limit, loggedUser) => {
        let query = { deleted: { $ne: 1 } };
        let aclPermissions = acl.getAclQueryPermissions('scheduler', 'view', loggedUser);
        query['$or'] = [{ 'acl_meta.permissions': { '$in': aclPermissions } }, { 'acl_meta.users': ObjectId(loggedUser._id) }];
        const crieteria = ([
            { $match: query },
            { $sort: { 'created_at': -1 } },
            { $skip: limitOrDefault(limit) * (pageOrDefault(page) - 1) },
            { $limit: limitOrDefault(limit) },
        ]);
        return DataAccess.aggregate(collection_name, crieteria);
    },
    mobileList: (query, body, loggedUser) => {
        try {
            let matchQuery = { deleted: { $ne: 1 } };

            if (!query) {
                matchQuery = matchQuery;
            };

            if (body.start_date && !isEmpty(body.start_date) && body.end_date && !isEmpty(body.end_date)) {

                matchQuery['$or'] = [
                    { due_date: { $gte: getTodayStartTime(body.start_date), $lt: getTodayEndTime(body.end_date) } },
                    {
                        $and: [
                            { start_date: { $lt: getTodayStartTime(body.start_date) } },
                            { end_date: { $gte: getTodayStartTime(body.end_date), } },
                        ]
                    },
                    { start_date: { $gte: getTodayStartTime(body.start_date), $lt: getTodayEndTime(body.end_date) } },
                    { end_date: { $gte: getTodayStartTime(body.start_date), $lt: getTodayEndTime(body.end_date) } },
                    { meeting_date: { $gte: getTodayStartTime(body.start_date), $lt: getTodayEndTime(body.end_date) } },
                    { deadline: { $gte: getTodayStartTime(body.start_date), $lt: getTodayEndTime(body.end_date) } },
                    {
                        $and: [
                            { meeting_date: { $lt: getTodayStartTime(body.start_date) } },
                            { deadline: { $gte: getTodayStartTime(body.end_date), } },
                        ]
                    },
                    { visit_date: { $gte: getTodayStartTime(body.start_date), $lt: getTodayEndTime(body.end_date) } },
                    { call_start_date: { $gte: getTodayStartTime(body.start_date), $lt: getTodayEndTime(body.end_date) } },
                ]
            }

            if (query.date) {
                matchQuery['$or'] = [
                    { due_date: { $gte: getTodayStartTime(query.date), $lt: getTodayEndTime(query.date) } },
                    {
                        $and: [
                            { start_date: { $lt: getTodayStartTime(query.date) } },
                            { end_date: { $gte: getTodayEndTime(query.date), } },
                        ]
                    },
                    { start_date: { $gte: getTodayStartTime(query.date), $lt: getTodayEndTime(query.date) } },
                    { end_date: { $gte: getTodayStartTime(query.date), $lt: getTodayEndTime(query.date) } },
                    { meeting_date: { $gte: getTodayStartTime(query.date), $lt: getTodayEndTime(query.date) } },
                    { deadline: { $gte: getTodayStartTime(query.date), $lt: getTodayEndTime(query.date) } },
                    {
                        $and: [
                            { meeting_date: { $lt: getTodayStartTime(query.date) } },
                            { deadline: { $gte: getTodayEndTime(query.date), } },
                        ]
                    },
                    { visit_date: { $gte: getTodayStartTime(query.date), $lt: getTodayEndTime(query.date) } },
                    { call_start_date: { $gte: getTodayStartTime(query.date), $lt: getTodayEndTime(query.date) } },
                ]
            }

            if (!isEmpty(body) && !isEmpty(body.assigned_to)) {
                let assignedTo = [];
                body.assigned_to.forEach(assignee => {
                    assignedTo.push(ObjectId(assignee));
                });
                body.assigned_to = assignedTo;
                matchQuery['assigned_to'] = { $in: body.assigned_to };
            } else {
                matchQuery['assigned_to'] = { $in: [ObjectId(loggedUser._id)] };
            }

            if (!isEmpty(body) && !isEmpty(body.type)) {
                let objectIdTypes = body.type.map(i => ObjectId(i))
                matchQuery['type'] = { $in: objectIdTypes };
            }


            console.log('mobile list::query: ', JSON.stringify(matchQuery));


            const crieteria = ([

                { $match: matchQuery },
                { $lookup: { from: 'users', localField: 'assigned_to', foreignField: '_id', as: 'assignee_details' } },
                { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'created_by_details' } },
                { $lookup: { from: 'priority', localField: 'priority', foreignField: '_id', as: 'priority_details' } },
                { $lookup: { from: 'status', localField: 'status', foreignField: '_id', as: 'status_details' } },
                { $lookup: { from: 'task_types', localField: 'type', foreignField: '_id', as: 'schedule_types' } },
                { $lookup: { from: 'scheduler_categories', localField: 'category', foreignField: '_id', as: 'category_types' } },
                { $lookup: { from: 'contacts', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_contact_details' } },
                { $lookup: { from: 'lead', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_lead_details' } },
                { $lookup: { from: 'customer', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_customer_details' } },
                { $lookup: { from: 'supplier', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_supplier_details' } },
                { $lookup: { from: 'scheduler', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_scheduler_details' } },
                { $lookup: { from: 'dealer', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_dealer_details' } },
                {
                    $project: {
                        _id: 1,
                        subject: 1,
                        description: 1,
                        type: 1,
                        category: 1,
                        category_tag: 1,
                        associated_with: 1,
                        associated_radio_with: 1,
                        priority: 1,
                        status: 1,
                        activity: 1,
                        recurrence_schedule: 1,
                        recurrence_parentSchedule: 1,
                        created_at: 1,
                        location: 1,
                        start_date: 1,
                        end_date: 1,
                        due_date: 1,
                        meeting_date: 1,
                        visit_date: 1,
                        call_start_date: 1,
                        deadline: 1,
                        deliverables: 1,
                        description: 1,
                        location_venue_radio: 1,
                        start_time: 1,
                        end_time: 1,
                        meeting_end_time: 1,
                        meeting_time: 1,
                        due_time: 1,
                        canCheckIn: 1,
                        venue_area: 1,
                        venue_name: 1,
                        created_by: { $concat: [{ $arrayElemAt: ['$created_by_details.first_name', 0] }, ' ', { $arrayElemAt: ['$created_by_details.last_name', 0] }] },
                        associatedWith_customer_details: 1,
                        associatedWith_lead_details: 1,
                        associatedWith_supplier_details: 1,
                        associatedWith_contact_details: 1,
                        associated_with_details: 1,
                        associatedWith_scheduler_details: 1,
                        associatedWith_dealer_details: 1,
                        assignee_details: 1,
                        checkedIn:1,
                        category_name: {
                            $cond: {
                                if: { $ne: ['$category_types', []] },
                                then: { $arrayElemAt: ['$category_types.category', 0] },
                                else: null
                            }
                        },
                        type_name: {
                            $cond: {
                                if: { $ne: ['$schedule_types', []] },
                                then: { $arrayElemAt: ['$schedule_types.type', 0] },
                                else: null
                            }
                        },
                        priority: {
                            $cond: {
                                if: { $ne: ['$priority_details', []] },
                                then: { $arrayElemAt: ['$priority_details.priority', 0] },
                                else: null
                            }
                        },
                        status_name: {
                            $cond: {
                                if: { $ne: ['$status_details', []] },
                                then: { $arrayElemAt: ['$status_details.type', 0] },
                                else: null
                            }
                        },

                        card_icon: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ['$category', ObjectId('5addcaeb4a3802c94e2fba60')] }, then: schedule_CardIcons.FA },
                                    { case: { $eq: ['$category', ObjectId('5addcb084a3802c94e2fba62')] }, then: schedule_CardIcons.call },
                                    { case: { $eq: ['$category', ObjectId('5addcb0d4a3802c94e2fba63')] }, then: schedule_CardIcons.email },
                                    { case: { $eq: ['$category', ObjectId('5addcb184a3802c94e2fba64')] }, then: schedule_CardIcons.todo },
                                    { case: { $eq: ['$category', ObjectId('5afa9c9a68062170124f93d6')] }, then: schedule_CardIcons.meeting },
                                    { case: { $eq: ['$category', ObjectId('5afa9ca368062170124f93d7')] }, then: schedule_CardIcons.meeting },
                                    { case: { $eq: ['$category', ObjectId('5addcb014a3802c94e2fba61')] }, then: schedule_CardIcons.FA },
                                    { case: { $eq: ['$category', ObjectId('5b3d9db215789cbb6768175c')] }, then: schedule_CardIcons.FA },
                                    { case: { $eq: ['$category', ObjectId('5b3d9dc615789cbb6768175d')] }, then: schedule_CardIcons.FA },
                                    { case: { $or: [{ $eq: ['$category', ObjectId('5a8eb11662a646e65f27a500')] }, { $eq: ['$category', ObjectId('5b6184d9c60a5e49ade7ef1b')] }] }, then: schedule_CardIcons.completed },
                                    { case: { $eq: ['$category', ObjectId('5a8eb10b62a646e65f27a4ff')] }, then: schedule_CardIcons.inProgress },
                                    { case: { $eq: ['$category', ObjectId('5a8eb11e62a646e65f27a501')] }, then: schedule_CardIcons.notStarted },
                                    { case: { $eq: ['$category', ObjectId('5af09ba1c94cc441b55524f2')] }, then: schedule_CardIcons.overdue },
                                    { case: { $eq: ['$category', ObjectId('5db2cb63b612365bf1c30793')] }, then: schedule_CardIcons.cancelled },
                                ],
                                default: ""
                            }
                        },

                        card_color: {
                            $switch: {
                                branches: [
                                    { case: { $eq: ['$type', ObjectId('5a93a2c4152426c79f4bbdc5')] }, then: schedule_CardColor.FA },
                                    { case: { $eq: ['$type', ObjectId('5aab8d4a9eaf9bce829b5c3c')] }, then: schedule_CardColor.TASK },
                                    { case: { $eq: ['$type', ObjectId('5afbd730fc9609813663b0c2')] }, then: schedule_CardColor.MEETING },
                                ],
                                default: ""
                            }
                        },
                    }
                },
                { $sort: { start_date: 1, meeting_date: 1, visit_date: 1, call_start_date: 1, due_date: 1 } }

            ]);
            return DataAccess.aggregate(collection_name, crieteria);
        } catch (error) {
            throw new Error(error)
        }
    },

    showMarkers: async (body, loggedUser) => {

        let matchQuery = { deleted: { $ne: 1 }, }

        if (!isEmpty(body) && !isEmpty(body.assigned_to)) {
            let assignedTo = [];
            body.assigned_to.forEach(assignee => {
                assignedTo.push(ObjectId(assignee));
            });
            body.assigned_to = assignedTo;
            matchQuery['assigned_to'] = { $in: body.assigned_to };
        } else {
            matchQuery['assigned_to'] = { $in: [ObjectId(loggedUser._id)] };
        }


        matchQuery['$or'] = [
            { due_date: { $gte: getWeekFirstDay(body.start_date), $lt: getWeekLastDay(body.end_date) } },
            { start_date: { $gte: getWeekFirstDay(body.start_date), $lt: getWeekLastDay(body.end_date) } },
            { end_date: { $gte: getWeekFirstDay(body.start_date), $lt: getWeekLastDay(body.end_date) } },
            { meeting_date: { $gte: getWeekFirstDay(body.start_date), $lt: getWeekLastDay(body.end_date) } },
            { visit_date: { $gte: getWeekFirstDay(body.start_date), $lt: getWeekLastDay(body.end_date) } },
            { call_start_date: { $gte: getWeekFirstDay(body.start_date), $lt: getWeekLastDay(body.end_date) } },
            { deadline: { $gte: getWeekFirstDay(body.start_date), $lt: getWeekLastDay(body.end_date) } },
        ]


        const crieteria = ([
            { $match: matchQuery },
            {
                $project: {
                    subject: 1,
                    start_date: 1,
                    end_date: 1,
                    due_date: 1,
                    meeting_date: 1,
                    visit_date: 1,
                    deadline: 1,
                    call_start_date: 1,
                }
            }
        ]);

        const result = await DataAccess.aggregate(collection_name, crieteria);

        console.log('data: ', result);

        var startOfWeek = Moment(body.start_date).startOf('week');
        var endOfWeek = Moment(body.end_date).endOf('week');

        var days = [];
        var day = startOfWeek;

        while (day <= endOfWeek) {
            days.push(day.toDate());
            day = day.clone().add(1, 'd');
        }


        let resp = {}

        for (const day of days) {
            if (!isEmpty(result)) {
                for (const iterator of result) {
                    if (
                        ((new Date(iterator.meeting_date) >= getTodayStartTime(day)) && (new Date(iterator.meeting_date) <= getTodayEndTime(day))) ||
                        ((new Date(iterator.start_date) >= getTodayStartTime(day)) && (new Date(iterator.start_date) <= getTodayEndTime(day))) ||
                        ((new Date(iterator.end_date) >= getTodayStartTime(day)) && (new Date(iterator.end_date) <= getTodayEndTime(day))) ||
                        ((new Date(iterator.due_date) >= getTodayStartTime(day)) && (new Date(iterator.due_date) <= getTodayEndTime(day))) ||
                        ((new Date(iterator.call_start_date) >= getTodayStartTime(day)) && (new Date(iterator.call_start_date) <= getTodayEndTime(day))) ||
                        ((new Date(iterator.visit_date) >= getTodayStartTime(day)) && (new Date(iterator.visit_date) <= getTodayEndTime(day))) ||
                        ((new Date(iterator.deadline) >= getTodayStartTime(day)) && (new Date(iterator.deadline) <= getTodayEndTime(day)))
                    ) {
                        resp[day] = 1;
                        break;
                    } else {
                        resp[day] = 0;
                    }
                }
            } else {
                resp[day] = 0;
            }
        }

        console.log('RESP: ', resp);




        return resp
    },
    create: async (body, userId, query, loggedUser) => {
        acl.allowUser('scheduler', loggedUser, body);
        // acl.allowUser("scheduler", assigned_to, body);
        // let aclPermissions = acl.getAclQueryPermissions("scheduler", "view", loggedUser);
        const stringValueOfAssociated_with = body.associated_with;

        // convert to objectId
        if (body.associated_with.match(/^[0-9a-fA-F]{24}$/)) {
            body.associated_with = ObjectId(body.associated_with);
        }

        if (String(body.type) === '5a93a2c4152426c79f4bbdc5') {
            body.canCheckIn = true
        }
        const newTask = await DataAccess.InsertOne(collection_name, body);
        saveSchedulerActivity({
            module: shcedulerModule,
            action: auditCreateAction,
            documentId: ObjectId(newTask[0]._id),
            userId: ObjectId(userId),
            data: newTask[0],
            message: 'created a'
        });
        addNote(Modules().shceduler, newTask[0]._id, newTask[0].notes, userId);
        if (stringValueOfAssociated_with.match(/^[0-9a-fA-F]{24}$/)) {
            saveSchedulerActivity({
                // module: body.associated_radio_with,
                module: shcedulerModule,
                action: auditLinkAction,
                documentId: ObjectId(stringValueOfAssociated_with),
                userId: ObjectId(userId),
                data: newTask[0],
                message: 'linked a'
            });
        }
        if (!isEmpty(newTask[0].assigned_to)) {
            newTask[0].assigned_to.forEach(assignee => {
                saveSchedulerActivity({
                    module: userModule,
                    action: auditLinkAction,
                    documentId: ObjectId(assignee),
                    userId: ObjectId(userId),
                    data: newTask[0],
                    message: 'assigned you a'
                });
            });
        }
        let deliverablesIds = [];
        if (body.deliverables) {
            body.deliverables.forEach(element => {
                const jsonDataToCreateNewTask = {
                    _id: new ObjectId(),
                    type: ObjectId('5aab8d4a9eaf9bce829b5c3c'),
                    category: ObjectId('5addcb184a3802c94e2fba64'),
                    associated_radio_with: 'custom',
                    associated_with: ObjectId(newTask[0]._id),
                    subject: element.deliverable_title != '' ? element.deliverable_title : 'Deliverable for ' + body.subject,
                    description: element.deliverable_description,
                    assigned_to: [ObjectId(element.userId)],
                    due_date: element.deliverable_date != '' ? new Date(element.deliverable_date) : new Date(body.deadline),
                    due_time: element.deliverable_time != '' ? element.deliverable_time : '',
                    priority: ObjectId(element.deliverable_priority),
                    status: ObjectId(element.deliverable_status),
                    deliverable_task: 1,
                    deleted: 0,
                    created_by: ObjectId(userId),
                    created_at: new Date()
                };
                deliverablesIds.push({ deliverableId: jsonDataToCreateNewTask._id, userId: jsonDataToCreateNewTask.assigned_to });
                DataAccess.InsertOne(collection_name, jsonDataToCreateNewTask).then((deliverableTask) => {
                    // log a activity for each deliverable task
                    saveSchedulerActivity({
                        module: shcedulerModule,
                        action: auditCreateAction,
                        documentId: ObjectId(deliverableTask[0]._id),
                        userId: ObjectId(userId),
                        data: deliverableTask[0],
                        message: 'assigned you a'
                    });
                    addNote(Modules().shceduler, deliverableTask[0]._id, deliverableTask[0].notes, userId);
                    // console.log('IDDD: ', jsonDataToCreateNewTask._id, jsonDataToCreateNewTask.assigned_to, ':', deliverableTask[0]._id, deliverableTask[0].assigned_to);
                    DataAccess.UpdateOne(collection_name, { _id: ObjectId(newTask[0]._id), 'deliverables.userId': ObjectId(element.userId) }, { $set: { 'deliverables.$.scheduleId': ObjectId(deliverableTask[0]._id) } });
                });
            });
        }
        if (body.recurrence == true || body.recurrence == 'true') {
            const options = {
                deliverablesIds: deliverablesIds
            };
            if (body.options.repeat) {
                checkRecurrenceId(body.options.repeat, body, newTask[0]._id, userId, options);
            }
        }
        return newTask.length > 0 ? newTask[0] : 0;

    },
    update: async (id, body, loggedUser, type) => {

        try {
            convertStringToDate(body);
            const unset = removeUnUsedDates(body);

            acl.allowUser('scheduler', loggedUser, body);
            const stringValueOfAssociated_with = body.associated_with;
            // convert to objectId
            if (body.associated_with && body.associated_with.match(/^[0-9a-fA-F]{24}$/)) {
                body.associated_with = ObjectId(body.associated_with);
            }

            if (body.status == '5af09ba1c94cc441b55524f2' && body.end_date > new Date() ||
                body.status == '5af09ba1c94cc441b55524f2' && body.due_date > new Date() ||
                body.status == '5af09ba1c94cc441b55524f2' && body.visit_date > new Date() ||
                body.status == '5af09ba1c94cc441b55524f2' && body.deadline > new Date() ||
                body.status == '5af09ba1c94cc441b55524f2' && body.call_start_date > new Date()
            ) { body.status = ObjectId('5a8eb11e62a646e65f27a501'); }

            console.log('MODEL::update schedule body====>: ', body);

            if (type == 1 || type == '1') {
                delete body.options;
            }

            if (body.recurrence == false) {
                deleteRecurrenceChildSchedules(id);
            }

            const prevData = await DataAccess.findOne(collection_name, { _id: ObjectId(id) });
             if (prevData.deviation !== 1) {
                body.plannedDate = prevData.start_date;
            }

            if (body.start_date && String(body.start_date) !== String(prevData.start_date)) {
                body.deviation = 1;
            }
            let options={ $set: body };
            if(unset){
                options["$unset"]=unset;
            }
            const resp = await DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) },options );
           try{ if (resp.modifiedCount > 0) {
                // log of update schedule (display on schedule details)
                auditUpdatedDeatils(loggedUser, id, body, prevData)
                checkStatusUpdated(prevData, id, body, loggedUser);
                logAllActivities(stringValueOfAssociated_with, body, prevData, loggedUser);
            }
            if (body.deliverables) {
                addDeliverableTask(id, body, prevData, loggedUser);
            }
            if (body.recurrence == true || body.recurrence == 'true') {
                const options = {};
                if (type == 3 || type == '3') {
                    DataAccess.DeleteMany(collection_name, { recurrence_parentSchedule: ObjectId(id) }).then((resp_1) => {
                        checkRecurrenceId(body.options.repeat, body, id, loggedUser._id, options);
                    });
                } else if (type == 2 || type == '2') {
                    // do nothing
                } else if (type == 1 || type == '1') {
                    // do nothing
                } else {
                    DataAccess.DeleteMany(collection_name, { recurrence_parentSchedule: ObjectId(id) }).then((resp_2) => {
                        checkRecurrenceId(body.options.repeat, body, id, loggedUser._id, options);
                    });
                }
            }}
            catch(err){}
            return resp.matchedCount > 0 ? 1 : 0;
        } catch (error) {
            throw new Error(error)
        }
    },
    UpdateMany: (crieteria, doc) => {
        const docToUpdate = { $set: doc };
        return DataAccess.UpdateMany(collection_name, crieteria, docToUpdate);
    },
    updateScheduleStatus: async (id, body, loggedUser, location) => {
        const dataToUpdate = {};
        if (body.lat !== undefined && body.lng !== undefined) {
            dataToUpdate.checkedIn = { lat: body.lat, long: body.lng };
        }
        if (body.status && body.status !== undefined && body.status != "") {
            dataToUpdate.status = body.status;
        }
        const prevData = await DataAccess.findOne(collection_name, { _id: ObjectId(id) });
        if (body.lat !== undefined && body.lng !== undefined && loggedUser._id) {
            let checkedInUser = [];
            if (prevData && Array.isArray(prevData.checked_in_user)) {
                checkedInUser = prevData.checked_in_user;
            }
            if (!checkedInUser.includes(loggedUser._id)) {
                checkedInUser.push(loggedUser._id);
            }
            dataToUpdate.checked_in_user = checkedInUser;
        }
        const result = await DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set:  dataToUpdate})
        if (result.modifiedCount > 0) {
            if (body.completed_remarks) {
                await addNotesOnChangeOfStatus(body, loggedUser, id);
                checkStatusUpdated(prevData, id, body, loggedUser)
            } else {
                body.checkedIn = {
                    lat: body.lat,
                    long: body.lng,
                    place: location
                }
                logActivity(shcedulerModule, auditActions().checkIn, id, loggedUser._id, body, 'checked in at ' + location)
            }
        }

        if (body.recurrence == true || body.recurrence == 'true') {
            const options = {};
            if (type == 3 || type == '3') {
                this.UpdateMany({ recurrence_parentSchedule: ObjectId(id) }, { status: status })
            } else if (type == 2 || type == '2') {
            } else if (type == 1 || type == '1') {
            }
        }


        return result.modifiedCount;
    },

    // cron update
    updateStatusToOverdue: () => {
        const statusId = '5af09ba1c94cc441b55524f2';
        if (mydb) {
            const collections = collection(collection_name);
            return collections.find({ deleted: { $ne: 1 }, status: { $nin: [ObjectId('5a8eb11662a646e65f27a500'), ObjectId("5af09ba1c94cc441b55524f2"), ObjectId("5b6184d9c60a5e49ade7ef1b")] }, }).toArray().then((result) => {
                result.forEach(element => {

                    if ((element.end_date || element.due_date || element.visit_date || element.deadline || element.call_start_date) < new Date()) {

                        return collections
                            .updateOne({ _id: ObjectId(element._id) }, { $set: { status: ObjectId(statusId) } })
                            .then((result) => {
                                if (result.modifiedCount > 0) {
                                    console.log('cron update::schedule', 'id: ', element._id, 'status: ', element.status, statusId);
                                    saveSchedulerActivity({
                                        module: shcedulerModule,
                                        action: auditActions().elapse,
                                        documentId: ObjectId(element._id),
                                        userId: 'cron update',
                                        data: { status: ObjectId(element.status) },
                                        message: 'marked as overdue'
                                    });
                                }
                            })
                            .catch(e => {
                            });
                    }
                });
            });
        }
    },

    deleteById: async (id, type, loggedUser) => {
        // if (!type || type == 1 || type == '1' || type == '0' || type == 0) 
        if (type == 2 || type == '2') {
            const resp = await DataAccess.findOne(collection_name, { _id: ObjectId(id) });
            const crieteria = {
                $and: [
                    {
                        $or: [
                            { _id: ObjectId(id) },
                            { recurrence_parentSchedule: ObjectId(resp.recurrence_parentSchedule) },
                            { recurrence_parentSchedule: ObjectId(id) }
                        ]
                    },
                    {
                        $or: [
                            { start_date: { $gte: new Date(resp.start_date) } },
                            { meeting_date: { $gte: new Date(resp.meeting_date) } },
                            { visit_date: { $gte: new Date(resp.visit_date) } },
                            { due_date: { $gte: new Date(resp.due_date) } },
                            { call_start_date: { $gte: new Date(resp.call_start_date) } },
                        ]
                    }
                ]
            };
            const result = await DataAccess.DeleteMany(collection_name, crieteria);
            saveSchedulerActivity({
                module: shcedulerModule,
                action: auditDeleteAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: { scheduleId: ObjectId(id) },
                message: 'deleted the schedule'
            });
            return result.matchedCount > 0 ? 1 : 0;
        } else if (type == 3 || type == '3') {
            const resp_1 = await DataAccess.findOne(collection_name, { _id: ObjectId(id) });
            const crieteria_1 = {
                $or: [
                    { _id: ObjectId(id) }, { recurrence_parentSchedule: ObjectId(resp_1.recurrence_parentSchedule) },
                    { _id: ObjectId(resp_1.recurrence_parentSchedule) }, { recurrence_parentSchedule: ObjectId(resp_1._id) },
                    { _id: ObjectId(resp_1._id) }
                ]
            };
            const result_1 = await DataAccess.DeleteMany(collection_name, crieteria_1);
            saveSchedulerActivity({
                module: shcedulerModule,
                action: auditDeleteAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: { scheduleId: ObjectId(id) },
                message: 'deleted the schedule'
            });
            return result_1.matchedCount > 0 ? 1 : 0;
        } else {
            const result_2 = await DataAccess.UpdateOne(collection_name, { _id: ObjectId(id) }, { $set: { deleted: 1, modified_At: new Date() } });
            saveSchedulerActivity({
                module: shcedulerModule,
                action: auditDeleteAction,
                documentId: ObjectId(id),
                userId: ObjectId(loggedUser._id),
                data: { scheduleId: ObjectId(id) },
                message: 'deleted the schedule'
            });
            deleteNotes(id);
            DataAccess.findOne(collection_name, { _id: ObjectId(id) }).then((data) => {
                if (data.deliverables) {
                    data.deliverables.forEach(element => {
                        DataAccess.UpdateOne(collection_name, { _id: ObjectId(element.scheduleId) }, { $set: { deleted: 1, modified_At: new Date() } });
                    });
                }
            });
            DataAccess.findAll(collection_name, { associated_with: ObjectId(id) }).then((found) => {
                if (!isEmpty(found)) {
                    found.forEach(ele => {
                        DataAccess.UpdateOne(collection_name, { _id: ObjectId(ele._id) }, { $set: { associated_with: '', associated_radio_with: 'custom' } });
                        logActivity(ele.associated_radio_with, auditDeleteAction, ele._id, loggedUser._id, { recurrence_schedule: 1, scheduleId: ObjectId(id) }, 'deleted the parent schedule')
                    });
                }
            });
            /* DataAccess.findOne(collection_name, { _id: ObjectId(id) }).then((schedule) => {
                if (!isEmpty(schedule.associated_with)) {
                    saveSchedulerActivity({
                        module: shcedulerModule,
                        action: auditDeleteAction,
                        documentId: ObjectId(schedule.associated_with),
                        userId: ObjectId(loggedUser._id),
                        data: schedule,
                        message: 'deleted the'
                    });
                }
                if (!isEmpty(schedule.assigned_to)) {
                    schedule.assigned_to.forEach(assignee => {
                        saveSchedulerActivity({
                            module: shcedulerModule,
                            action: auditDeleteAction,
                            documentId: ObjectId(assignee),
                            userId: ObjectId(loggedUser._id),
                            data: schedule,
                            message: 'deleted the'
                        });
                    });
                }
            }); */
            return result_2.matchedCount > 0 ? 1 : 0;
        }
    },

    getTaskTypes: (loggedUserInfo) => {
        let roles = [];
        loggedUserInfo.role_access_reports_mapping.forEach(element => {
            roles.push(element.role);
        });
        if (mydb) {
            const collections = collection('task_types');
            return collections
                .aggregate([
                    { $match: { role: { $in: roles } } },
                    { $lookup: { from: 'scheduler_categories', localField: '_id', foreignField: 'schedule_type', as: 'categories' } },
                    { $lookup: { from: 'status', localField: 'linked_status', foreignField: '_id', as: 'linked_status_details' } },
                    {
                        $project: {
                            'linked_status': 0, 'categories.schedule_type': 0, 'created_at': 0, 'role': 0, 'linked_status_details.created_at': 0, 'linked_status_details.displayId': 0,
                        }
                    },
                    { $sort: { created_at: -1 } }
                ])
                .toArray().then((result) => { return result; });
        }
    },
    scheduleTypeDetails: (id) => {
        if (mydb) {
            const collections = collection('task_types');
            return collections
                .aggregate([
                    { $match: { _id: ObjectId(id) } },
                    { $lookup: { from: 'scheduler_categories', localField: '_id', foreignField: 'schedule_type', as: 'categories' } },
                    { $lookup: { from: 'status', localField: 'linked_status', foreignField: '_id', as: 'linked_status_details' } },
                    { $project: { 'linked_status': 0, 'categories.schedule_type': 0, 'created_at': 0, 'linked_status_details.created_at': 0, 'linked_status_details.displayId': 0 } },
                    { $sort: { created_at: -1 } }
                ])
                .toArray().then((result) => { return result; });
        }
    },
    listScheduleCategories: () => {
        if (mydb) {
            const collections = collection('scheduler_categories');
            return collections
                .aggregate([
                    { $lookup: { from: 'task_types', localField: 'schedule_type', foreignField: '_id', as: 'schedule_type_details' } },
                    { $sort: { created_at: -1 } }
                ])
                .toArray().then((result) => { return result; });
        }
    },
    getTaskFields: (id) => {
        if (mydb) {
            const collections = collection('task_fields');
            return collections
                .find({ task_type_id: ObjectId(id) }).sort('created_at', -1).toArray()
                .then((result) => { return result; });
        }
    },
    listAllTaskFields: () => {
        if (mydb) {
            const collections = collection('task_fields');
            return collections.find().sort('created_at', -1).toArray().then((result) => { return result; });
        }
    },
    createTaskTypes: (body) => {
        if (mydb) {
            const collections = collection('task_types');
            return collections.insertOne(body).then((result) => { return result.ops; });
        }
    },
    createTaskFields: (body) => {
        if (mydb) {
            const collections = collection('task_fields');
            return collections.insertOne(body).then((result) => { return result.ops; });
        }
    },
    getOptionsList: () => {
        return DataAccess.findAll('scheduler_settings', {});
    },
};

module.exports = model;

function mapFilterQuery(loggedUser, filter) {
    let query = { deleted: { $ne: 1 } };
    let temp_type = [];
    let temp_associatedWith = [];
    let temp_assignee = [];
    let temp_status = [];
    const scheduleAssignedByMe = filter.isScheduler && filter.assigned_to.length === 0 ? true : false;
    let aclPermissions = acl.getAclQueryPermissions('scheduler', 'view', loggedUser);
    // query["acl_meta.permissions"] = { "$in": aclPermissions };
    if (filter.assigned_to && filter.assigned_to.length > 0) {
        filter.assigned_to.forEach(element => {
            temp_assignee.push(ObjectId(element));
        });
        query['assigned_to'] = { $in: temp_assignee };
    }
    if (filter.type && filter.type.length > 0) {
        filter.type.forEach(element => {
            temp_type.push(ObjectId(element));
        });
        query['type'] = { $in: temp_type };
    }
    if (filter.associated_with && filter.associated_with.length > 0) {
        filter.associated_with.forEach(element => {
            temp_associatedWith.push(ObjectId(element));
        });
        query['associated_with'] = { $in: temp_associatedWith };
    }
    if (filter.status && filter.status.length > 0) {
        filter.status.forEach(element => {
            temp_status.push(ObjectId(element));
        });
        query['status'] = { $in: temp_status };
    }
    if (!isEmpty(filter.scheduleId)) {
        query._id = { $nin: [ObjectId(filter.scheduleId)] };
    }


    if (filter.created_by && filter.created_by.length > 0) {
        const createdBy = filter.created_by.map((userId) => ObjectId(userId))
        query['created_by'] = { $in: createdBy };
    }
    
    if (filter.dateRange && filter.dateRange.start && filter.dateRange.end) {
        query['created_at'] = { $gte: new Date(filter.dateRange.start), $lte: new Date(filter.dateRange.end) };
        
    }

    // Conditions for "Assigned Schedule" filter:
    // Assigned to others: created by me, acssigned to others not including me
    // Assigned to me: created by anyone, assigned to me
    // Conditions for "Scheduler" filter:
    // All Schedules assigned by me: created by me and assigned to others exclude to me.
    
    if (filter.isAssignedSchedule && filter.userAssignedToFliter) {
        if (filter.created_by) {
            const createdBy = filter.created_by.map((userId) => ObjectId(userId));
            query['$and'] = [
                { 'created_by': { $in: createdBy } },
                { $expr: { $not: { $in: ['$created_by', '$assigned_to'] } } }
            ];        
        }
    }

    if ((filter.isAssignedSchedule && !filter.userAssignedToFliter)) {
        query['$and'] = [
            { assigned_to: { $in: [loggedUser._id] } },
            { created_by: { $ne: loggedUser._id } }
        ];        
    }

    if (filter.options && !isEmpty(filter.options)) {
        let params = filter.options; 
        console.log("selected id: ", params.selectedId);
        const selectedIds = params.selectedId.map(id => ObjectId(id));

        if (!params.is_created && !params.is_assigned) {
            console.log("Here inside Common");
            query['$and'] = [
                { $or: [
                    { assigned_to: { $in: selectedIds } },
                    { created_by: { $in: selectedIds } }
                ]}
            ];
        }

         // Condition 2: is_created = true AND is_assigned = false
        if (params.is_created && !params.is_assigned) {
            console.log("Here inside creted By");
            query['created_by'] = { $in: selectedIds };
        }

        if (!params.is_created && params.is_assigned) {
            console.log("Here inside assigned By");
            query['$and'] = [
                { created_by: { $in: selectedIds } },
                { assigned_to: { $exists: true, $ne: selectedIds } }
            ];
        }
        
        // if (params.selectedId && params.selectedId.length > 0) {
        //     query['$and'] = [
        //         {
        //             $or: [
        //                 { assigned_to: { $in: params.selectedId.map(id => ObjectId(id)) } },
        //                 { created_by: { $in: params.selectedId.map(id => ObjectId(id)) } }
        //             ]
        //         }
        //     ];
        // }
    }

    
     
    if (filter.options && !isEmpty(filter.options)) {
        let params = filter.options;
        if (params.start_date) {
            if (params.end_date) {
                query['$or'] = [
                    { due_date: { $gte: getTodayStartTime(params.start_date), $lt: getTodayEndTime(params.end_date) } },
                    { start_date: { $gte: getTodayStartTime(params.start_date), $lt: getTodayEndTime(params.end_date) } },
                    { end_date: { $gte: getTodayStartTime(params.start_date), $lt: getTodayEndTime(params.end_date) } },
                    { meeting_date: { $gte: getTodayStartTime(params.start_date), $lt: getTodayEndTime(params.end_date) } },
                    { visit_date: { $gte: getTodayStartTime(params.start_date), $lt: getTodayEndTime(params.end_date) } },
                    { call_start_date: { $gte: getTodayStartTime(params.start_date), $lt: getTodayEndTime(params.end_date) } },
                    { deadline: { $gte: getTodayStartTime(params.start_date), $lt: getTodayEndTime(params.end_date) } },
                ]
            } else {
                query['$or'] = [
                    { due_date: { $gte: getTodayStartTime(params.start_date), $lt: getMonthLastDay(params.start_date) } },
                    { start_date: { $gte: getTodayStartTime(params.start_date), $lt: getMonthLastDay(params.start_date) } },
                    { end_date: { $gte: getTodayStartTime(params.start_date), $lt: getMonthLastDay(params.start_date) } },
                    { meeting_date: { $gte: getTodayStartTime(params.start_date), $lt: getMonthLastDay(params.start_date) } },
                    { visit_date: { $gte: getTodayStartTime(params.start_date), $lt: getMonthLastDay(params.start_date) } },
                    { call_start_date: { $gte: getTodayStartTime(params.start_date), $lt: getMonthLastDay(params.start_date) } },
                    { deadline: { $gte: getTodayStartTime(params.start_date), $lt: getMonthLastDay(params.start_date) } },
                ]
            }
        }

    }
    console.log("Query Details: ", JSON.stringify(query));
    return query;
}

function logAllActivities(stringValueOfAssociated_with, body, prevData, loggedUser) {
    if (stringValueOfAssociated_with.match(/^[0-9a-fA-F]{24}$/)) {
        if (!isEmpty(body.associated_with) && !isEmpty(prevData.associated_with)) {
            if (JSON.stringify(prevData.associated_with) == JSON.stringify(body.associated_with)) {
                // log of update schedule on linked(associated_with) (display on associated_with details)
                logActivity(body.associated_radio_with, auditUpdateAction, body.associated_with, loggedUser._id, body, 'updated the linked');
            }
            else if (JSON.stringify(prevData.associated_with) != JSON.stringify(body.associated_with)) {
                // log when you remove and add new associated_with (display on associated_with details)
                logActivity(body.associated_radio_with, auditLinkAction, body.associated_with, loggedUser._id, body, 'linked a');
                // log when you remove associated_with (display on associated_with details)
                logActivity(body.associated_radio_with, auditUnLinkAction, prevData.associated_with, loggedUser._id, body, 'unlinked from the');
            }
        }
        else if (isEmpty(body.associated_with) && !isEmpty(prevData.associated_with)) {
            // log when you remove associated_with (display on associated_with details)
            logActivity(body.associated_radio_with, auditUnLinkAction, prevData.associated_with, loggedUser._id, body, 'unlinked from the');
        }
        else if (!isEmpty(body.associated_with) && isEmpty(prevData.associated_with)) {
            // log when you add new associated_with (display on associated_with details)
            logActivity(body.associated_radio_with, auditLinkAction, body.associated_with, loggedUser._id, body, 'linked a');
        }
    }
}

async function addNotesOnChangeOfStatus(body, loggedUser, id) {
    const json_data_to_add_notes_On_marekd_as_completed = {
        data: body.completed_remarks,
        status: body.status,
        schedule_completed_note: 1,
        userId: ObjectId(loggedUser._id),
        date: new Date()
    };
    Notes.addNotes(id, json_data_to_add_notes_On_marekd_as_completed, loggedUser, shcedulerModule);
}

const common_queries = {
    filter: [
        { $lookup: { from: 'users', localField: 'assigned_to', foreignField: '_id', as: 'assignee_details' } },
        { $lookup: { from: 'status', localField: 'status', foreignField: '_id', as: 'status_details' } },
        { $lookup: { from: 'priority', localField: 'priority', foreignField: '_id', as: 'priority_details' } },
        { $lookup: { from: 'task_types', localField: 'type', foreignField: '_id', as: 'schedule_types' } },
        { $lookup: { from: 'contacts', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_contact_details' } },
        { $lookup: { from: 'lead', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_lead_details' } },
        { $lookup: { from: 'customer', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_customer_details' } },
        { $lookup: { from: 'supplier', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_supplier_details' } },
        { $lookup: { from: 'scheduler', localField: 'associated_with', foreignField: '_id', as: 'associatedWith_scheduler_details' } },
        { $lookup: { from: 'users', localField: 'created_by', foreignField: '_id', as: 'created_by_details' } },
        {
            $lookup: {
              from: 'audit',
              let: { schedulerId: '$_id' },
              pipeline: [
                {
                  $match: {
                    $expr: {
                      $and: [
                        { $eq: ['$documentId', '$$schedulerId'] },
                        { $eq: ['$action', 'checkIn'] }
                      ]
                    }
                  }
                },
                {
                  $lookup: {
                    from: 'users',
                    localField: 'userId',
                    foreignField: '_id',
                    as: 'user_details'
                  }
                },
                {
                  $addFields: {
                    user: { $arrayElemAt: ['$user_details', 0] }
                  }
                },
                {
                  $project: {
                    _id: 1,
                    message: 1,
                    data: 1,
                    date: 1,
                    'user.first_name': 1,
                    'user.last_name': 1
                  }
                }
              ],
              as: 'checkIn_audit_details'
            }
          },
          {
            $addFields: {
              checkIn_audit_details: {
                $map: {
                  input: '$checkIn_audit_details',
                  as: 'audit',
                  in: {
                    message: '$$audit.message',
                    data: '$$audit.data.checkedIn',
                    date: '$$audit.date',
                    userName: { $concat: ['$$audit.user.first_name', ' ', '$$audit.user.last_name'] }
                  }
                }
              }
            }
          },
        { $addFields: { isDelete: 1 } },
        {
            $project: {
                _id: 1,
                activity: 1,
                assigned_to: {
                    $map: {
                        input: '$assignee_details',
                        as: 'assignee',
                        in: { $concat: ['$$assignee.first_name', ' ', '$$assignee.last_name'] }
                    }
                },
                assigned_to_ids: {
                    $map: {
                      input: '$assignee_details',
                      as: 'assigneeId',
                      in: '$$assigneeId._id'
                    }
                },
                associated_with: 1,
                associated_radio_with: 1,
                category: 1,
                created_at: formatDate('$created_at'),
                created_by: 1,
                start_date: 1,
                end_date: 1,
                due_date: 1,
                meeting_date: 1,
                visit_date: 1,
                call_start_date: 1,
                deadline: 1,
                expense_report:1,
                deliverables: 1,
                description: 1,
                location: 1,
                checkIn_audit_details: 1,
                checked_in_user: 1,
                location_venue_radio: 1,
                start_time: 1,
                end_time: 1,
                meeting_end_time: 1,
                meeting_time: 1,
                due_time: 1,
                status: 1,
                priority: 1,
                subject: 1,
                deviation: 1,
                plannedDate:1,
                type: 1,
                venue_area: 1,
                venue_name: 1,
                assignee_details: 1,
                createdByName: { $concat: [{ $arrayElemAt: ['$created_by_details.first_name', 0] }, ' ', { $arrayElemAt: ['$created_by_details.last_name', 0] }] },
                assignee_details: 1,
                status_name: {
                    $cond: {
                        if: { $ne: ['$status_details', []] },
                        then: { $arrayElemAt: ['$status_details.type', 0] },
                        else: null
                    }
                },
                type_name: {
                    $cond: {
                        if: { $ne: ['$schedule_types', []] },
                        then: { $arrayElemAt: ['$schedule_types.type', 0] },
                        else: null
                    }
                },
                associatedWith_customer_details: 1,
                associatedWith_lead_details: 1,
                associatedWith_supplier_details: 1,
                associatedWith_contact_details: 1,
                associated_with_details: 1,
                associatedWith_scheduler_details: 1,
                recurrence_schedule: 1,
                recurrence_parentSchedule: 1,
                isDelete: 1,
                schedule_icon: {
                    $switch: {
                        branches: [
                            { case: { $and: [{ $eq: ['$created_by', '$loggedUser'] }, { $not: { $in: ['$loggedUser', '$assigned_to'] } }] }, then: 'fa-arrow-up' },
                            { case: { $and: [{ $ne: ['$created_by', '$loggedUser'] }, { $in: ['$loggedUser', '$assigned_to'] }] }, then: 'fa-arrow-down', },
                            { case: { $and: [{ $eq: ['$created_by', '$loggedUser'] }, { $in: ['$loggedUser', '$assigned_to'] }] }, then: 'fa-arrow-right', },
                        ],
                        default: ''
                    }
                },
                schedule_icon_color: {
                    $switch: {
                        branches: [
                            { case: { $and: [{ $eq: ['$created_by', '$loggedUser'] }, { $not: { $in: ['$loggedUser', '$assigned_to'] } }] }, then: '#051e4e' },
                            { case: { $and: [{ $ne: ['$created_by', '$loggedUser'] }, { $in: ['$loggedUser', '$assigned_to'] }] }, then: '#ffff' },
                            { case: { $and: [{ $eq: ['$created_by', '$loggedUser'] }, { $in: ['$loggedUser', '$assigned_to'] }] }, then: '#FC087E' },
                        ],
                        default: ''
                    }
                },
                card_icon: {
                    $switch: {
                        branches: [
                            { case: { $or: [{ $eq: ['$status', ObjectId('5a8eb11662a646e65f27a500')] }, { $eq: ['$category', ObjectId('5b6184d9c60a5e49ade7ef1b')] }] }, then: schedule_CardIcons.completed },
                            { case: { $eq: ['$status', ObjectId('5a8eb10b62a646e65f27a4ff')] }, then: schedule_CardIcons.inProgress },
                            { case: { $eq: ['$status', ObjectId('5a8eb11e62a646e65f27a501')] }, then: schedule_CardIcons.notStarted },
                            { case: { $eq: ['$status', ObjectId('5af09ba1c94cc441b55524f2')] }, then: schedule_CardIcons.overdue },
                            { case: { $eq: ['$status', ObjectId('5db2cb63b612365bf1c30793')] }, then: schedule_CardIcons.cancelled },
                        ],
                        default: ""
                    }
                },
                card_color: {
                    $switch: {
                        branches: [
                            { case: { $eq: ['$type', ObjectId('5a93a2c4152426c79f4bbdc5')] }, then: schedule_CardColor.FA },
                            { case: { $eq: ['$type', ObjectId('5aab8d4a9eaf9bce829b5c3c')] }, then: schedule_CardColor.TASK },
                            { case: { $eq: ['$type', ObjectId('5afbd730fc9609813663b0c2')] }, then: schedule_CardColor.MEETING },
                        ],
                        default: ""
                    }
                },
            }
        },
        { $sort: { start_date: 1, meeting_date: 1, visit_date: 1, call_start_date: 1, due_date: 1 } }
    ]
}

