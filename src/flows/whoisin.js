'use strict'
const os = require('os')
const Poll = require('../poll')
const smb = require('slack-message-builder')

module.exports = (app) => {
  let slapp = app.slapp
  let kv = app.kv

  slapp.command('/inorout', /.*/, (msg) => {
    var lines = msg.body.text.split(os.EOL).map((it) => { return it.trim() })

    let poll = null
    if (!lines[0]) {
      poll = Poll.createDefault()
    } else {
      poll = Poll.create()
      poll.question = lines[0]
    }
    poll.generateId(msg.meta.team_id)

    // max 15 answers (3 for buttons, 1 for move to bottom, 15 for each answer)
    if (lines.length > 16) {
      msg.respond(`:sob: Sorry, you may only enter 15 options. Here is what you entered:\n\n/inorout ${msg.body.text}`)
      return
    }

    if (lines.length > 1) {
      for (var i = 1; i < lines.length; i++) {
        var answer = lines[i]
        poll.addAnswer(answer)
      }
    }

    // only show hasn't answered for channels (kinda hackish :/ )
    if (msg.meta.channel_id[0] === 'C') {
      poll.enableUnaccounted = true
    }

    slapp.client.users.info({ token: msg.meta.bot_token, user: msg.meta.user_id }, (err, data) => {
      if (err) return msg.respond(`Sorry, something went wrong. Try again? (${err.message || err})`)

      // add author information to first attachment
      poll.author_name = data.user.profile.real_name || data.user.name
      poll.author_icon = data.user.profile.image_24

      kv.set(poll.id, poll, (err) => {
        let preview = poll.render()
          .responseType('ephemeral')
          .replaceOriginal(false)
          .attachment()
            .text(':point_up: Does this look OK?')
            .fallback('Does this look OK?')
            .callbackId('in_or_out_callback')
            .action()
              .name('confirm_publish')
              .value(poll.id)
              .text('Yes, Publish')
              .type('button')
              .style('primary')
              .end()
            .action()
              .name('cancel_publish')
              .value(poll.id)
              .text('No, Cancel')
              .type('button')
              .style('danger')
              .end()
            .end()
        msg.respond(preview.json())
      })
    })
  })

  slapp.action('in_or_out_callback', 'confirm_publish', (msg, pollId) => {
    console.log(pollId)
    kv.get(pollId, (err, val) => {
      if (err) return handleError(err, msg)
      console.log(val)
      var poll = Poll.create(val)
      msg.respond({ delete_original: true })
      msg.say(poll.render().json())
      kv.del(pollId, (err) => {
        if (err) console.log(`Error deleting poll from persist ${pollId}`)
      })
    })
  })

  slapp.action('in_or_out_callback', 'cancel_publish', (msg, pollId) => {
    kv.del(pollId, (err) => {
      if (err) return handleError(err, msg)
      msg.respond({ delete_original: true })
    })
  })

  // Recycle the message to the bottom (most recent) of the stream
  slapp.action('in_or_out_callback', 'recycle', (msg, value) => {
    getPollFromAction(msg, value, (err, poll, data) => {
      if (err) return handleError(err, msg)
      var update = smb()
        .text('')
        .deleteOriginal(true)
        .attachment()
          .text(`_${poll.question}_\nmoved to bottom`)
          .callbackId('in_or_out_callback')
          .mrkdwnIn(['text'])
          .fallback('moved to bottom')
          .action()
            .name('dismiss')
            .text('Dismiss')
            .type('button')
            .end()
          .end()
      msg.respond(update.json(), (err) => {
        if (err) return handleError(err, msg)
        msg.say(poll.render().json())
      })
    })
  })

  slapp.action('in_or_out_callback', 'dismiss', (msg) => {
    msg.respond({
      delete_original: true
    })
  })

  slapp.action('in_or_out_callback', 'unaccounted', (msg, value) => {
    getPollFromAction(msg, value, (err, poll, data) => {
      if (err) return handleError(err, msg)

      let token = msg.meta.bot_token
      let channel = msg.meta.channel_id
      let answered = poll.answered()

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
          let message = smb()
            .text('')
            .responseType('ephemeral')
            .replaceOriginal(false)
            .attachment()
              .fallback('dismiss')
              .text(`_${poll.question}_\n${noAnswer.length} people in this channel have not answered:\n${noAnswerText.join(', ')}`)
              .callbackId('in_or_out_callback')
              .mrkdwnIn(['text'])
              .action()
                .name('dismiss')
                .text('Dismiss')
                .type('button')
                .value('dismiss')
              .end()
            .end()
          msg.respond(message.json())
        })
      })
    })
  })

  // Handle an answer
  slapp.action('in_or_out_callback', 'answer', (msg, value) => {
    var username = msg.body.user.name

    getPollFromAction(msg, value, (err, poll, data) => {
      if (err) return handleError(err, msg)
      let answer = data.answerId !== undefined ? data.answerId : value
      poll.unvote(username)
      poll.vote(answer, username)
      kv.set(poll.id, poll, (err) => {
        if (err) return handleError(err, msg)
        msg.respond(poll.render().json())
      })
    })
  })

  function getPollFromAction (msg, actionVal, callback) {
    let wrapperCB = (err, poll, data) => {
      if (poll) {
        if (msg.meta.channel_id[0] === 'C') {
          poll.enableUnaccounted = true
        }
      }
      callback(err, poll, data)
    }

    var orig = msg.body.original_message
    try {
      let data = JSON.parse(actionVal)
      kv.get(data.id, (err, val) => {
        if (err) return wrapperCB(err)
        wrapperCB(null, Poll.create(val), data)
      })
    } catch (ex) {
      let poll = Poll.legacyParse(orig)
      poll.generateId(msg.meta.team_id)
      let data = { id: poll.id }
      kv.set(poll.id, poll, (err) => {
        if (err) return wrapperCB(err)
        wrapperCB(null, poll, data)
      })
    }
  }

  return {}
}


function handleError (err, msg) {
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
