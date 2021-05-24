const Discord = require('discord.js')
const { SlashCommand } = require('slash-create')

const ServerOptions = require('../mongo')
const add = require('../counter')

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
    const hasPerms = (await this.client.guilds.cache.get(interaction.guildID).members.fetch(interaction.user.id)).hasPermission('ADMINISTRATOR')

    if (!hasPerms) {
      throw new Error('You must have the ADMINISTRATOR permission to change settings.')
    }

    add('interactions')

    const serverOptions = ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true })
    const args = interaction.data.data.options.reduce((a, b) => {
      a[b.name] = b.value
      return a
    }, {})

    serverOptions.progress.enabled = args.enabled

    await serverOptions.validate()
    await serverOptions.save()

    interaction.send({ embeds: [new Discord.MessageEmbed().setTitle(':gear: Options Successfully Changed').setColor(serverOptions.color).toJSON()] })
  }
}
