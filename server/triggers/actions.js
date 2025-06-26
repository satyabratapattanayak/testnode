// @ts-check
const { isEmpty, isArray, isUndefined, capitalize } = require('lodash');
const Moment = require('moment');
const ObjectId = require('mongodb').ObjectID;
const handlebars = require('handlebars');

const { notificationFromAddsName, notificationFromAdds, origin } = require('../config/config');
const { Modules, auditActions, cmrStatus } = require('../modules/shared/shared.model');
const { getDateMonthYearTime, dateFormats } = require('../config/dateutil');
const notificationService = require('../service/notification');
const Model = require('../service/get_user_types');
const NotificationModel = require('../modules/notification/notification.model');
const database = require('../service/database');
const DataAccess = require('../helpers/DataAccess');

let password_reset_url = `${origin}/#/resetpassword?token=`
var DateFormats = {
    short: dateFormats.short,
    medium: dateFormats.medium,
    long: dateFormats.long,
};

handlebars.registerHelper("formatDate", function (datetime, format) {
    if (Moment) {
        format = DateFormats[format] || format;
        return Moment(datetime).format(format);
    } else {
        return datetime;
    }
});


let db;
let flag = true;
let userCollection;
let scheduledActions;
let notificationTrack;
let templatesMap = {};
let subjectMap = {};
let Regions = {};
let Users = {};
let Areas = {};
let Zones = {};
let AllStatus = {};
let CustomerCategorys = {};
let SchedulerCategorys = {};
let SchedulerTypes = {};
let pushNotifiTitle = {};
let pushNotifiBody = {};

database.getDb().then(async res => {

    db = res;
    userCollection = db.collection(Modules().user);
    scheduledActions = db.collection('scheduled_actions');
    notificationTrack = db.collection(Modules().notification);
    // notification_templates = db.collection(Modules().notificationTemplates);
    // customer_category = db.collection(Modules().customerCategory);
    let tempData = [];
    loadUsers(tempData);
    setEmailTemplates(tempData);
    setPushTemplates(tempData);
    setRegions(tempData);
    setAreas(tempData);
    setZones(tempData);
    setCustomerCategory(tempData);
    setStatus(tempData);
    setSchedulerTypes(tempData);
    setSchedulerCategories(tempData);
});

