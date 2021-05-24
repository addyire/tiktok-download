const Discord = require('discord.js')
const { SlashCommand } = require('slash-create')

const ServerOptions = require('../mongo')
const add = require('../counter')
const client = require('../../bot')

module.exports = class Progress extends SlashCommand {
  constructor (creator) {
    super(creator, {
      name: 'settings',
      description: 'Displays the current server settings.'
    })
  }

  async run (interaction) {
    const hasPerms = (await client.guilds.cache.get(interaction.guildID).members.fetch(interaction.user.id)).hasPermission('ADMINISTRATOR')

    if (!hasPerms) {
      throw new Error('You must have the ADMINISTRATOR permission to view settings.')
    }

    add('interactions')

    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true })

    // Create embed
    const e = new Discord.MessageEmbed()
      .setTitle('Server Settings')
      .setDescription('Here are the settings for this server')

    const data = serverOptions.toObject()

    // Deleete db stuff
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
