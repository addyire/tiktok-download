const { SlashCommand } = require('slash-create')
const { MessageActionRow, MessageButton } = require('discord.js')

const { ServerOptions } = require('../mongo')
const botInviteURL = require('../invite')
const tiktokEmoji = require('../../other/settings.json').emojis.tiktok
const { settingsChange, tikTokMessage } = require('../messageGenerator')
const log = require('../log')

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
          type: 3,
          name: 'link',
          description: 'Show the link of the TikTok.',
          required: false,
          choices: [
            {
              name: 'disabled',
              value: 'disabled'
            },
            {
              name: 'embed',
              value: 'embed'
            },
            {
              name: 'button',
              value: 'button'
            },
            {
              name: 'both',
              value: 'both'
            }
          ]
        }
      ]
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
      throw new Error('You must have the ADMINISTRATOR permission to change settings.')
    }

    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: false })
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

    if (!serverOptions.details.analytics && !serverOptions.details.author && !serverOptions.details.description && !serverOptions.details.requester && serverOptions.details.link === 'disabled') {
      serverOptions.details.enabled = false
    }

    await serverOptions.validate()
    await serverOptions.save()

    log.info('Changed details', { serverID: interaction.guildID })

    // Create a tiktok message using dummy data
    const preview = tikTokMessage({
      videoURL: botInviteURL,
      text: 'The video description will go here!',
      authorMeta: {
        name: 'Author Username',
        nickName: 'Author Nick Name',
        avatar: 'https://static.thenounproject.com/png/82455-200.png'
      },
      playCount: '5M',
      diggCount: '600K',
      shareCount: '100'
    }, serverOptions, {
      name: `${interaction.user.username}#${interaction.user.discriminator}`,
      icon_url: interaction.user.avatarURL
    }, true)

    preview.embeds.splice(0, 0, settingsChange(args.enabled ? 'Here is a preview of what the details will look like next time I send a TikTok:' : 'Next time you request a TikTok, only the video will be sent.'))

    interaction.send(preview)
  }
}
