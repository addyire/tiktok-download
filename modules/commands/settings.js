const Discord = require('discord.js')
const { SlashCommand } = require('slash-create')

const ServerOptions = require('../mongo')
const add = require('../counter')

module.exports = class Progress extends SlashCommand {
  constructor (client, creator) {
    super(creator, {
      name: 'settings',
      description: 'Displays the current server settings.'
    })
    this.client = client
  }

  onError () {}

  async run (interaction) {
    const hasPerms = (await (await this.client.guilds.fetch(interaction.guildID)).members.fetch(interaction.user.id)).hasPermission('ADMINISTRATOR')

    if (!hasPerms) {
      throw new Error('You must have the ADMINISTRATOR permission to view settings.')
    }

    add('interactions')

    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: true })

    // Create embed
    const e = new Discord.MessageEmbed()
      .setTitle('Server Settings')
      .setDescription('Here are the settings for this server')

    const data = serverOptions.toObject()

    // Delete db stuff
    delete data._id
    delete data.serverID
    delete data.__v

    for (const key of Object.keys(data)) {
      const cat = data[key]
      let str = ''

      if (typeof cat === 'object') {
        for (const item of Object.keys(cat)) {
          str += `\`${item}\`: \`${cat[item]}\`\n`
        }
      } else {
        str = `\`${cat}\``
      }

      e.addField(key, str)
    }

    interaction.send({ embeds: [e.toJSON()] })
  }
}
