const express = require('express');
const router = express.Router();
const { isEmpty } = require('lodash');

const State = require('../state/state.model.js');
const { Modules } = require('../shared/shared.model');
const DataAccess = require('../../helpers/DataAccess');

const checkStateCodeChanged = (oldData, currentData) => {
    if (oldData.stateCode !== currentData.stateCode) {
        DataAccess.UpdateMany(Modules().customer, { customer_state: oldData.stateCode }, { $set: { customer_state: currentData.stateCode } })
        DataAccess.UpdateMany(Modules().lead, { lead_state: oldData.stateCode }, { $set: { lead_state: currentData.stateCode } })
    }
};

const listAll = async (req, res, next) => {
    try {
        const result = await State.all(req.query, req.body);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

const Details = async (req, res, next) => {
    try {
        const result = await State.findOne(req.params.stateCode);
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
        const result = await State.create(req.body);
        if (result == 0) {
            res.status(400).json({
                message: 'State already exist',
                status: 400,
            });
        } else {
            res.json({
                message: 'new State created ',
                status: 200,
                data: result
            });
        }
    } catch (error) {
        next(error)
    }
};

const update = async (req, res, next) => {
    console.log('reqBody: ', req.body);

    try {
        const prevState = await State.findOne(req.params.stateCode);
        console.log('prevState: ', prevState);
        const result = await State.update(req.params.stateCode, req.body);
        if (result == 0) {
            res.status(400).json({
                message: 'State/StateCode already exist',
                status: 400,
            });
        } else {
            res.json({
                message: 'State has been updated ',
                status: 200,
                data: result
            });
            checkStateCodeChanged(prevState, req.body);
        }
    } catch (error) {
        next(error)
    }
};
const Delete = async (req, res, next) => {
    try {
        const result = await State.delete(req.params.stateCode);
        res.json({
            message: 'State has been deleted ',
            status: 200,
            data: result
        });
    } catch (error) {
        next(error)
    }
};

module.exports = { listAll, Details, create, update, Delete };