'use strict'

// list out explicitly to control order
module.exports = (slapp) => {
  slapp.flows = {
    help: require('./help')(slapp),
    whoisin: require('./whoisin')(slapp),
    chatter: require('./chatter')(slapp)
  }
}
