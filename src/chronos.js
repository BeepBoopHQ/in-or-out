'use strict'
const needle = require('needle')

module.exports = (config) => {
  return new Chronos(config)
}

class Chronos {
  constructor (config) {
    if (!config.beepboop_token) throw new Error('beepboop_token required')
    if (!config.beepboop_project_id) throw new Error('beepboop_project_id required')
    this.token = config.beepboop_token
    this.project_id = config.beepboop_project_id
    this.base = config.base || 'https://beepboophq.com/api/v1/chronos'
  }

  list (callback) {
    this._get(`${this.base}/tasks`, callback)
  }

  active (callback) {
    this._get(`${this.base}/tasks?inactive=false`, callback)
  }

  inactive (callback) {
    this._get(`${this.base}/tasks?inactive=true`, callback)
  }

  create (data, callback) {
    needle.post(`${this.base}/tasks`, data, this._baseOptions(), (err, resp) => {
      if (err) return callback(err)
      if (resp.statusCode !== 201) {
        return callback(new Error(`unsuccesful status code ${resp.statusCode}`))
      }
      callback(null, resp.body)
    })
  }

  scheduleSyntheticEvent (msg, cron, type, payload, callback) {
    let ts = Date.now() + ''

    this.create({
      schedule: cron,
      url: `https://beepboophq.com/proxy/${this.project_id}/slack/event`,
      method: 'POST',
      headers: {
        'BB-Enrich': `slack_team_id=${msg.meta.team_id}`
      },
      payload: {
        token: msg.body.token,
        team_id: msg.meta.team_id,
        type: 'event_callback',
        event: {
          ts: ts,
          event_ts: ts,
          type: type,
          payload: payload,
          user: msg.meta.user_id,
          channel: msg.meta.channel_id
        }
      }
    }, callback)
  }

  delete (id, callback) {
    console.log(`${this.base}/tasks/${id} - ${this.token}`)
    needle.delete(`${this.base}/tasks/${id}`, null, this._baseOptions(), (err, resp) => {
      if (err) return callback(err)
      if (resp.statusCode !== 200) {
        return callback(new Error(`unsuccesful status code ${resp.statusCode}`))
      }
      callback(null, resp.body)
    })
  }

  _get (url, callback) {
    needle.get(url, this._baseOptions(), (err, resp) => {
      if (err) return callback(err)
      if (resp.statusCode !== 200) {
        return callback(new Error(`unsuccesful status code ${resp.statusCode}`))
      }
      callback(null, resp.body)
    })
  }

  _baseOptions () {
    return {
      headers: {
        Authorization: `Bearer ${this.token}`
      },
      json: true
    }
  }
}
