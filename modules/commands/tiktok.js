const { SlashCommand } = require('slash-create')
const fs = require('fs')

const ServerOptions = require('../mongo')
const { TikTokParser } = require('../tiktok')
const add = require('../counter')

module.exports = class Progress extends SlashCommand {
  constructor (creator) {
    super(creator, {
      name: 'tiktok',
      description: 'Downloads a TikTok',
      options: [
        {
          type: 3,
          name: 'url',
          description: 'The URL of the TikTok',
          required: true
        }
      ]
    })
  }

  async run (interaction) {
    add('interactions')

    await interaction.defer()

    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true })
    const serverDetails = serverOptions.details

    const args = interaction.data.data.options.reduce((a, b) => {
      a[b.name] = b.value
      return a
    }, {})

    const videoData = await TikTokParser(args.url)
    const response = {
      file: {
        name: 'tiktok.mp4',
        file: fs.readFileSync(videoData.videoPath)
      }
    }

    if (serverDetails.enabled) {
      response.embeds = [{
        title: serverDetails.link ? 'View On TikTok' : undefined,
        description: serverDetails.description ? videoData.text : undefined,
        timestamp: serverDetails.requester ? new Date().toISOString() : undefined,
        color: parseInt(serverOptions.color.substring(1), 16),
        url: serverDetails.link ? args.url : undefined,
        author: serverDetails.author
          ? {
              name: `${videoData.authorMeta.nickName} (${videoData.authorMeta.name})`,
              icon_url: videoData.authorMeta.avatar
            }
          : undefined,
        // thumbnail: {
        //     url: thumbnail
        // },
        footer: serverDetails.requester
          ? {
              text: `Requested by ${interaction.user.username}#${interaction.user.discriminator}`,
              icon_url: interaction.user.avatarURL
            }
          : undefined,
        fields: serverDetails.analytics
          ? [
              { name: ':arrow_forward: Plays', value: videoData.playCount, inline: true },
              { name: ':speech_left: Comments', value: videoData.commentCount, inline: true },
              { name: ':mailbox_with_mail: Shares', value: videoData.shareCount, inline: true }
            ]
          : undefined
      }]
    }

    videoData.purge()

    return response
  }
}
