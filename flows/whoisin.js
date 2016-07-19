const os = require('os')

module.exports = (slackapp) => {

  slackapp.command('/inorout', /^create.*/, (req) => {
    var lines = req.body.text.split(os.EOL)
    var text = lines[0].substring('create '.length) || 'In or Out?'

    var actions = [
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

    if (lines.length > 1) {
      actions = []
      for (var i=1; i<lines.length; i++) {
        var answer = lines[i]
        actions.push({
          name: 'answer',
          text: answer,
          type: 'button',
          value: answer
        })
      }
    }


    req.convo.say({
      text: text,
      attachments: [
        {
          text: '',
          callback_id: 'in_or_out_callback',
          actions: actions
        }]
    }, (err) => { console.log(err) })
  })

  slackapp.action('in_or_out_callback', 'answer', (req, value) => {
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
