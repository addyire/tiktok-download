const { SlashCommand } = require('slash-create')
const Discord = require('discord.js')

const { ServerOptions } = require('../mongo')
const botInviteURL = require('../invite')
const log = require('../log')
module.exports = class Settings extends SlashCommand {
  constructor (client, creator) {
    super(creator, {
      name: 'settings',
      description: 'Displays the current server settings.'
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
      throw new Error('You must have the ADMINISTRATOR permission to view settings.')
    }

    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: false }).exec()

    // Create embed
    const e = new Discord.MessageEmbed()
      .setTitle('Server Settings')
      .setColor(serverOptions.color)
      .setDescription('Here are the settings for this server')

    const data = serverOptions.toObject()

    // Delete db stuff
    delete data._id
    delete data.serverID
    delete data.__v

    for (const key of Object.keys(data)) {
      const cat = data[key]
      let str = ''

      if (key === 'banned' || key === 'limiter') continue

      if (typeof cat === 'object') {
        for (const item of Object.keys(cat)) {
          if (typeof cat[item] === 'object') continue
          str += `\`${item}\`: \`${cat[item]}\`\n`
        }
      } else {
        str = `\`${cat}\``
      }

      e.addField(key, str)
    }

    interaction.send({ embeds: [e.toJSON()] })

    log.info('Displaying settings', { serverID: interaction.guildID })
  }
}
