'use strict'
const os = require('os')

module.exports = (slapp) => {

  slapp.command('/inorout', /.*/, (msg, text) => {
    var lines = msg.body.text.split(os.EOL).map((it) => { return it.trim() })
    var text = lines[0] || 'In or Out?'

    // max 15 answers (3 for buttons, 1 for move to bottom, 15 for each answer)
    if (lines.length > 16) {
      msg.respond(`:sob: Sorry, you may only enter 15 options. Here is what you entered:

/inorout ${msg.body.text}`)
      return
    }

    // default actions incase the user doesn't specify one
    var actions = [
      {
        name: 'answer',
        text: 'In',
        type: 'button',
        value: 'in',
        style: 'default'
      },
      {
        name: 'answer',
        text: 'Out',
        type: 'button',
        value: 'out',
        style: 'default'
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
          value: answer,
          style: 'default'
        })
      }
    }

    // split the buttons into blocks of five if there are that many different
    // questions
    var attachments = []
    actions.forEach((action, num) => {
      let idx = Math.floor(num / 5)
      if (!attachments[idx]) {
        attachments[idx] = {
          text: '',
          fallback: text,
          callback_id: 'in_or_out_callback',
          color: '#47EEBC',
          actions: []
        }
      }
      attachments[idx].actions.push(action)
    })

    let bottomActions = [{ name: 'recycle', text: ':arrow_heading_down: Move to bottom', type: 'button' }]

    // only show hasn't answered for channels (kinda hackish :/ )
    if (msg.meta.channel_id[0] === 'C') {
      bottomActions.push({ name: 'unaccounted', text: ':thinking_face: Hasn\'t answered?', type: 'button' })
    }

    // move to the bottom button
    attachments.push({
      text: '',
      fallback: 'move to the bottom',
      callback_id: 'in_or_out_callback',
      actions: bottomActions
    })

    slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => {
      if (err) return msg.respond(`Sorry, something went wrong. Try again? (${err.message || err})`)

      // add author information to first attachment
      attachments[0].author_name = `asked by ${data.user.profile.real_name || data.user.name}`
      attachments[0].author_icon = data.user.profile.image_24,

      msg.say({
        text: text,
        attachments: attachments
      }, (err) => {
        if (err && err.message === 'channel_not_found') {
          msg.respond('Sorry, I can not write to a channel or group I am not a part of!')
        }
      })
    })
  })

  // Recycle the message to the bottom (most recent) of the stream
  slapp.action('in_or_out_callback', 'recycle', (msg, value) => {
    var orig = msg.body.original_message
    var update = {
      text: 'In or out (moved to bottom): ' + orig.text,
      delete_original: true
    }
    msg.respond(update, (err) => {
      if (err) return handleError(err, msg)
      msg.say({
        text: orig.text,
        attachments: orig.attachments
      })
    })
  })

  slapp.action('in_or_out_callback', 'unaccounted', (msg) => {
    let orig = msg.body.original_message
    let question = msg.body.original_message.text
    let token = msg.meta.bot_token
    let channel = msg.meta.channel_id
    let answered = []

    for(var i=0; i < orig.attachments.length; i++) {
      var attachment = orig.attachments[i]
      if (attachment.actions) continue
      var line = new AttachmentLine(attachment.text)
      answered = answered.concat(line.entries)
    }

    slapp.client.channels.info({ token, channel }, (err, result) => {
      if (err) return handleError(err, msg)
      let membersById = result.channel.members

      slapp.client.users.list({ token }, (err, teamMembers) => {
        if (err) return handleError(err, msg)
        let channelMembers = teamMembers.members.filter((it) => {
          return membersById.indexOf(it.id) >= 0
        })

        let noAnswer = channelMembers.filter((it) => {
          return answered.indexOf(it.name) < 0 && !it.is_bot && !it.deleted
        })

        let noAnswerText = noAnswer.map((it) => { return `<@${it.id}>`})
        msg.respond({
          text: `${noAnswer.length} people have not answered "${question}" yet\n ${noAnswerText.join('\n')}`,
          response_type: 'ephemeral',
          replace_original: false
        })
      })
    })
  })

  // Handle an answer
  slapp.action('in_or_out_callback', 'answer', (msg, value) => {
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

      // parse the attachment text and represent as an object
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
    orig.attachments = newAttachments.concat(lines.map((l)=>{ return { text: l.string(),  mrkdwn_in: ["text"], color: '#47EEBC' } }))

    // replace the original message
    msg.respond(msg.body.response_url, orig)
  })

}

function handleError(err, msg) {
  console.error(err)

  // Only show errors when we can respond with an ephemeral message
  // So this includes any button actions or slash commands
  if (!msg.body.response_url) return

  msg.respond({
    text: `:scream: Uh Oh: ${err.message || err}`,
    response_type: 'ephemeral',
    replace_original: false
  }, (err) => {
    if (err) console.error('Error handling error:', err)
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
    return '*' + this.count() + '*' + ' ' + this.answer +  ' » ' + this.entries.join(', ')
  }
}
