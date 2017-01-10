'use strict'

const smb = require('slack-message-builder')
const uuidV4 = require('uuid/v4')
const moment = require('moment-timezone')

module.exports = {
  create: (obj) => new Poll(obj),

  createDefault: () => {
    let poll = new Poll()
    poll.question = 'In or Out?'
    poll.addAnswer('In')
    poll.addAnswer('Out')
    return poll
  },

  legacyParse: (message) => {
    let poll = new Poll()
    poll.question = message.text
    if (message.attachments && message.attachments.length > 0) {
      poll.author_name = message.attachments[0].author_name
      poll.author_icon = message.attachments[0].author_icon
    }
    for (var i = 0; i < message.attachments.length; i++) {
      var attachment = message.attachments[i]
      if (attachment.actions) {
        attachment.actions.forEach((action) => {
          if (action.name === 'answer') {
            poll.addAnswer(action.text)
          }
        })
      }
      if (!attachment.actions) {
        let attachment = message.attachments[i]
        var line = new LegacyAttachmentLine(attachment.text)
        line.entries.forEach((person) => {
          poll.vote(line.answer, person)
        })
      }
    }
    return poll
  },

  taskMappingKey: (teamId, pollId) => `${teamId}|task_mapping|${pollId}`,

  periods: ['daily', 'm-f', 'mwf', 'tth', 'weekly', 'monthly']
}

class Poll {
  constructor (obj) {
    obj = obj || {}
    this.id = obj.id
    this.parent_id = obj.parent_id
    this.draft = obj.draft || false
    this.draft_schedule = obj.draft_schedule || { time: null, repeat: '' }
    this.author_name = obj.author_name || ''
    this.author_icon = obj.author_icon || ''
    this.author_id = obj.author_id || ''
    this.tz_offset = obj.tz_offset || ''
    this.tz_label = obj.tz_label || ''
    this.tz = obj.tz || ''
    this.question = obj.question || ''
    this.answers = obj.answers || []
    this.channel_id = obj.channel_id || ''
    this.team_id = obj.team_id || ''
    this.ts = obj.ts || ''

    this.chronos_id = obj.chronos_id
    this.chronos_cancelled = obj.chronos_cancelled || false

    this.enableUnaccounted = obj.enableUnaccounted || false
  }

  generateId (slackTeamID) {
    this.id = `${slackTeamID}|poll|${uuidV4()}`
  }

  addAnswer (text) {
    let id = this.answers.length
    this.answers.push({
      id,
      text,
      people: []
    })
  }

  vote (id, userId) {
    if (typeof id === 'number' && this.answers[id]) {
      this.answers[id].people.push(userId)
    } else {
      for (var i = 0; i < this.answers.length; i++) {
        if (this.answers[i].text === id) {
          this.answers[i].people.push(userId)
        }
      }
    }
  }

  unvote (userId) {
    this.answers.forEach((answer) => {
      answer.people = answer.people.filter((person) => person !== userId)
    })
  }

  answered () {
    let all = []
    this.answers.forEach((answer) => {
      answer.people.forEach((person) => {
        all.push(person)
      })
    })
    return all
  }

  subtractDay (num) {
    this.draft_schedule.time = this.localizedSchedule().add(-1 * num, 'days').toDate()
  }

  addDay (num) {
    this.draft_schedule.time = this.localizedSchedule().add(num, 'days').toDate()
  }

  addHour (num) {
    this.draft_schedule.time = this.localizedSchedule().add(num, 'hours').startOf('hour').toDate()
  }

  subtractHour (num) {
    this.draft_schedule.time = this.localizedSchedule().add(-1 * num, 'hours').startOf('hour').toDate()
  }

  clearSchedule () {
    this.draft_schedule.time = null
    this.draft_schedule.repeat = ''
  }

  localizedSchedule () {
    let self = this
    this.draft_schedule.time = this.draft_schedule.time || Date.now()
    let m = moment(self.draft_schedule.time).utcOffset(self.tz_offset / 60)
    m.tz(this.tz)
    return m
  }

  formatPeriod (period) {
    switch (period) {
      case 'daily':
        return 'Daily'
      case 'm-f':
        return 'Weekdays'
      case 'mwf':
        return 'M/W/F'
      case 'tth':
        return 'T/Th'
      case 'weekly':
        return 'Weekly'
      case 'monthly':
        return 'Monthly'
    }
  }

  formatScheduleStatus (stripMarkdown) {
    let self = this
    let scheduleText = ''
    if (self.draft_schedule.time) {
      let dayDate = self.localizedSchedule().format('ddd MMM D')
      let dayOfWeek = self.localizedSchedule().format('ddd')
      let dayOfMonth = self.localizedSchedule().format('Do')
      let tod = self.localizedSchedule().format('h:mm a z')
      let B = stripMarkdown ? '' : '*'
      let period = `${B}${self.formatPeriod(self.draft_schedule.repeat)}${B}`
      if (self.draft_schedule.repeat) {
        if (self.draft_schedule.repeat === 'monthly') {
          scheduleText = `Scheduled for ${B}${tod}${B} (Repeats ${period} on the ${B}${dayOfMonth}${B})`
        } else if (self.draft_schedule.repeat === 'weekly') {
          scheduleText = `Scheduled for ${B}${tod}${B} (Repeats ${period} each ${B}${dayOfWeek}${B})`
        } else {
          scheduleText = `Scheduled for ${B}${tod}${B} (Repeats ${B}${self.formatPeriod(self.draft_schedule.repeat)}${B})`
        }
      } else {
        scheduleText = `Scheduled for ${B}${dayDate}${B} at ${B}${tod}${B}`
      }
    }
    return scheduleText
  }

