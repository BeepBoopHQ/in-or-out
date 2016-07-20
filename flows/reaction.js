module.exports = (slackapp) => {

  slackapp.event('reaction_added', (msg) => {
    let token = msg.meta.app_token
    let name = 'smile'
    let timestamp = msg.body.event.item.ts
    slackapp.client.reactions.add({token, name, timestamp}, (err, data) => {
      if (err) {
        msg.say('oh no: ' + err)
      } else {
        msg.say(data)
      }
    })
  })

}
