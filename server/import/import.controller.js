const { isEmpty, isUndefined } = require('lodash');
const ObjectId = require('mongodb').ObjectID;
const fs = require('fs');
const csv = require('fast-csv');
const request = require('request');

const Model = require('../import/import.model.js');
// const CustomerModel = require('../');
const Region = require('../modules/region/region.model.js');
const Area = require('../modules/area/area.model.js');
const Zone = require('../modules/zone/zone.model.js');
const StateModel = require('../modules/state/state.model');


let count = 0;

// stable
const staffInsert = (req, res, next) => {
    let count = 0;
    let csvTempArray = [];
    csv
        .fromPath('/home/developer-ashraf/Desktop/test.csv')
        .on('data', (data) => {
            if (count != 0) { csvTempArray.push(data); }
            count++;
        })
        .on('end', () => {
            if (!isEmpty(csvTempArray)) {
                let array = [];
                let insertedCount = 0;
                let updatedCount = 0;
                let totalCount = 0;
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let element = array.pop();

                        if (!isEmpty(element[0])) {
                            const konspec_refno = element[0];
                            const first_name = element[1];
                            const last_name = element[2];
                            const email = element[3];
                            const designation = element[4];
                            const role = element[5];
                            const ACL = element[6];
                            const dept = element[7];
                            const region = element[8];
                            const area = element[9];
                            const zone = element[10];
                            const location = element[11];
                            Model.findByRefNo('users', konspec_refno).then((staff) => {
                                console.log('1111111: ', staff);
                                Region.findByName(region).then((regionId) => {
                                    console.log('222');
                                    Area.findByName(area).then((areaId) => {
                                        console.log('333: ', konspec_refno);
                                        Zone.findByName(zone).then((zoneId) => {
                                            console.log('444');
                                            Role.findByName(role).then((roleId) => {
                                                console.log('5555');
                                                Role.findACL(ACL).then((aclId) => {
                                                    console.log('6666');
                                                    const jsonDataToInsert = {
                                                        emp_code: konspec_refno,
                                                        first_name: first_name,
                                                        last_name: last_name,
                                                        email: email,
                                                        password: 'pa55w0rd',
                                                        designation: designation,
                                                        department: dept,
                                                        region: region != '' ? regionId : [],
                                                        area: area != '' ? areaId : [],
                                                        zone: zone != '' ? zoneId : [],
                                                        role_access_reports_mapping: [
                                                            {
                                                                role: role != '' ? roleId : '',
                                                                access_level: ACL != '' ? aclId : '',
                                                                reports_to: []
                                                            }
                                                        ],
                                                        localtion: location,
                                                        created_at: new Date()
                                                    };


                                                    if (staff == false) {
                                                        console.log('false');
                                                        Model.insert('users', jsonDataToInsert);
                                                        insertedCount++;
                                                    } else {
                                                        console.log('else');
                                                        Model.update('users', staff._id, jsonDataToInsert);
                                                        updatedCount++;
                                                    }
                                                    totalCount++;
                                                    if (array.length > 0) {
                                                        return importCsv(array);
                                                    }
                                                    else {
                                                        res.json({ Inserted: insertedCount, Updated: updatedCount, 'Total': totalCount });
                                                        return true;
                                                    }
                                                });
                                            });
                                        });
                                    });

                                });
                            });
                        } else {
                            if (array.length > 0) {
                                return importCsv(array);
                            }
                            else {
                                return true;
                            }
                        }
                    } else {
                        return true;
                    }
                };
                importCsv(csvTempArray);

            }
        });
};



const staff_UpdateReportsTo = (req, res, next) => {
    let count = 0;
    let csvTempArray = [];
    csv
        .fromPath(req.file.path)
        .on('data', (data) => {
            if (count != 0) {
                csvTempArray.push(data); // push csv data into an array
            }
            count++;
        })
        .on('end', () => {
            if (!isEmpty(csvTempArray)) {
                let array = [];
                let updatedCount = 0;
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let element = array.pop();

                        console.log('reports1: ', element[1], '::', element[7]);

                        const konspec_refno = element[1];
                        const reportsToNo = element[7];
                        // let str = konspec_refno;
                        // if (str.match('+AC0-')) {
                        //     str.replace('+AC0-', '-');
                        // }
                        let query = { empCode: konspec_refno };
                        Model.findByQuery('users', query).then((staff) => {

                            console.log('user1: ', staff._id);

                            // if (reportsToNo && reportsToNo.length > 0) {
                            let query = { empCode: reportsToNo };
                            Model.findByQuery('users', query).then((reportingUser) => {
                                console.log('user2: ', reportingUser._id);
                                let query = { _id: ObjectId(staff._id), 'role_access_reports_mapping.reports_to.id': ObjectId(reportingUser._id) };
                                Model.findByQuery('users', query).then((reportsToUser) => {
                                    console.log('user3: ', reportsToUser);
                                    /* const jsonDataToInsert = {
                                        'role_access_reports_mapping': [
                                            {
                                                role: role,
                                                access_level: '',
                                                reports_to: reportsToNo != '' ? reportsToUser : [], //[reportsTo]
                                            }
                                        ],
                                        created_at: new Date()
                                    }; */

                                    // db.importStaff.updateOne({"_id" : ObjectId("5b4c2b1e4b0def1a7961c444"),"role_access_reports_mapping.role":2},{$set:{"role_access_reports_mapping.$.access_level":7}})
                                    // db.importStaff.updateOne({"_id" : ObjectId("5b4c363377d26b20b37dd204")},{$push:{"role_access_reports_mapping.reports_to" :{id:2}}})
                                    // db.importStaff.updateOne({"_id" : ObjectId("5b4c363377d26b20b37dd204"),"role_access_reports_mapping.role":2},{$push:{"role_access_reports_mapping.$.reports_to" :{id:1}}})

                                    if (reportsToUser == false) {
                                        Model.update_reportsTo('users', staff._id, 2, reportingUser._id);
                                        // updatedCount++;
                                    }

                                    if (array.length > 0) { return importCsv(array); } else {
                                        res.send('imported');
                                        return true;
                                    }



                                    // });
                                });
                            });
                            // }

                        });
                    } else {
                        return true;
                    }
                };
                importCsv(csvTempArray);

            }
        });
};