const actions = {
    setCreateTime: (params, doc) => {
        doc.createAt = new Date();
    },

    setCreateBy: (params, doc) => { },

    setUpdateTime: (params, doc) => { },

    scheduleAction: (actionName, params, doc, time) => {
        scheduledActions.insertOne({ actionName, params, doc, time });
    },

    saveNotificationSentDetails: (doc, auditData) => {
        // notificationTrack.insertOne(doc);
        NotificationModel.create(doc, { _id: auditData.userId })
    },

    sendNotifications: async (params, doc) => {
        console.log('sendEmailNotification: ', params, ':::', doc);
        let route = setRoute(doc)
        let actualModel, cmrDetails;
        if (doc.module) {
            actualModel = await Model.findOneByQuery(doc.module, { _id: new ObjectId(doc.documentId) });
            if(doc.module==='customer_cmr_details'){
                actualModel = await Model.findOneByQuery('customer', { _id: new ObjectId(actualModel.customer_id) });
                cmrDetails = await Model.findOneByQuery('customer_cmr_details', { _id: new ObjectId(doc.documentId) });
            }
        }
        let CMRNewStatus = cmrStatus().filter((key) => key.value == doc.data.newStatus);
        let CMROldStatus = cmrStatus().filter((key) => key.value == doc.data.oldStatus);

        actualModel.associated_with_name = "";
        actualModel.associated_with_lable_name = 
            actualModel.associated_radio_with === 'lead' ? 'Lead Name' :
            actualModel.associated_radio_with === 'customer' ? 'Customer Name' :
            actualModel.associated_radio_with === 'dealer' ? 'Dealer Name' :
            '';
        if (actualModel.associated_with && typeof actualModel.associated_with === 'string' && actualModel.associated_with.trim() !== "" && ObjectId.isValid(actualModel.associated_with.trim())) {
            try {
                let associatedPersonDetails = await Model.findOneByQuery('customer', { _id: new ObjectId(actualModel.associated_with.trim()) });
                actualModel.associated_with_name = (associatedPersonDetails && associatedPersonDetails.customer_name) ? associatedPersonDetails.customer_name : '';
            } catch (error) {
                console.error("Error fetching associated person details:", error);
            }
        }

        let CMRStatus = {
            newStatus: CMRNewStatus[0],
            oldStatus: CMROldStatus[0]
        };

        // let query = { $or: [{ $and: [] }] };
        let query = { deleted: { $ne: 1 }, isActive: { $ne: false }, $or: [] };
        if (params && params.to) {
            let groups = [];
            if (params.to.users && params.to.users.length > 0) {
                usersByGroup(doc, params, groups, query);
            }

            if (groups && groups.length > 0 && params.to.RegionAreaZone && params.to.RegionAreaZone.length > 0) {
                RegionAreaZone(doc, params, actualModel, query);
            }

            if (params.to.filterBy && params.to.filterBy.length > 0) {
                filterBy(doc, params, actualModel, query);
            }

            if (params.to.filterAuditBy && params.to.filterAuditBy.length > 0) {
                filterAuditBy(doc, params, query, cmrDetails);
            }

            if (params.to.specificUsers && params.to.specificUsers.length > 0) {
                specificUsers(doc, params, query);
            }

            if (params.to.roles && params.to.roles.length > 0) {
                Roles(doc, params, query);
            }

            if (params.to.hierarchy && params.to.hierarchy.length > 0) {
                await getUsersByHierarchy(doc, params, query);
            }

            const updatedUser = await Model.getDocumentById('users', doc.userId == 'cron' ? null : doc.userId);

            let source = templatesMap[params.emailTemplateId];
            let subjectsource = subjectMap[params.emailTemplateId];
            if (!subjectsource) {
                subjectsource = "No Subject";
            }

            if (source) {

                console.log("users Query", JSON.stringify(query));
                let resp = [];

                if (!isEmpty(query['$or'])) {
                    resp = await Model.getAllUsersFromQuery('users', query)
                }
                if (params.to.specificEmails && params.to.specificEmails.length > 0) {
                    specificEmails(doc, params, resp);
                }

                let uniqueUsers = [];
                if (resp && resp.length > 0) {
                    uniqueUsers = getUniqueUsers(resp);
                }
                console.log('getAllUsersFromQuery ', resp && resp.length);
                const AddedBy = updatedUser ? updatedUser.first_name + ' ' + updatedUser.last_name : undefined;
                let mod = doc.module;
               
                let regionId = doc.module ? actualModel[mod + '_region'] : null;
                let areaId = doc.module ? actualModel[mod + '_area'] : null;
                let zoneId = doc.module ? actualModel[mod + '_zone'] : null;
                if (mod === 'customer_cmr_details') {
                    regionId = doc.data.customer_region;
                    areaId = doc.data.customer_area;
                    zoneId = doc.data.customer_zone;
                }
                console.log("regionId",regionId);

                if (actualModel && actualModel.assigned_to && actualModel.assigned_to.length > 0) {
                    actualModel.assigned_to = actualModel.assigned_to.map((e) => e = Users[String(e)]);
                }

                if (uniqueUsers && uniqueUsers.length > 0) {
                    const StringConvertedData = JSON.stringify(doc.data);
                    let context = {
                        doc: doc,
                        fromUser: updatedUser,
                        requestModel: doc.data,
                        actualModel,
                        cmrDetails,
                        CMRData: doc.data,
                        StringConvertedData,
                        Notes: doc.data.data,
                        Region: Regions[String(regionId)],
                        Area: Areas[String(areaId)],
                        Zone: Zones[String(zoneId)],
                        customerCategory: actualModel ? CustomerCategorys[actualModel.customer_category] : null,
                        CMRStatus: CMRStatus,
                        SchedulerType: actualModel ? SchedulerTypes[String(actualModel.type)] : null,
                        SchedulerCategory: actualModel ? SchedulerCategorys[String(actualModel.category)] : null,
                        newStatus: AllStatus[String(doc.data.newStatus)],
                        prevStatus: AllStatus[String(doc.data.oldStatus)],
                        customMessage: doc.data.sendForApproval ? 'sent a CMR for approval' : 'approved the CMR',
                        Date: {
                            start_date: actualModel && actualModel.start_date ? getDateMonthYearTime(actualModel.start_date) : actualModel && actualModel.visit_date ? getDateMonthYearTime(actualModel.visit_date) : null,
                            end_date: actualModel && actualModel.end_date ? getDateMonthYearTime(actualModel.end_date) : null,
                            due_date: actualModel && actualModel.due_date ? getDateMonthYearTime(actualModel.due_date) : actualModel && actualModel.call_start_date ? getDateMonthYearTime(actualModel.call_start_date) : null,
                            meeting_date: actualModel && actualModel.meeting_date ? getDateMonthYearTime(actualModel.meeting_date) : null,
                            created_at: actualModel && actualModel.created_at ? getDateMonthYearTime(actualModel.created_at) : null,
                            audit_date: doc.date ? getDateMonthYearTime(doc.date) : null
                        },

                        url: 'http://localhost:4200/#/staff/staffdetails/5c58286d30c8e15ac88fb671',
                        URL: {
                            password_reset_url: password_reset_url,
                            WebAppLogin: `${origin}/#/login`,
                            documentDetailsUrl: `${origin}/#/${route}`
                        }
                    };
                    let emailUsers = [];
                    uniqueUsers.forEach(user => {
                        emailUsers.push({
                            name: user.first_name,
                            email: user.email,
                            _id: user._id,
                        })
                    });
                    if (emailUsers.length > 0 && params.enableEmail || (doc.data.notify_by_email && doc.action == auditActions().reminder)) {
                        sendEmails(source, subjectsource, context, emailUsers, AddedBy);
                    }
                    uniqueUsers.forEach(eachUser => {
                        console.log('eachUser ', eachUser.email, ' :: ', eachUser.group);
                        context.toUser = eachUser;
                        if (params.enablePush) {
                            sendPushNotifications(params, context, eachUser);
                        }
                    });
                }

            }
        }
    },

    sendEmail: async (user, message, data, auditData, updatedUser) => {
        if (user.email) {
            message.to = !isUndefined(user.first_name) ? user.first_name + '<' + user.email + '>' : user.email;
            message.from = notificationFromAdds ? notificationFromAddsName + '<' + notificationFromAdds + '>' : 'info@seventech.co';
        } else if (user.length > 0) {
            message.to = user;
            message.from = notificationFromAdds ? notificationFromAddsName + '<' + notificationFromAdds + '>' : 'info@seventech.co';

        }

        let dataToKeepNotiTrack = {
            content: message,
            type: 'email',
            status: 'success',
            reciepient_userId: user._id,
            reciepient_userIds: user.map(u => u._id),
            reciepient_email: user.email,
            reciepients: message.to,
            documentId: data._id
        };
        let response;
        if (!message.to || message.to.length < 1) {
            return;
        }
        try {
            response = await notificationService.sendEmail(message);
            dataToKeepNotiTrack.sendgrid_messageId = response[0].headers['x-message-id'];
            dataToKeepNotiTrack.date = new Date(response[0].headers['date']);
            saveNotifier('email', user, data, auditData, message.subject, dataToKeepNotiTrack.sendgrid_messageId, dataToKeepNotiTrack)
        } catch (error) {
            dataToKeepNotiTrack.status = 'error';
            dataToKeepNotiTrack.sendgrid_messageId = error;
            dataToKeepNotiTrack.date = new Date();
            console.log('Error sending email:', error, response, message);
        } finally {
            actions.saveNotificationSentDetails(dataToKeepNotiTrack, auditData);
        }
    },

    sendPushNotification: async (user, message, data, auditData) => {
        let tokens = user.tokens;
        let flag = true;
        if (tokens && tokens.length > 0) {
            for (const token of tokens) {
                if (token) {

                    let insert_reciepient_track = {
                        type: 'push',
                        status: 'success',
                        contents: message,
                        date: new Date()
                    };

                    try {
                        const response = await notificationService.sendMessage(token, message);
                        insert_reciepient_track.pushNotificationId = response;
                        console.log('Successfully sent Push Notification:', response.failureCount, ' :: ', response.successCount);
                        if (response && response.successCount && response.successCount === 1) {
                            console.log('PUSH NOTIFI SUCCESS: ', response.successCount, ' :: ', response.failureCount);
                            actions.saveNotificationSentDetails(insert_reciepient_track, auditData);
                        }
                    } catch (error) {
                        insert_reciepient_track.pushNotificationId = error;
                        insert_reciepient_track.status = 'error';
                        user.tokens.splice(user.tokens.indexOf(token), 1);
                        userCollection.updateOne({ _id: user._id }, { $set: { tokens: user.tokens } });
                    }
                }
            }
        }
    },

    sendSMS: (params, doc) => {
        // console.log("sendSMS");
    },

};

