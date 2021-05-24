const Discord = require('discord.js')
const { SlashCommand } = require('slash-create')

const ServerOptions = require('../modules/mongo')
const { owner, version, inviteURL } = require('../options/settings.json')
const add = require('../modules/counter')

module.exports = class Progress extends SlashCommand {
  constructor (creator) {
    super(creator, {
      name: 'help',
      description: 'Displays helpful information'
    })
  }

  async run (interaction) {
    add('interactions')

    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true })

    const e = new Discord.MessageEmbed()
      .setTitle('Invite TokTik Downloader')
      .setURL(inviteURL)
      .setDescription("This bot automagically replaces TikTok URL's with a MP4 file so you don't have to leave discord to watch it. \n*If you are being DM'd responses to commands make sure the bot has sufficient permissions to send messages in ALL channels.*\nFor any additional help you can join the [help discord](https://discord.gg/eCTMza4ggA)")
      .addFields({
        name: 'Usage',
        value: 'If enabled, you can just send a TikTok and the bot will download it. To enabled/disable this use the /autodownload command.'
      }, {
        name: 'Commands',
        value: 'Type / and click on the TokTik icon to see all the available commands!'
      }, {
        name: 'Open Source',
        value: 'This bot is currently **not** open source. This may change in the future'
      })
      .setColor(serverOptions.color)
      .setFooter(`Contact ${owner.tag} for any questions or help with this bot. | Version: ${version}`)

    interaction.send({ embeds: [e.toJSON()] })
  }
}
