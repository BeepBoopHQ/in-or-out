'use strict'
const express = require('express')
const Slapp = require('slapp')
const BeepBoopConvoStore = require('slapp-convo-beepboop')
const BeepBoopContext = require('slapp-context-beepboop')
const BeepBoopPersist = require('beepboop-persist')
const Chronos = require('./src/chronos')
const config = require('./src/config').validate()

var slapp = Slapp({
  verify_token: config.slack_verify_token,
  log: config.slapp_log,
  colors: config.slapp_colors,
  record: 'out.jsonl',
  convo_store: BeepBoopConvoStore(),
  context: BeepBoopContext()
})

var server = slapp.attachToExpress(express())

var app = {
  slapp,
  server,
  kv: BeepBoopPersist({ provider: config.persist_provider }),
  chronos: Chronos({ 
    beepboop_token: config.beepboop_token, 
    beepboop_project_id: config.beepboop_project_id
  })
}

require('./src/flows')(app)
server.get('/', function (req, res) {
  res.send('Hello')
})

server.get('/healthz', function (req, res) {
  res.send({ version: process.env.VERSION, id: process.env.BEEPBOOP_ID })
})

console.log('Listening on :' + config.port)
server.listen(config.port)