// module.exports = actions;
module.exports = actions, refreshUsers;



const getUniqueUsers = (users = []) => {
    let uniqueArray = [];
    for (const iterator of users) {
        let uniqueUser = uniqueArray.find((user) => {
            if (user) {
                return user.email === iterator.email;
            }
        });
        if (!uniqueUser) {
            uniqueArray.push(iterator);
        }
    }
    return uniqueArray;
};

function sendPushNotifications(params, context, eachUser) {
    let pushSource = pushNotifiTitle[params.pushTemplateId];
    let pushSubSource = pushNotifiBody[params.pushTemplateId];
    if (pushSource) {
        let pushTemplate = handlebars.compile(pushSource);
        let pushSubject = handlebars.compile(pushSubSource);
        let pushTitle = pushTemplate(context);
        let pushBody = pushSubject(context);
        let payload = {
            notification: {
                title: pushTitle,
                body: pushBody,
            },
            data: {
                doc: JSON.stringify(context.actualModel),
            },
        };
        actions.sendPushNotification(eachUser, payload, context.actualModel, context.doc);
    }
}

function sendEmails(source, subjectsource, context, eachUser, AddedBy) {
    let template = handlebars.compile(source);
    let subjecttemplate = handlebars.compile(subjectsource);
    let html = template(context);
    let subjecthtml = subjecttemplate(context);
    const emailMessage = {
        subject: subjecthtml,
        html: html,
    };
    actions.sendEmail(eachUser, emailMessage, context.actualModel, context.doc, AddedBy);
}

