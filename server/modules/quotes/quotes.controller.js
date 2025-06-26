const express = require('express');
const router = express.Router();
const { isEmpty, head, first } = require('lodash');
const ObjectId = require('mongodb').ObjectID;
const jwt = require('jsonwebtoken');
const moment = require('moment');

const Quotes = require('../quotes/quotes.model.js');
const Audit = require('../audit/audit.model.js');
const Notes = require('../notes/notes.model.js');
const Config = require('../../config/config');

const { getCurrentUserInfo } = require('../shared/shared.controller');



const convertDate = (date) => {
    return moment(date).tz('Asia/Kolkata').format('MMMM Do YYYY');
};

const audit = (body) => { Audit.addLog(body); };
const addNote = (module, documentId, notes, user) => {
    const body = {
        module: module,
        documentId: documentId,
        notes: [{
            data: notes,
            userId: ObjectId(user),
            date: new Date()
        }]
    };
    Notes.create(body);
};

const listAll = (req, res, next) => {
    Quotes.all()
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                result.forEach(element => {
                    element.created_by = element.created_by_details[0].first_name + ' ' + element.created_by_details[0].last_name;
                    element.created_at = convertDate(element.created_at);
                    delete element.created_by_details;
                });
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const details = (req, res, next) => {
    Quotes.findById(req.params.id)
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                if (!isEmpty(first(result).files)) {
                    let uploadedFiles = [];
                    first(result).files.forEach(eachFile => {
                        const file_details = first(result).quotes_file_details.find((fileDetails) => {
                            return JSON.stringify(eachFile) == JSON.stringify(fileDetails._id);
                        });
                        if (file_details) {
                            uploadedFiles.push({ id: eachFile, file_name: file_details.file_name, url: Config.imageURL + eachFile });
                        }
                    });
                    first(result).files = uploadedFiles;
                }
                delete first(result).quotes_file_details;
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

// not used
const create = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        if (req.body.documentId) { req.body.documentId = ObjectId(req.body.documentId); }
        req.body.created_by = ObjectId(currentLoggedUser._id);
        req.body.created_at = new Date();
        Quotes.create(req.body)
            .then((result) => {
                res.json(result, 200, next);
                return addNote('quotes', head(result)._id, head(result).notes, currentLoggedUser._id);
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const update = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const id = req.params.id;
        if (req.body.documentId) { req.body.documentId = ObjectId(req.body.documentId); }
        Quotes.update(id, req.body, currentLoggedUser)
            .then((result) => {
                if (result == 1) res.json({ message: 'updated success!', status: 200 });
                res.json({ message: 'nothing to update!', status: 200 });
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const addNotes = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const id = req.params.quoteId;
        req.body.userId = ObjectId(currentLoggedUser._id);
        req.body.date = new Date();
        Notes.addNotes(id, req.body)
            .then((result) => {
                console.log('result: ', result);
                for (let i = 0; i < head(result).notes.length; i += 1) {
                    for (let j = 0; j < head(result).notes_user_details.length; j += 1) {
                        if (JSON.stringify(head(result).notes[i].userId) == JSON.stringify(head(result).notes_user_details[j]._id)) {
                            let FirstName = head(result).notes_user_details[j].first_name;
                            let LastName = head(result).notes_user_details[j].last_name;
                            head(result).notes[i].userFirstName = FirstName;
                            head(result).notes[i].userLastName = LastName;
                        }
                    }
                }
                // res.json(result[0].remarks);
                res.json(head(result).notes);
                return audit({
                    module: 'quotes',
                    action: 'addNotes',
                    documentId: ObjectId(id),
                    userId: ObjectId(currentLoggedUser._id),
                    message: 'note added',
                    date: new Date()
                });
                // audit('lead', 'addedRemarks', currentLoggedUser._id, req.params.leadId, req.body, req.ip);
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const deleteQuotes = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const id = req.params.id;
        Quotes.deleteById(id, req.body, currentLoggedUser)
            .then((result) => {
                if (result == 1) {
                    res.status(200).json({ message: 'Delete quote!, quotes not exist!', status: 200 });
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

module.exports = {
    listAll,
    details,
    create,
    update,
    addNotes,
    deleteQuotes,
};