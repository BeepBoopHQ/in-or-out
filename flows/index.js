'use strict'

module.exports = (slackapp) => {
  require('./whoisin')(slackapp)
  require('./chatter')(slackapp)
}