  formatChronosSchedule () {
    let self = this
    if (self.draft_schedule.time) {
      let t = moment(self.draft_schedule.time).utc()
      if (!self.draft_schedule.repeat) {
        return t.toISOString()
      }

      switch (self.draft_schedule.repeat) {
        case 'daily':
          return `${t.minute()} ${t.hour()} * * * *`
        case 'm-f':
          return `${t.minute()} ${t.hour()} * * 1-5 *`
        case 'mwf':
          return `${t.minute()} ${t.hour()} * * 1,3,5 *`
        case 'tth':
          return `${t.minute()} ${t.hour()} * * 2,4 *`
        case 'weekly':
          return `${t.minute()} ${t.hour()} * * ${t.day()} *`
        case 'monthly':
          return `${t.minute()} ${t.hour()} * ${t.date()} * *`
      }
    }
  }

  renderBase (isInactive) {
    let self = this
    let msg = smb().text(`*${this.question}*`)
    let actionName = isInactive ? 'inactive_answer' : 'answer'

    let addAttachment = () => {
      let a = msg.attachment()
        .fallback('In-or-Out choices')
        .callbackId('in_or_out_callback')
        .color('#47EEBC')
        .mrkdwnIn('text')
      return a
    }

    // answer buttons
    let current = addAttachment()
    current
      .authorName(`asked by ${this.author_name}`)
      .authorIcon(this.author_icon)
    let currentCount = 0
    this.answers.forEach((answer) => {
      let action = current
        .action()
          .name(actionName)
          .text(answer.text)
          .type('button')
          .value(JSON.stringify({ id: self.id, answerId: answer.id }))

      if (isInactive) {
        action.confirm()
          .title('Question not published!')
          .text(':nerd_face: These buttons won\'t work until you publish the question.')
          .okText('Ok')
          .dismissText('Dismiss')
      }

      currentCount++

      if (currentCount === 5) {
        current = addAttachment()
        currentCount = 0
      }
    })
    return msg
  }

  render () {
    let self = this
    let value = JSON.stringify({ id: self.id })
    let msg = self.renderBase()

    // choices, slice(0) creates a clone
    let sorted = self.answers.slice(0).sort((a, b) => { return a.people.length > b.people.length ? -1 : 1 })
    sorted.forEach((answer) => {
      if (answer.people.length > 0) {
        msg
          .attachment()
          .text(`*${answer.people.length}*  ${answer.text}  ⇢  _${answer.people.map(it => `@${it}`).join(', ')}_`)
          .mrkdwnIn(['text'])
      }
    })

    // bottom
    let bottom = msg.attachment()
    bottom
      .text('')
      .fallback('move to the bottom')
      .callbackId('in_or_out_callback')
      .action()
        .name('recycle')
        .text(':arrow_heading_down: Move to bottom')
        .type('button')
        .value(value)

    if (self.enableUnaccounted) {
      bottom.action()
        .name('unaccounted')
        .text(':thinking_face: Hasn\'t answered?')
        .type('button')
        .value(value)
    }
    if (self.chronos_id) {
      bottom.action()
        .name('cancel_published_schedule')
        .value(value)
        .text('Unschedule')
        .type('button')
        .confirm()
          .title('Are you sure?')
          .text(`Cancel all future occurances of "${this.question}" created by ${this.author_name}?\n${this.formatScheduleStatus(true)}.`)
          .okText('Yes')
          .dismissText('No')

      bottom.footer(self.formatScheduleStatus(true))
    }
    if (self.chronos_cancelled) {
      bottom.footer('Schedule cancelled')
    }

    return msg
  }

  renderDraft () {
    let self = this
    let value = JSON.stringify({ id: self.id })
    let scheduleText = self.formatScheduleStatus()
    let isInactive = true
    let publishText = self.draft_schedule.time ? 'Publish' : 'Publish Now'

    let msg = self.renderBase(isInactive)
      .responseType('ephemeral')
      .replaceOriginal(true)

    let att = msg.attachment()
      .text(scheduleText)
      .fallback('Publish or Schedule')
      .callbackId('in_or_out_callback')
      .mrkdwnIn(['text'])
      .action()
        .name('confirm_publish')
        .value(value)
        .text(publishText)
        .type('button')
        .style('primary')
        .end()
      .action()
        .name('draft_schedule')
        .value(value)
        .text(':calendar: Schedule')
        .type('button')
        .end()

    // only show repeat if a schedule has been set
    if (self.draft_schedule.time) {
      att.action()
        .name('draft_repeat')
        .value(value)
        .text(':repeat: Repeat')
        .type('button')
        .end()
    }

    att.action()
      .name('cancel_publish')
      .value(value)
      .text('Discard')
      .type('button')
      .style('danger')
      .end()
    return msg
  }

