'use strict'

const smb = require('slack-message-builder')
const uuidV4 = require('uuid/v4')

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
  }
}

class Poll {
  constructor (obj) {
    obj = obj || {}
    this.id = obj.id
    this.author_name = obj.author_name || ''
    this.author_icon = obj.author_icon || ''
    this.question = obj.question || ''
    this.answers = obj.answers || []
    this.channel = obj.channel || ''
    this.ts = obj.ts || ''

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

  render () {
    let self = this
    let msg = smb().text(this.question)

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
      .authorName(this.author_name)
      .authorIcon(this.author_icon)
    let currentCount = 0
    this.answers.forEach((answer) => {
      current
        .action()
          .name('answer')
          .text(answer.text)
          .type('button')
          .value(JSON.stringify({ id: self.id, answerId: answer.id }))

      currentCount++

      if (currentCount === 5) {
        current = addAttachment()
        currentCount = 0
      }
    })

    // choices
    let sorted = this.answers.sort((a, b) => { return a.people.length > b.people.length ? -1 : 1 })
    sorted.forEach((answer) => {
      if (answer.people.length > 0) {
        msg
          .attachment()
          .text(`*${answer.people.length}*  ${answer.text} » ${answer.people.join(',')}`)
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
        .value(JSON.stringify({ id: self.id }))

    if (this.enableUnaccounted) {
      bottom.action()
        .name('unaccounted')
        .text(':thinking_face: Hasn\'t answered?')
        .type('button')
        .value(JSON.stringify({ id: self.id }))
    }

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
