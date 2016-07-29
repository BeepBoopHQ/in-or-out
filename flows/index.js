'use strict'

// list out explicitly to control order
module.exports = (slapp) => {
  require('./help')(slapp)
  require('./whoisin')(slapp)
  require('./chatter')(slapp)
}
