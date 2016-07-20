const handleHowAreYou = 'chatter:handleHowAreYou'

module.exports = (slackapp) => {

  slackapp.hear('hi|hello|hey', (req) => {
    req.convo
      .say('How are you?')
      .next(handleHowAreYou, {}, 60)
  })

  slackapp.register(handleHowAreYou, (req) => {
    var resp = req.body.event && req.body.event.text

    if (new RegExp('good', 'i').test(resp)) {
      req.convo
        .say('Glad to hear it! How is your mom?')
        .next(handleHowAreYou, {}, 60)
    } else {
      req.convo.say('Me too')
    }
  })

  slackapp.hear('thanks|thank you', (req) => {
    req.convo.say(['You are welcome', 'Of course'])
  })

  slackapp.hear('good night|bye', (req) => {
    req.convo.say(['Cheers :beers:', 'Bye', 'Goodbye', 'Adios'])
  })

  slackapp.hear('haha|lol', (req) => {
    // respond only 20% of the time
    if (Math.random() < 0.2) {
      req.convo.say(['haha', 'rofl'])
    }
  })

}