const staff_UpdateReagionAreaZOne = (req, res, next) => {
    let count = 0;
    let csvTempArray = [];
    csv
        .fromPath('/home/developer-ashraf/Desktop/test.csv')
        .on('data', (data) => {
            if (count != 0) {
                csvTempArray.push(data); // push csv data into an array
            }
            count++;
        })
        .on('end', () => {
            if (!isEmpty(csvTempArray)) {
                let array = [];
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let element = array.pop();

                        const konspec_refno = element[0];
                        const region = element[1];

                        Model.findByRefNo('importStaff', konspec_refno).then((staff) => {
                            Region.find_region(region).then((regionId) => {
                                // Area.findByName(area).then((areaId) => {
                                //     Zone.findByName(zone).then((zoneId) => {
                                const jsonDataToInsert = {
                                    'role_access_reports_mapping': [
                                        {
                                            role: 'role',
                                            access_level: '',
                                            reports_to: ''
                                        }
                                    ],
                                    created_at: new Date()
                                };

                                // db.importStaff.updateOne({"_id" : ObjectId("5b4c2b1e4b0def1a7961c444"),"role_access_reports_mapping.role":2},{$set:{"role_access_reports_mapping.$.access_level":7}})
                                // db.importStaff.updateOne({"_id" : ObjectId("5b4c363377d26b20b37dd204")},{$push:{"role_access_reports_mapping.reports_to" :{id:2}}})
                                // db.importStaff.updateOne({"_id" : ObjectId("5b4c363377d26b20b37dd204"),"role_access_reports_mapping.role":2},{$push:{"role_access_reports_mapping.$.reports_to" :{id:1}}})

                                // if (reportsToUser != true && reportsToUser != false) {
                                // Model.update_reportsTo('users', staff._id, roleId, reportsToUser._id);
                                // }

                                if (array.length > 0) { return importCsv(array); } else { return true; }
                                // return array.length > 0 ? importCsv(array) : true;
                            });
                        });
                        //     });
                        // });
                    } else {
                        return true;
                    }
                };
                importCsv(csvTempArray);

            }
        });
};

const customerInsert = (req, res, next) => {
    let count = 0;
    let csvTempArray = [];
    csv
        .fromPath(req.file.path)
        .on('data', (data) => {
            if (count != 0) {
                csvTempArray.push(data);
            }
            count++;
        })
        .on('end', () => {
            if (!isEmpty(csvTempArray)) {
                let array = [];
                let insertedCount = 0;
                let updatedCount = 0;
                let totalCount = 0;
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let element = array.pop();

                        const customer_refno = element[0];
                        const customer_name = element[1];
                        const customer_address1 = element[3];
                        const customer_address2 = element[4];
                        const customer_city = element[5];
                        const customer_phone = element[7];
                        const credit_limit = element[9];
                        const currency_code = element[10];
                        const customer_postcode = element[12];
                        const customer_country = element[13];
                        const customer_email = element[14];
                        const panNum = element[15];
                        const pan_status = element[16];
                        const gst_registration_num = element[17];
                        const gst_registration_type = element[18];
                        const customer_type = element[19];
                        const projected_customer_category = element[20];
                        const customer_category = element[24];
                        const name_onpan = element[28];
                        const cin_number = element[29];
                        const credit_days = element[30];
                        const credit_rating = element[31];
                        const last_credit_rating_review_date = element[32];
                        const bank_guarantee = element[34];
                        const customer_contact_point_techservice = element[35];
                        const customer_contact_point_techservices_designation = element[36];
                        const industrial_area = element[38];
                        const customer_continent = element[40];
                        const customer_sub_continent = element[41];
                        const businesscode = element[42];
                        const customer_region = element[43];
                        const crm_division = element[44];
                        const crm_brand_region = element[45];
                        const customer_area = element[46];
                        const customer_zone = element[48];
                        const businessunit = element[489];

                        let query = { customer_code: customer_refno };
                        Model.findByQuery('customer', query).then((customer) => {
                            let query = { region_code: customer_region };
                            Model.findByQuery('region', query).then((regionId) => {
                                let query = { area_code: customer_area };
                                Model.findByQuery('area', query).then((areaId) => {
                                    let query = { zone_code: customer_zone };
                                    Model.findByQuery('zone', query).then((zoneId) => {

                                        if (zoneId == false) {
                                            fs.appendFile('/home/developer-ashraf/projects/newZone.txt', customer_zone + '\n', () => { });
                                        }
                                        if (areaId == false) {
                                            fs.appendFile('/home/developer-ashraf/projects/newArea.txt', customer_area + '\n', () => { });
                                        }
                                        if (regionId == false) {
                                            fs.appendFile('/home/developer-ashraf/projects/newRegion.txt', customer_region + '\n', () => { });
                                        }

                                        const jsonDataToInsert = {
                                            customer_region: (regionId && regionId != false) ? regionId._id : '',
                                            customer_area: (areaId && areaId != false) ? areaId._id : '',
                                            customer_zone: (zoneId && zoneId != false) ? zoneId._id : '',
                                            modified_At: new Date()
                                        };

                                        console.log('jsonDataToInsert: ', jsonDataToInsert);

                                        if (customer == false) {
                                            // Model.insert('customer', jsonDataToInsert);
                                            fs.appendFile('/home/developer-ashraf/projects/newCustomer.txt', element + '\n', () => { });
                                            insertedCount++;
                                        } else {
                                            fs.appendFile('/home/developer-ashraf/projects/updatedCustomer.txt', customer._id + '\n', () => { });
                                            Model.update('customer', customer._id, jsonDataToInsert);
                                            updatedCount++;
                                        }
                                        totalCount++;

                                        if (array.length > 0) {
                                            return importCsv(array);
                                        }
                                        else {
                                            console.log('Imported =====================================================>: ', insertedCount, updatedCount, totalCount);
                                            res.json({ Inserted: insertedCount, Updated: updatedCount, 'Total': totalCount });
                                            return true;
                                        }
                                    });
                                });
                            });
                        });
                    } else {
                        console.log('RETURN END');
                        return true;
                    }
                };
                importCsv(csvTempArray);

            }
        });
};

