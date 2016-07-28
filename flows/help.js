'use strict'

module.exports = (slackapp) => {

  let help = `OK, it's pretty simple. Ask question with the \`/inorout\` command:
\`\`\`
/inorout [type your question here]
[answer 1]
[answer 2]
[...]
\`\`\`

For example:

\`\`\`
/inorout What time should we meet?
10:30AM PST
2:00PM PST
:no_entry: never
\`\`\`

Choose a button and results are aggregated below.

:recycle: moves the question down to the bottom of the stream.

Like this! https://goo.gl/ucnthN
`

  slackapp.command('/inorout', /^\s*help\s*$/, (msg) => {
    console.log('help')
    msg.respond(msg.body.response_url, help)
  })

  slackapp.message('help', ['direct_mention', 'direct_message'], (msg, text) => {
    msg.say(help)
  })
}
