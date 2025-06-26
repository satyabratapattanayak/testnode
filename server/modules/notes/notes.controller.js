//@ts-check
const { isEmpty } = require('lodash');

const Model = require('../notes/notes.model.js');
const Config = require('../../config/config');
const { getCurrentUserInfo } = require('../shared/shared.controller');
const { sortByKey } = require('../shared/shared.model');
const { getDateFormat } = require('../../config/dateutil');


const NotesTypes = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.NotesTypes(loggedUser, null)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'no data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }

};
const listAll = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.all(loggedUser)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'no data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }

};

// get notes
const details = async (req, res, next) => {
    try {
        const result = await Model.findById(req.params.id, req.body)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'no data found', status: 404 });
        } else {
            let output = [];
            for (const iterator of result) {

                iterator.notes.forEach(element1 => {
                    console.log('element1: ', element1.date);

                    // element1.date = getDateFormat(element1.date)
                    iterator.notes_user_details.forEach(element2 => {
                        if (JSON.stringify(element1.userId) == JSON.stringify(element2._id)) {
                            element1.username = element2.first_name + ' ' + element2.last_name;
                        }
                    });
                    let filesDetails = [];
                    if (!isEmpty(element1.files)) {
                        iterator.file_details.forEach(fileElement => {
                            element1.files.forEach(element => {
                                if (JSON.stringify(element) == JSON.stringify(fileElement._id)) {
                                    filesDetails.push({ id: element, file_name: fileElement.file_name, url: Config.imageURL + element });
                                }
                            });
                        });
                        element1.files = filesDetails;
                    }
                });
                output.push(...iterator.notes)
            }

            sortByKey(output, 'date');


            // let notes = result[0] && result[0].notes;
            res.json(output, 200, next);

            /* result[0].notes.forEach(element1 => {
                result[0].notes_user_details.forEach(element2 => {
                    if (JSON.stringify(element1.userId) == JSON.stringify(element2._id)) {
                        element1.username = element2.first_name + ' ' + element2.last_name;
                    }
                });
                let filesDetails = [];
                if (!isEmpty(element1.files)) {
                    result[0].file_details.forEach(fileElement => {
                        element1.files.forEach(element => {
                            if (JSON.stringify(element) == JSON.stringify(fileElement._id)) {
                                filesDetails.push({ id: element, file_name: fileElement.file_name, url: Config.imageURL + element });
                            }
                        });
                    });
                    element1.files = filesDetails;
                }
            }); */
        }
    } catch (error) {
        next(error)
    }

};

// get note details by id
const noteById = async (req, res, next) => {
    try {
        const result = await Model.noteById(req.params.id, req.body)
        if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const create = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.create(req.body, loggedUser);
        res.json({ message: 'successfully created!', status: 200, data: result });
    } catch (error) {
        next(error)
    }
};



const update = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization);
        const isMobileRequest = req.query.fromMobile === 'true' || false;
        const result = await Model.update(req.params.id, req.body, isMobileRequest, loggedUser);
        if (result === 0) {
            res.status(409).json({ message: 'update failed', status: 409 });
        } else {
            res.json({ message: 'update successful', status: 200, data: result });
        }
    } catch (error) {
        next(error)
    }
};

const Delete = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const isMobileRequest = req.query.fromMobile === 'true' || false;
        const result = await Model.delete(req.params.id, isMobileRequest, loggedUser);
        if (result === 0) {
            res.status(409).json({ message: 'delete failed', status: 409 });
        } else {
            res.json({ message: 'delete successfull', status: 200, data: result });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = { create, listAll, details, update, Delete, NotesTypes, noteById };