const customer_UpdateLinkedStaff = (req, res, next) => {
    let count = 0;
    let csvTempArray = [];
    csv
        .fromPath(req.file.path)
        .on('data', (data) => { if (count != 0) { csvTempArray.push(data); } count++; })
        .on('end', () => {
            if (!isEmpty(csvTempArray)) {
                let array = [];
                let updatedCount = 0;
                let updated1Count = 0;
                let totalCount = 0;
                let insertedCount = 0;
                let linkedCount = 0;
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let element = array.pop();

                        const customer_refno = element[0];
                        const linked_staff_refNo = element[1];
                        const linked_staff_executive = element[2];

                        let query = { customer_code: customer_refno };
                        Model.findByQuery('customer', query).then((customer) => {
                            let query = { emp_code: linked_staff_refNo };
                            Model.findByQuery('users', query).then((staff) => {
                                Model.Customer_checkStaffAlreadyLinked('customer', customer_refno, staff._id).then((linkedStaff) => {
                                    if (staff != false) {
                                        const jsonDataToUpdate = {
                                            staffId: staff._id,
                                            addedBy: ObjectId('5a858080e6e8f6724d6aa54f'),
                                            linked_on: new Date()
                                        };
                                        if (linkedStaff == false) {
                                            Model.Customer_linkStaff('customer', customer._id, jsonDataToUpdate);
                                            linkedCount++;
                                        }
                                        if (array.length > 0) {
                                            return importCsv(array);
                                        }
                                    } else {
                                        console.log('INSERT STAFF //////////////////////////////////////> : ', linked_staff_refNo);
                                        if (array.length > 0) {
                                            return importCsv(array);
                                        }
                                    }
                                });
                            });
                        });
                    } else {
                        return true;
                    }
                };
                importCsv(csvTempArray);
            }
        });
};

const customer_LinkContacts = (req, res, next) => {
    let count = 0;
    let csvTempArray = [];
    csv
        .fromPath(req.file.path)
        .on('data', (data) => { if (count != 0) { csvTempArray.push(data); } count++; })
        .on('end', () => {
            if (!isEmpty(csvTempArray)) {
                let array = [];
                let updatedCount = 0;
                let insertedCount = 0;
                let totalCount = 0;
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let element = array.pop();

                        const customer_refno = element[0];
                        const linked_contactName = element[1];

                        let query = { customer_code: customer_refno };
                        Model.findByQuery('customer', query).then((customer) => {

                            let query = { contact_name: linked_contactName };
                            Model.findByQuery('contacts', query).then((contact) => {
                                let query = { _id: customer._id, 'linked_contacts.contactId': contact._id };
                                Model.findByQuery('customer', query).then((linkedContact) => {
                                    if (contact != false) {
                                        const jsonDataToUpdate = {
                                            contactId: contact._id,
                                            addedBy: ObjectId('5a858080e6e8f6724d6aa54f'),
                                            linked_on: new Date()
                                        };
                                        if (linkedContact == false) {
                                            Model.Customer_linkContact('customer', customer._id, jsonDataToUpdate);
                                        }
                                        if (array.length > 0) {
                                            return importCsv(array);
                                        }
                                    } else {
                                        console.log('INSERT STAFF /////////////> : ', linked_contactName);
                                        if (array.length > 0) {
                                            return importCsv(array);
                                        }
                                    }
                                });
                            });
                        });
                    } else {
                        return true;
                    }
                };
                importCsv(csvTempArray);
            }
        });
};

