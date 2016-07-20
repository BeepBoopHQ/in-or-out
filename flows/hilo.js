const handleHiLo = 'hilo:handle'

module.exports = (slackapp) => {

  slackapp.hear('hilo', (msg) => {
    let state = { start: Date.now() }
    msg
      .say({
        text: '',
        attachments: [
          {
            text: '',
            fallback: 'Hi or Lo?',
            callback_id: 'hilo_callback',
            actions: [
              {
                name: 'answer',
                text: 'Hi',
                type: 'button',
                value: 'hi'
              },
              {
                name: 'answer',
                text: 'Lo',
                type: 'button',
                value: 'lo'
              }
            ]
          }]
        })
      .route(handleHiLo, state)
  })

  slackapp.route(handleHiLo, (msg, state) => {
    let elapsed = Date.now() - state.start
    if (msg.type !== 'action') {
      if (state.count > 1) {
        msg.say('Ok, ok, I get it.')
        return
      }
      state.count = (state.count || 0) + 1
      msg.say('Please pick a button!').route(handleHiLo, state)
      return
    }

    let value = msg.body.actions[0].value
    msg.respond(msg.body.response_url, 'registered ' + value + ' ('+ elapsed + 'ms)')
  })

}
