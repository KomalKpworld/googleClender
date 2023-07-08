const syncSql = require('sync-sql');
const constants = require('../constants')
const { google } = require('googleapis');
const _ = require('lodash')
const util = require('../util')
const moment = require('moment-timezone')
const { OAuth2 } = google.auth
const con = {
    host: constants.DB_HOST,
    user: constants.DB_USER,
    password: constants.DB_PASSWORD,
    database: constants.DB_NAME,
    port: constants.DB_PORT
};
const addEventToDB = async (table_name, values) => {
    const query = `INSERT INTO ${table_name}(email,event_id,title,description,duration,due_date_gmt,due_date_local,priority,want_need,start_time,snooze_time) VALUES (?,?,?,?,?,?,?,?,?,?,?)`
    const data = [values.email, values.event_id, values.title, values.description, values.duration, values.due_date_gmt, values.due_date_local, values.priority, values.want_need, values.start_time, values.snooze_time]
    const response = syncSql.mysql(con, query, data)
    if (response.success) {
        util.logMessage("Added to DB")
    } else {
        util.logError(response.data.err)
    }
}
const getAllEventsFromDB = async (email, start_time) => {
    let query = 'SELECT * FROM users'
    if (email) query = `SELECT * FROM users where email = '${email}'`
    const response = syncSql.mysql(con, query)
    util.logMessage(response)
    if (response.data && response.data.rows && start_time) {
        response.data.rows.filter(row => new Date(row.due_date_local).getTime() >= new Date(start_time).getTime())
    }
    return response.data.rows || []
}
const getEventByIdFromDB = async (event_id) => {
    const query = `SELECT * FROM users where event_id = '${event_id}'`
    const response = syncSql.mysql(con, query)
    util.logMessage(response)
    return response.data.rows || []
}
const deleteEventFromDB = async (event_id) => {
    const query = `DELETE FROM users where event_id = '${event_id}'`
    await syncSql.mysql(con, query)
}
const changeEventStatus = async (event_id, status) => {
    const query = `UPDATE users SET isCompleted = ${status} where event_id = '${event_id}'`
    const response = await syncSql.mysql(con, query)
    return response
}
const clearEventFromDB = async (email) => {
    let query = 'DELETE FROM users'
    if (email) query = `DELETE FROM users where email = '${email}'`
    await syncSql.mysql(con, query)
}
const updateRegistrationTokenToDB = async (email, registrationToken) => {
    try {
        const query = `INSERT INTO tokens(email, registrationToken) VALUES(?,?) ON DUPLICATE KEY UPDATE registrationToken = "${registrationToken}" `
        const data = [email, registrationToken]
        const response = syncSql.mysql(con, query, data)
        util.logMessage(response)
        return response
    } catch (err) {
        util.logError(err)
    }
}
const getTokenByEmail = async (email) => {
    try {
        let query
        if (email) query = `SELECT * FROM tokens where email = '${email}'`
        else query = 'SELECT * FROM tokens'
        const response = syncSql.mysql(con, query)
        util.logMessage(response)
        return response.data.rows || []
    } catch (err) {
        util.logError(err)
        return []
    }
}
const getCalendarList = async (token) => {
    const oAuth2Client = new OAuth2(constants.CLIENT_ID, constants.CLIENT_SECRET)
    oAuth2Client.setCredentials({
        access_token: token
    })
    const calendar = google.calendar({
        version: 'v3',
        auth: oAuth2Client
    })
    const response = await calendar.calendarList.list()
    if (response.status >= 200 && response.status < 300) {
        return response.data.items || []
    } else
        return { err: response.statusText }
}
const addEventToCalendar = async (token, event) => {
    const oAuth2Client = new OAuth2(constants.CLIENT_ID, constants.CLIENT_SECRET)
    oAuth2Client.setCredentials({
        access_token: token
    })
    const calendar = google.calendar({
        version: 'v3',
        auth: oAuth2Client
    })
    const response = await calendar.events.insert({ calendarId: 'primary', resource: event })
    event.event_id = response.data.id
    if (response.status >= 200 && response.status < 300) {
        await addEventToDB('users', event)
        return { id: response.data.id, event: response.data }
    } else {
        return { err: response.statusText }
    }
}
const getEventsFromCalendar = async (token, timeMin, timeMax, timeZone) => {
    const oAuth2Client = new OAuth2(constants.CLIENT_ID, constants.CLIENT_SECRET)
    oAuth2Client.setCredentials({
        access_token: token
    })
    const calendar = google.calendar({
        version: 'v3',
        auth: oAuth2Client
    })
    const otherCalendars = await getCalendarList(token)
    if (otherCalendars.err) {
        return { err: otherCalendars.err }
    }
    const allEvents = []
    for (let i = 0; i < otherCalendars.length; i++) {
        let response = await calendar.events.list({ calendarId: otherCalendars[i].id, timeMin, timeMax, timeZone })
        if (response.status >= 200 && response.status < 300) {
            let recurringEvent
            for (let j = 0; j < response.data.items.length; j++) {
                if (response.data.items[j].recurrence) {
                    recurringEvent = response.data.items[j]
                    continue
                }
                allEvents.push(response.data.items[j])
            }
            if (recurringEvent) {
                response = await calendar.events.list({ calendarId: otherCalendars[i].id, timeMin, timeMax, timeZone, singleEvents: true })
                response.data.items.forEach(i => allEvents.push(i))
            }
        } else {
            return { err: response.statusText }
        }
    }
    util.logMessage("foerach")
    allEvents.forEach(e => {
        if (e.summary === 'r') {
            util.logMessage(e)
        }
    })
    return allEvents || []
}
const deleteEventFromCalendar = async (token, event_id) => {
    try {
        const oAuth2Client = new OAuth2(constants.CLIENT_ID, constants.CLIENT_SECRET)
        oAuth2Client.setCredentials({
            access_token: token
        })
        const calendar = google.calendar({
            version: 'v3',
            auth: oAuth2Client
        })
        const response = await calendar.events.delete({ calendarId: 'primary', eventId: event_id })
        if (response.status >= 200 && response.status < 300) {
            await deleteEventFromDB(event_id)
            return {}
        } else
            return { err: response.statusText }
    } catch (err) {
        if (err.code === 410) {
            await deleteEventFromDB(event_id)
            return {}
        }
        util.logError(err)
        return { err }
    }
}
const getEventByIdFromCalendar = async (token, eventId) => {
    const oAuth2Client = new OAuth2(constants.CLIENT_ID, constants.CLIENT_SECRET)
    oAuth2Client.setCredentials({
        access_token: token
    })
    const calendar = google.calendar({
        version: 'v3',
        auth: oAuth2Client
    })
    const response = await calendar.events.get({ calendarId: 'primary', eventId })
    if (response.status >= 200 && response.status < 300) {
        return response.data
    }
    return { err: response.statusText }
}
const sortCalendarEventsByStartTime = (events) => {
    return _.sortBy(events, [(o) => o.start.dateTime || o.start.date])
}
exports.updateRegistrationTokenToDB = updateRegistrationTokenToDB
exports.getTokenByEmail = getTokenByEmail
exports.addEventToDB = addEventToDB
exports.addEventToCalendar = addEventToCalendar
exports.deleteEventFromDB = deleteEventFromDB
exports.deleteEventFromCalendar = deleteEventFromCalendar
exports.getAllEventsFromDB = getAllEventsFromDB
exports.getEventsFromCalendar = getEventsFromCalendar
exports.getEventByIdFromCalendar = getEventByIdFromCalendar
exports.getEventByIdFromDB = getEventByIdFromDB
exports.getCalendarList = getCalendarList
exports.clearEventFromDB = clearEventFromDB
exports.sortCalendarEventsByStartTime = sortCalendarEventsByStartTime
exports.changeEventStatus = changeEventStatus