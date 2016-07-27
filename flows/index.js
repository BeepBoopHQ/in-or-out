'use strict'

module.exports = (slackapp) => {
  require('./whoisin')(slackapp)
  require('./hilo')(slackapp)
  require('./reaction')(slackapp)
  require('./chatter')(slackapp)
}
