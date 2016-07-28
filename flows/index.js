'use strict'

// list out explicitly to control order
module.exports = (slackapp) => {
  require('./help')(slackapp)
  require('./whoisin')(slackapp)
  require('./chatter')(slackapp)
}
