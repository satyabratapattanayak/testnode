const express = require('express');
const router = express.Router();
const { isEmpty, isArray, isUndefined, first, head, forOwn } = require('lodash');
const Moment = require('moment');

const Role = require('../role/role.model.js');

const listAll = (req, res, next) => {
    Role.all()
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                result.forEach(element => {
                    if (!isEmpty(element.access_levels_details)) {
                        element.access_levels_details.forEach(accessLevels => {
                            delete accessLevels.roles;
                        });
                    }
                    // delete element.access_levels_details.role;
                });
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

// user details
const details = (req, res, next) => {
    const id = req.params.id;
    Role.findById(id)
        .then((result) => {
            if (isEmpty(result)) {
                // res.status(404).json({ message: 'No data found', status: 404 });
            } else {
                result.forEach(element => {
                    if (!isEmpty(element.access_levels_details)) {
                        element.access_levels_details.forEach(accessLevels => {
                            delete accessLevels.roles;
                        });
                    }
                    // delete element.access_levels_details.role;
                });
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const create = async (req, res, next) => {
    try {
        const result = await Role.create(req.body);
        if (result == 0) {
            res.status(400).json({
                message: 'Role already exist',
                status: 400,
            });
        } else if (result == 1) {
            res.status(400).json({
                message: 'Hierarchy already exist',
                status: 400,
            });
        } else {
            res.json({
                message: 'new Role created ',
                status: 200,
                data: result
            });
        }
    } catch (error) {
        next(error)
    }
};

const update = async (req, res, next) => {
    try {
        const result = await Role.update(parseInt(req.params.id), req.body);
        if (result == 0) {
            res.status(400).json({
                message: 'Role already exist',
                status: 400,
            });
        } else if (result == 1) {
            res.status(400).json({
                message: 'Hierarchy already exist',
                status: 400,
            });
        } else {
            res.json({
                message: 'Role has been updated ',
                status: 200,
                data: result
            });
        }
    } catch (error) {
        next(error)
    }
};
const Delete = async (req, res, next) => {
    try {
        const result = await Role.delete(req.params.countryCode);
        res.json({
            message: 'Country has been deleted ',
            status: 200,
            data: result
        });
    } catch (error) {
        next(error)
    }
};

module.exports = { listAll, details, create, update, Delete };