function usersByGroup(doc, params, groups, query,) {
    let userTypes = params.to.users;
    userTypes.forEach(type => {
        if (type.name) {
            let result = false;
            if (type.if && type.if != "") {
                eval(type.if);
            }
            else {
                result = true;
            }
            if (result) {
                if (isArray(type.name)) {
                    type.name.forEach(name => {
                        groups.push(name);
                    })
                } else {
                    groups.push(type.name);
                }

            }
        }
    });
    if (groups && groups.length > 0) {
        query['$or'][0] = { $and: [] };
        query['$or'][0]['$and'].push({ group: { '$in': groups } });
    }
}

function RegionAreaZone(doc, params, actualModel, query) {
    let filters = params.to.RegionAreaZone;
    filters.forEach(filter => {
        let result;
        if (filter.if && filter.if != "") {
            eval(filter.if);
        }
        else {
            result = true;
        }
        if (result && filter.userKey && filter.docKey) {
            let docValue = actualModel[filter.docKey];
            if (docValue) {
                if (typeof docValue == "string") {
                    query['$or'][0]['$and'].push({ [filter.userKey]: { $in: [ObjectId(docValue)] } });
                }
                else if (ObjectId.isValid(docValue)) {
                    query['$or'][0]['$and'].push({ [filter.userKey]: { $in: [ObjectId(docValue)] } });
                }
                else if (isArray(docValue)) {
                    query['$or'][0]['$and'].push({ [filter.userKey]: { $in: docValue } });
                }
            }
            else {
                // console.log("no key " + filter.docKey + " actualModel" + actualModel);
            }
        }
    });
}

