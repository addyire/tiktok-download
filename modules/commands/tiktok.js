const { SlashCommand, ButtonStyle, ComponentType } = require('slash-create')
const fs = require('fs')

const ServerOptions = require('../mongo')
const TikTokParser = require('../tiktok')
const { owner } = require('../../other/settings.json')
const log = require('../log')

module.exports = class TikTok extends SlashCommand {
  constructor (client, creator) {
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

  onError () {}

  async run (interaction) {
    await interaction.defer()

    const serverOptions = await ServerOptions.findOneAndUpdate({ serverID: interaction.guildID }, {}, { upsert: true, new: true, setDefaultsOnInsert: true, useFindAndModify: true })
    const serverDetails = serverOptions.details

    const args = interaction.data.data.options.reduce((a, b) => {
      a[b.name] = b.value
      return a
    }, {})

    TikTokParser(args.url, undefined, interaction.guildID).then(videoData => {
      const response = {
        file: {
          name: 'tiktok.mp4',
          file: fs.readFileSync(videoData.videoPath)
        }
      }

      if (serverDetails.enabled) {
        response.embeds = [{
          title: serverDetails.link === 'embed' || serverDetails.link === 'both' ? 'View On TikTok' : undefined,
          description: serverDetails.description ? videoData.text : undefined,
          timestamp: serverDetails.requester ? new Date().toISOString() : undefined,
          color: parseInt(serverOptions.color.substring(1), 16),
          url: serverDetails.link === 'embed' || serverDetails.link === 'both' ? args.url : undefined,
          author: serverDetails.author
            ? {
                name: `${videoData.authorMeta.nickName} (${videoData.authorMeta.name})`,
                icon_url: videoData.authorMeta.avatar
              }
            : undefined,
          footer: serverDetails.requester
            ? {
                text: `Requested by ${interaction.user.username}#${interaction.user.discriminator}`,
                icon_url: interaction.user.avatarURL
              }
            : undefined,
          fields: serverDetails.analytics
            ? [
                { name: ':arrow_forward: Plays', value: videoData.playCount, inline: true },
                { name: ':heart: Likes', value: videoData.diggCount, inline: true },
                { name: ':mailbox_with_mail: Shares', value: videoData.shareCount, inline: true }
              ]
            : undefined
        }]
        response.components = serverDetails.link === 'button' || serverDetails.link === 'both'
          ? [{
              components: [{
                style: ButtonStyle.LINK,
                type: ComponentType.BUTTON,
                label: 'View On TikTok',
                url: args.url,
                emoji: {
                  id: '859225749281308702'
                }
              }],
              type: ComponentType.ACTION_ROW
            }]
          : undefined
      }

      interaction.send(response).then(() => {
        videoData.purge()
      })
    }).catch(err => {
      log.warn('Encountered this error while downloading video with interaction')
      log.error(err)

      const e = {
        title: ':rotating_light: Error',
        description: "I couldn't download that video for some reason. Check to make sure the video link is valid.",
        color: parseInt('FF0000', 16),
        footer: {
          text: `Please contact ${owner.tag} if you believe this is an error`
        }
      }
      interaction.send({ embeds: [e] })
    })
  }
}