const contactsImport = (req, res, next) => {
    let count = 0;
    let csvTempArray = [];
    csv
        .fromPath(req.file.path)
        .on('data', (data) => {
            if (count != 0) {
                csvTempArray.push(data);
            }
            count++;
        })
        .on('end', () => {
            if (!isEmpty(csvTempArray)) {
                let array = [];
                let insertedCount = 0;
                let updatedCount = 0;
                let totalCount = 0;
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let element = array.pop();

                        const contact_name = element[0];
                        const contact_region = element[1];
                        const contact_area = element[2];
                        const contact_zone = element[4];
                        if (contact_name && contact_name.length > 0) {
                            let query = { contact_name: contact_name };
                            Model.findByQuery('contacts', query).then((contacts) => {
                                let query = { region_code: contact_region };
                                Model.findByQuery('region', query).then((regionId) => {
                                    let query = { area_code: contact_area };
                                    Model.findByQuery('area', query).then((areaId) => {
                                        let query = { zone_code: contact_zone };
                                        Model.findByQuery('zone', query).then((zoneId) => {
                                            if (zoneId == false) {
                                                fs.appendFile('/home/developer-ashraf/projects/newZone.txt', contact_zone + '\n', () => { });
                                            }
                                            if (areaId == false) {
                                                fs.appendFile('/home/developer-ashraf/projects/newArea.txt', contact_area + '\n', () => { });
                                            }
                                            if (regionId == false) {
                                                fs.appendFile('/home/developer-ashraf/projects/newRegion.txt', contact_region + '\n', () => { });
                                            }
                                            const jsonDataToInsert = {
                                                contact_name: contact_name,
                                                contact_region: (regionId && regionId != false) ? [regionId._id] : [],
                                                contact_area: (areaId && areaId != false) ? [areaId._id] : [],
                                                contact_zone: (zoneId && zoneId != false) ? [zoneId._id] : [],
                                            };

                                            console.log('jsonDataToInsert: ', jsonDataToInsert);

                                            if (contacts == false) {
                                                fs.appendFile('/home/developer-ashraf/projects/newCustomer.txt', element + '\n', () => { });
                                                // Model.insert('contacts', jsonDataToInsert);
                                                insertedCount++;
                                            } else {
                                                fs.appendFile('/home/developer-ashraf/projects/updatedCustomer.txt', contacts._id + '\n', () => { });
                                                Model.update('contacts', contacts._id, jsonDataToInsert);
                                                updatedCount++;
                                            }
                                            totalCount++;

                                            if (array.length > 0) {
                                                return importCsv(array);
                                            }
                                            else {
                                                console.log('Imported =====================================================>: ', insertedCount, updatedCount, totalCount);
                                                res.json({ Inserted: insertedCount, Updated: updatedCount, 'Total': totalCount });
                                                return true;
                                            }
                                        });
                                    });
                                });
                            });
                        } else {
                            if (array.length > 0) {
                                return importCsv(array);
                            }
                        }
                    } else {
                        console.log('RETURN END');
                        return true;
                    }
                };
                importCsv(csvTempArray);

            }
        });
};

const checkAndcreateRegion = (data) => {
    return new Promise((resolve, reject) => {
        return Region.create(data)
            .then((result) => {
                resolve(result);
            })
            .catch(e => reject(e));
    });
};

const checkAndcreateArea = (data) => {
    return new Promise((resolve, reject) => {
        return Area.create(data).then((result) => {
            resolve(result);
        }).catch(e => reject(e));
    });
};

const checkAndcreateZone = (data) => {
    return new Promise((resolve, reject) => {
        return Zone.create(data).then((result) => {
            resolve(result);
        }).catch(e => reject(e));
    });
};

const RegionAreaZone = (req, res, next) => {
    let req2 = req;
    count = 0;
    const fileRows = [];

    let region = [];
    let area = [];
    let zone = [];


    csv.fromPath(req.file.path)
        .on('data', function (data) {
            if (count != 0) {
                fileRows.push(data); // push each row
            }
            count++;
        })
        .on('end', function () {

            if (fileRows && fileRows.length > 1) {
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let row = array.pop();
                        let regionFormat = {
                            'region_code': row[0],
                            'region': row[0],
                        };

                        let areaFormat = {
                            'area_code': row[1],
                            'area': row[1],
                            'region': []
                        };

                        let zoneFormat = {
                            'zone_code': row[2],
                            'zone': row[2],
                            'area': []
                        };

                        checkAndcreateRegion(regionFormat).then((regionId) => {
                            region.push(regionId);
                            checkAndcreateArea(areaFormat).then((areaId) => {
                                area.push(areaId);
                                let body = {
                                    id: areaId
                                };
                                Area.linkRegion(regionId, body).then(() => {
                                    checkAndcreateZone(zoneFormat).then((zoneId) => {
                                        zone.push(zoneId);
                                        let body = {
                                            id: zoneId
                                        };
                                        Zone.linkArea(areaId, body).then(() => {
                                            if (array.length > 0) {
                                                return importCsv(fileRows);
                                            } else {
                                                res.json({ region: region, area: area, zone: zone });
                                                return true;
                                            }
                                        });
                                    });
                                });
                            });
                        });
                    } else {
                        console.log('RETURN END');
                        return true;
                    }
                };
                importCsv(fileRows);
            } else {
                res.status(200).send({ error: "no records found" });
            }
        });

};

const vendorsImport = (req, res, next) => {
    let fileRows = [];
    count = 0;
    let inserted = 0;
    let updated = 0;
    let total = 0;

    csv.fromPath(req.file.path)
        .on('data', function (data) {
            if (count != 0) {
                fileRows.push(data); // push each row
            }
            count++;
        })
        .on('end', function () {

            if (fileRows && fileRows.length > 1) {
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let element = array.pop();

                        const vendor_code = element[0];
                        const vendor_name = element[1];
                        const vendor_address = element[3];
                        const vendor_city = element[4];
                        const vendor_phone = element[5];
                        const vendor_country = element[6];
                        const vendor_postCode = element[7];

                        let query = { vendor_code: vendor_code };
                        Model.findByQuery('vendor', query).then((found) => {
                            console.log('vendor: ', found);

                            const jsonDataToInsert = {
                                vendor_code: vendor_code,
                                vendor_name: vendor_name,
                                vendor_address: vendor_address,
                                vendor_city: vendor_city,
                                vendor_phone: vendor_phone,
                                vendor_country: vendor_country,
                                vendor_postCode: vendor_postCode
                            };

                            total++;
                            if (!found) {
                                inserted++;
                                Model.insert('vendor', jsonDataToInsert);
                            } else {
                                // Model.update('vendor', jsonDataToInsert);
                                updated++;
                            }

                            if (array.length > 0) {
                                return importCsv(array);
                            }
                            else {
                                res.json({
                                    total: total,
                                    New: inserted,
                                    updated: updated
                                });
                                return true;
                            }

                        });
                    } else {
                        return true;
                    }
                };
                importCsv(fileRows);
            } else {
                res.status(200).send({ error: "no records found" });
            }
        });
};

