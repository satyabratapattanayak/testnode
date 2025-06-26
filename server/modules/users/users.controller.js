// @ts-check
const objectid = require('mongodb').ObjectID;
const { isEmpty, head, isArray } = require('lodash');
const randomcolor = require('randomcolor');
const PubSub = require('pubsub-js');

const User = require('../users/users.model.js');
const UserLocation = require('../users/userLocation.model.js');
const { getDateMonthYearTime } = require('../../config/dateutil');
const { getCurrentUserInfo } = require('../shared/shared.controller');
const Config = require('../../config/config');
const Notes = require('../notes/notes.model.js');
const { transporter } = require('../../config/nodemailer');
const Tasks = require('../schedule/schedule.model.js');



const addNote = (module, documentId, notes, user) => {
    if (isEmpty(notes)) { notes = []; } else {
        notes = [{
            data: notes,
            userId: objectid(user),
            date: new Date()
        }];
    }
    const body = {
        module: module,
        documentId: documentId,
        notes: notes
    };
    Notes.create(body);
};

const listAll = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        let body = req.body;
        const result = await User.all(currentLoggedUser, null, body)

        if (isEmpty(result)) {
            res.status(404).json({ message: 'Users not found!', status: 404 });
        } else {
            result[0].data.forEach(element => {
                // element.created_at = getDateMonthYearTime(element.created_at);
                element.role_access_reports_mapping.forEach(ele => {

                    if (!isEmpty(element.role_details) && element.role_details != null && element.role_details != undefined && element.role_details.length > 0) {
                        element.role_details.forEach(roleElement => {
                            if (roleElement._id == ele.role) { ele.role_name = roleElement.role; }
                        });
                    }

                    if (!isEmpty(element.access_level_details) && element.access_level_details != null && element.access_level_details != undefined && element.access_level_details.length > 0) {
                        element.access_level_details.forEach(accessElement => {
                            if (accessElement._id == ele.access_level) {
                                ele.access_level_name = accessElement.access_level;
                            }
                        });
                    }
                });

                if (element.roles) { delete element.roles.role; }
                if (element.access_level_details) { delete element.access_level_details; }
                if (element.role_details) { delete element.role_details; }
            });
            let response = {
                data: result[0].data,
                // total: result[0].totalCount[0].count
                total: result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0
            }
            res.json(response, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const listStaffsToLink = (req, res, next) => {
    User.listStaffsToLink(req.body)
        .then((result) => {
            if (isEmpty(result)) { res.status(404).json({ message: 'No data found', status: 404 }); } else {
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};

const advance_filter = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        User.advance_filter(req.body, currentLoggedUser)
            .then((result) => {
                result.forEach(element => {
                    element.name = element.first_name + ' ' + element.last_name + '(' + element.accessLevel_details[0].access_level + ')';
                    element.marker_color = randomcolor();
                    element.region = !isEmpty(element.region_details) ? element.region_details[0].region : '';
                    element.area = !isEmpty(element.area_details) ? element.area_details[0].area : '';
                    delete element.area, delete element.region, delete element.zone, delete element.reports_to, delete element.access_level;
                    delete element.roles, delete element.accessLevel_details;
                    delete element.role_access_reports_mapping, delete element.first_name, delete element.last_name;
                    delete element.region_details, delete element.area_details, delete element.zone_details;
                    delete element.reports_to_all_tagged, delete element.reports_details;
                    delete element.access_levels, delete element.role_temp, delete element.tokens, delete element.token;
                });
                res.json(result, 200, next);
            }).catch(e => next(e));
    }).catch(e => next(e));
};

const basic_filter = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await User.basic_filter(currentLoggedUser, req.query);
        res.json(result, 200, next);
    } catch (error) {
        next(error)
    }
};

// list of users on creation of schedule
const listUsersToCreateSchedule = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization);
        const result = await User.listUsersToCreateSchedule(currentLoggedUser)
        result.forEach(element => {
            if (!isEmpty(element.role_details)) {
                element.role = !isEmpty(element.role_details) ? element.role_details[0].role : '';
            }
            if (!isEmpty(element.accessLevel_details)) {
                element.access_level = !isEmpty(element.accessLevel_details) ? element.accessLevel_details[0].access_level : '';
            }
            delete element.roles;
            delete element.region, delete element.area, delete element.zone, delete element.reports_to;
            delete element.role_details, delete element.accessLevel_details, delete element.role_access_reports_mapping;
            delete element.first_name, delete element.last_name;
            delete element.region_details, delete element.area_details, delete element.zone_details;
            delete element.access_levels, delete element.role_temp, delete element.reports_details;
            delete element.tokens, delete element.token, delete element.reports_to_all_tagged;
        });
        res.json(result, 200, next);
    } catch (error) {
        next(error)
    }
};

