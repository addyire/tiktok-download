const Discord = require('discord.js')
const { SlashCommand } = require('slash-create')

const add = require('../counter')
const ServerOptions = require('../mongo')

module.exports = class Progress extends SlashCommand {
  constructor (client, creator) {
    super(creator, {
      name: 'setcolor',
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
    const hasPerms = (await this.client.guilds.cache.get(interaction.guildID).members.fetch(interaction.user.id)).hasPermission('ADMINISTRATOR')

    if (!hasPerms) {
      throw new Error('You must have the ADMINISTRATOR permission to change settings.')
    }

    add('interactions')

    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: true })
    const args = interaction.data.data.options.reduce((a, b) => {
      a[b.name] = b.value
      return a
    }, {})

    serverOptions.color = args.color

    await serverOptions.validate()
    await serverOptions.save()

    interaction.send({ embeds: [new Discord.MessageEmbed().setTitle(':gear: Options Successfully Changed').setColor(serverOptions.color).toJSON()] })
  }
}
