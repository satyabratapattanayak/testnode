const express = require('express');
const router = express.Router();
const lodash = require('lodash');
const { isEmpty } = require('lodash');
const jwt = require('jsonwebtoken');
const mongodb = require('mongodb').MongoClient;
const objectid = require('mongodb').ObjectID;

const Priority = require('../priority/priority.model.js');
const Audit = require('../audit/audit.model.js');
const Notes = require('../notes/notes.model.js');

const listAll = (req, res, next) => {
    console.log('req.query: ', req.query);
    Priority.all(req.query)
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else { res.json(result, 200, next); }
        })
        .catch((e) => next(e));
};

const details = (req, res, next) => {
    Priority.findById(req.params.id)
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {

                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

module.exports = { listAll, details };