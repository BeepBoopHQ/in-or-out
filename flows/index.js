module.exports = (slackapp) => {
  require('./whoisin')(slackapp)
  require('./hilo')(slackapp)
  require('./chatter')(slackapp)
}