// list of users on creation of schedule(meetings)
// const listUsersToCreateMeetings = async (req, res, next) => {
//     try {
//         const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
//         const result = await User.listUsersToReportsTo(req.query, currentLoggedUser)
//         res.json(result, 200, next);
//     } catch (error) {
//         next(error);
//     }
// };

// list of users on for responsibility matrix (BD stage: s2)
const listUsersOfResponsibilityMatrix = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await User.listUsersOfRespMatrix(currentLoggedUser, req.body)
        res.json(result, 200, next);
    } catch (error) {
        next(error);
    }
};

// list of users(Reports To) on creation of staff
const listUsersToReportsTo = async (req, res, next) => {
    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await User.listUsersToReportsTo(req.body, currentLoggedUser)
        result.forEach(element => {
            element.name = element.first_name + ' ' + element.last_name; // + '(' + element.accessLevel_details[0].access_level + ')';
            delete element.area, delete element.region, delete element.zone, delete element.reports_to, delete element.access_level;
            delete element.roles, delete element.accessLevel_details;
            delete element.first_name, delete element.last_name;
            delete element.role_temp, delete element.tokens, delete element.token;
            delete element.role, delete element.role_access_reports_mapping;
        });
        res.json(result, 200, next);
    } catch (error) {
        next(error)
    }
};


function getUnique(arr, comp) {
    console.log(comp);
    const unique = arr
        .map(e => {
            e[comp]
        })

        // store the keys of the unique objects
        .map((e, i, final) => {
            console.log(i);
            final.indexOf(e) === i && i
        })

        // eliminate the dead keys & store unique objects
        .filter(e => arr[e]).map(e => arr[e]);

    return unique;
}

const userDetails = (req, res, next) => {
    const id = req.params.id;
    User.findById(id)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ success: false, message: 'user not found!', status: 404 });
            } else {
                result.forEach(element => {

                    if (!isEmpty(element.linked_customers)) {
                        linkedCustomers(element);
                    }

                    element.role_access_reports_mapping.forEach(element2 => {
                        element2.reports_to.forEach(reportsTo => {
                            const reportsUser = element.reportsTo_details.find(user => {
                                return JSON.stringify(user._id) == JSON.stringify(reportsTo.id);
                            });

                            if (reportsUser) {
                                reportsTo.name = reportsUser.first_name;
                            }

                        });
                        element.role_details.forEach(role => {
                            if (element2.role === role._id) {
                                element2.role_name = role.role;
                            }
                        });
                        element.access_level_details.forEach(access_level => {
                            if (element2.access_level === access_level._id) {
                                element2.access_level_name = access_level.access_level;
                            }
                        });
                    });

                    let regions = [];
                    element.region_details.forEach(region => {
                        element.region.forEach(elementRegion => {
                            if (JSON.stringify(elementRegion) === JSON.stringify(region._id)) {
                                regions.push({ id: elementRegion, region_name: region.region });
                            }
                        });
                    });
                    element.region = regions;

                    let areas = [];
                    element.area_details.forEach(area => {
                        element.area.forEach(elementArea => {
                            if (JSON.stringify(elementArea) === JSON.stringify(area._id)) {
                                areas.push({ id: elementArea, area_name: area.area });
                            }
                        });

                    });
                    element.area = areas;

                    let zones = [];
                    element.zone_details.forEach(zone => {
                        element.zone.forEach(elementZone => {
                            if (JSON.stringify(elementZone) === JSON.stringify(zone._id)) {
                                zones.push({ id: elementZone, zone_name: zone.zone });
                            }
                        });

                    });
                    element.zone = zones;

                    delete element.linked_customers1;
                    delete element.linked_customers2;
                    delete element.access_level_details, delete element.role_details;
                    delete element.reportsTo_details, delete element.region_details, delete element.area_details, delete element.zone_details;
                    delete element.linked_customers_bc_details, delete element.linked_customers_zone_details;
                });
                res.json(result, 200, next);
            }
        })
        .catch((e) => next(e));
};


