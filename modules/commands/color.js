const { SlashCommand } = require('slash-create')

const { ServerOptions } = require('../mongo')
const botInviteURL = require('../invite')
const log = require('../log')
const { settingsChange } = require('../messageGenerator')

module.exports = class SetColor extends SlashCommand {
  constructor (client, creator) {
    super(creator, {
      name: 'color',
      description: 'Change the sidebar color',
      options: [
        {
          type: 3,
          name: 'color',
          description: 'The color itself. (Must be a hexcode like this: #ff0000)',
          required: true
        }
      ]
    })
    this.client = client
  }

  onError () {}

  async run (interaction) {
    let hasPerms

    try {
      hasPerms = (await (await this.client.guilds.fetch(interaction.guildID)).members.fetch(interaction.user.id)).permissions.has('ADMINISTRATOR')
    } catch (err) {
      throw new Error(`I am not in this server as a bot. Please have an administrator click [this](${botInviteURL}) link to invite me.`)
    }

    if (!hasPerms) {
      throw new Error('You must have the ADMINISTRATOR permission to change settings.')
    }

    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: false })
    const args = interaction.data.data.options.reduce((a, b) => {
      a[b.name] = b.value
      return a
    }, {})

    log.info(`Set color to: ${args.color}`, { serverID: interaction.guildID })

    serverOptions.color = args.color

    await serverOptions.validate()
    await serverOptions.save()

    interaction.send({
      embeds: [
        settingsChange(`I have changed the color to \`${args.color}\``)
      ]
    })
  }
}
