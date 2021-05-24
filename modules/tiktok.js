const TikTokScraper = require('tiktok-scraper')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static')

ffmpeg.setFfmpegPath(ffmpegPath)

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const add = require('./counter')
const { compression, relativeDownloadPath } = require('../other/settings.json')
const log = require('./log')

const basePath = path.join(__dirname, '..', relativeDownloadPath)
const DISCORD_MAX_SIZE = compression.max_size
const AUDIO_BITRATE = compression.audio_bitrate

function downloadTikTok (videoURL, status) {
  const videoID = Math.random().toString(36).substr(7)
  let returnInfo

  return new Promise((resolve, reject) => {
    TikTokScraper.getVideoMeta(videoURL).then((videoMeta) => {
      log.info('Got TikTok metadata')

      const headers = videoMeta.headers
      returnInfo = videoMeta.collector[0]
      returnInfo.videoPath = path.join(basePath, `${videoID}.mp4`)

      return download(returnInfo.videoUrl, { headers }, returnInfo.videoPath)
    }).then(() => {
      const videoSize = fs.statSync(returnInfo.videoPath).size

      if (videoSize > DISCORD_MAX_SIZE) {
        updateStatus(status, 2)
        const start = new Date().getTime()

        log.info(`Video size is ${videoSize}. Compression required.`)

        const oldPath = returnInfo.videoPath
        const newVideoPath = path.join(basePath, `${videoID}c.mp4`) // TODO make downloads path a setting
        const videoLength = returnInfo.videoMeta.duration
        const wantedSize = DISCORD_MAX_SIZE * 0.8
        const videoBitRate = ((wantedSize / 128) / videoLength) - AUDIO_BITRATE

        ffmpeg(returnInfo.videoPath)
          .videoBitrate(videoBitRate)
          .audioBitrate(AUDIO_BITRATE)
          .save(newVideoPath)
          .on('error', e => {
            log.error(`Failed to compress the video.\n ${e}`)
            add('failed_compressions')
            reject(new Error('Failed to compress the video.'))
          })
          .on('end', () => {
            log.info(`Finished compressing the video. Time taken: ${new Date().getTime() - start}ms`)

            add('compressions')
            updateStatus(status, 3)

            returnInfo.purge = () => {
              log.info('Deleting videos')
              fs.unlinkSync(oldPath)
              fs.unlinkSync(newVideoPath)
            }
            returnInfo.videoPath = newVideoPath
            returnInfo.videoName = `${videoID}c.mp4`

            resolve(returnInfo)
          })
      } else {
        updateStatus(status, 1)
        returnInfo.videoName = `${videoID}.mp4`
        returnInfo.purge = () => {
          log.info('Deleting video')
          fs.unlinkSync(returnInfo.videoPath)
        }
        resolve(returnInfo)
      }
    }).catch(reject)
  })
}

// Status uodater
function updateStatus (status, state) {
  if (status === undefined || !status.statusMessage || !status.videoStatus) return

  switch (state) {
    case 0:
      status.videoStatus.fields = [
        { name: ':white_check_mark: Downloaded', value: 'Complete!', inline: true },
        { name: ':x: Compressed', value: 'Waiting...', inline: true }
      ]
      break
    case 1:
      status.videoStatus.fields = [
        { name: ':white_check_mark: Downloaded', value: 'Complete!', inline: true },
        { name: ':fast_forward: Compressed', value: 'Skipped!', inline: true }
      ]
      break
    case 2:
      status.videoStatus.fields = [
        { name: ':white_check_mark: Downloaded', value: 'Complete!', inline: true },
        { name: ':thought_balloon: Compressing', value: 'Thinking...', inline: true }
      ]
      break
    case 3:
      status.videoStatus.fields = [
        { name: ':white_check_mark: Downloaded', value: 'Complete!', inline: true },
        { name: ':white_check_mark: Compressed', value: 'Complete!', inline: true }
      ]
      break
  }

  if (status) {
    status.statusMessage.edit({ embed: status.videoStatus })
  }
}

// Not my code
function download (url, options, filePath) {
  const proto = !url.charAt(4).localeCompare('s') ? https : http

  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filePath)
    let fileInfo = null

    const request = proto.get(url, options, response => {
      if (response.statusCode !== 200) {
        reject(new Error(`Failed to get '${url}' (${response.statusCode})`))
        return
      }

      fileInfo = {
        mime: response.headers['content-type'],
        size: parseInt(response.headers['content-length'], 10)
      }

      response.pipe(file)
    })

    // The destination stream is ended by the time it's called
    file.on('finish', () => resolve(fileInfo))

    request.on('error', err => {
      fs.unlink(filePath, () => reject(err))
    })

    file.on('error', err => {
      fs.unlink(filePath, () => reject(err))
    })

    request.end()
  })
}

module.exports = {
  TikTokParser: downloadTikTok
}