const create = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        if (req.body.state && objectid.isValid(req.body.state)) {
            req.body.state = objectid(req.body.state);
        }

        if (req.body.region) {
            let selectedRegion = [];
            req.body.region.forEach(element => { selectedRegion.push(objectid(element)); });
            req.body.region = selectedRegion;
        } else {
            req.body.region = [];
        }

        if (req.body.area) {
            let selectedArea = [];
            req.body.area.forEach(element => { selectedArea.push(objectid(element)); });
            req.body.area = selectedArea;
        } else {
            req.body.area = [];
        }

        if (req.body.zone) {
            let selectedZone = [];
            req.body.zone.forEach(element => { selectedZone.push(objectid(element)); });
            req.body.zone = selectedZone;
        } else {
            req.body.zone = [];
        }


        if (req.body.role_access_reports_mapping) {
            req.body.role_access_reports_mapping.forEach(element => {
                if (!isEmpty(element.reports_to)) {
                    let reportsId = [];
                    element.reports_to.forEach(element2 => {
                        reportsId.push({ id: objectid(element2) });
                    });
                    element.reports_to = reportsId;
                }
            });
        }

        console.log('USER CREATE::req data:==>: ', req.body);

        User.create(req.body, currentLoggedUser)
            .then((createdUser) => {

                if (createdUser === 0) {
                    res.status(408).json({ Message: 'User: ' + req.body.email + ' already exist!', status: 408 });
                } else if (createdUser === 1) {
                    res.status(408).json({
                        Message: 'This user was active previously and has been archived. Please un archive the user',
                        status: 408
                    });
                } else {
                    res.status(200).json({ message: 'staff successfully created', status: 200, userId: createdUser[0]._id });
                    return addNote('users', head(createdUser)._id, head(createdUser).notes, currentLoggedUser._id);
                }

            })
            .catch((e) => next(e));
    }).catch((e) => next(e));
};

const update = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const id = req.params.id;
        if (req.body.staffList) {
            req.body.staffList.forEach(AssignedStaffs => { AssignedStaffs.id = objectid(AssignedStaffs.id); });
        }

        if (req.body.state && objectid.isValid(req.body.state)) {
            req.body.state = objectid(req.body.state);
        }

        if (req.body.region) {
            let emptyRegion = [];
            req.body.region.forEach(element => { emptyRegion.push(objectid(element)); });
            req.body.region = emptyRegion;
        }

        if (req.body.area) {
            let emptyArea = [];
            req.body.area.forEach(element => { emptyArea.push(objectid(element)); });
            req.body.area = emptyArea;
        }

        if (req.body.zone) {
            let emptyZone = [];
            req.body.zone.forEach(element => { emptyZone.push(objectid(element)); });
            req.body.zone = emptyZone;
        }

        if (req.body.role_access_reports_mapping) {
            req.body.role_access_reports_mapping.forEach(element => {
                if (!isEmpty(element.reports_to)) {
                    let reportsId = [];
                    element.reports_to.forEach(element2 => {
                        reportsId.push({ id: objectid(element2) });
                    });
                    element.reports_to = reportsId;
                }
            });
        }

        req.body.isFirstTimeLogin = 0;
        req.body.modified_At = new Date();
        delete req.body.created_by, delete req.body.created_at;

        User.update(id, req.body, currentLoggedUser)
            .then((result) => {
                if (result == 1) {
                    res.json({ Message: 'update successfull!', status: 200 });
                } else if (result == 0) {
                    res.status(408).json({ Message: 'User: ' + req.body.email + ' already exist!', status: 408 });
                } else {
                    res.json({ Message: 'update failed' });
                }
            })
            .catch((e) => next(e));
    }).catch((e) => next(e));
};

const addNotes = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const id = req.params.userId;

        if (req.body.files) {
            let uploadedFile = [];
            req.body.files.forEach(element => {
                uploadedFile.push(objectid(element.id));
            });
            req.body.files = uploadedFile;
        }

        if (!isEmpty(req.body.tagged_users)) {
            let t_users = [];
            req.body.tagged_users.forEach(element => {
                t_users.push(objectid(element));
            });
            req.body.tagged_users = t_users;
        } else {
            req.body.tagged_users = [];
        }

        req.body.userId = objectid(currentLoggedUser._id);
        req.body.date = new Date();
        Notes.addNotes(id, req.body, currentLoggedUser, 'users')
            .then((result) => {
                result[0].notes.forEach(element1 => {
                    result[0].notes_user_details.forEach(element2 => {
                        if (JSON.stringify(element1.userId) == JSON.stringify(element2._id)) {
                            element1.username = element2.first_name + ' ' + element2.last_name;
                        }
                    });
                    let filesDetails = [];
                    if (!isEmpty(element1.files)) {
                        element1.files.forEach(element => {
                            result[0].file_details.forEach(fileElement => {
                                if (JSON.stringify(element) == JSON.stringify(fileElement._id)) {
                                    filesDetails.push({ id: element, file_name: fileElement.file_name, url: Config.imageURL + element });
                                }
                            });
                        });
                        element1.files = filesDetails;
                    }
                });
                res.json(head(result).notes);
            })
            .catch((e) => next(e));
    }).catch((e) => next(e));
};

