const ObjectId = require('mongodb').ObjectID;
const { isEmpty, first, toArray, toString, isArray, head } = require('lodash');

const Model = require('../routePlan/routePlan.model');
const Config = require('../../config/config');
const Notes = require('../notes/notes.model.js');
const { getCurrentUserInfo } = require('../shared/shared.controller');
const { getDateMonthYearTime } = require('../../config/dateutil');



const listAll = async (req, res, next) => {
    try {
        const result = await Model.all(req.body)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            result.forEach(element => {
                element.start_date = getDateMonthYearTime(element.start_date)
                element.end_date = getDateMonthYearTime(element.end_date)
                element.created_at = getDateMonthYearTime(element.created_at)
            });
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const Details = (req, res, next) => {
    Model
        .findById(req.params.id)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            } else {
                result[0].start_date = getDateMonthYearTime(result[0].start_date)
                result[0].end_date = getDateMonthYearTime(result[0].end_date)

                if (result[0].linkedSchedules && result[0].linkedSchedules.length > 0) {
                    result[0].linkedSchedules.forEach(element => {
                        if (element.visit_date) {
                            element.start_date = getDateMonthYearTime(element.visit_date)
                            element.end_date = getDateMonthYearTime(element.visit_date)
                        } else {
                            element.start_date = getDateMonthYearTime(element.start_date)
                            element.end_date = getDateMonthYearTime(element.end_date)
                        }
                        const shceduletypes = result[0].schedule_types.find((type) => {
                            if (type) {
                                return JSON.stringify(element.type) == JSON.stringify(type._id);
                            }
                        })
                        element.type_name = shceduletypes.type;

                        let linkedAssignedTo = [];
                        element.assigned_to.forEach(assignedToEle => {
                            const linkedScheduleAssignedTo = result[0].schedule_assignee_details.find((assignedToDetails) => {
                                return JSON.stringify(assignedToEle) == JSON.stringify(assignedToDetails._id);
                            });

                            if (linkedScheduleAssignedTo) {
                                // linkedAssignedTo.push({ id: assignedToEle, name: linkedScheduleAssignedTo.first_name + ' ' + linkedScheduleAssignedTo.last_name });
                                linkedAssignedTo.push(linkedScheduleAssignedTo.first_name + ' ' + linkedScheduleAssignedTo.last_name);
                            }
                        });
                        element.assigned_to = linkedAssignedTo.toString();

                    });
                }
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const Create = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        if (req.body.assigned_to && isArray(req.body.assigned_to)) {
            let assignees = [];
            req.body.assigned_to.forEach((ele) => {
                assignees.push(ObjectId(ele))
            })
            req.body.assigned_to = assignees;
        }

        req.body.created_by = currentLoggedUser._id;
        req.body.created_at = new Date();
        req.body.modified_At = new Date();

        Model.create(currentLoggedUser, req.body)
            .then((result) => {
                res.json({ message: 'route plan successfully created!', status: 200, data: result });
            }).catch((e) => next(e))
    }).catch((e) => next(e))
}

const Update = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        if (req.body.assigned_to && isArray(req.body.assigned_to)) {
            let assignees = [];
            req.body.assigned_to.forEach((ele) => {
                assignees.push(ObjectId(ele))
            })
            req.body.assigned_to = assignees;
        }
        req.body.modified_At = new Date();
        const result = Model.update(currentLoggedUser, req.params.id, req.body)
        res.json({ message: 'route plan successfully updated!', status: 200 });
    } catch (error) {
        next(error)
    }
}


const addNotes = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const id = req.params.id;

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
        console.log('req body: ', req.body);

        Notes.addNotes(id, req.body, currentLoggedUser, 'routePlan')
            .then((result) => {
                console.log('controller: ', result);

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

const Delete = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.delete(req.params.id, currentLoggedUser);
        if (result === 0) {
            res.status(409).json({ message: 'delete failed', status: 409 });
        } else {
            res.json({ message: 'delete successfull', status: 200, data: result });
        }
    } catch (error) {
        next(error)
    }
};

module.exports = { listAll, Details, Create, Update, addNotes, Delete };