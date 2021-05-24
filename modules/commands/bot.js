const Discord = require('discord.js')
const { SlashCommand } = require('slash-create')

const { owner } = require('../../other/settings.json')

module.exports = class Progress extends SlashCommand {
  constructor (client, creator) {
    super(creator, {
      name: 'bot',
      guildIDs: [owner.server],
      description: 'Display bot analytics'
    })
    this.client = client
  }

  onError () {}

  async run (interaction) {
    if (interaction.user.id !== owner.id) {
      throw new Error('You do not have permission to use this command!')
    }

    const serverData = this.client.guilds.cache.reduce((acc, server) => {
      if (server.id === '110373943822540800') return acc
      return {
        servers: acc.servers + 1,
        members: acc.members + server.memberCount
      }
    }, { servers: 0, members: 0 })

    const data = require('../options/metrics.json')

    const e = new Discord.MessageEmbed()
      .setTitle(':bar_chart: Bot Information')
      .addFields({
        name: 'Servers',
        value: `\`\`\`${serverData.servers}\`\`\``,
        inline: true
      }, {
        name: 'Members',
        value: `\`\`\`${serverData.members}\`\`\``,
        inline: true
      }, {
        name: 'Other Stuff',
        value: '------------'
      }, {
        name: 'Downloads',
        value: `\`\`\`${data.downloads}\`\`\``,
        inline: true
      }, {
        name: 'Compressions',
        value: `\`\`\`${data.compressions}\`\`\``,
        inline: true
      }, {
        name: 'Interactions',
        value: `\`\`\`${data.interactions}\`\`\``,
        inline: true
      }, {
        name: 'Failed Downloads',
        value: `\`\`\`${data.failed_downloads}\`\`\``,
        inline: true
      }, {
        name: 'Failed Compressions',
        value: `\`\`\`${data.failed_compressions}\`\`\``,
        inline: true
      }, {
        name: 'Failed Download %',
        value: `\`\`\`${data.failed_downloads / data.downloads * 100}\`\`\``,
        inline: false
      }, {
        name: 'Failed Compress %',
        value: `\`\`\`${data.failed_compressions / data.compressions * 100}\`\`\``,
        inline: false
      })

    interaction.send({ embeds: [e.toJSON()] })
  }
}
