const { SlashCommand } = require('slash-create')

const { ServerOptions } = require('../mongo')
const botInviteURL = require('../invite')
const { settingsChange } = require('../messageGenerator')
const log = require('../log')

module.exports = class Progress extends SlashCommand {
  constructor (client, creator) {
    super(creator, {
      name: 'progress',
      description: 'Change video download progress settings.',
      options: [
        {
          type: 5,
          name: 'enabled',
          description: 'Whether this is enabled or not.',
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

    serverOptions.progress.enabled = args.enabled

    await serverOptions.validate()
    await serverOptions.save()

    log.info(`${args.enabled ? 'Enabled' : 'Disabled'} progress message`, { serverID: interaction.guildID })

    interaction.send({
      embeds: [
        settingsChange(`I have ${args.enabled ? 'enabled' : 'disabled'} the progress message`)
      ]
    })
  }
}