function filterBy(doc, params, actualModel, query) {
    let filters = params.to.filterBy;
    filters.forEach(filter => {
        let result;
        if (filter.if && filter.if != "") {
            eval(filter.if);
        } else {
            result = true;
        }
        if (result && filter.userKey && filter.docKey) {
            let docValue = actualModel[filter.docKey];
            if (docValue) {
                if (typeof docValue == "string") {
                    // process string value
                } else if (isArray(docValue)) {
                    if (filter.linkedByKey) {
                        let ids = [];
                        for (const iterate of docValue) {
                            ids.push(ObjectId(iterate[filter.linkedByKey]));
                        }
                        query['$or'].push({ [filter.userKey]: { $in: ids } });
                    } else {
                        query['$or'].push({ [filter.userKey]: { $in: docValue } });
                    }
                } else {
                    if (filter.linkedByKey) {
                        query['$or'].push({ [filter.userKey]: { $in: [docValue[filter.linkedByKey]] } });
                    } else {
                        query['$or'].push({ [filter.userKey]: { $in: [docValue] } });
                    }
                }
            }
            else {
                // console.log("no key " + filter.docKey + " actualModel" + actualModel);
            }
        }
    });
}

function filterAuditBy(doc, params, query, cmrDetails) {
    const filterAudit = params.to.filterAuditBy;
    // Adding created by and pre approvals on the doc for CMRs.
    doc.data.CMRcreated_by = (cmrDetails && cmrDetails.created_by !== undefined && cmrDetails.created_by !== null)
    ? cmrDetails.created_by
    : (doc.data.CMRcreated_by !== undefined && doc.data.CMRcreated_by !== "")
    ? doc.data.CMRcreated_by
    : '';
    if (cmrDetails && cmrDetails.approvals) {
        let approverIds = [];
        for (const iterator of cmrDetails.approvals) {
            approverIds.push(ObjectId(iterator.approver_id));
        }
        doc.data.prevApprovers = approverIds;
    }
    for (const filter of filterAudit) {
        let result;
        if (filter.if && filter.if != "") {
            eval(filter.if);
        }
        else {
            result = true;
        }
        if (result && filter.userKey && filter.docKey) {
            let docValue = doc[filter.docKey];
            if (docValue) {
                if (typeof docValue == "string") {
                    if (filter.KeyFromData) {
                        if (filter.userKey == "_id") {
                            query['$or'].push({ [filter.userKey]: { $in: [ObjectId(docValue[filter.KeyFromData])] } });
                        } else {
                            query['$or'].push({ [filter.userKey]: { $in: [docValue[filter.KeyFromData]] } });
                        }
                    } else {
                        query['$or'].push({ [filter.userKey]: ObjectId(docValue) });
                    }
                } else if (isArray(docValue)) {
                    if (filter.KeyFromData) {
                        let ids = [];
                        for (const iterate of docValue) {
                            ids.push(ObjectId(iterate[filter.KeyFromData]));
                        }
                        query['$or'].push({ [filter.userKey]: { $in: ids } });
                    } else { }
                } else {
                    if (filter.KeyFromData) {
                        if (isArray(docValue[filter.KeyFromData])) {
                            query['$or'].push({ [filter.userKey]: { $in: docValue[filter.KeyFromData] } });
                        } else {
                            if (filter.userKey == "_id") {
                                query['$or'].push({ [filter.userKey]: { $in: [ObjectId(docValue[filter.KeyFromData])] } });
                            } else {
                                query['$or'].push({ [filter.userKey]: { $in: [docValue[filter.KeyFromData]] } });
                            }
                        }
                    }
                    else {
                        query['$or'].push({ [filter.userKey]: ObjectId(docValue) });
                    }
                }
            }
            else {
                // console.log("no key " + filter.docKey + " actualModel" + actualModel);
            }
        }
    }
}

