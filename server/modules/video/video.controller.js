const { isEmpty, } = require('lodash');
const { PassThrough, Transform } = require('stream');

const fs = require('fs');

const Model = require('./video.model');
const { getCurrentUserInfo } = require('../shared/shared.controller');
const { getDateMonthYearTime } = require('../../config/dateutil');

const listAll = async (req, res, next) => {
    try {
        const result = await Model.listAll()
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            result.forEach(ele => {
                ele.created_at = getDateMonthYearTime(ele.created_at)
            });
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const Details = async (req, res, next) => {
    try {
        const id = req.params.id;
        const result = await Model.details(id)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result[0], 200, next);
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
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.update(req.params.id, req.body, loggedUser);
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
        const result = await Model.delete(req.params.id, loggedUser);
        if (result === 0) {
            res.status(409).json({ message: 'update failed', status: 409 });
        } else {
            res.json({ message: 'delete successfull', status: 200, data: result });
        }
    } catch (error) {
        next(error);
    }
};

module.exports = {
    listAll,
    Details,
    create,
    update,
    Delete
};