'use strict'

// list out explicitly to control order
module.exports = (app) => {
  app.flows = {
    help: require('./help')(app),
    whoisin: require('./whoisin')(app),
    chatter: require('./chatter')(app)
  }
}
