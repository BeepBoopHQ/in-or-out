'use strict'
const os = require('os')
const Poll = require('../poll')
const smb = require('slack-message-builder')
const moment = require('moment')

module.exports = (app) => {
  let slapp = app.slapp
  let kv = app.kv
  let chronos = app.chronos

  slapp.command('/inorout', /.*/, (msg) => {
    var lines = msg.body.text.split(os.EOL).map((it) => { return it.trim() })

    let poll = null
    if (!lines[0]) {
      poll = Poll.createDefault()
    } else if (lines.length == 1) {
      poll = Poll.createDefault()
      poll.question = lines[0]
    } else {
      poll = Poll.create()
      poll.question = lines[0]
    }
    poll.generateId(msg.meta.team_id)
    poll.draft = true
    poll.team_id = msg.meta.team_id
    poll.channel_id = msg.meta.channel_id
    poll.author_id = msg.meta.user_id


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
      poll.tz = data.user.tz
      poll.tz_offset = data.user.tz_offset
      poll.tz_label = data.user.tz_label

      kv.set(poll.id, poll, (err) => {
        msg.respond(poll.renderDraft().json())
      })
    })
  })

  slapp.event('scheduled_publish', (msg) => {
    let poll = Poll.create(msg.body.event.payload)
    poll.parent_id = poll.id
    poll.generateId()

    // get the parent poll to find the chronos task ID
    kv.get(poll.parent_id, (err, parentPoll) => {
      if (err) return handleError(err, msg)
      poll.chronos_id = parentPoll.chronos_id

      kv.set(poll.id, poll, (err) => {
        if (err) return handleError(err, msg)
        msg.say(poll.render().json())
      })
    })
  })

  slapp.action('in_or_out_callback', 'confirm_publish', (msg, data) => {
    getPollFromAction(msg, data, (err, poll, data) => {
      if (err) return handleError(err, msg)
      poll.draft = false

      // publish now
      if (!poll.draft_schedule.time) {
        msg.respond({ delete_original: true })
        msg.say(poll.render().json(), (err, result) => {
          if (err) return handleError(err, msg)
          poll.ts = msg.ts
          poll.channel_id = msg.channel

          kv.set(poll.id, poll, (err) => {
            if (err) return handleError(err, msg)
          })
        })
        return
      }

      // scheduled
      chronos.scheduleSyntheticEvent(msg, poll.formatChronosSchedule(), 'scheduled_publish', poll, (err, task) => {
        if (err) return handleError(err, msg)

        // store task mapping
        poll.chronos_id = task.id
        kv.set(poll.id, poll, (err) => {
          if (err) return handleError(err, msg)
          msg.respond({ delete_original: true })
          msg.say(poll.renderScheduledConfirmation().json(), (err, result) => {
            if (err) return handleError(err, msg)
          })
        })
      })
    })
  })

  slapp.action('in_or_out_callback', 'cancel_publish', (msg, data) => {
    data = parseData(data)
    kv.del(data.id, (err) => {
      if (err) return handleError(err, msg)
      msg.respond({ delete_original: true })
    })
  })

  slapp.action('in_or_out_callback', 'cancel_published_schedule', (msg, data) => {
    getPollFromAction(msg, data, (err, poll, data) => {
      if (err) return handleError(err, msg)
      chronos.delete(poll.chronos_id, (err) => {
        if (err) return handleError(err, msg)
        poll.chronos_id = null
        poll.chronos_cancelled = true
        kv.set(poll.id, poll, (err) => {
          if (err) return handleError(err, msg)
          if (data.discard) {
            msg.respond({ delete_original: true })
          } else {
            msg.respond(poll.render().json())
          }
        })
      })
    })
  })

  slapp.action('in_or_out_callback', 'draft_schedule', (msg, data) => {
    getPollFromAction(msg, data, (err, poll, data) => {
      if (err) return handleError(err, msg)
      if (!poll.draft_schedule.time) {
        poll.draft_schedule.time = Date.now() + (60000)
        kv.set(poll.id, poll, (err) => {
          if (err) return handleError(err, msg)
          msg.respond(poll.renderScheduling().json())
        })
      } else {
        msg.respond(poll.renderScheduling().json())
      }
    })
  })

  slapp.action('in_or_out_callback', 'schedule_day_sub', (msg, data) => {
    getPollFromAction(msg, data, (err, poll, data) => {
      if (err) return handleError(err, msg)
      poll.subtractDay(1)
      kv.set(poll.id, poll, (err) => {
        if (err) return handleError(err, msg)
        msg.respond(poll.renderScheduling().json())
      })
    })
  })

  slapp.action('in_or_out_callback', 'schedule_day_add', (msg, data) => {
    getPollFromAction(msg, data, (err, poll, data) => {
      if (err) return handleError(err, msg)
      poll.addDay(1)
      kv.set(poll.id, poll, (err) => {
        if (err) return handleError(err, msg)
        msg.respond(poll.renderScheduling().json())
      })
    })
  })

  slapp.action('in_or_out_callback', 'schedule_hour_add', (msg, data) => {
    getPollFromAction(msg, data, (err, poll, data) => {
      if (err) return handleError(err, msg)
      poll.addHour(1)
      kv.set(poll.id, poll, (err) => {
        if (err) return handleError(err, msg)
        msg.respond(poll.renderScheduling().json())
      })
    })
  })

  slapp.action('in_or_out_callback', 'schedule_hour_sub', (msg, data) => {
    getPollFromAction(msg, data, (err, poll, data) => {
      if (err) return handleError(err, msg)
      poll.subtractHour(1)
      kv.set(poll.id, poll, (err) => {
        if (err) return handleError(err, msg)
        msg.respond(poll.renderScheduling().json())
      })
    })
  })

  slapp.action('in_or_out_callback', 'draft_repeat', (msg, data) => {
    getPollFromAction(msg, data, (err, poll, data) => {
      if (err) return handleError(err, msg)
      msg.respond(poll.renderRepeats().json())
    })
  })

  Poll.periods.forEach((period) => {
    slapp.action('in_or_out_callback', `repeat_${period}`, (msg, data) => {
      getPollFromAction(msg, data, (err, poll, data) => {
        if (err) return handleError(err, msg)
        poll.draft_schedule.repeat = period
        kv.set(poll.id, poll, (err) => {
          if (err) return handleError(err, msg)
          msg.respond(poll.renderRepeats().json())
        })
      })
    })
  })

  slapp.action('in_or_out_callback', 'schedule_save', (msg, data) => {
    getPollFromAction(msg, data, (err, poll, data) => {
      if (err) return handleError(err, msg)
      msg.respond(poll.renderDraft().json())
    })
  })

  slapp.action('in_or_out_callback', 'schedule_cancel', (msg, data) => {
    getPollFromAction(msg, data, (err, poll, data) => {
      if (err) return handleError(err, msg)
      poll.clearSchedule()
      kv.set(poll.id, poll, (err) => {
        if (err) return handleError(err, msg)
        msg.respond(poll.renderDraft().json())
      })
    })
  })

  // Recycle the message to the bottom (most recent) of the stream
  slapp.action('in_or_out_callback', 'recycle', (msg, value) => {
    getPollFromAction(msg, value, (err, poll, data) => {
      if (err) return handleError(err, msg)
      msg.respond({ delete_original: true })
      msg.say(poll.render().json())
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

          let noAnswerText = noAnswer.map((it) => { return `<@${it.id}>` })
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

  function parseData (data) {
    try {
      return JSON.parse(data)
    } catch (ex) {
      return {}
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
