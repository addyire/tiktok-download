const Discord = require('discord.js')
const { SlashCommand, ButtonStyle, ComponentType } = require('slash-create')

const ServerOptions = require('../mongo')
const { owner, version } = require('../../other/settings.json')
const botInviteURL = require('../invite')

module.exports = class Help extends SlashCommand {
  constructor (client, creator) {
    super(creator, {
      name: 'help',
      description: 'Displays helpful information'
    })
    this.client = client
  }

  onError () {}

  async run (interaction) {
    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: false })

    const response = {}

    response.embeds = [new Discord.MessageEmbed()
      .setTitle('Invite TokTik Downloader')
      .setURL(botInviteURL)
      .setDescription("This bot automagically replaces TikTok URL's with a MP4 file so you don't have to leave discord to watch it. \n*If you are being DM'd responses to commands make sure the bot has sufficient permissions to send messages in ALL channels.*")
      .addFields({
        name: 'Usage',
        value: 'If autodownload is enabled, you can just send a TikTok and the bot will download it. To enabled/disable this use the /autodownload command.'
      }, {
        name: 'Commands',
        value: 'Type / and click on the TokTik icon to see all the available commands!'
      }, {
        name: 'Open Source',
        value: 'You can view the code [here](https://github.com/addyire/tiktok-download) on GitHub!'
      }, {
        name: 'Help',
        value: 'For any additional help you can join the [official help discord](https://discord.gg/eCTMza4ggA). You can also create an issue on GitHub!'
      })
      .setColor(serverOptions.color)
      .setFooter(`Contact ${owner.tag} for any questions or help with this bot. | Version: ${version}`)
      .toJSON()
    ]

    response.components = [{
      components: [{
        style: ButtonStyle.LINK,
        type: ComponentType.BUTTON,
        label: 'GitHub',
        url: 'https://github.com/addyire/tiktok-download',
        emoji: {
          id: '860239859972440064'
        }
      }],
      type: ComponentType.ACTION_ROW
    }]

    console.log(response)

    interaction.send(response)
  }
}
