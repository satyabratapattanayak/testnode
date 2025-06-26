const express = require('express');
const router = express.Router();
const { isEmpty, head } = require('lodash');
const ObjectId = require('mongodb').ObjectID;
const jwt = require('jsonwebtoken');

const Zone = require('../zone/zone.model.js');
const { getCurrentUserInfo } = require('../shared/shared.controller');


const moveToPos = function (array, from, to) {
    array.splice(to, 0, array.splice(from, 1)[0]);
    return array;
};

const listAll = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        Zone.all(req.query, currentLoggedUser)
            .then((result) => {

                if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                    result.forEach((element, index) => {

                        if ((element.zones && element.zones[0].id == '5c5ac9021086f2e73b5ddb67') || element.zone_code == 'na') {
                            moveToPos(result, index, 0);
                        }

                        element.zoneId = element._id;
                        if (!isEmpty(element.area_details)) {
                            element.areaName = element.area_details[0].area;

                            let areas = [];
                            let aName = [];
                            element.area_details.forEach(areaEle => {
                                // areas.push({ areaId: areaEle._id, area_name: areaEle.area });

                                if (req.query.area) {
                                    const areaname = req.query.area.find((reqQueryId) => {

                                        return JSON.stringify(reqQueryId) == JSON.stringify(areaEle._id);
                                    });
                                    if (areaname) {
                                        aName.push(areaEle.area);
                                    }
                                }


                                if (!isEmpty(areaEle.region)) {
                                    let regions = [];
                                    areaEle.region.forEach(regionEle => {
                                        const regionName = element.region_details.find((regionDetails) => {
                                            return JSON.stringify(regionDetails._id) == JSON.stringify(regionEle);
                                        });
                                        if (regionName) {
                                            regions.push({ regionId: regionName._id, region_name: regionName.region });
                                        }

                                    });
                                    areas.push({ areaId: areaEle._id, area_name: areaEle.area, linked_regions: regions });
                                } else {
                                    areas.push({ areaId: areaEle._id, area_name: areaEle.area });
                                }

                            });

                            if (req.query.area && req.query.area.length > 0) {
                                element.areaName = aName;
                            }

                            element.linked_area_region = areas;
                            delete element.area_details, delete element.region_details, delete element.area;
                        }
                    });

                    res.json(result, 200, next);
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};



// used on Adavance_filter(users-scheduler)
const filter_List = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        Zone.filterList(currentLoggedUser, req.body)
            .then((result) => {
                if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {

                    result.forEach((element, i) => {

                        if (!isEmpty(element.area_details)) {
                            element.area = element.area_details[0].area;
                            delete element.area_details;
                        }


                        if (element.zone_code == 'na') {
                            moveToPos(result, i, 0);
                        }
                    });

                    res.json(result, 200, next);
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const details = (req, res, next) => {
    Zone.findById(req.params.id)
        .then((result) => {

            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                if (!isEmpty(result[0].area)) {
                    let areas = [];
                    result[0].area.forEach(area => {
                        const areaName = result[0].area_details.find((areaDetails) => {
                            return JSON.stringify(areaDetails._id) == JSON.stringify(area);
                        });

                        if (areaName) {
                            areas.push({ areaId: areaName._id, area_name: areaName.area });
                        }

                        result[0].area = areas;
                    });
                    if (result[0].area_details) { delete result[0].area_details; }

                }

                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const create = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        if (!isEmpty(req.body.area)) {
            let emptyarea = [];
            req.body.area.forEach(element => { emptyarea.push(ObjectId(element)); });
            req.body.area = emptyarea;
        } else {
            req.body.area = [];
        }
        req.body.created_at = new Date();
        Zone.create(req.body, currentLoggedUser)
            .then((newZone) => {
                if (newZone === 0) {
                    res.status(408).json({ message: 'zone already exist', status: 408 });
                } else {
                    res.json({ message: 'zone successfully created!', status: 200, zoneId: newZone });
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const update = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        if (!isEmpty(req.body.area)) {
            let emptyarea = [];
            req.body.area.forEach(element => { emptyarea.push(ObjectId(element)); });
            req.body.area = emptyarea;
        }
        Zone.update(req.params.id, req.body, currentLoggedUser)
            .then((result) => {
                if (result == 0) {
                    res.status(408).json({ message: 'Zone already exist', status: 408 });
                } else if (result == 1) {
                    res.json({ message: 'zone successfully updated!', status: 200 });
                } else {
                    res.json({ message: 'zone not updated!', status: 200 });
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const DeleteZone = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        Zone.deleteById(req.params.id, currentLoggedUser)
            .then((result) => {
                if (result == 1) {
                    res.json({ message: 'Area deleted successfully', status: 200 });
                } else {
                    res.json({ message: 'Area not deleted successfully', status: 500 });
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

module.exports = { listAll, filter_List, details, create, update, DeleteZone };

