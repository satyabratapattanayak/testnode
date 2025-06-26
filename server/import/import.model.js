const ObjectId = require('mongodb').ObjectID;
const { isEmpty, isArray, isUndefined, first, head } = require('lodash');

let mydb;
/* mongodb.connect(config.mongoDBurl, (err, database) => {
    mydb = database.db('sevenCRM');
    if (err) return console.log('db connection err: ', err);
}); */
const acl = require('../../server/service/acl');
const DataAccess = require('../helpers/DataAccess');
const Audit = require('../modules/audit/audit.model');
const database = require('../service/database');
database.getDb().then(res => { mydb = res; });
const collection_name = 'import';

const collection = (collectionName) => { return mydb.collection(collectionName); };

async function getZone(area) {
    console.log('zone: ', area);
    const collections = collection('zone');
    return await collections.findOne({ zone: area });
    // .findOne({ $text: { $search: area } });
}

function zoneValue(area) {
    return new Promise((resolve, reject) => {
        let i = 0;
        let idArray = [];
        checkzone();
        function checkzone() {
            getZone(area[i]).then((data) => {
                // console.log('data: ', data);
                idArray.push(data._id);
                i++;
                if (i < area.length) {
                    checkzone();

                } else {
                    resolve(idArray);
                }
            });
        }
        // console.log('then 2: ', idArray);

    });

}

async function getArea(area) {
    // console.log('area: ', area);
    const collections = collection('area');
    return await collections
        .findOne({ area: area });
    // .findOne({ $text: { $search: area } });
}

function areaValue(area) {
    console.log('area: ', area);
    return new Promise((resolve, reject) => {
        let i = 0;
        let idArray = [];
        checkzone();
        function checkzone() {
            console.log('area[i]: ', area[i]);
            getArea(area[i]).then((data) => {
                // console.log('data: ', data);
                idArray.push(data._id);
                i++;
                if (i < area.length) {
                    checkzone();
                } else {
                    resolve(idArray);
                }
            });
        }
        // console.log('then 2: ', idArray);

    });

}


