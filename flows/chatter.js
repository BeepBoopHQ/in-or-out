'use strict'

const handleHowAreYou = 'chatter:handleHowAreYou'

module.exports = (slackapp) => {

  slackapp.message('^(hi|hello|hey)$', ['direct_mention', 'direct_message'], (msg, text) => {
    msg
      .say(text + ', how are you?')
      .route(handleHowAreYou, {}, 60)
  })

  slackapp.route(handleHowAreYou, (msg) => {
    var resp = msg.body.event && msg.body.event.text

    if (new RegExp('good', 'i').test(resp)) {
      msg
        .say(['Great! Ready?', ':smile: Are you sure?'])
        .route(handleHowAreYou, 60)
    } else {
      msg.say('Me too')
    }
  })

  slackapp.message('^(thanks|thank you)', ['mention', 'direct_message'], (msg) => {
    msg.say(['You are welcome', 'Of course'])
  })

  slackapp.message('good night|bye', ['mention', 'direct_message'], (msg) => {
    msg.say(['Cheers :beers:', 'Bye', 'Goodbye', 'Adios'])
  })

  slackapp.message('.*', ['direct_mention', 'direct_message'], (msg) => {
    msg.say([':wave:', ':pray:', ':raised_hands:'])
  })
}
