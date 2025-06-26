const express = require('express');
const router = express.Router();
const { isEmpty, head, isArray } = require('lodash');
const ObjectId = require('mongodb').ObjectID;
const jwt = require('jsonwebtoken');
const moment = require('moment');

const APIResponse = require('../../helpers/APIResponse.js');
const Model = require('../venue_areas/venue_areas.model.js');
const Audit = require('../audit/audit.model.js');
const Notes = require('../notes/notes.model.js');
const { getCurrentUserInfo } = require('../shared/shared.controller');


const listAll = (req, res, next) => {
    Model.all()
        .then((result) => {
            res.json(result, 200, next);
        })
        .catch((e) => next(e));
};

const details = (req, res, next) => {
    Model.findById(req.params.id)
        .then((result) => {
            res.json(result, 200, next);
        })
        .catch((e) => next(e));
};

const create = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        req.body.created_by = ObjectId(currentLoggedUser._id);
        req.body.created_at = new Date();
        Model.create(req.body, currentLoggedUser)
            .then((result) => {
                APIResponse.formatSucessMessage(res, 'Venue Area successfully created!', result)
                // res.json({ status: 200, message: 'Venue Area successfully created!', data: result });
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const update = (req, res, next) => {
    const id = req.params.id;
    Model.update(id, req.body)
        .then((result) => {
            if (result == 1) {
                res.json({ status: 200, message: 'Venue Area successfully updated!' });
            } else {
                res.json({ message: 'Venue area not updated!', status: 200, error: result });
            }
        })
        .catch((e) => next(e));
};

const deleteVenueArea = (req, res, next) => {
    const id = req.params.id;
    Model.deleteById(id)
        .then((result) => {
            res.json({ status: 200, message: 'successfully deleted', result: result });
        })
        .catch((e) => next(e));
};

module.exports = { listAll, details, create, update, deleteVenueArea };