const listUsersBasedOnRoleAndReporters = async (req, res, next) => {

    try {
        const currentLoggedUser = await getCurrentUserInfo(req.headers.authorization)
        const result = await User.staffListBasedOnRoleAndReporters(req.body, currentLoggedUser)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            result.forEach(element => {
                if (!element.emp_code || isEmpty(element.emp_code)) {
                    element.emp_code = '';
                }
            });
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};
const listUsersBasedOnRole = async (req, res, next) => {
    try {
        const result = await User.staffListBasedOnRole(req.body.roles)
        if (isEmpty(result)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            result.forEach(element => {
                if (!element.emp_code || isEmpty(element.emp_code)) {
                    element.emp_code = '';
                }
            });
            res.json(result, 200, next);
        }
    } catch (error) {
        next(error)
    }
};

const deleteUser = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const id = req.params.id;
        User.delete(id, currentLoggedUser)
            .then((result) => {
                if (result == 1) {
                    res.status(200).json({ message: 'Staff deleted successfully!', status: 200 });
                } else {
                    res.json({ message: 'Staff not deleted!' });
                }
            })
            .catch(e => next(e));
    }).catch(e => next(e));
};

const linkCustomers = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const userId = req.params.userId;

        let reqBody = [];
        if (!isEmpty(req.body.customerId)) {
            req.body.customerId.forEach(element => {
                reqBody.push(objectid(element));
            });
        } else {
            res.status(400).json({ message: 'customerId requires', status: 400 });
        }

        req.body = reqBody;

        User.linkCustomers(userId, req.body, currentLoggedUser)
            .then((result) => {
                if (result == 1) {
                    res.json({ message: 'customer successfully linked!', status: 200 });
                } else {
                    res.json({ message: 'not linked successfully', status: 500 });
                }
            })
            .catch((e) => next(e));
    }).catch((e) => next(e));
};

const linkLeads = (req, res, next) => {
    getCurrentUserInfo(req.headers.authorization).then((currentLoggedUser) => {
        const userId = req.params.userId;

        let reqBody = [];
        if (!isEmpty(req.body.leadId)) {
            req.body.leadId.forEach(element => {
                reqBody.push(objectid(element));
            });
        } else {
            res.status(400).json({ message: 'leadId requires', status: 400 });
        }

        req.body = reqBody;

        User.linkLeads(userId, req.body, currentLoggedUser)
            .then((result) => {
                if (result == 1) {
                    res.json({ message: 'Lead successfully linked!', status: 200 });
                } else {
                    res.json({ message: 'not linked successfully', status: 500 });
                }
            })
            .catch((e) => next(e));
    }).catch((e) => next(e));
};

