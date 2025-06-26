const express = require('express');
const router = express.Router();
const { isArray, isEmpty, head, first } = require('lodash');
const jwt = require('jsonwebtoken');
const objectid = require('mongodb').ObjectID;
const PubSub = require('pubsub-js');

const Config = require('../../config/config');
const Lead = require('../lead/lead.model.js');
const Audit = require('../audit/audit.model.js');
const Notes = require('../notes/notes.model.js');

const { getDateMonthYearTime } = require('../../config/dateutil');
const { getCurrentUserInfo } = require('../shared/shared.controller');
const { auditActions, Modules } = require('../shared/shared.model');



let saveLeadActivity = (body) => {
    body.date = new Date();
    Audit.addLog(body);
};
const addLog = (action, id, userId, doc, msg) => {
    saveLeadActivity({
        module: Modules().lead,
        action: action,
        documentId: objectid(id),
        userId: objectid(userId),
        data: doc,
        message: msg,
    });
};


const addNote = (module, documentId, notes, user) => {
    if (isEmpty(notes) || !notes) { notes = []; } else {
        notes = [{
            data: notes,
            userId: objectid(user),
            date: new Date()
        }];
    }
    const body = {
        module: module,
        documentId: documentId,
        notes: notes
    };
    Notes.create(body);
};

const matchCountryAndBusinessUnit = (doc, country, businessunit, number) => {
    if (doc.lead_country == 'IN' && doc.businessunit == businessunit) {
        doc.number_series = number;
    } else if (doc.lead_country != 'IN' && doc.businessunit == businessunit) {
        doc.number_series = 2;
    }
};

const setNumberSeries = (doc) => {
    switch (doc.businessunit) {
        case 'masterbatch':
            matchCountryAndBusinessUnit(doc, doc.lead_country, doc.businessunit, 1);
            break;
        case 'ssg':
            matchCountryAndBusinessUnit(doc, doc.lead_country, doc.businessunit, 3);
            break;
        case 'nfc_wpc_profiles':
            matchCountryAndBusinessUnit(doc, doc.lead_country, doc.businessunit, 4);
            break;
        case 'n2n_bio_deg_&_comp':
            matchCountryAndBusinessUnit(doc, doc.lead_country, doc.businessunit, 5);
            break;
        case 'performance_material':
            matchCountryAndBusinessUnit(doc, doc.lead_country, doc.businessunit, 1);
            break;
        case 'innovative_materials_group':
            matchCountryAndBusinessUnit(doc, doc.lead_country, doc.businessunit, 5);
            break;
        case 'common':
            matchCountryAndBusinessUnit(doc, doc.lead_country, doc.businessunit, 1);
            break;
        default:
            break;
    }
};