const importResMatrix = (req, res, next) => {
    let fileRows = [];
    count = 0;
    let inserted = 0;
    let updated = 0;
    let total = 0;

    csv.fromPath(req.file.path)
        .on('data', function (data) {
            if (count != 0) {
                fileRows.push(data); // push each row
            }
            count++;
        })
        .on('end', function () {

            if (fileRows && fileRows.length > 1) {
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let element = array.pop();

                        const customer_code = element[1];
                        const type = element[3];
                        const accountManager = element[4];
                        const fieldCoordinator = element[5];
                        const BissDevelopmenmt = element[6];
                        const TechnicalService = element[7];
                        const Salesops = element[10];

                        let staffsToLink = [];


                        let query = { customer_code: customer_code };
                        Model.findByQuery('customer', query).then((customer) => {
                            let query = { emp_code: accountManager };
                            Model.findByQuery('users', query).then((accountManager1) => {

                                staffsToLink.push(
                                    {
                                        staffId: accountManager1._id,
                                        addedBy: ObjectId('5a858080e6e8f6724d6aa54f'),
                                        linked_on: new Date()
                                    }
                                );


                                let query = { emp_code: fieldCoordinator };
                                Model.findByQuery('users', query).then((fieldCoordinator1) => {
                                    staffsToLink.push(
                                        {
                                            staffId: fieldCoordinator1._id,
                                            addedBy: ObjectId('5a858080e6e8f6724d6aa54f'),
                                            linked_on: new Date()
                                        }
                                    );

                                    let query = { emp_code: BissDevelopmenmt };
                                    Model.findByQuery('users', query).then((BissDevelopmenmt1) => {
                                        staffsToLink.push(
                                            {
                                                staffId: BissDevelopmenmt1._id,
                                                addedBy: ObjectId('5a858080e6e8f6724d6aa54f'),
                                                linked_on: new Date()
                                            }
                                        );

                                        let query = { emp_code: TechnicalService };
                                        Model.findByQuery('users', query).then((TechnicalService1) => {
                                            staffsToLink.push(
                                                {
                                                    staffId: TechnicalService1._id,
                                                    addedBy: ObjectId('5a858080e6e8f6724d6aa54f'),
                                                    linked_on: new Date()
                                                }
                                            );

                                            let query = { emp_code: Salesops };
                                            Model.findByQuery('users', query).then((SalesOps1) => {
                                                staffsToLink.push(
                                                    {
                                                        staffId: SalesOps1._id,
                                                        addedBy: ObjectId('5a858080e6e8f6724d6aa54f'),
                                                        linked_on: new Date()
                                                    }
                                                );


                                                if (accountManager1 == false) {
                                                    fs.appendFile('/home/developer-ashraf/projects/accountManager.txt', accountManager + '\n', () => { });
                                                }
                                                if (fieldCoordinator1 == false) {
                                                    fs.appendFile('/home/developer-ashraf/projects/fieldCoordinator.txt', fieldCoordinator + '\n', () => { });
                                                }
                                                if (BissDevelopmenmt1 == false) {
                                                    fs.appendFile('/home/developer-ashraf/projects/BissDevelopmenmt.txt', BissDevelopmenmt + '\n', () => { });
                                                }
                                                if (TechnicalService1 == false) {
                                                    fs.appendFile('/home/developer-ashraf/projects/TechnicalService.txt', TechnicalService + '\n', () => { });
                                                }
                                                if (SalesOps1 == false) {
                                                    fs.appendFile('/home/developer-ashraf/projects/SalesOps.txt', Salesops + '\n', () => { });
                                                }

                                                let jsonDataToUpdate = {};



                                                if (type == 'Primary') {
                                                    jsonDataToUpdate = {
                                                        'responsibility_matrix.primary_account_manager': accountManager.length > 0 ? accountManager1._id : '',
                                                        'responsibility_matrix.primary_field_coordinator': fieldCoordinator.length > 0 ? fieldCoordinator1._id : '',
                                                        'responsibility_matrix.primary_biss_development': BissDevelopmenmt.length > 0 ? BissDevelopmenmt1._id : '',
                                                        'responsibility_matrix.primary_technical_services': TechnicalService.length > 0 ? TechnicalService1._id : '',
                                                        'responsibility_matrix.primary_product_development': '',
                                                        'responsibility_matrix.primary_door_opener': '',
                                                        'responsibility_matrix.primary_salesOps': Salesops.length > 0 ? SalesOps1._id : ''
                                                    };
                                                } else if (type == 'Secondary') {
                                                    jsonDataToUpdate = {
                                                        'responsibility_matrix.secondary_account_manager': accountManager.length > 0 ? accountManager1._id : '',
                                                        'responsibility_matrix.secondary_field_coordinator': fieldCoordinator.length > 0 ? fieldCoordinator1._id : '',
                                                        'responsibility_matrix.secondary_biss_development': BissDevelopmenmt.length > 0 ? BissDevelopmenmt1._id : '',
                                                        'responsibility_matrix.secondary_technical_services': TechnicalService.length > 0 ? TechnicalService1._id : '',
                                                        'responsibility_matrix.secondary_product_development': '',
                                                        'responsibility_matrix.secondary_door_opener': '',
                                                        'responsibility_matrix.secondary_salesOps': Salesops.length > 0 ? SalesOps1._id : ''
                                                    };
                                                } else if (type == 'Tertiary') {
                                                    jsonDataToUpdate = {
                                                        'responsibility_matrix.tertiary_account_manager': accountManager.length > 0 ? accountManager1._id : '',
                                                        'responsibility_matrix.tertiary_field_coordinator': fieldCoordinator.length > 0 ? fieldCoordinator1._id : '',
                                                        'responsibility_matrix.tertiary_biss_development': BissDevelopmenmt.length > 0 ? BissDevelopmenmt1._id : '',
                                                        'responsibility_matrix.tertiary_technical_services': TechnicalService.length > 0 ? TechnicalService1._id : '',
                                                        'responsibility_matrix.tertiary_product_development': '',
                                                        'responsibility_matrix.tertiary_door_opener': '',
                                                        'responsibility_matrix.tertiary_salesOps': Salesops.length > 0 ? SalesOps1._id : ''
                                                    };
                                                } else {
                                                    // new data
                                                    fs.appendFile('/home/developer-ashraf/projects/newType.txt', element + '\n', () => { });
                                                }

                                                console.log('staffsToLink: ', staffsToLink);


                                                total++;
                                                if (!customer) {
                                                    // console.log('new customer: ', customer_code);
                                                    inserted++;
                                                    // Model.insert('vendor', jsonDataToInsert);
                                                    fs.appendFile('/home/developer-ashraf/projects/newCustomer.txt', element + '\n', () => { });
                                                } else {

                                                    // console.log('jsonDataToUpdateL:  ', jsonDataToUpdate);
                                                    Model.update('customer', customer._id, jsonDataToUpdate);
                                                    Model.RES_MATRIX_linkStaff('customer', customer._id, staffsToLink);
                                                    updated++;
                                                }

                                                if (array.length > 0) {
                                                    return importCsv(array);
                                                }
                                                else {
                                                    res.json({
                                                        total: total,
                                                        New: inserted,
                                                        updated: updated
                                                    });
                                                    return true;
                                                }

                                            });
                                        });
                                    });
                                });
                            });
                        });
                    } else {
                        return true;
                    }
                };
                importCsv(fileRows);
            } else {
                res.status(200).send({ error: "no records found" });
            }
        });
};