const updateLocation = (req, res, next) => {
    let userId = req.body.userId;
    let location = req.body.user_location;

    console.log('LOCATION to can checkIn: ', req.body);

    Tasks.updateFieldActivityByAssignee([userId], location).then(result => {
        console.log('findByAssignee: ', result);
        res.json(result, 200, next);
    });
};
const sendLocation = (req, res, next) => {
    let body = req.body;
    let json = { meta: body };
    json.location = {
        type: "Point",
        coordinates: [body.location.coords.latitude, body.location.coords.longitude]
    }
    PubSub.publish('live-locations', json);
    UserLocation.create(json).then(result => {
        res.json({ status: "success" }, 200, next);
    }, err => {
        res.json({ status: "error" }, 200, next);
    });
}
const getLocations = (req, res, next) => {
    console.log('req body: ', req.body);
    let body = req.body;
    let fromDate = new Date(body.fromDate);
    let toDate = new Date(body.toDate);

    let query = [

        { $match: { "meta.userId": { $in: body.users }, "meta.location.timestamp": { "$gte": fromDate.toISOString(), "$lte": toDate.toISOString() } } },
        {
            $group: {
                _id:
                    { uuid: "$meta.device.uuid", userId: "$meta.userId", manufacturer: "$meta.device.manufacturer", model: "$meta.device.model" },
                location: { $push: "$meta" }
            }
        }
    ]
    console.log("aggregate query", JSON.stringify(query));
    UserLocation.aggregate(query).then(result => {
        //    console.log("aggregate", result);
        res.json({ status: "success", result }, 200, next);
    }, err => {
        console.log("aggregate err", err);
        res.json({ status: "error" }, 200, next);
    });

}
const getLastLocations = (req, res, next) => {
    console.log('req body: ', req.body);
    let body = req.body;
    let fromDate = new Date(body.fromDate);
    let toDate = new Date(body.toDate);
    fromDate.setDate(-15);
    let date = fromDate.toISOString();
    let query = [
        {
            $match: {
                "meta.userId": { $in: body.users },

                "meta.location.timestamp": { "$gte": date }
            }
        },


        {
            $group: {
                _id: { userId: "$meta.userId" },
                location: { $last: "$meta" },
                count: { $sum: 1 }
            }
        },

        { "$addFields": { "userId": { "$toObjectId": "$_id.userId" } } },
        {
            "$lookup":
            {
                "from": "users",
                "localField": "userId",
                "foreignField": "_id",
                "as": "user"
            }
        },
    ]
    console.log("aggregate query", JSON.stringify(query));
    try {
        UserLocation.aggregate(query, { allowDiskUse: true }).then(result => {
            console.log("aggregate", result);
            res.json({ status: "success", result }, 200, next);
        }, err => {
            console.log("aggregate err", err);
            res.json({ status: "error" }, 200, next);
        })
    } catch (err) {
        console.log("aggregate err", err);
        res.json({ status: "error" }, 200, next);
    }


}

module.exports = {
    advance_filter,
    basic_filter,
    listUsersToCreateSchedule,
    listUsersToReportsTo,
    listAll,
    listStaffsToLink,
    userDetails,
    create,
    update,
    addNotes,
    listUsersBasedOnRole,
    listUsersBasedOnRoleAndReporters,
    deleteUser,
    linkCustomers,
    linkLeads,
    updateLocation,
    sendLocation,
    getLocations,
    getLastLocations,
    // listUsersToCreateMeetings,
    listUsersOfResponsibilityMatrix,

};

function linkedCustomers(element) {
    let uniqueArray = [];
    element.linked_customers.forEach(ele => {
        let uniqueUser = uniqueArray.find((user) => {
            if (user) {
                return JSON.stringify(user._id) === JSON.stringify(ele._id);
            }
        });
        if (!uniqueUser) {
            uniqueArray.push(ele);
        }
    });
    element.linked_customers = uniqueArray;
    element.linked_customers.forEach(linkedCustomer => {
        if (!isEmpty(linkedCustomer.customer_business_category)) {
            if (isArray(linkedCustomer.customer_business_category)) {
                let categories = [];
                linkedCustomer.customer_business_category.forEach(customerBC => {
                    const categoryDetails = element.linked_customers_bc_details.find((category) => {
                        return JSON.stringify(category._id) == JSON.stringify(customerBC);
                    });
                    if (categoryDetails) {
                        categories.push(categoryDetails.category);
                    }
                });
                linkedCustomer.customer_business_category = categories;
            }
            else {
                linkedCustomer.customer_business_category = element.linked_customers_bc_details[0].category;
            }
        }
        if (!isEmpty(linkedCustomer.customer_zone)) {
            if (isArray(linkedCustomer.customer_zone)) {
                let zoneNames = [];
                linkedCustomer.customer_zone.forEach(eachZone => {
                    const zones = element.linked_customers_zone_details.find((zoneDetails) => {
                        return JSON.stringify(eachZone) == JSON.stringify(zoneDetails._id);
                    });
                    if (zones) {
                        zoneNames.push(zones.zone);
                    }
                });
                linkedCustomer.customer_zone = zoneNames;
            }
            else {
                element.linked_customers_zone_details.forEach(eachZone => {
                    if (JSON.stringify(linkedCustomer.customer_zone) == JSON.stringify(eachZone._id)) {
                        linkedCustomer.customer_zone = eachZone.zone;
                    }
                });
            }
        }
    });
}
