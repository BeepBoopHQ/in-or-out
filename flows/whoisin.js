'use strict'
const os = require('os')

module.exports = (slackapp) => {

  slackapp.command('/inorout', /.*/, (msg) => {
    var lines = msg.body.text.split(os.EOL).map((it) => { return it.trim() })
    var text = lines[0] || 'In or Out?'

    // default actions incase the user doesn't specify one
    var actions = [
      {
        name: 'answer',
        text: 'In',
        type: 'button',
        value: 'in'
      },
      {
        name: 'answer',
        text: 'Out',
        type: 'button',
        value: 'out'
      }
    ]

    if (lines.length > 1) {
      actions = []
      for (var i=1; i<lines.length; i++) {
        var answer = lines[i]
        actions.push({
          name: 'answer',
          text: answer,
          type: 'button',
          value: answer
        })
      }
    }

    msg.say({
      text: '',
      attachments: [
        {
          text: text,
          callback_id: 'in_or_out_callback',
          actions: actions
        },
        {
          text: '',
          callback_id: 'in_or_out_callback',
          actions: [{
            name: 'recycle',
            text: ':recycle:',
            type: 'button',
          }]
        }]
    }, (err) => {
      if (err && err.message === 'channel_not_found') {
        msg.respond(msg.body.response_url, 'Sorry, I can not write to a channel or group I am not a part of!')
      }
    })
  })

  // Recycle the message to the bottom (most recent) of the stream
  slackapp.action('in_or_out_callback', 'recycle', (msg, value) => {
    var orig = msg.body.original_message
    var update = {
      text: 'In or out (moved to bottom): ' + orig.text,
      delete_original: true
    }
    msg.respond(msg.body.response_url, update, (err) => {
      if (err) console.err('uh oh')
      msg.say({
        text: orig.text,
        attachments: orig.attachments
      })
    })
  })

  // Handle an answer
  slackapp.action('in_or_out_callback', 'answer', (msg, value) => {
    var infoMsg = msg.body.user.name + ' is ' + value
    var username = msg.body.user.name
    var orig = msg.body.original_message
    var foundExistingLine = false
    orig.attachments = orig.attachments || []

    var newAttachments = []
    var lines = []

    // look for an existing line/attachment and update it if found
    for(var i=0; i < orig.attachments.length; i++) {
      var attachment = orig.attachments[i]

      if (attachment.actions) {
        newAttachments.push(attachment)
        continue
      }

      // parase the attachment text and represent as an object
      var line = new AttachmentLine(attachment.text)
      if (line.answer === value) {
        foundExistingLine = true
        line.add(username)
        lines.push(line)
      } else {
        line.remove(username)
        if (line.count() > 0) {
          lines.push(line)
        }
      }
    }

    // create a new line if next existing
    if (!foundExistingLine) {
      var line = new AttachmentLine()
      line.answer = value
      line.add(username)
      lines.push(line)
    }

    // sort lines by most votes
    lines = lines.sort((a,b) => { return a.count() > b.count() ? -1 : 1 })

    // render and replace the updated attachments list
    orig.attachments = newAttachments.concat(lines.map((l)=>{ return { text: l.string() } }))

    // replace the original message
    msg.respond(msg.body.response_url, orig)
  })

}

class AttachmentLine {

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

  string() {
    let dots = ''
    return numToEmoji(this.count()) + ' ' + this.answer +  ' » ' + this.entries.join(', ')
  }
}

var numMap = {
  '1': ':one:',
  '2': ':two:',
  '3': ':three:',
  '4': ':four:',
  '5': ':five:',
  '6': ':six:',
  '7': ':seven:',
  '8': ':eight:',
  '9': ':nine:',
  '0': ':zero:'
}

function numToEmoji(num) {
  return (num + '').split('').map((n) => { return numMap[n] })
}