function specificUsers(doc, params, query) {
    const filterUsers = params.to.specificUsers;
    for (const filter of filterUsers) {
        let result;
        if (filter.if && filter.if != "") {
            eval(filter.if);
        }
        else {
            result = true;
        }
        if (result && filter.userKey) {
            query['$or'].push({ [filter.userKey]: { $in: [ObjectId(filter.value)] } });
        }
    }
}

function specificEmails(doc, params, resp) {
    const filterEmails = params.to.specificEmails;
    for (const email of filterEmails) {
        resp.push({ email: email });
    }
}

function Roles(doc, params, query) {
    const filterUsers = params.to.roles;
    for (const filter of filterUsers) {
        let result;
        if (filter.if && filter.if != "") {
            eval(filter.if);
        } else {
            result = true;
        }
        if (result && filter.userKey && filter.docKey) {
            query['$or'].push({ [filter.userKey]: filter.docKey });
        }
    }
}

async function getUsersByHierarchy(doc, params, query) {
    const filterHierarchy = params.to.hierarchy;
    for (const filter of filterHierarchy) {
        let result, hierarchyKey;
        hierarchyKey = filter.userKey;
        if (filter.if && filter.if != "") {
            eval(filter.if);
        } else {
            result = true;
        }
        const existValue = doc.data[hierarchyKey] !== undefined && doc.data[hierarchyKey] !== '' ? doc.data[hierarchyKey] : doc[hierarchyKey];
        if (result && existValue) {
            let idsToUse = Array.isArray(existValue) ? existValue : [existValue].filter(Boolean);
            for (const id of idsToUse) {
                const getUserIds = await getUserIdsInHierarchy(id, filter.name || "", filter.level || 0);
                query['$or'].push({ ['_id']: { $in: getUserIds } });
              }
        }
    }
}

async function getUserIdsInHierarchy(loginUserId, hierarchyLimit, hierarchyLevel) {
    try {
        const hierarchy = [];
        hierarchyLevel = parseInt(hierarchyLevel);
        // Recursive function to traverse the hierarchy
        async function traverseReverseHierarchy(currentUserId, currentLevel) {
            const user = await DataAccess.findOne('users', { _id: ObjectId(currentUserId) });
            if (!user) return;

            hierarchy.push(user._id);

            if (hierarchyLimit && user.group.includes(hierarchyLimit)) {
                return; // return when hierarchy limit is found
            }

            if (hierarchyLevel !== null && hierarchyLevel !== undefined && parseInt(currentLevel) === hierarchyLevel) {
                return; // return when hierarchy level is found
            }

            if (Array.isArray(user.role_access_reports_mapping)) {
                for (const mapping of user.role_access_reports_mapping) {
                    if (Array.isArray(mapping.reports_to)) {
                        for (const report of mapping.reports_to) {
                            if (report.id) {
                                const reportsToUserId = report.id;
                                await traverseReverseHierarchy(reportsToUserId, currentLevel + 1);
                            }
                        }
                    }
                }
            }
        }

        await traverseReverseHierarchy(loginUserId, 0);
        return hierarchy;
    } catch (err) {
        console.error(err);
        throw err;
    }
}

async function setSchedulerCategories(tempData) {
    tempData = await Model.findAll('scheduler_categories', {});
    for (const region of tempData) {
        let id = region._id + "";
        SchedulerCategorys[id] = region.category;
    }
    return tempData;
}

