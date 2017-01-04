'use strict'

const handleHowAreYou = 'chatter:handleHowAreYou'

module.exports = (app) => {
  let slapp = app.slapp

  slapp.message('^(hi|hello|hey)$', ['direct_mention', 'direct_message'], (msg, text) => {
    msg
      .say(text + ', how are you?')
      .route(handleHowAreYou, {}, 60)
  })

  slapp.route(handleHowAreYou, (msg) => {
    var resp = msg.body.event && msg.body.event.text

    if (new RegExp('good', 'i').test(resp)) {
      msg
        .say(['Great! Ready?', ':smile: Are you sure?'])
        .route(handleHowAreYou, 60)
    } else {
      msg.say('Me too')
    }
  })

  slapp.message('^(thanks|thank you)', ['mention', 'direct_message'], (msg) => {
    msg.say(['You are welcome', 'Of course'])
  })

  slapp.message('good night|bye', ['mention', 'direct_message'], (msg) => {
    msg.say(['Cheers :beers:', 'Bye', 'Goodbye', 'Adios'])
  })

  slapp.message('.*', ['direct_mention', 'direct_message'], (msg) => {
    // respond only 40% of the time
    if (Math.random() < 0.4) {
      msg.say([':wave:', ':pray:', ':raised_hands:'])
    }
  })

  return {}
}
