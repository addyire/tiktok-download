const { MessageEmbed, MessageActionRow, MessageButton } = require('discord.js')
const { SlashCommand, ButtonStyle, ComponentType } = require('slash-create')

const { ServerOptions } = require('../mongo')
const { version } = require('../../package.json')
const { owner, emojis, helplink, voteURL } = require('../../other/settings.json')
const { tiktok, github, discord } = emojis
const botInviteURL = require('../invite')
const log = require('../log')

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

    response.embeds = [new MessageEmbed()
      .setTitle('TokTik Downloader')
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
        value: `For any additional help you can join the [official help discord]${helplink ? '(' + helplink + ')' : 'not linked'}. You can also create an issue on GitHub!`
      })
      .setColor(serverOptions.color)
      .setFooter(`Contact ${owner.tag} for any questions or help with this bot. | Version: ${version}`)
      .toJSON()
    ]

    const buttons = [
      new MessageButton({
        style: 'LINK',
        label: 'GitHub',
        url: 'https://github.com/addyire/tiktok-download',
        emoji: github
      }),
      new MessageButton({
        style: 'LINK',
        label: 'Invite',
        url: botInviteURL,
        emoji: tiktok
      })
    ]

    helplink && buttons.push(new MessageButton({
      style: 'LINK',
      label: 'Help',
      url: helplink,
      emoji: discord
    }))

    voteURL && buttons.push(new MessageButton({
      style: 'LINK',
      label: 'Vote',
      emoji: '🗳️',
      url: voteURL
    }))
    response.components = [
      new MessageActionRow()
        .addComponents(buttons)
        .toJSON()
    ]
    
    interaction.send(response)

    log.info('Sent help information', { serverID: interaction.guildID })
  }
}
