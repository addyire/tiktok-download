const { SlashCommand } = require('slash-create')

const { ServerOptions } = require('../mongo')
const botInviteURL = require('../invite')
const log = require('../log')
const { settingsChange } = require('../messageGenerator')

module.exports = class Progress extends SlashCommand {
  constructor (client, creator) {
    super(creator, {
      name: 'autodownload',
      description: 'Set whether to automatically download TikToks. No command necessary.',
      options: [
        {
          type: 5,
          name: 'enabled',
          description: 'Whether this is enabled or not.',
          required: true
        },
        {
          type: 5,
          name: 'deletemessage',
          description: 'Delete the message with the URL in it.',
          required: false
        },
        {
          type: 5,
          name: 'smartdelete',
          description: 'When enabled, the message will not be deleted if there is more than just the URL in it.',
          required: false
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

    serverOptions.autodownload.enabled = args.enabled !== undefined ? args.enabled : serverOptions.autodownload.enabled
    serverOptions.autodownload.deletemessage = args.deletemessage !== undefined ? args.deletemessage : serverOptions.autodownload.deletemessage
    serverOptions.autodownload.smartdelete = args.smartdelete !== undefined ? args.smartdelete : serverOptions.autodownload.smartdelete

    log.info('Changed auto download settings', { serverID: interaction.guildID })

    await serverOptions.validate()
    await serverOptions.save()

    interaction.send({
      embeds: [
        settingsChange(`I have successfully ${args.enabled ? 'updated' : 'disabled'} auto download!`)
      ]
    })
  }
}
