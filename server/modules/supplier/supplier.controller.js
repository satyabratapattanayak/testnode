const ObjectId = require('mongodb').ObjectID;
const { isEmpty, head } = require('lodash');

const Model = require('./supplier.model');
const { getCurrentUserInfo } = require('../shared/shared.controller');
const { getDateMonthYearTime } = require('../../config/dateutil');
const Notes = require('../notes/notes.model.js');

const listAll = async (req, res, next) => {
    let body = req.body;
    const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
    Model.listAll(currentLoggedUser, body)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            } else {
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const Details = async (req, res, next) => {
    const id = req.params.id;
    Model.details(id)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            } else {
                res.json(result[0], 200, next);
            }
        })
        .catch((e) => next(e));
};

const create = async (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.create(req.body, getCurrentUserInfo);
        })
        .then((result) => {
            res.json({ message: 'successfully created!', status: 200, data: result });
        })
        .catch((e) => next(e));
};

const update = async (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.update(req.params.id, req.body, getCurrentUserInfo);
        })
        .then((result) => {
            if (result === 0) {
                res.status(409).json({ message: 'update failed', status: 409 });
            } else {
                res.json({ message: 'update successful', status: 200, data: result });
            }
        })
        .catch((e) => next(e));
};

const Delete = async (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization)
        .then((getCurrentUserInfo) => {
            return Model.delete(req.params.id, getCurrentUserInfo);
        })
        .then((result) => {
            if (result === 0) {
                res.status(409).json({ message: 'update failed', status: 409 });
            } else {
                res.json({ message: 'delete successfull', status: 200, data: result });
            }
        })
        .catch((e) => next(e));
};

const addNotes = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const id = req.params.supplierId;


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
        Notes.addNotes(id, req.body, currentLoggedUser, 'supplier')
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

module.exports = {
    listAll,
    Details,
    create,
    update,
    Delete,
    addNotes,
};