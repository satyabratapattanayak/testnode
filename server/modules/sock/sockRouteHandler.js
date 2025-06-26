// @ts-check
const { isEmpty, head, first, isRegExp, isArray } = require('lodash');
const PubSub = require('pubsub-js');

const Config = require('../../config/config');
const Customer = require('../customers/customer.model.js');
const endProduct = require('../endProducts/endProduct.model');
const Leads = require('../lead/lead.model');
const Contacts = require('../contacts/contacts.model');
const Region = require('../region/region.model');
const Area = require('../area/area.model');
const Zone = require('../zone/zone.model');
const Business = require('../methodology/methodology.model');
const State = require('../state/state.model');
const Users = require('../users/users.model');
const Status = require('../status/status.model');
const Industry = require('../industry/industry.model');
const Process = require('../process/process.model');
const Category = require('../category/category.model');
const konspecCode = require('../konspecCode/konspecCode.model');
const City = require('../cities/cities.model');
const Country = require('../countries/countries.model');
const Notes = require('../notes/notes.model');
const NotificationModel = require('../notification/notification.model');
const { getCurrentUserInfo } = require('../shared/shared.controller');
const { getTodayEndTime, getTodayStartTime, getDateFormat, getTimeAgo } = require('../../config/dateutil');


const SyncRegion = async (conn, filter, loggedUser) => {
    try {

        const result = await Region.all(loggedUser, filter);
        if (isEmpty(result)) { }
        else {
            let data = { collection: 'region', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    }
    catch (e) {
        console.log('err', e);
    }
};

const SyncArea = async (conn, filter, loggedUser) => {
    try {

        const result = await Area.filterAll(filter, loggedUser);
        if (isEmpty(result)) { }
        else {
            let data = { collection: 'area', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    }
    catch (e) {
        console.log('SyncArea err', e);
    }
};

const SyncZone = async (conn, filter, loggedUser) => {
    try {
        const result = await Zone.filterAll(filter, loggedUser);
        if (isEmpty(result)) { }
        else {
            let data = { collection: 'zone', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    }
    catch (e) {
        console.log('SyncZone err', e);
    }
};

const SyncBusinessGroup = async (filter, conn) => {
    try {
        const result = await Business.listBG(filter);
        if (isEmpty(result)) { }
        else {
            let data = { collection: 'business_group', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    }
    catch (e) {
        console.log('SyncBusinessGroup err', e);
    }
};

const SyncBusinessCategory = async (conn, filter) => {

    try {
        const result = await Business.listBC(filter);
        if (isEmpty(result)) { }
        else {

            let data = { collection: 'business_category', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    }
    catch (e) {
        console.log('SyncBusinessCategory err', e);
    }
};

const SyncBusinessDivision = async (conn, filter) => {
    try {
        const result = await Business.listBD(filter);
        if (isEmpty(result)) { }
        else {
            let data = { collection: 'business_division', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    }
    catch (e) {
        console.log('SyncBusinessDivision err', e);
    }
};

const SyncCustomerCategory = async (conn, filter) => {

    try {
        const result = await Customer.listCustomerCategory(filter);
        if (isEmpty(result)) {

        } else {
            let data = { collection: 'customer_category', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log('SyncCustomerCategory err', error);
    }
};

const SyncUsers = async (conn, filter, loggedUser) => {
    try {
        const result = await Users.all(loggedUser, filter);
        if (isEmpty(result[0].data)) { }
        else {
            let data = { collection: 'users', data: result[0].data, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log('SyncUsers err', error);
    }
};

const SyncStatus = async (conn, filter) => {
    try {
        const result = await Status.flatList(filter);
        if (isEmpty(result)) { }
        else {
            let data = { collection: 'status', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log('SyncStatus err', error);
    };
};

const SyncContacts = async (conn, filter, loggedUser) => {
    try {
        const result = await Contacts.all(loggedUser, filter);
        if (isEmpty(result[0].data)) {
        } else {
            let data = { collection: 'contacts', data: result[0].data, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log('SyncContacts err', error);
    }
};

const SyncLeads = async (conn, filter, loggedUser) => {
    try {
        const result = await Leads.all(null, loggedUser, filter);
        if (isEmpty(result)) {
        } else {
            let data = { collection: 'lead', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log('SyncLeads err', error);
    }
};

const SyncCustomers = async (conn, filter, loggedUser) => {
    try {
        const params = JSON.parse('{"first":0,"rows":3000,"sortOrder":1}');
        const result = await Customer.all(loggedUser, filter, params, true);
        if (isEmpty(result[0].data)) { } else {
            result[0].data.forEach(element => {
                if (!element.bd_activated) {
                    element.bd_activated = 0;
                }
                if (!isEmpty(element.state_details)) element.customer_state = element.state_details[0].state;
                delete element.state_details;

            });
            // console.log('sync customer: ', result);
            let data = { collection: 'customer', data: result[0].data, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log(' SyncCustomers err', error);
    }
};

const SyncEndProducts = async (conn, filter, loggedUser) => {
    console.log('sync end prodcust');

    try {
        const result = await endProduct.listAll(filter);
        if (result && result.length > 0) {
            result.forEach((ele) => {
                if (!ele.linked_IndustryAndSubIndustry[0]._id) {
                    ele.linked_IndustryAndSubIndustry = [];
                }
                if (!ele.linked_ProcessAndSubProcess[0]._id) {
                    ele.linked_ProcessAndSubProcess = [];
                }
                if (!ele.linked_CategoryAndSubCategory[0]._id) {
                    ele.linked_CategoryAndSubCategory = [];
                }
                if (!ele.linked_RecommendationChart[0]._id) {
                    ele.linked_RecommendationChart = [];
                }

                ele.testimonials = ele.testimonials[0];
                ele.linked_KonspecCode = ele.linked_KonspecCode[0];
                ele.linked_Customer = ele.linked_Customer[0];
                ele.linked_Video = ele.linked_Video[0];

                if (ele.image && ele.image[0].length > 0) {
                    ele.image[0].forEach((elem) => {
                        elem.imageURL = Config.imageURL + elem._id;
                    });
                } else {
                    let data = {
                        _id: '',
                        imageURL: Config.placeholder_image
                    };
                    ele.image[0] = [data];
                }
                ele.image = ele.image[0];

                if (ele.linked_RecommendationChart && ele.linked_RecommendationChart.length > 0) {
                    ele.linked_RecommendationChart.forEach(element => {
                        if (element.file && element.file.length > 0) {
                            element.file.forEach(elem => {
                                elem.fileURL = Config.imageURL + elem._id;
                            });
                        }
                    });
                }
            });

            console.log('synced end product 1');
            let data = { collection: 'endProduct', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
            console.log('synced end product 2');
        }
    } catch (error) {
        console.log('SyncEndProducts err', error);
    }
};

const SyncProcess = async (conn, filter, loggedUser) => {
    try {
        const result = await Process.listAll(filter);
        if (result && result.length > 0) {
            let data = { collection: 'process', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log('SyncProcess err', error);
    }
};

const SyncIndustry = async (conn, filter, loggedUser) => {
    try {
        const result = await Industry.listAll(filter);
        if (result && result.length > 0) {
            let data = { collection: 'industry', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log('SyncIndustry err', error);
    }
};

const SyncCategory = async (conn, filter, loggedUser) => {
    try {
        const result = await Category.listAll(filter);
        if (result && result.length > 0) {
            let data = { collection: 'category', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log('SyncSubIndustry err', error);
    }
};

const SyncKonspecCode = async (conn, filter, loggedUser) => {
    try {
        const result = await konspecCode.listAll(filter);
        if (result && result.length > 0) {
            let data = { collection: 'konspecCode', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log('SyncKonspecCode err', error);
    }
};

const SyncCities = async (conn, filter, loggedUser) => {
    try {
        const result = await City.filterAll(filter);
        if (result && result.length > 0) {
            let data = { collection: 'city', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log('SyncCities err', error);
    }
};

const SyncState = async (filter, conn) => {
    try {
        const result = await State.filterAll(filter);
        if (isEmpty(result)) { }
        else {
            let data = { collection: 'state', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log('SyncState err', error);
    }
};

const SyncPostCode = async (conn, filter, loggedUser) => {
    try {
        const result = await City.listPostCode(filter);
        if (result && result.length > 0) {
            let data = { collection: 'postCode', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log('SyncPostCode err', error);
    }
};

const SyncCountry = async (conn, filter, loggedUser) => {
    try {
        const result = await Country.filterAll(filter);
        if (result && result.length > 0) {
            let data = { collection: 'country', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    } catch (error) {
        console.log('SyncCountry err', error);
    }
};


const SyncNotes = async (conn, filter, loggedUser) => {
    try {
        const result = await Notes.all(loggedUser, filter);
        if (result && !isEmpty(result)) {
            let data = { collection: 'notes', data: result, type: 'sync_collection' };
            conn.write(JSON.stringify(data));
        }
    }
    catch (e) {
        console.log('err', e);
    }
};

const SyncNotifiocationData = async (conn, loggedUser, filter) => {
    console.log('SyncNotifiocationData: ', loggedUser);
    try {
        const result = await NotificationModel.getNotificationUnReadCount(loggedUser, loggedUser);
        if (result) {
            console.log('SyncNotifiocationData result: ', result);
            let response = {
                unReadCount: result
            };
            let data = { collection: 'notifications', data: response, type: 'notifications' };
            conn.write(JSON.stringify(data));
        }
    }
    catch (e) {
        console.log('SyncNotifiocationData :: err => ', e);
    }
};


let SockRouteHandler = /** @class */ (function () {
    function SockRouteHandler() {
        let self = this;
        this.connectionOpen = true;
        let dbUpdateSubscriber = function (msg, data) {
            console.log('dbUpdateSubscriber', msg, data);
            if (self.conn && self.message) {
                self.sendData(self.conn, self.message);
            }
        };
        let liveLocationPublish = function (msg, data) {
            // console.log('liveLocationPublish', data);
            if (self.conn && self.message) {
                self.sendLiveData(self.conn, self.message, data);
            }
        };
        let dbDeleteSubscriber = function (msg, data) {
            console.log('dbDeleteSubscriber', msg, data);
            if (self.conn && self.message) {
                let message = self.message;
                let conn = self.conn;
                let json = message;
                if (json.type == 'remoteSync') {
                    let dataRes = { collection: data.change, data: [data.data], type: 'sync_collection' };
                    conn.write(JSON.stringify(dataRes));
                }
            }
        };
        let notificationsPublish = function (msg, data) {
            console.log('notificationPublish: ', msg, ';;', data);
            let message = { type: msg }
            if (self.conn) {
                self.SyncNotifications(self.conn, message, data);
            }
        };
        this.subscription2 = PubSub.subscribe('live-locations', liveLocationPublish);
        this.subscription = PubSub.subscribe('DBUpdates', dbUpdateSubscriber);
        this.subscription3 = PubSub.subscribe('DBDelete', dbDeleteSubscriber);
        this.subscription4 = PubSub.subscribe('notifications', notificationsPublish);
    }
    SockRouteHandler.prototype.route = function (conn, message) {
        if (message) {
            console.log('dbSync request: ', message);
            this.message = message;
            this.conn = conn;
            this.sendData(conn, message);
        }
    };
    SockRouteHandler.prototype.close = function () {
        this.connectionOpen = false;
        if (this.subscription) {
            PubSub.unsubscribe(this.subscription);
        }
        if (this.subscription2) {
            PubSub.unsubscribe(this.subscription2);
        }
        if (this.subscription3) {
            PubSub.unsubscribe(this.subscription3);
        }
        if (this.subscription4) {
            PubSub.unsubscribe(this.subscription4);
        }
    };

    SockRouteHandler.prototype.sendLiveData = function (conn, message, location) {

        // let json = JSON.parse(message);
        let json = message;
        if (json.type == 'live-locations') {
            console.log('sync sendLiveData: ', message);
            let data = { collection: 'location', data: location, type: 'live-location' };
            conn.write(JSON.stringify(data));
        }
    };
    SockRouteHandler.prototype.SyncNotifications = function (conn, message, doc) {
        console.log('sync notifications: ');
        let user = doc && doc.loggedUser ? doc.loggedUser : { _id: message.userId };
        this.message = message;
        this.conn = conn;
        if (this.conn && message.type == 'notifications') {
            SyncNotifiocationData(conn, user);
        }
    };

    SockRouteHandler.prototype.sendData = async function (conn, message) {
        let json = JSON.parse(message);

        if (message) {
            //   console.log('dbSync request 2: ', json);
            if (json.type == 'remoteSync') {
                let currentLoggedUser;
                let date = void 0;

                if (json.userToken) {
                    try {
                        const currentLoggedUser = await getCurrentUserInfo(json.userToken)
                        if (!this.lastSyncTime) {
                            if (json.lastSyncTime) {
                                date = new Date(parseFloat(json.lastSyncTime));
                            }
                        } else {
                            date = this.lastSyncTime;
                        }
                        console.log('dbSync date: ', date);
                        this.lastSyncTime = new Date();

                        let filterCustomer = {};
                        if (date) {
                            console.log('SyncCustomers date: ', date);
                            //filterCustomer['modified_At'] = { $gte: date };
                        }
                        SyncCustomers(conn, filterCustomer, currentLoggedUser);

                        let filterLeads = {};
                        if (date) {
                            filterLeads['modified_At'] = { $gte: date };
                        }
                        SyncLeads(conn, filterLeads, currentLoggedUser);

                        let filterEndProducts = {};
                        if (date) {
                            filterEndProducts['modified_At'] = { $gte: date };
                        }
                        SyncEndProducts(conn, filterEndProducts, currentLoggedUser);


                        let filterContacts = {};
                        if (date) { filterContacts['modified_At'] = { $gte: date }; }
                        SyncContacts(conn, filterContacts, currentLoggedUser);


                        let filterUsers = {};
                        if (date) { filterUsers['modified_At'] = { $gte: date }; }
                        SyncUsers(conn, filterUsers, currentLoggedUser);


                        let filterState = {};
                        if (date) {
                            filterState['modified_At'] = { $gte: date };
                        }
                        SyncState(filterState, conn);


                        let filterRegion = {};
                        if (date) {
                            filterRegion['modified_At'] = { $gte: date };
                        }
                        SyncRegion(conn, filterRegion, currentLoggedUser);


                        let filterArea = {};
                        if (date) {
                            filterArea['modified_At'] = { $gte: date };
                        }
                        SyncArea(conn, filterArea, currentLoggedUser);


                        let filterZone = {};
                        if (date) {
                            filterZone['modified_At'] = { $gte: date };
                        }
                        SyncZone(conn, filterZone, currentLoggedUser);


                        let filterBG = {};
                        if (date) {
                            filterBG['modified_At'] = { $gte: date };
                        }
                        SyncBusinessGroup(filterBG, conn);


                        let filterBC = {};
                        if (date) {
                            filterBC['modified_At'] = { $gte: date };
                        }
                        SyncBusinessCategory(conn, filterBC);


                        let filterBD = {};
                        if (date) {
                            filterBD['modified_At'] = { $gte: date };
                        }
                        SyncBusinessDivision(conn, filterBD);


                        let filterCC = {};
                        if (date) {
                            filterCC['modified_At'] = { $gte: date };
                        }
                        SyncCustomerCategory(conn, filterCC);


                        let filterStatus = {};
                        if (date) {
                            filterStatus['modified_At'] = { $gte: date };
                        }
                        SyncStatus(conn, filterStatus);

                        let filterCategory = {};
                        if (date) {
                            filterCategory['modified_At'] = { $gte: date };
                        }

                        SyncCategory(conn, filterCategory, currentLoggedUser);

                        let filterIndustry = {};
                        if (date) {
                            filterIndustry['modified_At'] = { $gte: date };
                        }
                        SyncIndustry(conn, filterIndustry, currentLoggedUser);

                        let filterProcess = {};
                        if (date) {
                            filterProcess['modified_At'] = { $gte: date };
                        }
                        SyncProcess(conn, filterProcess, currentLoggedUser);

                        let filterKonspecCode = {};
                        if (date) {
                            filterKonspecCode['modified_At'] = { $gte: date };
                        }
                        SyncKonspecCode(conn, filterKonspecCode, currentLoggedUser);

                        let filterCities = {};
                        if (date) {
                            filterCities['modified_At'] = { $gte: date };
                        }
                        SyncCities(conn, filterCities, currentLoggedUser);

                        let filterPostCode = {};
                        if (date) {
                            filterPostCode['modified_At'] = { $gte: date };
                        }
                        SyncPostCode(conn, filterPostCode, currentLoggedUser);

                        let filterCountry = {};
                        if (date) {
                            filterCountry['modified_At'] = { $gte: date };
                        }
                        SyncCountry(conn, filterCountry, currentLoggedUser);

                        let filterNotes = {};
                        if (date) {
                            filterNotes['modified_At'] = { $gte: date };
                        }
                        SyncNotes(conn, filterNotes, currentLoggedUser);


                    } catch (error) {
                        console.log('SYNC AUTHORIZATION ERROR: ', error);

                    }

                }
            }
            else if (json.type == 'live-locations') {
                // console.log('live locs', json);
            }
        }
    };
    return SockRouteHandler;
}());

module.exports = SockRouteHandler;


function formatOutput(result, response) {
    let now = new Date();
    let yesterday = now.setDate(now.getDate() - 1);
    let responseData = {
        Today: [],
        Yesterday: [],
        Older: []
    };
    for (const iterator of result[0].data) {
        if (iterator.date >= getTodayStartTime() && iterator.date <= getTodayEndTime()) {
            iterator.date = getTimeAgo(iterator.date);
            responseData.Today.push(iterator);
        }
        else if (iterator.date >= getTodayStartTime(yesterday) && iterator.date <= getTodayEndTime(yesterday)) {
            iterator.date = getTimeAgo(iterator.date);
            responseData.Yesterday.push(iterator);
        }
        else {
            iterator.date = getDateFormat(iterator.date);
            responseData.Older.push(iterator);
        }
    }
    response = {
        data: responseData,
        total: result[0].totalCount.length > 0 ? result[0].totalCount[0].count : 0,
        unReadCount: result[0].unReadCount.length > 0 ? result[0].unReadCount[0].count : 0,
        nextPage: 2,
        currentPage: 1,
        prevPage: 0,
    };
    return response;
}
