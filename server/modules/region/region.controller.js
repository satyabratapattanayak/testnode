const { isEmpty } = require('lodash');
const Region = require('../region/region.model.js');
const { getCurrentUserInfo, moveToPos, getModuleName } = require('../shared/shared.controller');
const helperService = require('../../helpers/APIResponse');


/* const moveToPos = function (array, from, to) {
    array.splice(to, 0, array.splice(from, 1)[0]);
    return array;
}; */

const listAll = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await Region.all(currentLoggedUser);

        if (isEmpty(result)) {
            helperService.sendDataNotFound(res);
        } else {
            result.forEach((element, i) => {
                if (element.region_code == 'na') {
                    moveToPos(result, i, 0);
                }
            });
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

// used on Adavance_filter(users-scheduler)
const filter_list = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        Region.filter_list(currentLoggedUser)
            .then((result) => {
                if (isEmpty(result)) {
                    res.status(404).json({ message: 'No data found', status: 404 });
                } else {
                    result.forEach((element, i) => {
                        if (element.region_code == 'na') {
                            moveToPos(result, i, 0);
                        }
                    });
                    res.json(result, 200, next);
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

// used this on creation of staff. to list region, area, zone
const listTaggedAreaZone = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        Region.listTaggedAreaZone(currentLoggedUser)
            .then((result) => {
                if (isEmpty(result)) {
                    res.status(404).json({ message: 'No data found', status: 404 });
                } else {
                    result.forEach((element, i) => {
                        if (element.region_code == 'na') {
                            moveToPos(result, i, 0);
                        }
                    });
                    res.json(result, 200, next);
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const listAllWithAreaZone = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        Region.listAllWithAreaZone(req.query, currentLoggedUser)
            .then((result) => {
                if (isEmpty(result)) {
                    res.status(404).json({ message: 'No data found', status: 404 });
                } else {
                    result.forEach((element, i) => {
                        if (element.region_code == 'na') {
                            moveToPos(result, i, 0);
                        }
                    });
                    let zone_names = [];
                    result[0].area_details.forEach(ele => {
                        result[0].zone_details.forEach(element => {
                            if (JSON.stringify(ele._id) == JSON.stringify(element.area)) {
                                element.area_name = ele.area;
                            }
                        });
                    });

                    res.json(result, 200, next);
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const details = (req, res, next) => {
    Region.findById(req.params.id)
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                let zones = [];
                result[0].area_details.forEach(area => {
                    // console.log('area: ', area);
                    result[0].zone_details.forEach(zone => {
                        if (JSON.stringify(area._id) == JSON.stringify(zone.area)) {
                            zones.push({ _id: zone._id, name: zone.zone });
                        }
                    });
                    area.zone_details11 = zones;

                });
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const create = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        req.body.created_at = new Date();
        Region.create(req.body, currentLoggedUser)
            .then((newRegion) => {
                if (newRegion === 0) {
                    res.status(408).json({ message: 'region already exist', status: 408 });
                } else {
                    res.json({ message: 'region successfully created!', status: 200, regionId: newRegion });
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const update = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        Region.update(req.params.id, req.body, currentLoggedUser)
            .then((result) => {
                if (result == 0) {
                    res.status(408).json({ message: 'region already exist', status: 408 });
                } else if (result == 1) {
                    res.json({ message: 'region successfully updated!', status: 200 });
                } else {
                    res.json({ message: 'region not updated!', status: 200 });
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

const DeleteRegion = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        Region.deleteById(req.params.id, currentLoggedUser)
            .then((result) => {
                if (result == 1) {
                    res.json({ message: 'Region deleted successfully', status: 200 });
                } else {
                    res.json({ message: 'Region not deleted successfully', status: 500 });
                }
            }).catch((e) => next(e));
    }).catch((e) => next(e));
};

module.exports = { listAll, filter_list, listTaggedAreaZone, listAllWithAreaZone, details, create, update, DeleteRegion };