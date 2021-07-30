const { MessageEmbed } = require('discord.js')
const { SlashCommand, ButtonStyle, ComponentType } = require('slash-create')

const { voteURL } = require('../../other/settings.json')
const ServerOptions = require('../mongo')

module.exports = class Settings extends SlashCommand {
  constructor (client, creator) {
    super(creator, {
      name: 'vote',
      description: 'Vote for this bot on top.gg',
      guildIDs: ['854985734976831498']
    })
    this.client = client
  }

  onError () {}

  async run (interaction) {
    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: false }).exec()

    const res = {}

    res.embeds = [new MessageEmbed()
      .setTitle('Thanks For Voting!')
      .setColor(serverOptions.color)
      .setDescription('I cannot thank you enough for supporting my bot!')
      .toJSON()
    ]

    res.components = [{
      components: [{
        style: ButtonStyle.LINK,
        type: ComponentType.BUTTON,
        label: 'Vote',
        emoji: {
          name: '🗳️'
        },
        url: voteURL
      }],
      type: ComponentType.ACTION_ROW
    }]

    interaction.send(res)
  }
}
