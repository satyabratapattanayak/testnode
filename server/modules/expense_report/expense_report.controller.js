const express = require('express');
const jwt = require('jsonwebtoken');
const ObjectId = require('mongodb').ObjectID;
const { isEmpty, first, toArray, toString } = require('lodash');
const moment = require('moment');
const DataAccess = require('../../helpers/DataAccess');

const ExpenseReport = require('../expense_report/expense_report.model');
const { getCurrentUserInfo } = require('../shared/shared.controller');

const listAll = (req, res, next) => {
    ExpenseReport.all(req.body)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            }
            else {
                result.forEach(element => {
                    delete element.customer_details, delete element.uploadedBy_details;
                });
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const details = (req, res, next) => {
    ExpenseReport.findById(req.params.id)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            }
            else {
                delete first(result).customer_details, delete first(result).uploadedBy_details;
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const create = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        ExpenseReport.create(req.body, currentLoggedUser)
            .then((result) => {
                res.status(200).json({ status: 200, message: 'Expense report successfully created', data: result });
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const update = (req, res, next) => {
    const id = req.params.id;
    console.log('EXPENSE REPORT UPDATE :: CONTROLLER : ', req.body);

    ExpenseReport.update(id, req.body)
        .then((result) => {
            if (result == 1) {
                res.status(200).json({ message: 'Expense report successffully updated!', status: 200 });
            } else if (result == 0) {
                res.status(200).json({ message: 'nothing to update. you did not change anything. please check the data and Expense report ID', status: 200 });
            }
        })
        .catch((e) => next(e));
};



module.exports = { listAll, create, details, update };