async function setSchedulerTypes(tempData) {
    tempData = await Model.findAll('task_types', {});
    for (const region of tempData) {
        let id = region._id + "";
        SchedulerTypes[id] = region.type;
    }
    return tempData;
}

async function setStatus(tempData) {
    tempData = await Model.findAll('status', {});
    for (const region of tempData) {
        let id = region._id + "";
        AllStatus[id] = region.type;
    }
    return tempData;
}

async function setCustomerCategory(tempData) {
    tempData = await Model.findAll('customer_category', {});
    for (const region of tempData) {
        let id = region.key;
        CustomerCategorys[id] = region.category;
    }
    return tempData;
}

async function setZones(tempData) {
    tempData = await Model.findAll('zone', {});
    for (const region of tempData) {
        let id = region._id + "";
        Zones[id] = region.zone;
    }
    return tempData;
}

async function setAreas(tempData) {
    tempData = await Model.findAll('area', {});
    for (const region of tempData) {
        let id = region._id + "";
        Areas[id] = region.area;
    }
}

async function setRegions(tempData) {
    tempData = await Model.findAll('region', {});
    for (const region of tempData) {
        let id = region._id + "";
        Regions[id] = region.region;
    }
}


async function loadUsers(tempData) {
    tempData = await Model.findAll(Modules().user, { deleted: { $ne: 1 } });
    for (const user of tempData) {
        let id = user._id + "";
        Users[id] = user.first_name + ' ' + user.last_name;
    }
}

async function refreshUsers() {
    let data = await Model.findAll(Modules().user, { deleted: { $ne: 1 } });
    for (const user of data) {
        let id = user._id + "";
        Users[id] = user.first_name + ' ' + user.last_name;
    }
}

async function setEmailTemplates(tempData) {
    tempData = await Model.findAll('notification_templates', { type: 'email' });
    for (const template of tempData) {
        let id = template._id + "";
        templatesMap[id] = template.html;
        subjectMap[id] = template.subject;
    }

}

async function setPushTemplates(tempData) {
    tempData = await Model.findAll('notification_templates', { type: 'push' });
    for (const region of tempData) {
        let id = region._id + "";
        pushNotifiBody[id] = region.body;
        pushNotifiTitle[id] = region.title;
    }
}

function saveNotifier(type, reciepient, data, auditData, message, responseId, payload) {
    let dataToSave = {
        sent: type,
        message: message,
        type: 'notifier',
        status: payload.status,
        reciepient_userId: reciepient._id,
        reciepient_email: reciepient.email,
        notification_responseId: responseId,
        documentId: data._id,
        module: auditData.module,
        date: new Date(payload.date),
        read: 0,
        deleted: 0,
    };
    actions.saveNotificationSentDetails(dataToSave, auditData)
}

const setRoute = (doc) => {
    let route;
    const key = doc.module;
    switch (key) {
        case Modules().lead: {
            route = `leads/leaddetails/${doc.documentId}`; break
        };
        case Modules().customer: {
            if (doc.action === auditActions().elapse) {
                route = `bd-activity/dynamicform;id=${doc.documentId}`; break
            } else if (doc.subModule === Modules().cmr) {
                route = `cmr-list/cmr;customer_id=${doc.documentId};id=${doc.data._id}`; break
            } else {
                route = `customers/customerdetail/${doc.documentId}`; break
            }
        };
        case Modules().contact: {
            route = `contacts/contactdetail/${doc.documentId}`; break
        };
        case Modules().user: {
            route = `staff/staffdetails/${doc.documentId}`; break
        };
        case Modules().supplier: {
            route = `supplier/supplier-details/${doc.documentId}`; break
        };
        case Modules().dealer: {
            route = `dealers/dealerdetails/${doc.documentId}`; break
        };
        case Modules().shceduler: {
            // route = `schedule/calendar`; break
            route = `schedule/calendar?id=${doc.documentId}`; break
        };
        default:
            route = `dashboard`; break
            break;
    }

    return route.includes('?') ? `${route}&source=email` : `${route}?source=email`;
}