const listAll = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await Lead.all(req.body, currentLoggedUser);
        if (isEmpty(result)) { res.status(404).json({ message: 'Leads not found!', status: 404 }); } else {
            result.forEach(element => {
                // element.created_at = getDateMonthYearTime(element.created_at);
                delete element.region_details;
                delete element.assignee_details;
            });
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

const filter = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await Lead.filter(currentLoggedUser, req.body);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'no results found', status: 404 });
        } else {
            result.forEach(element => {
                element.created_at = getDateMonthYearTime(element.created_at);
            });
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

const leadDetails = (req, res, next) => {
    Lead.findById(req.params.id)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ success: false, message: 'Lead not found!', status: 404 });
            } else {
                result.forEach(element => {
                    if (!isEmpty(element.linked_staff)) {
                        let mergeObject;
                        let arrObject = [];
                        element.linked_staff.forEach(marketId => {
                            const cust_marketDetails = element.linked_staff_details.find((markestInfo) => {
                                return JSON.stringify(marketId.staffId) == JSON.stringify(markestInfo._id);
                            });

                            if (cust_marketDetails) {
                                // delete cust_marketDetails._id;
                                mergeObject = { ...marketId, ...cust_marketDetails };
                                arrObject.push(mergeObject);
                            }
                        });
                        element.linked_staff = arrObject;
                    }

                    if (!isEmpty(element.assignee_details)) {
                        let assignees = [];
                        element.lead_assigned_to.forEach(ele => {
                            const assigneeDetails = element.assignee_details.find((user) => {
                                return JSON.stringify(user._id) == JSON.stringify(ele);
                            });
                            if (assigneeDetails) {
                                assignees.push({ id: assigneeDetails._id, name: assigneeDetails.first_name + ' ' + assigneeDetails.last_name });
                            }
                        });
                        element.lead_assigned_to = assignees;
                    }

                    if (!isEmpty(element.lead_business_category)) {
                        let businessCategory = [];
                        element.lead_business_category.forEach(category => {
                            const bcDetails = element.business_category_details.find((categoryDetails) => {
                                return JSON.stringify(category) == JSON.stringify(categoryDetails._id);
                            });
                            if (bcDetails) {
                                businessCategory.push({ id: category, name: bcDetails.category });
                            }
                        });
                        element.lead_business_category = businessCategory;
                    }

                    if (!isEmpty(element.lead_business_division)) {
                        let businessDivision = [];
                        element.lead_business_division.forEach(division => {
                            const bdDetails = element.business_division_details.find((divisionDetails) => {
                                return JSON.stringify(division) == JSON.stringify(divisionDetails._id);
                            });
                            if (bdDetails) {
                                businessDivision.push({ id: division, name: bdDetails.division });
                            }
                        });
                        element.lead_business_division = businessDivision;
                    }

                    if (!isEmpty(element.lead_business_group)) {
                        let businessGroup = [];
                        element.lead_business_group.forEach(group => {
                            const bcDetails = element.business_group_details.find((groupDetails) => {
                                return JSON.stringify(group) == JSON.stringify(groupDetails._id);
                            });
                            if (bcDetails) {
                                businessGroup.push({ id: group, name: bcDetails.group });
                            }
                        });
                        element.lead_business_group = businessGroup;
                    }

                    if (!isEmpty(element.state_details)) element.lead_state_name = element.state_details[0].state;
                    if (!isEmpty(element.status_details)) element.lead_status_name = element.status_details[0].type;

                    if (!isEmpty(element.createdBy_details)) element.created_by = element.createdBy_details[0].first_name;
                    delete element.createdBy_details, delete element.linked_staff_details;
                    delete element.state_details, delete element.assignee_details, delete element.status_details;
                    delete element.region_details, delete element.area_details, delete element.zone_details;
                    delete element.business_division_details, delete element.business_group_details, delete element.business_category_details;
                });
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const create = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        // if (req.body.lead_status) { req.body.lead_status = objectid(req.body.lead_status); }
        if (req.body.lead_state && objectid.isValid(req.body.lead_state)) {
            req.body.lead_state = objectid(req.body.lead_state);
        }

        if (req.body.lead_assigned_to) {
            let selectedAssignee = [];
            req.body.lead_assigned_to.forEach(element => { selectedAssignee.push(objectid(element)); });
            req.body.lead_assigned_to = selectedAssignee;
        } else {
            req.body.lead_assigned_to = [];
        }

        req.body.created_by = objectid(currentLoggedUser._id);
        req.body.created_at = new Date();
        req.body.modified_At = new Date();
        if (req.body._id) {
            req.body.offlineSyncId = req.body._id;
            delete req.body._id;
        }

        if (req.body.businessunit) {
            setNumberSeries(req.body);
        }

        const result = await Lead.create(req.body, currentLoggedUser);
        PubSub.publishSync('DBUpdates', { change: 'lead', data: result[0] });
        if (req.body.offlineSyncId) {
            const deleteDupData = {
                delete: true,
                deleted: 1,
                _id: req.body.offlineSyncId
            };
            PubSub.publishSync('DBDelete', { change: 'lead', data: deleteDupData });
        }
        res.status(200).json({ message: 'Lead successffully created!', status: 200, leadId: first(result)._id });
        addNote(Modules().lead, head(result)._id, head(result).notes, currentLoggedUser._id);
    } catch (error) {
        next(error);
    }
};

const update = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const id = req.params.id;
        console.log('LEAD UPDATE: ', req.body);
        const result = await Lead.update(id, req.body, currentLoggedUser);
        if (result == 1) {
            res.status(200).json({ message: 'Lead successffully updated!', status: 200 });
        } else if (result == 0) {
            res.status(200).json({ message: 'nothing to update. please check the data and leadID', status: 200 });
        }
    } catch (error) {
        next(error);
    }
};

const addNotes = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const id = req.params.leadId;


        if (req.body.files) {
            let uploadedFile = [];
            req.body.files.forEach(element => {
                uploadedFile.push(objectid(element.id));
            });
            req.body.files = uploadedFile;
        }

        if (!isEmpty(req.body.tagged_users)) {
            let t_users = [];
            req.body.tagged_users.forEach(element => {
                t_users.push(objectid(element));
            });
            req.body.tagged_users = t_users;
        } else {
            req.body.tagged_users = [];
        }


        req.body.userId = objectid(currentLoggedUser._id);
        req.body.date = new Date();
        Notes.addNotes(id, req.body, currentLoggedUser, Modules().lead)
            .then((result) => {
                console.log('result: ', result);

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

const deleteLead = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const id = req.params.id;
        const result = await Lead.deleteById(id, currentLoggedUser);
        if (result == 1) {
            res.status(200).json({ message: 'Lead deleted successfully', status: 200 });
            const deleteDupData = {
                delete: true,
                _id: id
            };
            PubSub.publishSync('DBDelete', { change: 'lead', data: deleteDupData });
        } else {
            res.json({ message: 'Lead not deleted successfully' });
        }
    } catch (error) {
        next(error);
    }
};

