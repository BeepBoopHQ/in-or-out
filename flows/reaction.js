'use strict'

module.exports = (slackapp) => {

  slackapp.event('reaction_added', (msg) => {
    let token = msg.meta.bot_token
    let name = 'smile'
    let timestamp = msg.body.event.item.ts
    let channel = msg.body.event.item.channel
    slackapp.client.reactions.add({token, name, timestamp, channel}, (err, data) => {
      if (err) {
        console.log('Error adding reaction', err)
      }
    })
  })

}