  renderScheduling () {
    let self = this
    let value = JSON.stringify({ id: self.id })
    let day = self.localizedSchedule().format('ddd MMM D')
    let tod = self.localizedSchedule().format('h:mm a z')
    let isInactive = true
    let msg = self.renderBase(isInactive)
      .responseType('ephemeral')
      .attachment()
        .text('Schedule this post on:')
        .fallback('Schedule this post')
        .callbackId('in_or_out_callback')
        .mrkdwnIn(['text'])
        .action()
          .name('schedule_day_sub')
          .value(value)
          .text('-')
          .type('button')
          .end()
        .action()
          .name('noop')
          .value(value)
          .text(day)
          .type('button')
          .end()
        .action()
          .name('schedule_day_add')
          .value(value)
          .text('+')
          .type('button')
          .end()
        .end()
      .attachment()
        .text('')
        .fallback('Schedule this post')
        .callbackId('in_or_out_callback')
        .action()
          .name('schedule_hour_sub')
          .value(value)
          .text('-')
          .type('button')
          .end()
        .action()
          .name('noop')
          .value(value)
          .text(tod)
          .type('button')
          .end()
        .action()
          .name('schedule_hour_add')
          .value(value)
          .text('+')
          .type('button')
          .end()
        .end()
      .attachment()
        .text('')
        .fallback('Schedule this post')
        .callbackId('in_or_out_callback')
        .action()
          .name('schedule_save')
          .value(value)
          .text('Save')
          .type('button')
          .style('primary')
          .end()
        .action()
          .name('schedule_cancel')
          .value(value)
          .text('Cancel')
          .type('button')
          .end()
        .end()
    return msg
  }

  renderRepeats () {
    let self = this
    let unselected = '\u25CB'
    let selected = '\u25CF'
    let radio = (period) => self.draft_schedule.repeat === period ? selected : unselected
    let value = JSON.stringify({ id: this.id })
    let scheduleText = this.formatScheduleStatus()
    let isInactive = true
    let msg = this.renderBase(isInactive).responseType('ephemeral')
    let actionAttachment = null

    module.exports.periods.forEach((period, i) => {
      if (i % 4 === 0) {
        actionAttachment = msg.attachment()
          .fallback('Repeat Frequency')
          .callbackId('in_or_out_callback')
          .mrkdwnIn(['text'])
       }
      actionAttachment.action()
        .name(`repeat_${period}`)
        .value(value)
        .text(`${radio(period)} ${self.formatPeriod(period)}`)
        .type('button')
    })

    msg.attachment()
      .text('')
      .fallback('Set Reoccurance')
      .callbackId('in_or_out_callback')
      .action()
        .name('schedule_save')
        .value(value)
        .text('Save')
        .type('button')
        .style('primary')
        .end()
      .action()
        .name('schedule_cancel')
        .value(value)
        .text('Cancel')
        .type('button')
        .end()
      .end()
    return msg
  }

  renderScheduledConfirmation () {
    let value = JSON.stringify({ id: this.id, discard: true })
    let msg = smb()
      .text(`:white_check_mark: <@${this.author_id}> scheduled a new poll for this channel.`)
      .attachment()
        .text(`*${this.question}*`)
        .fallback('Cancel scheduled question')
        .callbackId('in_or_out_callback')
        .footer(this.formatScheduleStatus(true))
        .mrkdwnIn(['text'])
        .action()
          .name('cancel_published_schedule')
          .value(value)
          .text('Unschedule')
          .type('button')
          .confirm()
            .title('Are you sure?')
            .text(`Cancel all future occurances of "${this.question}" created by ${this.author_name}?\n${this.formatScheduleStatus(true)}.`)
            .okText('Yes')
            .dismissText('No')
            .end()
          .end()
        .action()
          .name('dismiss')
          .value(value)
          .text('Dismiss')
          .type('button')
        .end()
      .end()
    return msg
  }
}


class LegacyAttachmentLine {

  constructor (text) {
    this.entries = []
    this.answer = ''
    if (text) {
      var parts = text.substring(text.indexOf(' ')).split(/»/)
      parts = parts.map((it) => { return it.trim() })
      this.answer = parts[0]
      this.entries = parts[1].split(',').map((val) => { return val.trim() })
    }
  }

  add (entry) {
    this.remove(entry)
    this.entries.push(entry)
    return this
  }

  remove (entry) {
    this.entries = this.entries.filter((val) => { return val !== entry })
    return this
  }

  contains (entry) {
    return this.entries.indexOf(entry) > -1
  }

  count () {
    return this.entries.length
  }

  string () {
    return '*' + this.count() + '*' + ' ' + this.answer + ' » ' + this.entries.join(', ')
  }
}