const konspecCodeImport = (req, res, next) => {
    let fileRows = [];
    count = 0;
    let inserted = 0;
    let updated = 0;
    let total = 0;

    csv.fromPath(req.file.path)
        .on('data', function (data) {
            if (count != 0) {
                fileRows.push(data); // push each row
            }
            count++;
        })
        .on('end', function () {

            if (fileRows && fileRows.length > 1) {
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let element = array.pop();

                        const konspecCode = element[0];
                        const productName = element[1];
                        const equivalentCode = element[3];
                        const EquivalentCodeProductName = element[5];
                        const company = element[4];

                        let query = { konspecCode: konspecCode };
                        Model.findByQuery('konspecCode', query).then((found) => {
                            console.log('vendor: ', found);

                            const jsonDataToInsert = {
                                konspecCode: konspecCode,
                                productName: productName,
                                EquivalentCode: [
                                    {
                                        code: equivalentCode,
                                        productName: EquivalentCodeProductName,
                                        company: company
                                    }
                                ],
                            };

                            const jsonDataToUpdate = {
                                $push: {
                                    EquivalentCode: {
                                        code: equivalentCode,
                                        productName: EquivalentCodeProductName,
                                        company: company
                                    }
                                }
                            };

                            total++;

                            if (!found) {
                                inserted++;
                                Model.insert('konspecCode', jsonDataToInsert);
                            } else {
                                Model.append('konspecCode', found._id, jsonDataToUpdate);
                                updated++;
                            }

                            if (array.length > 0) {
                                return importCsv(array);
                            } else {
                                res.json({
                                    total: total,
                                    New: inserted,
                                    updated: updated
                                });
                                return true;
                            }

                        });
                    } else {
                        return true;
                    }
                };
                importCsv(fileRows);
            } else {
                res.status(200).send({ error: "no records found" });
            }
        });
};


const getAllState = async () => {
    try {
        // http://postalpincode.in/api/pincode/110053
        request(`http://services.groupkt.com/state/get/IND/all`, async (error, response, body) => {
            if (error) {
                console.log('error: ', error);
            } else {
                const json = JSON.parse(body);
            }
        });
    } catch (error) {
        console.log('catch :: getStateCode::error: ', error);
    }
}

const stateImport = (req, res, next) => {
    let fileRows = [];
    count = 0;
    let inserted = 0;
    let updated = 0;
    let total = 0;

    csv.fromPath(req.file.path)
        .on('data', function (data) {
            if (count != 0) {
                fileRows.push(data); // push each row
            }
            count++;
        })
        .on('end', function () {
            if (fileRows && fileRows.length > 1) {
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let element = array.pop();

                        const stateCode = element[0];
                        const stateName = element[1];
                        const gstCode = element[2];
                        const country = element[3];

                        let query = { konspecCode: stateCode };
                        Model.findByQuery('state', query).then((found) => {
                            const jsonDataToInsert = {
                                stateCode: stateCode,
                                stateName: stateName,
                                gstCode: gstCode,
                                country: country,
                            };

                            const jsonDataToUpdate = {};

                            total++;
                            if (!found) {
                                inserted++;
                                Model.insert('state', jsonDataToInsert);
                            } else {
                                // Model.append('state', found._id, jsonDataToUpdate);
                                updated++;
                            }

                            if (array.length > 0) {
                                return importCsv(array);
                            } else {
                                res.json({
                                    total: total,
                                    New: inserted,
                                    updated: updated
                                });
                                return true;
                            }

                        });
                    } else {
                        return true;
                    }
                };
                importCsv(fileRows);
            } else {
                res.status(200).send({ error: "no records found" });
            }
        });
};

