const moment = require('moment');
const momentTZ = require('moment-timezone')

const Config = require('./config')


const monthNames = ['', 'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'];

const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const dateFormats = {
    short: "DD MMMM - YYYY",
    medium: "MMM DD, YYYY, h:mm A",
    long: "ddd DD MMM YYYY h:mm A",
    custom: "DD-MMM-YYYY, h:mm A"
}


const convertDate = {
    dateFormats: dateFormats,
    getDateMonthYearTime: (date) => {
        return momentTZ(date).tz(Config.timeZone).format(dateFormats.medium);
    },
    getFullStringFormat: (date) => {
        return momentTZ(date).tz(Config.timeZone).format(dateFormats.long);
    },
    getDateFormat: (date) => {
        return momentTZ(date).tz(Config.timeZone).format(dateFormats.custom);
    },
    getStringFormat: (date) => {
        return moment(date).toString();
    },
    getTimeAgo: (date) => {
        date = !date ? new Date() : new Date(date)
        return moment(date).fromNow()
    },
    getMonthName: (month) => {
        if (!month) { month = moment().month(); }
        return monthNames[month];
    },
    getDayName: (date) => {
        if (!date) { date = new Date(); }
        return monthNames[moment(date).month()];
    },
    getTodayStartTime: (date) => {
        date = !date ? new Date() : new Date(date)
        return new Date(moment(date).startOf('day'));
    },
    getTodayEndTime: (date) => {
        date = !date ? new Date() : new Date(date)
        return new Date(moment(date).endOf('day'));
    },
    getWeekFirstDay: (date) => {
        date = !date ? new Date() : new Date(date)
        return new Date(moment(date).startOf('week'));
    },
    getWeekLastDay: (date) => {
        date = !date ? new Date() : new Date(date)
        return new Date(moment(date).endOf('week'));
    },
    getMonthFirstDay: (date) => {
        date = !date ? new Date() : new Date(date)
        return new Date(moment(date).startOf('month'));
    },
    getMonthLastDay: (date) => {
        date = !date ? new Date() : new Date(date)
        return new Date(moment(date).endOf('month'));
    },
    getYearFirstDay: (date = new Date()) => {
        date = !date ? new Date() : new Date(date)
        return new Date(moment(date).startOf('year'));
    },
    getYearLastDay: (date = new Date()) => {
        date = !date ? new Date() : new Date(date)
        return new Date(moment().endOf('year'));
    },
    // returns a date of days before
    getPrevDate: (date, days = 0, key = 'd') => {
        date = !date ? new Date() : new Date(date)
        return new Date(moment(date).subtract(days, key))
    },

    getDates: (startDate, endDate) => {
        var dateArray = [];
        var currentDate = moment(startDate);
        var stopDate = moment(endDate);
        while (currentDate <= stopDate) {
            dateArray.push(moment(currentDate).format('YYYY-MM-DD'))
            currentDate = moment(currentDate).add(1, 'days');
        }
        return dateArray;
    },

    getTimeDiff: (startDate, endDate, measurement) => { // measurement: years, months, weeks, days, hours, minutes;
        return moment(startDate ? startDate : new Date()).diff(moment(endDate), measurement)
    }

};

module.exports = convertDate;

















// let lastMidnight = new Date();
// lastMidnight.setHours(0, 0, 0, 0);
// let nextMidnight = new Date();
// nextMidnight.setHours(24, 0, 0, 0);