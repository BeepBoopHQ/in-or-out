module.exports = (slackapp) => {

  slackapp.hear('whoisin', (req) => {
    req.convo.say({
      text: 'Who is in today?',
      attachments: [
        {
          text: '',
          callback_id: 'in_today_callback',
          actions: [
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
        }]
    }, (err) => { console.log(err) })
  })

  slackapp.action('in_today_callback', 'answer', (req, value) => {
    var infoMsg = req.body.user.name + ' is ' + value
    var orig = req.body.original_message
    orig.attachments = orig.attachments || []

    // look for an existing attachment and replace if found
    for(var i=0; i < orig.attachments.length; i++) {
      if (orig.attachments[i].text && orig.attachments[i].text.indexOf(req.body.user.name) === 0) {
        orig.attachments[i].text = infoMsg
        return req.convo.updateAction(req.body.response_url, orig)
      }
    }

    // push a new response
    orig.attachments.push({
      text: req.body.user.name + ' is ' + value
    })

    req.convo.updateAction(req.body.response_url, orig)
  })

}