const countryImport = (req, res, next) => {
    let fileRows = [];
    count = 0;
    let inserted = 0;
    let updated = 0;
    let total = 0;

    csv.fromPath(req.file.path)
        .on('data', function (data) {
            if (count != 0) {
                fileRows.push(data); // push each row
            }
            count++;
        })
        .on('end', function () {

            if (fileRows && fileRows.length > 1) {
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let element = array.pop();

                        const type = element[0];
                        const countryCode = element[1];
                        const countryName = element[2];

                        let query = { countryCode: countryCode };
                        Model.findByQuery('country', query).then((found) => {
                            const jsonDataToInsert = {
                                type: type,
                                countryCode: countryCode,
                                country: countryName,
                            };

                            const jsonDataToUpdate = {};

                            total++;

                            if (!found) {
                                inserted++;
                                fs.appendFile('/home/developer-ashraf/projects/newCountry.txt', countryCode + '\n', () => { });
                                Model.insert('country', jsonDataToInsert);
                            } else {
                                fs.appendFile('/home/developer-ashraf/projects/existedC.txt', found.countryCode + '\n', () => { });
                                // Model.append('countryNew', found._id, jsonDataToUpdate);
                                updated++;
                            }

                            if (array.length > 0) {
                                return importCsv(array);
                            } else {
                                res.json({
                                    total: total,
                                    New: inserted,
                                    updated: updated
                                });
                                return true;
                            }

                        });
                    } else {
                        return true;
                    }
                };
                importCsv(fileRows);
            } else {
                res.status(200).send({ error: "no records found" });
            }
        });
};


const getStateCode = async (postCode, city) => {
    let nullValue = "";
    return new Promise((resolve, reject) => {
        try {
            return request(`https://maps.googleapis.com/maps/api/geocode/json?address=${postCode}&key=`, (error, response, body) => {
                if (error) {
                    console.log('post Code: ', postCode);
                    console.log('getLatLong::error: ', error);
                } else {
                    console.log('post Code: ', postCode);
                    const json = JSON.parse(body);
                    if (!isUndefined(json.results[0])) {
                        if (!isUndefined(json.results[0].address_components[2])) {

                            if (json.results[0].address_components[1].types.indexOf('administrative_area_level_1') != -1) {
                                fs.appendFile('/home/developer-ashraf/projects/stateCode.txt', 1 + ' :: ' + postCode + ' :: ' + city + ' :: ' + json.results[0].address_components[1].short_name + '\n', () => { });
                                resolve(json.results[0].address_components[1].short_name);
                            } else if (json.results[0].address_components[2].types.indexOf('administrative_area_level_1') != -1) {
                                fs.appendFile('/home/developer-ashraf/projects/stateCode.txt', 2 + ' :: ' + postCode + ' :: ' + city + ' :: ' + json.results[0].address_components[2].short_name + '\n', () => { });
                                resolve(json.results[0].address_components[2].short_name);
                            } /* else if (json.results[0].address_components[3].types && json.results[0].address_components[3].types.indexOf('administrative_area_level_1') != -1) {
                                fs.appendFile('/home/developer-ashraf/projects/stateCode.txt', 3 + ' :: ' + postCode + ' :: ' + city + ' :: ' + json.results[0].address_components[3].short_name + '\n', () => { });
                                resolve(json.results[0].address_components[3].short_name);
                            } */ else {
                                fs.appendFile('/home/developer-ashraf/projects/stateCodeError.txt', postCode + ' :: ' + city + '\n', () => { });
                                resolve(nullValue);
                            }
                        } else {
                            fs.appendFile('/home/developer-ashraf/projects/stateCodeError.txt', postCode + ' :: ' + city + '\n', () => { });
                            resolve(nullValue);
                        }
                    } else {
                        fs.appendFile('/home/developer-ashraf/projects/stateCodeError.txt', postCode + ' :: ' + city + '\n', () => { });
                        resolve(nullValue);
                    }
                }
            });
        } catch (error) {
            console.log('catch :: getStateCode::error: ', error);
            resolve(nullValue);
        }
    });

};

const cityImport = (req, res, next) => {
    let fileRows = [];
    count = 0;
    let inserted = 0;
    let updated = 0;
    let total = 0;

    csv.fromPath(req.file.path)
        .on('data', function (data) {
            if (count != 0) {
                fileRows.push(data); // push each row
            }
            count++;
        })
        .on('end', function () {
            if (fileRows && fileRows.length > 1) {
                const importCsv = (array) => {
                    setTimeout(() => {
                        if (array.length > 0) {
                            let element = array.pop();

                            const postCode = element[0];
                            const place = element[1];
                            const city = element[2];
                            const search = element[3];
                            const uniqueId = element[4];
                            getStateCode(postCode, city).then((stateCode) => {
                                // let query = { konspecCode: stateCode };
                                // Model.findByQuery('state', query).then((found) => {
                                const jsonDataToInsert = {
                                    postCode: postCode,
                                    place: place,
                                    city: city,
                                    searchCity: search,
                                    uniqueId: city,
                                    state: stateCode,
                                };

                                const jsonDataToUpdate = {};

                                total++;
                                // if (!found) {
                                inserted++;
                                Model.insert('city', jsonDataToInsert);
                                // } else {
                                // Model.append('state', found._id, jsonDataToUpdate);
                                updated++;
                                // }

                                if (array.length > 0) {
                                    console.log('cameeeee');

                                    return importCsv(array);
                                } else {
                                    res.json({
                                        total: total,
                                        New: inserted,
                                        updated: updated
                                    });
                                    return true;
                                }
                            })
                            // });
                        } else {
                            return true;
                        }
                    }, 10);
                };
                importCsv(fileRows);
            } else {
                res.status(200).send({ error: "no records found" });
            }
        });
};

const getPostCodeFullDetails = (postCode) => {
    return new Promise((resolve, reject) => {
        try {
            return request(`http://postalpincode.in/api/pincode/${postCode}`, (error, response, body) => {
                if (error) {
                    console.log('error: ', error);
                } else {
                    const json = JSON.parse(body);
                    resolve(json.PostOffice);
                }
            });
        } catch (error) {
            fs.appendFile('/home/developer-ashraf/projects/getPostCodeError.txt', postCode + ' :: ' + error + '\n', () => { });
            reject(error)
        }
    })

}

