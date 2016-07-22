const handleHowAreYou = 'chatter:handleHowAreYou'

module.exports = (slackapp) => {

  slackapp.message('^(hi|hello|hey)', ['direct_mention', 'direct_message'], (msg, text) => {
    msg
      .say(text + ', how are you?')
      .route(handleHowAreYou, {}, 60)
  })

  slackapp.route(handleHowAreYou, (msg) => {
    var resp = msg.body.event && msg.body.event.text

    if (new RegExp('good', 'i').test(resp)) {
      msg
        .say(['Great! How is your mom?', 'Hmm... how is your cat?', 'Nice! Do you like candy?', 'And you dog?'])
        .route(handleHowAreYou, 60)
    } else {
      msg.say('Me too')
    }
  })

  slackapp.message('^(thanks|thank you)', 'mention', (msg) => {
    msg.say(['You are welcome', 'Of course'])
  })

  slackapp.message('good night|bye', 'mention', (msg) => {
    msg.say(['Cheers :beers:', 'Bye', 'Goodbye', 'Adios'])
  })

  slackapp.message('^(haha|lol)', 'ambient', (msg) => {
    // respond only 20% of the time
    if (Math.random() < 0.2) {
      msg.say(['haha', 'rofl'])
    }
  })

}
