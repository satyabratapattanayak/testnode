// @ts-check
const { isEmpty, first, toArray, toString } = require('lodash');
const moment = require('moment');

const Audit = require('../audit/audit.model.js');
const { getDateMonthYearTime, getPrevDate } = require('../../config/dateutil');
const { Modules, auditActions } = require('../shared/shared.model');

// card color
const bdProcess_color = '#5B2C6F';
const import_color = '#B7950B';
const create_color = '#0E6655';//'#09AB8B'; // '#117A65'; // // '#0aa89e'; 
const update_color = '#004d66'; // '#086A87'; // '#3498db';
const delete_color = '#B40404'; // '#E74C3C'; 
const add_notes_color = '#585858'; // '#566573'; // 
const link_color = '#2E4053'; // '#7D3C98'; // 
const userLink_color = '#2E4053'; // '#7D3C98'; // 
const unlink_color = '#8A0829'; // '#AF7AC5'; 
const edit_target_color = '#bb8fce'; // '#5D6D7E'; // 
const delete_target_color = '#CD6155'; //'#9b59b6'; //'#2E4053'; //
const update_status_color = '#946611'; //'#666600'; // '#805500'; //'#711945';
const overdue_color = '#993300';
const approve_color = '#084430';
const reject_color = '#A70E25';
const elapse_color = '#A70E25';
const default_color = '#000000';

// card icon
const create_icon = 'add-circle';
const update_icon = 'create';
const add_notes_icon = 'paper';
const link_icon = 'link';

const convertDate = (date) => {
    if (!date) { return ''; } else { return moment(date).tz('Asia/Kolkata').format('MMMM Do YYYY, h:mm a'); }
};

const getCardColor = (action) => {
    let card_color;
    if (action == 'create') {
        card_color = create_color;
    } else if (action == 'update') {
        card_color = update_color;
    } else if (action == 'delete') {
        card_color = delete_color;
    } else if (action == 'notes_add') {
        card_color = add_notes_color;
    } else if (action == 'link') {
        card_color = link_color;
    } else if (action == 'user_link') {
        card_color = link_color;
    } else if (action == 'unlink') {
        card_color = unlink_color;
    } else if (action == 'update_status') {
        card_color = update_status_color;
    } else if (action == 'import') {
        card_color = import_color;
    } else if (action == 'bd_update') {
        card_color = bdProcess_color;
    } else if (action == 'approve') {
        card_color = approve_color;
    } else if (action == 'reject') {
        card_color = reject_color;
    } else if (action == 'elapse') {
        card_color = elapse_color;
    } else {
        card_color = default_color;
    }
    return card_color;
};

const getCardIcon = (action) => {
    let card_icon;
    if (action == 'create') {
        card_icon = create_icon;
    } else if (action == 'update' || action == 'update_status') {
        card_icon = update_icon;
    } else if (action == 'notes_add') {
        card_icon = add_notes_icon;
    } else if (action == 'link') {
        card_icon = link_icon;
    }
    return card_icon;
};