const canApproveLead = (id, currentLoggedUser) => {
    return new Promise((resolve, reject) => {
        Lead.findOne(id).then(leadDetails => {
            if (leadDetails) {
                let leadData = leadDetails;

                if ((currentLoggedUser.group.indexOf('rbm') != -1 ||
                    currentLoggedUser.group.indexOf('director') != -1 ||
                    currentLoggedUser.group.indexOf('vp') != -1 ||
                    currentLoggedUser.group.indexOf('admin') != -1) && (leadData.lead_status != '5ce7c83ac348160bd473fe1e')
                ) {
                    resolve({ canApprove: true, status: 1, message: 'Approval Pending', results: leadData.approvals, leadData });
                } else {
                    resolve({ canApprove: false, status: 1, message: 'Approval Pending', results: leadData.approvals, leadData });
                }

            } else {
                resolve({ canApprove: false, status: 500, message: 'Lead not found' });
            }
        });
    });
};


const canApprove = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const id = req.params.id;
        canApproveLead(id, currentLoggedUser).then(data => {
            res.json(data);
        }, err => {
            next(err);
        });
    });

};


const approveOrReject = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        let body = req.body;
        const id = req.params.id;
        console.log('approveOrReject', id, body);

        let notes = {
            data: body.notes,
            userId: objectid(body.approver_id),
            date: new Date(body.approved_date)
        };
        console.log('lead notes');
        Notes.addNotes(id, notes, currentLoggedUser, Modules().lead);

        Lead.findById(id).then(leadDetails => {
            if (leadDetails && leadDetails.length > 0) {
                let leadData = leadDetails[0];
                if (!leadData.approvals) { leadData.approvals = []; }
                leadData.approvals.push(body);
                let updateData = {
                    lead_status: body.status == 'Approved' ? objectid('5be51e358cad0228c0073613') : objectid('5ce7c83ac348160bd473fe1e'),
                    approvals: leadData.approvals
                };
                console.log('leadData', updateData);
                Lead.update(id, updateData, currentLoggedUser).then((result) => {
                    if (result == 1) {
                        res.status(200).json({ message: 'Lead successffully updated!', status: 200 });
                        addLog(body.status == 'Approved' ? auditActions().approve : auditActions().reject, id, currentLoggedUser._id, req.body, body.status + ' the lead');
                    } else if (result == 0) {
                        res.status(200).json({ message: 'nothing to update. please check the data and leadID', status: 200 });
                    }
                }).catch(err => {
                    console.log('err1', err);
                    next(err);
                });
            } else {

            }
        }).catch(err => {
            console.log('err2', err);
            next(err);
        });
    }).catch(err => {
        next(err);
    });

};

const linkStaff = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const id = req.params.id;

        const linkedUsers = req.body;

        let reqBody = [];
        if (!isEmpty(req.body.staffId)) {
            req.body.staffId.forEach(element => {
                reqBody.push({ staffId: objectid(element), addedBy: objectid(currentLoggedUser._id), linked_on: new Date() });
            });
        } else {
            res.json('staffId requires');
        }
        req.body = reqBody;
        const result = await Lead.linkStaff(id, req.body, currentLoggedUser, linkedUsers);
        if (result == 1) {
            res.json({ message: 'Staff successfully linked!', status: 200 });
        } else {
            res.json({ message: 'not linked successfully', status: 500 });
        }
    } catch (error) {
        next(error);
    }
};

const unLinkStaff = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const id = req.params.id;
        const staffId = req.params.staffId;
        const result = await Lead.unLinkStaff(id, staffId, currentLoggedUser);
        if (result == 1) {
            res.json({ message: 'Staff successfully unlinked!', status: 200 });
        } else {
            res.json({ message: 'not unlinked successfully', status: 500 });
        }
    } catch (error) {
        next(error);
    }
};

const listLeadsToLink = async (req, res, next) => {
    try {
        const result = await Lead.listLeadsToLink(req.body);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listAll,
    filter,
    leadDetails,
    create,
    update,
    addNotes,
    deleteLead,
    canApprove,
    approveOrReject,
    linkStaff,
    unLinkStaff,
    listLeadsToLink
};
