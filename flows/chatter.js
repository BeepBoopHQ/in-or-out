const handleHowAreYou = 'chatter:handleHowAreYou'

module.exports = (slackapp) => {

  slackapp.hear('hi|hello|hey', (msg) => {
    msg
      .say('How are you?')
      .route(handleHowAreYou, {}, 60)
  })

  slackapp.route(handleHowAreYou, (msg) => {
    var resp = msg.body.event && msg.body.event.text

    if (new RegExp('good', 'i').test(resp)) {
      msg
        .say(['Great! How is your mom?', 'Hmm... how is your cat?', 'Nice! Do you like candy?', 'And you dog?'])
        .route(handleHowAreYou, {}, 60)
    } else {
      msg.say('Me too')
    }
  })

  slackapp.hear('thanks|thank you', (msg) => {
    msg.say(['You are welcome', 'Of course'])
  })

  slackapp.hear('good night|bye', (msg) => {
    msg.say(['Cheers :beers:', 'Bye', 'Goodbye', 'Adios'])
  })

  slackapp.hear('haha|lol', (msg) => {
    // respond only 20% of the time
    if (Math.random() < 0.2) {
      msg.say(['haha', 'rofl'])
    }
  })

}
