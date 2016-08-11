'use strict'

module.exports = (slapp) => {

  let help = `OK, it's pretty simple. Ask question with the \`/inorout\` command:
\`\`\`
/inorout [type your question here]
[answer 1]
[answer 2]
[...]
\`\`\`

Up to 15 answers may go on following lines (shift-enter or ctrl-enter or return on mobile).

For example:

\`\`\`
/inorout What time should we meet?
10:30AM PST
2:00PM PST
:no_entry: never
\`\`\`

Choose a button option and results are aggregated the question.

":arrow_heading_down: move to bottom" moves the question down to the bottom of the stream.

Like this! https://goo.gl/ucnthN
`

  slapp.command('/inorout', /^\s*help\s*$/, (msg) => {
    msg.respond(help)
  })

  slapp.message('help', ['direct_mention', 'direct_message'], (msg, text) => {
    msg.say(help)
  })
}