const model = {
    findByRefNo: (collectionName, ref_no) => {
        if (!isEmpty(ref_no)) {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .findOne({ empCode: ref_no })
                    .then((found) => { return found ? found : false; });
            }
        } else {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .findOne({ empCode: ref_no })
                    .then((found) => { return true; });
            }
        }
    },

    findByQuery: (collectionName, query) => {
        if (mydb) {
            const collections = collection(collectionName);
            return collections
                .findOne(query)
                .then((found) => { return found ? found : false; });
        }
    },

    findCustomer_ByRefNo: (collectionName, ref_no) => {

        if (!isEmpty(ref_no)) {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .findOne({ customer_code: ref_no })
                    .then((found) => { return found ? found : false; });
            }
        } else {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .findOne({ customer_code: ref_no })
                    .then((found) => { return true; });
            }
        }
    },
    find_staff: (collectionName, ref_no) => {
        if (!isEmpty(ref_no)) {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .findOne({ emp_code: ref_no })
                    .then((found) => { return found ? found : false; });
            }
        } else {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .findOne({ customer_code: ref_no })
                    .then((found) => { return true; });
            }
        }
    },
    Customer_checkStaffAlreadyLinked: (collectionName, customerNo, staffNo) => {
        console.log('LOGG: ', customerNo, staffNo);

        if (!isEmpty(customerNo)) {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    // .findOne({ customer_code: customerNo, linked_staff: { $in: [staffNo] } })
                    .findOne({ customer_code: customerNo, 'linked_staff.staffId': staffNo })
                    .then((found) => {
                        // console.log('FOUND DB: ', found);

                        return found ? found : false;
                    });
            }
        } else {
            /* if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .findOne({ customer_code: ref_no })
                    .then((found) => { return true; });
            } */
            return new Promise((resolve, reject) => { resolve([]); });
        }
    },
    find_Contacts: (collectionName, ref_no) => {
        if (!isEmpty(ref_no)) {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .findOne({ contact_name: ref_no })
                    .then((found) => { return found ? found : false; });
            }
        } else {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .findOne({ contact_name: ref_no })
                    .then((found) => { return true; });
            }
        }
    },
    Staff_findRegion: (userRegion) => {
        let query;
        if (!isEmpty(userRegion)) {
            if (userRegion.indexOf(',') > -1) {
                query = { $text: { $search: userRegion } };
            } else {
                // query = { region: userRegion };
                query = { $text: { $search: userRegion } };
            }
            if (mydb) {
                const collections = collection('region');
                return collections
                    .aggregate([
                        { $match: query },
                        { $project: { region: 0, created_at: 0 } }
                    ])
                    .toArray()
                    .then((result) => {
                        // console.log('region DB: ', result);
                        let id = [];
                        result.forEach(element => {
                            // id = + element._id;
                            id.push(ObjectId(element._id));
                        });
                        return id;
                    });
            }
        } else {
            if (mydb) {
                const collections = collection('region');
                return collections
                    .find({ $text: { $search: 'ashraf' } })
                    .toArray()
                    .then((result) => {
                        return;
                    });
            }
        }

    },
    insert: (collectionName, data) => {
        if (mydb) {
            const collections = collection(collectionName);
            return collections.insertOne(data).then((result) => {
                Audit.addLog({
                    module: collectionName,
                    action: 'create',
                    userId: ObjectId('5a858080e6e8f6724d6aa54f'),
                    documentId: result.ops[0]._id,
                    data: {},
                    message: 'imported this ' + collectionName,
                    date: new Date()
                });
                return result.ops;
            });
        }
    },
    update: (collectionName, id, body) => {
        if (mydb) {
            const collections = collection(collectionName);
            return collections.updateOne({ _id: ObjectId(id) }, { $set: body }).then(() => { });
        }
    },
    append: (collectionName, id, doc) => {
        if (mydb) {
            const collections = collection(collectionName);
            return collections.updateOne({ _id: ObjectId(id) }, doc).then(() => { });
        }
    },
    update_staff: (collectionName, id, body, pushToArray) => {
        if (mydb) {
            const collections = collection(collectionName);
            return collections.updateOne({ _id: ObjectId(id) }, { $set: body, $push: pushToArray }).then(() => { });
        }
    },
    Customer_linkStaff: (collectionName, id, body) => {
        if (mydb) {
            const collections = collection(collectionName);
            return collections.updateOne({ _id: ObjectId(id) }, { $push: { linked_staff: body } }).then(() => { });
        }
    },

    RES_MATRIX_linkStaff: (collectionName, id, body) => {
        body.forEach(element => {
            let crieteria = {
                _id: ObjectId(id),
                'linked_staff.staffId': { $ne: element.staffId },
            };

            let doc = {
                $push: {
                    linked_staff: element,
                },
                $addToSet: {
                    'acl_meta.users': element.staffId
                }
            };
            DataAccess.UpdateOne(collectionName, crieteria, doc);
        });
    },

    Customer_linkContact: (collectionName, id, body) => {
        if (mydb) {
            const collections = collection(collectionName);
            return collections.updateOne({ _id: ObjectId(id) }, { $push: { linked_contacts: body } }).then(() => { });
        }
    },
    update_reportsTo: (collectionName, id, role, reportsTo) => {
        if (mydb) {
            const collections = collection(collectionName);
            return collections
                .updateOne(
                    { _id: ObjectId(id), 'role_access_reports_mapping.role': role },
                    { $push: { 'role_access_reports_mapping.$.reports_to': { id: ObjectId(reportsTo) } } }
                )
                // .findOne({ _id: ObjectId(id) })
                .then(() => { });
        }

        // used for insert STAFF
        /*    update_reportsTo: (collectionName, id, body) => {
         if (mydb) {
            const collections = collection(collectionName);
            return collections
                .updateOne({ _id: ObjectId(id) }, { $set: { area: body } })
                .then(() => { });
        } */
    },

    update_region: (collectionName, id, body) => {
        if (mydb) {
            const collections = collection(collectionName);
            return collections
                .updateOne({ _id: ObjectId(id) }, { $set: { area: body } })
                .then(() => { });
        }
    },

    // get business group
    BG: (collectionName, search) => {
        if (!isEmpty(search)) {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    // .find({ $text: { $search: search } })
                    // .toArray()
                    .find({ group: search })
                    .toArray()
                    .then((result) => {
                        console.log('33333333333333333333333: ', result);

                        if (result == null || result == [] || isEmpty(result)) {
                            return collections.insertOne({ group: search }).then((resp) => {
                                return resp.insertedId;
                            });
                        } else {
                            return result[0]._id;
                        }
                    });
            }
        } else {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .find()
                    .toArray()
                    .then((result) => {
                        return;
                    });
            }
        }
    },
    BC: (collectionName, search) => {
        if (!isEmpty(search)) {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    // .find({ $text: { $search: search } })
                    // .toArray()
                    .find({ category: search })
                    .toArray()
                    .then((result) => {
                        if (result == null || result == [] || isEmpty(result)) {
                            return collections.insertOne({ category: search }).then((resp) => {
                                return resp.insertedId;
                            });
                        } else {
                            return result[0]._id;
                        }
                    });
            }
        } else {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .find()
                    .toArray()
                    .then((result) => {
                        return;
                    });
            }
        }
    },
    BD: (collectionName, search) => {
        if (!isEmpty(search)) {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    // .find({ $text: { $search: search } })
                    // .toArray()
                    .find({ division: search })
                    .toArray()
                    .then((result) => {
                        if (result == null || result == [] || isEmpty(result)) {
                            return collections.insertOne({ division: search }).then((resp) => {
                                return resp.insertedId;
                            });
                        } else {
                            return result[0]._id;
                        }
                    });
            }
        } else {
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .find()
                    .toArray()
                    .then((result) => {
                        return;
                    });
            }
        }
    },

    findRegion_customer: (collectionName, userRegion) => {
        let query;
        if (!isEmpty(userRegion)) {
            if (userRegion.indexOf(',') > -1) {
                query = { $text: { $search: userRegion } };
            } else {
                // query = { region: userRegion };
                query = { $text: { $search: userRegion } };
            }
            if (mydb) {
                const collections = collection(collectionName);
                return collections
                    .aggregate([
                        { $match: query },
                        { $project: { region: 0, created_at: 0 } }
                    ])
                    .toArray()
                    .then((result) => {
                        console.log('region DB: ', result);
                        let id = [];
                        result.forEach(element => {
                            // id = + element._id;
                            id.push(ObjectId(element._id));
                        });
                        return id;
                    });
            }
        } else {
            if (mydb) {
                const collections = collection('region');
                return collections
                    .find({ $text: { $search: 'ashraf' } })
                    .toArray()
                    .then((result) => {
                        return;
                    });
            }
        }

    },

    findArea_customer: (userArea) => {
        console.log('userArea: ', userArea);
        let query;
        if (!isEmpty(userArea)) {
            if (userArea.indexOf(',') > -1) {
                console.log('came');
                // query = { $text: { $search: userArea } };
                const areaArray = userArea.split(',');
                return areaValue(areaArray).then((idarray) => {
                    console.log('idarray: ', idarray);
                    // console.log('idarray: ', idarray);
                    return idarray;
                });
            } else {

                query = { $text: { $search: userArea } };

                // query = { area: userArea };

                console.log('QUERY: ', query);


                if (mydb) {
                    const collections = collection('area');
                    return collections
                        // .find({ $text: { $search: userArea } })
                        .aggregate([
                            { $match: query },
                            { $project: { region: 0, created_at: 0 } }
                        ])
                        .toArray()
                        .then((result) => {
                            console.log('AREA DB: ', result);

                            let id = [];
                            result.forEach(element => {
                                id.push(ObjectId(element._id));
                            });
                            return id;
                        });
                }
            }
        } else {
            console.log('EMPTTTYYYYY');

            /* if (mydb) {
                const collections = collection('area');
                return collections
                    .find({ $text: { $search: userArea } })
                    .toArray()
                    .then((result) => {
                        return;
                    });
            } */
            return new Promise((resolve, reject) => {
                // return;
                console.log('empty');

                resolve([]);
            });
        }
    },

    findZone_customer: (userZone) => {
        console.log('ZONE MODEL:: userZone: ', userZone);

        let query;
        if (!isEmpty(userZone)) {
            if (userZone.indexOf(',') > -1) {
                const zoneArray = userZone.split(',');
                return zoneValue(zoneArray).then((idarray) => {
                    // console.log('idarray: ', idarray);
                    return idarray;
                });
                //  query = { $text: { $search: userZone } };
            } else {

                query = { $text: { $search: userZone } };
                // query = { zone: userZone };

                if (mydb) {
                    const collections = collection('zone');
                    return collections
                        // .find({ $text: { $search: userZone } })
                        .aggregate([
                            { $match: query },
                            { $project: { region: 0, created_at: 0 } }
                        ])
                        .toArray()
                        .then((result) => {
                            console.log('1111111111111111111111111');
                            let id = [];
                            result.forEach(element => {
                                id.push(ObjectId(element._id));
                            });
                            // console.log('idarray id: ', id);
                            return id;
                        });
                }
            }
        } else {
            return new Promise((resolve, reject) => {
                // return;
                console.log('empty zone');

                resolve([]);
            });
        }
    },

    findAreaByZone_customer: (userZone) => {
        // console.log('AREA MODEL:: userZone: ', userZone);

        let query;
        if (!isEmpty(userZone)) {
            if (userZone.indexOf(',') > -1) {
                const zoneArray = userZone.split(',');
                return zoneValue(zoneArray).then((idarray) => {
                    // console.log('idarray: ', idarray);
                    return idarray;
                });
                //  query = { $text: { $search: userZone } };
            } else {
                query = { $text: { $search: userZone } };
                // query = { zone: userZone };

                if (mydb) {
                    const collections = collection('zone');
                    return collections
                        // .find({ $text: { $search: userZone } })
                        .aggregate([
                            { $match: query },
                            { $project: { region: 0, created_at: 0 } }
                        ])
                        .toArray()
                        .then((result) => {
                            console.log("RESULT ZONEEEE: ", result);
                            /* let id = [];
                            result.forEach(element => {
                                id.push(ObjectId(element._id));
                            });
                            // console.log('idarray id: ', id);
                            return id; */
                            return result[0].area;
                        });
                }
            }
        } else {
            return new Promise((resolve, reject) => {
                // return;
                console.log('empty zone');

                resolve([]);
            });
        }
    }

};

module.exports = model;