const { isEmpty, } = require('lodash');
const moment = require('moment');

const Model = require('./notification.model');
const { getCurrentUserInfo } = require('../shared/shared.controller');
const { getTodayEndTime, getTodayStartTime, getDateFormat, getTimeAgo } = require('../../config/dateutil');

const listAll = async (req, res, next) => {
    const page = req.body.page;
    const limit = req.query.limit;

    const nextPage = page ? parseInt(page) + 1 : 2;
    const prevPage = page ? parseInt(page) - 1 : 0;

    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await Model.listAll(currentLoggedUser, req.body);
        console.log('result: ', result);

        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            let now = new Date();
            let yesterday = now.setDate(now.getDate() - 1);
            let responseData = {
                Today: [],
                Yesterday: [],
                Older: []
            };

            for (const iterator of result[0].data) {
                if (iterator.date >= getTodayStartTime() && iterator.date <= getTodayEndTime()) {
                    iterator.date = getTimeAgo(iterator.date)
                    responseData.Today.push(iterator)
                } else if (iterator.date >= getTodayStartTime(yesterday) && iterator.date <= getTodayEndTime(yesterday)) {
                    iterator.date = getTimeAgo(iterator.date)
                    responseData.Yesterday.push(iterator)
                } else {
                    iterator.date = getDateFormat(iterator.date)
                    responseData.Older.push(iterator)
                }
            }

            let response = {
                // data: result[0].data,
                data: responseData,
                total: result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0,
                unReadCount: result[0].unReadCount.length > 0 ? result[0].unReadCount[0].count : 0,
                nextPage: nextPage,
                currentPage: page,
                prevPage: prevPage,
            }
            res.json(response, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const Details = async (req, res, next) => {
    try {
        const id = req.params.id;
        const result = await Model.details(id);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            res.json(result[0], 200, next);
        }
    } catch (error) {
        next(error)
    }
};

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const create = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.create(req.body, loggedUser);
        res.json({ message: 'successfully created!', status: 200, data: result });
    } catch (error) {
        next(error)
    }
};


/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
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

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const markAllAsRead = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.markAllAsRead(loggedUser);
        console.log('result: ', result);
        if (result === 0) {
            res.status(409).json({ message: 'update failed', status: 409 });
        } else {
            res.json({ message: 'update successful', status: 200, data: result });
        }
    } catch (error) {
        next(error)
    }
};

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const markAllAsDeleted = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.markAllAsDeleted(loggedUser);
        console.log('result: ', result);
        if (result === 0) {
            res.status(409).json({ message: 'update failed', status: 409 });
        } else {
            res.json({ message: 'update successful', status: 200, data: result });
        }
    } catch (error) {
        next(error)
    }
};

/**
 * 
 * @param {*} req 
 * @param {*} res 
 * @param {*} next 
 */
const Delete = async (req, res, next) => {
    try {
        const loggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await Model.delete(req.params.id, loggedUser);
        if (result === 0) {
            res.status(409).json({ message: 'delete failed', status: 409 });
        } else {
            res.json({ message: 'delete successfull', status: 200, data: result });
        }
    } catch (error) {
        next(error)
    }
};

module.exports = {
    listAll,
    Details,
    create,
    update,
    markAllAsRead,
    markAllAsDeleted,
    Delete
};