const { isEmpty } = require('lodash');
const moment = require('moment');
const ObjectId = require('mongodb').ObjectID;
const Area = require('../area/area.model.js');
const { getCurrentUserInfo, moveToPos } = require('../shared/shared.controller');


/* const moveToPos = function (array, from, to) {
    array.splice(to, 0, array.splice(from, 1)[0]);
    return array;
}; */


const listAll = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await Area.all(req.query, currentLoggedUser);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            result.forEach((element, i) => {
                if (element.area_code == 'na') {
                    moveToPos(result, i, 0);
                }
                element.areaId = element._id;
                if (!isEmpty(element.region_details)) {
                    // element._id = element.region_details[0].region; // used this on creation of staff(to group wise region)
                    let regionsArray = [];
                    element.region_details.forEach(regionEle => {
                        // regions += regionEle.region + ' ';
                        regionsArray.push(regionEle.region);
                    });
                    element.region = regionsArray.join();
                    delete element.region_details;
                }
            });
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};




// used on Adavance_filter(users-scheduler)
const filter_List = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await Area.filterList(currentLoggedUser, req.body);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            result.forEach((element, i) => {
                if (!isEmpty(element.region_details)) {
                    element.region = element.region_details[0].region;
                    delete element.region_details;
                }

                if (element.area_code == 'na') {
                    moveToPos(result, i, 0);
                }

            });
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

const details = async (req, res, next) => {
    try {
        const result = await Area.findById(req.params.id);
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            if (!isEmpty(result[0].region)) {
                let regions = [];
                result[0].region.forEach(region => {
                    const regionName = result[0].region_details.find((regionDetails) => {
                        return JSON.stringify(regionDetails._id) == JSON.stringify(region);
                    });

                    if (regionName) {
                        regions.push({ regionId: regionName._id, region_name: regionName.region });
                    }

                    result[0].region = regions;
                });
                if (result[0].region_details) { delete result[0].region_details; }

            }
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

const create = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        if (!isEmpty(req.body.region)) {
            let emptyregion = [];
            req.body.region.forEach(element => { emptyregion.push(ObjectId(element)); });
            req.body.region = emptyregion;
        } else {
            req.body.region = [];
        }
        req.body.created_at = new Date();
        const newArea = await Area.create(req.body, currentLoggedUser);
        if (newArea === 0) {
            res.status(408).json({ message: 'area already exist', status: 408 });
        } else {
            res.json({ message: 'area successfully created!', status: 200, data: newArea });
        }
    } catch (error) {
        next(error);
    }
};

const update = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        if (!isEmpty(req.body.region)) {
            let emptyregion = [];
            req.body.region.forEach(element => { emptyregion.push(ObjectId(element)); });
            req.body.region = emptyregion;
        }

        Area.update(req.params.id, req.body, currentLoggedUser)
            .then((result) => {
                if (result == 0) {
                    res.status(408).json({ message: 'Area already exist', status: 408 });
                } if (result == 1) {
                    res.json({ message: 'area successfully updated!', status: 200 });
                } else {
                    res.json({ message: 'area not updated!', status: 200 });
                }
            })
            .catch((e) => next(e));
    }).catch((e) => next(e));
};

const DeleteArea = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        Area.deleteById(req.params.id, currentLoggedUser)
            .then((result) => {
                if (result == 1) {
                    res.json({ message: 'Area deleted successfully', status: 200 });
                } else {
                    res.json({ message: 'Area not deleted successfully', status: 500 });
                }
            })
            .catch((e) => next(e));
    }).catch((e) => next(e));
};

module.exports = { listAll, filter_List, details, create, update, DeleteArea };