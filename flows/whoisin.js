const os = require('os')
const times = require('times-loop')

module.exports = (slackapp) => {

  slackapp.command('/inorout', /^create.*/, (msg) => {
    var lines = msg.body.text.split(os.EOL).map((it) => { return it.trim() })
    var text = lines[0].substring('create '.length) || 'In or Out?'

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
      text: text,
      attachments: [
        {
          text: '',
          callback_id: 'in_or_out_callback',
          actions: actions
        }]
    }, (err) => { console.log(err) })
  })

  slackapp.action('in_or_out_callback', 'answer', (msg, value) => {
    var infoMsg = msg.body.user.name + ' is ' + value
    var username = msg.body.user.name
    var orig = msg.body.original_message
    var foundExistingLine = false
    orig.attachments = orig.attachments || []

    var newAttachments = []


    // look for an existing attachment and replace if found
    for(var i=0; i < orig.attachments.length; i++) {
      var attachment = orig.attachments[i]

      if (attachment.actions) {
        newAttachments.push(attachment)
        continue
      }
      var line = new AttachmentLine(attachment.text)
      if (line.answer === value) {
        foundExistingLine = true
        line.add(username)
        attachment.text = line.string()
        newAttachments.push(attachment)
      } else {
        attachment.text = line.remove(username).string()
        if (line.count() > 0) {
          newAttachments.push(attachment)
        }
      }
    }

    if (!foundExistingLine) {
      var line = new AttachmentLine()
      line.answer = value
      line.add(username)

      newAttachments.push({
        text: line.string()
      })
    }

    orig.attachments = newAttachments

    msg.respond(msg.body.response_url, orig)
  })

}

class AttachmentLine {

  constructor (text) {
    this.entries = []
    this.answer = ''
    if (text) {
      var parts = text.split(/•+/)
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
    times(this.count(), ()=> { dots += '•' })
    return this.answer +  ' ' + dots + ' ' + this.entries.join(', ')
  }
}
