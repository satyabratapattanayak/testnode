const express = require('express');
const router = express.Router();
const { isEmpty, head, isArray } = require('lodash');
const ObjectId = require('mongodb').ObjectID;
const jwt = require('jsonwebtoken');

const Venues = require('../venues/venues.model.js');
const Audit = require('../audit/audit.model.js');
const Notes = require('../notes/notes.model.js');
const { getDateMonthYearTime } = require('../../config/dateutil');
const { getCurrentUserInfo } = require('../shared/shared.controller');


const addNote = (module, documentId, notes, user) => {
    if (isEmpty(notes)) { notes = []; } else {
        notes = [{
            data: notes,
            userId: ObjectId(user),
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

const listAll = async (req, res, next) => {
    try {
        const result = await Venues.all(req.query)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const details = (req, res, next) => {
    Venues.findById(req.params.id)
        .then((result) => {
            result.forEach(element => {
                element.created_at = getDateMonthYearTime(element.created_at);
            });
            res.json(result, 200, next);
        })
        .catch((e) => next(e));
};

const create = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {

        if (isArray(req.body.linked_area) && !isEmpty(req.body.linked_area)) {
            let linked_areas = [];
            req.body.linked_area.forEach(each_linked_area => {
                linked_areas.push(ObjectId(each_linked_area));
            });
            req.body.linked_area = linked_areas;
        } else {
            req.body.linked_area = [];
        }

        if (req.body.isActive == 'yes' || req.body.isActive == 'Yes' || req.body.isActive == true) {
            req.body.isActive = true;
        } else {
            req.body.isActive = false;
        }

        // req.body.type = 'Standard';
        req.body.created_by = ObjectId(currentLoggedUser._id);
        req.body.created_at = new Date();
        Venues.create(req.body, currentLoggedUser)
            .then((result) => {
                // res.json(result, 200, next);
                res.json({ status: 200, message: 'Venue successfully created!', data: result });
                return addNote('venue', ObjectId(head(result)._id), head(result).notes, currentLoggedUser._id);
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const update = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const id = req.params.id;

        if (!isEmpty(req.body.linked_area)) {
            let linked_areas = [];
            req.body.linked_area.forEach(each_linked_area => {
                linked_areas.push(ObjectId(each_linked_area));
            });
            req.body.linked_area = linked_areas;
        }

        if (req.body.isActive == 'Yes' || req.body.isActive == 'yes' || req.body.isActive == true) {
            req.body.isActive = true;
        } else if (req.body.isActive == 'No' || req.body.isActive == 'no' || req.body.isActive == false) {
            req.body.isActive = false;
        }

        Venues.update(id, req.body, currentLoggedUser)
            .then((result) => {
                // res.json(result, 200, next);
                if (result == 1) {
                    res.json({ status: 200, message: 'Venue successfully updated!' });
                } else {
                    res.json({ message: 'Venue not updated!', status: 200, error: result });
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const deleteVenue = (req, res, next) => {
    const id = req.params.id;
    Venues.deleteById(id)
        .then((result) => {
            res.json({ status: 200, message: 'deleted successfully' });
        })
        .catch((e) => next(e));
};

module.exports = { listAll, details, create, update, deleteVenue };