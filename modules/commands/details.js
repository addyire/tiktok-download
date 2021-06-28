const Discord = require('discord.js')
const { SlashCommand } = require('slash-create')

const ServerOptions = require('../mongo')
const add = require('../counter')
const inviteURL = require('../invite')

module.exports = class Details extends SlashCommand {
  constructor (client, creator) {
    super(creator, {
      name: 'details',
      description: 'Change what video details to show after sending a TikTok.',
      options: [
        {
          type: 5,
          name: 'enabled',
          description: 'Whether this is enabled or not.',
          required: true
        },
        {
          type: 5,
          name: 'description',
          description: 'Show the description of the video. (Default: True)',
          required: false
        },
        {
          type: 5,
          name: 'author',
          description: 'Show the author of the TikTok.',
          required: false
        },
        {
          type: 5,
          name: 'requester',
          description: 'Show who requested the video and when.',
          required: false
        },
        {
          type: 5,
          name: 'analytics',
          description: 'Show things like video plays, comments, and shares.',
          required: false
        },
        {
          type: 5,
          name: 'link',
          description: 'Show the link of the TikTok.',
          required: false
        }
      ]
    })
    this.client = client
  }

  onError () {}

  async run (interaction) {
    let hasPerms

    try {
      hasPerms = (await this.client.guilds.cache.get(interaction.guildID).members.fetch(interaction.user.id)).hasPermission('ADMINISTRATOR')
    } catch (err) {
      throw new Error(`I am not in this server as a bot. Please have an administrator click [this](${inviteURL}) link to invite me.`)
    }

    if (!hasPerms) {
      throw new Error('You must have the ADMINISTRATOR permission to change settings.')
    }

    add('interactions')

    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true })
    const args = interaction.data.data.options.reduce((a, b) => {
      a[b.name] = b.value
      return a
    }, {})

    serverOptions.details.enabled = args.enabled
    serverOptions.details.analytics = args.analytics === undefined ? serverOptions.details.analytics : args.analytics
    serverOptions.details.author = args.author === undefined ? serverOptions.details.author : args.author
    serverOptions.details.description = args.description === undefined ? serverOptions.details.description : args.description
    serverOptions.details.requester = args.requester === undefined ? serverOptions.details.requester : args.requester
    serverOptions.details.link = args.link === undefined ? serverOptions.details.link : args.link

    if (!serverOptions.details.analytics && !serverOptions.details.author && !serverOptions.details.description && !serverOptions.details.requester && !serverOptions.details.link) {
      serverOptions.details.enabled = false
    }

    await serverOptions.validate()
    await serverOptions.save()

    const detailSettings = serverOptions.details
    const embeds = [new Discord.MessageEmbed().setTitle(':gear: Options Successfully Changed').setColor(serverOptions.color).toJSON()]

    // TODO convert to discord embed thing
    if (detailSettings.enabled) {
      embeds.push({
        title: detailSettings.link ? 'View On TikTok (Example Message)' : undefined,
        description: detailSettings.description ? 'The description would go here!' : undefined,
        timestamp: new Date().toISOString(),
        color: parseInt(serverOptions.color.substring(1), 16),
        author: detailSettings.author
          ? {
              name: 'Author Nick Name (Author Username)',
              icon_url: 'https://static.thenounproject.com/png/82455-200.png'
            }
          : undefined,
        footer: detailSettings.requester
          ? {
              text: `Requested by ${interaction.user.username}#${interaction.user.discriminator}`,
              icon_url: interaction.user.avatarURL
            }
          : undefined,
        fields: detailSettings.analytics
          ? [
              { name: ':arrow_forward: Plays', value: '1234', inline: true },
              { name: ':speech_left: Comments', value: '1234', inline: true },
              { name: ':mailbox_with_mail: Shares', value: '1234', inline: true }
            ]
          : undefined
      })
    }

    interaction.send({ embeds })
  }
}