const getStateDetails = async (stateName) => {
    try {
        let query = { state: stateName };
        const stateFullData = await Model.findByQuery('state', query)
        return stateFullData.stateCode;
    } catch (error) {
        fs.appendFile('/home/developer-ashraf/projects/StateDetailsError.txt', stateName + ' :: ' + error + '\n', () => { });
        Promise.reject(error)
    }

}

const checkDataAlreadyInserted = async (collection, query) => {
    try {
        const resp = await Model.findByQuery(collection, query)
        return resp;
    } catch (error) {
        fs.appendFile('/home/developer-ashraf/projects/DataExistError.txt', placeName + ' :: ' + error + '\n', () => { });
        Promise.reject(error)
    }
}

const insertPostCode = async (postCode, postCideDetails) => {

    try {
        let eachPostCode = postCideDetails.pop();
        const jsonDataToInsert = {
            uniqueId: eachPostCode.Division,
            city: eachPostCode.Division,
        };

        const stateCode = await getStateDetails(eachPostCode.State)
        jsonDataToInsert.state = stateCode;

        let query = { city: jsonDataToInsert.city }
        const foundCity = await checkDataAlreadyInserted('city1', query);
        if (!foundCity || foundCity == false) {
            let cityInsert = await Model.insert('city1', jsonDataToInsert)
        }
        const jsonDataToInsertPostcode = {
            postCode: postCode,
            city: eachPostCode.Division,
        };
        let postCodeInsert = await Model.insert('postCode1', jsonDataToInsertPostcode)


        /* let query1 = { place: jsonDataToInsertPostcode.place }
        console.log('foundPostCode 11111111: ', query1);
        const foundPostCode = await checkDataAlreadyInserted('postCode', query1);
        console.log('foundPostCode: ', foundPostCode);

        if (!foundPostCode || foundPostCode == false) {
            let t = await Model.insert('postCode', jsonDataToInsertPostcode)
        } */

        // if (postCideDetails.length > 0) {
        //     insertPostCode(postCode, postCideDetails)
        // } else {
        //     return true
        // }
        return true
    } catch (error) {
        fs.appendFile('/home/developer-ashraf/projects/insertPostCodeError.txt', postCode + ' :: ' + error + '\n', () => { });
        Promise.reject(error)
    }

}

const postCodeImport = async (req, res, next) => {

    // try {
    let fileRows = [];
    let count = 0;
    let insert = 0;

    csv.fromPath(req.file.path)
        .on('data', function (data) {
            if (count != 0) {
                fileRows.push(data); // push each row
            }
            count++;
        })
        .on('end', function () {
            if (fileRows && fileRows.length > 1) {
                const importCsv = async (array) => {
                    // setTimeout(async () => {
                    if (array.length > 0) {
                        let element = array.pop();

                        const postCode = element[0];
                        // console.log('postCode: ', postCode);
                        const postCodeDetails = await getPostCodeFullDetails(postCode)
                        await insertPostCode(postCode, postCodeDetails)
                        insert++
                        console.log('inserted: ', insert);


                        if (array.length > 0) {
                            return importCsv(array);
                        } else {
                            res.json({
                                done: 'done'
                            });
                            return true;
                        }
                        // });

                    } else {
                        return true;
                    }
                    // }, 10);
                };
                importCsv(fileRows);
            } else {
                res.status(200).send({ error: "no records found" });
            }
        });
    // } catch (error) {
    //     fs.appendFile('/home/developer-ashraf/projects/importError.txt', postCode + ' :: ' + error + '\n', () => { });
    //     Promise.reject(error)
    // }

};


const Import_EndProducts = (req, res, next) => {
    let fileRows = [];
    count = 0;
    let inserted = 0;
    let updated = 0;
    let total = 0;

    csv.fromPath(req.file.path)
        .on('data', function (data) {
            if (count != 0) {
                fileRows.push(data); // push each row
            }
            count++;
        })
        .on('end', function () {

            if (fileRows && fileRows.length > 1) {
                const importCsv = (array) => {
                    if (array.length > 0) {
                        let element = array.pop();

                        const vendor_code = element[0];
                        const vendor_name = element[1];
                        const vendor_address = element[3];
                        const vendor_city = element[4];
                        const vendor_phone = element[5];
                        const vendor_country = element[6];
                        const vendor_postCode = element[7];

                        let query = { vendor_code: vendor_code };
                        Model.findByQuery('vendor', query).then((found) => {
                            console.log('vendor: ', found);

                            const jsonDataToInsert = {
                                vendor_code: vendor_code,
                                vendor_name: vendor_name,
                                vendor_address: vendor_address,
                                vendor_city: vendor_city,
                                vendor_phone: vendor_phone,
                                vendor_country: vendor_country,
                                vendor_postCode: vendor_postCode
                            };

                            total++;
                            if (!found) {
                                inserted++;
                                Model.insert('vendor', jsonDataToInsert);
                            } else {
                                // Model.update('vendor', jsonDataToInsert);
                                updated++;
                            }

                            if (array.length > 0) {
                                return importCsv(array);
                            }
                            else {
                                res.json({
                                    total: total,
                                    New: inserted,
                                    updated: updated
                                });
                                return true;
                            }

                        });
                    } else {
                        return true;
                    }
                };
                importCsv(fileRows);
            } else {
                res.status(200).send({ error: "no records found" });
            }
        });
};

module.exports = {
    staffInsert,
    staff_UpdateReportsTo,
    customerInsert,
    customer_UpdateLinkedStaff,
    customer_LinkContacts,
    staff_UpdateReagionAreaZOne,
    checkAndcreateRegion,
    checkAndcreateArea,
    RegionAreaZone,
    checkAndcreateZone,
    contactsImport,
    vendorsImport,
    importResMatrix,
    konspecCodeImport,
    stateImport,
    countryImport,
    cityImport,
    postCodeImport,
    Import_EndProducts
};