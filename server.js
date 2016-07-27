'use strict'

const express = require('express')
const SlackApp = require('slackapp')
const BeepBoopConvoStore = require('slackapp-convo-beepboop')
if (!process.env.PORT) throw Error('PORT missing but required')

var slackapp = SlackApp({
  debug: true,
  record: 'out.jsonl',
  convo_store: BeepBoopConvoStore({ debug: true }),
  app_token: process.env.APP_TOKEN,
  app_user_id: process.env.APP_USER_ID,
  bot_token: process.env.BOT_TOKEN,
  bot_user_id: process.env.BOT_USER_ID,
  error: (err) => { console.error('Error: ', err) }
})

require('./flows')(slackapp)
var app = slackapp.attachToExpress(express())

app.get('/', function (req, res) {
  res.send('Hello')
})

console.log('Listening on :' + process.env.PORT)
app.listen(process.env.PORT)
