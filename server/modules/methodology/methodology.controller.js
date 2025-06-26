const express = require('express');
const router = express.Router();
const { isEmpty } = require('lodash');

const Methodology = require('../methodology/methodology.model.js');

const listBC = (req, res, next) => {
    Methodology.listBC()
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                res.json(result, 200, next);
            }
        }).catch((e) => next(e));
};
const listBD = (req, res, next) => {
    Methodology.listBD()
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                res.json(result, 200, next);
            }
        }).catch((e) => next(e));
};
const listBG = (req, res, next) => {
    Methodology.listBG()
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                res.json(result, 200, next);
            }
        }).catch((e) => next(e));
};

const detailsBG = (req, res, next) => {
    Methodology.detailsBG(req.params.id)
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else { res.json(result, 200, next); }
        })
        .catch((e) => next(e));
};
const detailsBC = (req, res, next) => {
    Methodology.detailsBC(req.params.id)
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else { res.json(result, 200, next); }
        })
        .catch((e) => next(e));
};
const detailsBD = (req, res, next) => {
    Methodology.detailsBD(req.params.id)
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else { res.json(result, 200, next); }
        })
        .catch((e) => next(e));
};


const create = (req, res, next) => {
    const randomPassword = Math.random().toString(36).slice(-8);
    req.body.password = randomPassword;
    req.body.created_at = new Date();
    Methodology.create(req.body)
        .then((createdUser) => {
            if (createdUser === 0) {
                res.status(408).json({ message: 'already exist', status: 408 });
            }
            res.json(createdUser);
        })
        .catch((e) => next(e));
};

module.exports = { listBC, listBG, listBD, detailsBG, detailsBC, detailsBD, create };