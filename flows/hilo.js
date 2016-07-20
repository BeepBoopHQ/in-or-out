const handleHiLo = 'hilo:handle'

module.exports = (slackapp) => {

  slackapp.hear('hilo', (req) => {
    var answer = Math.ceil(Math.random() * 1000)
    req.convo
      .say({
        text: '',
        attachments: [
          {
            text: '',
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
                text: 'Low',
                type: 'button',
                value: 'low'
              }
            ]
          }]
        })
      .next(handleHiLo, { }, 60)
  })

  slackapp.register(handleHiLo, (req) => {
    if (req.type !== 'interactive') {
      req.convo.say('Please pick a button!').next(handleHiLo, { }, 60)
      return
    }

    req.convo.updateActionMessage(req.body.response_url, ':white_check_mark:')
  })

}