// list based on documentId || module || action || userId
const auditDetails = (req, res, next) => {
    const page = req.query.page;
    const limit = req.query.limit;

    const nextPage = page ? parseInt(page) + 1 : 2;
    const prevPage = page ? parseInt(page) - 1 : 0;

    Audit.listBy(page, limit, req.query)
        .then((result) => {
            if (isEmpty(result)) {
                res.status(404).json({ message: 'No data found', status: 404 });
            } else {
                let scheduletype;
                result.forEach(element => {
                    if (!isEmpty(element.schedule_type_details)) {
                        scheduletype = ' ' + first(element.schedule_type_details).type;
                    } else {
                        scheduletype = '';
                    }

                    let fname = element.user_details.length > 0 ? element.user_details[0].first_name : '';
                    let lname = element.user_details.length > 0 ? element.user_details[0].last_name : '';
                    let username = fname + ' ' + lname;

                    if (element.userId == 'cron update') {
                        element.card_color = overdue_color;
                        element.module_specific_message = 'status marked as <b>Overdue</b>' + ' on ' + element.date;
                    } else if (element.action == 'update_status') {
                        if (!isEmpty(element.status_details)) {
                            let oldStatus = element.old_status_details.length > 0 ? 'from <b>' + element.old_status_details[0].type : '';
                            element.module_specific_message = '<b><font color="#00FFFF">' + username + '</font></b>  changed the status ' + oldStatus + '</b> to <b>' + element.status_details[0].type + ' </b>on ' + element.date + '.';
                        } else {
                            element.message = element.message + scheduletype
                            element.module_specific_message = '<b><font color="#00FFFF">' + username + '</font></b> <b>' + element.message + '</b> <font color="#E5E8E8">on ' + element.date + '.</font>';
                        }
                    } else {

                        // if (element.module == Modules().customer) {
                        //     if (element.linked_user_details && element.linked_user_details.length > 0) {
                        //         element.message = `linked a staff <a>${element.linked_user_details && element.linked_user_details.length > 0 ? element.linked_user_details[0].first_name : ''} ${element.linked_user_details && element.linked_user_details.length > 0 ? element.linked_user_details[0].last_name : ''} </a>`
                        //     }
                        //     if (element.linked_user_details && element.linked_user_details.length > 0 && element.linked_user_details.length > 1) {
                        //         let userNames = [];
                        //         for (const user of element.linked_user_details) { userNames.push(' ' + user.first_name + ' ' + user.last_name) }
                        //         element.message = `linked staffs <a>${userNames}</a>`
                        //     }
                        // }
                        element.module_specific_message = '<b><font color="#00FFFF">' + username + '</font></b> <b>' + element.message + '</b> <font color="#E5E8E8">on ' + element.date + '.</font>';
                    }



                    delete element.document_details;
                    if (element.linked_scheduler_details.length == 0) delete element.linked_scheduler_details;
                    if (element.linked_customer_details.length == 0) delete element.linked_customer_details;
                    delete element.customer_details;
                    if (element.cmr_details.length == 0) delete element.cmr_details;
                    delete element.scheduler_details;
                    delete element.lead_details;
                    delete element.contacts_details;
                    delete element.user_details;
                    if (element.linked_user_details.length == 0) delete element.linked_user_details;
                    delete element.status_details;
                    if (element.linked_contacts_details.length == 0) delete element.linked_contacts_details;
                    delete element.old_status_details;
                    if (element.schedule_type_details) { delete element.schedule_type_details; }
                });
                res.status(200).json({ nextPage: nextPage, prevPage: prevPage, data: result }, 200, next);
            }
        })
        .catch((e) => next(e));
};

// filter on check box in the activity tab
const filter = async (req, res, next) => {
    try {
        const id = req.params.id;
        const response = await Audit.filter(id, req.query);
        if (isEmpty(response)) {
            res.status(404).json({ message: 'No data found', status: 404 });
        } else {
            let msg;
            response.forEach(element => {

                element.module_specific_message = element.user_details[0].first_name + ' ' + element.user_details[0].last_name + ' ' + element.message + ' on ' + convertDate(element.date);

                if (!isEmpty(element.customer_details)) {
                    msg = element.customer_details[0].customer_name;
                } else if (!isEmpty(element.lead_details)) {
                    msg = element.lead_details[0].lead_name;
                } else if (!isEmpty(element.contact_details)) {
                    msg = element.contact_details[0].contact_name;
                }
                element.detailed_message = element.user_details[0].first_name + ' ' + element.user_details[0].last_name + ' ' + element.message + ' ' + msg + ' on ' + convertDate(element.date);
                delete element.customer_details;
                delete element.lead_details;
                delete element.contact_details;
                delete element.user_details;
            });
            res.json(response, 200, next);
        }
    } catch (error) {
        next(error);
    }
};

const custom = async (req, res, next) => {
    try {
        const result = await Audit.custom();
        res.json(result);
    } catch (error) {
        next(error);
    }
};



module.exports = { auditDetails, filter, custom };