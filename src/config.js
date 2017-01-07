'use strict'

let baseUrl = process.env.BASE_URL || `https://beepboophq.com/proxy/${process.env.BEEPBOOP_PROJECT_ID}`
let config = module.exports = {
  // HTTP port
  port: process.env.PORT || 4000,

  // External base URL
  base_url: baseUrl,

  // Slapp config
  debug: !!process.env.DEBUG,
  slapp_colors: true,
  slapp_log: true,
  slack_verify_token: process.env.SLACK_VERIFY_TOKEN,

  // Beep Boop Persist API provider (beepboop, fs, memory)
  persist_provider: process.env.PERSIST_PROVIDER || 'beepboop',

  // Beep Boop Project Id and Token for Chronos API
  beepboop_project_id: process.env.BEEPBOOP_PROJECT_ID,
  beepboop_token: process.env.BEEPBOOP_TOKEN,

  validate: () => {
    let required = ['beepboop_token']

    required.forEach((prop) => {
      if (!config[prop]) {
        throw new Error(`${prop.toUpperCase()} required but missing`)
      }
    })
    return config
  }
}

