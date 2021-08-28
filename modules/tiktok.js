const TikTokScraper = require('tiktok-scraper')
const ffmpeg = require('fluent-ffmpeg')

ffmpeg.setFfmpegPath(require('ffmpeg-static'))

const STATUS = {
  SKIPPED: [
    { name: ':white_check_mark: Downloaded', value: 'Complete!', inline: true },
    { name: ':fast_forward: Compressed', value: 'Skipped!', inline: true }
  ],
  COMPRESSING: [
    { name: ':white_check_mark: Downloaded', value: 'Complete!', inline: true },
    { name: ':thought_balloon: Compressing', value: 'Thinking...', inline: true }
  ],
  COMPLETE: [
    { name: ':white_check_mark: Downloaded', value: 'Complete!', inline: true },
    { name: ':white_check_mark: Compressed', value: 'Complete!', inline: true }
  ],
  NOT_PERMITTED: [
    { name: ':white_check_mark: Downloaded', value: 'Complete!', inline: true },
    { name: ':white_check_mark: Compressed', value: ':x: Not Permitted :x:', inline: true }
  ]
}

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const { compression, relativeDownloadPath, tiktok } = require('../other/settings.json')
const { proxies, sessions } = tiktok
const log = require('./log')

// Set constants
const basePath = path.join(__dirname, '..', relativeDownloadPath)
const DISCORD_MAX_SIZE = compression.max_size
const AUDIO_BITRATE = compression.audio_bitrate
const SETTINGS = {
  proxy: !Array.isArray(proxies) || proxies.length === 0 ? '' : proxies,
  sessionList: !Array.isArray(sessions) || sessions.length === 0 ? [''] : sessions
}

function processTikTok (videoURL, guildID, statusChange, downloadDoc) {
  // Create random videoID
  const videoID = Math.random().toString(36).substr(7)
  let returnInfo = { videoURL }

  // Return a promise
  return new Promise((resolve, reject) => {
    // Get video metaData then...
    TikTokScraper.getVideoMeta(videoURL, SETTINGS).then((videoMeta) => {
      // Store the headers for downloading the video
      const headers = videoMeta.headers

      // Store data about the video
      returnInfo = { ...returnInfo, ...videoMeta.collector[0] }
      returnInfo.videoPath = path.join(basePath, `${videoID}.mp4`)

      // Shorten the numbers
      returnInfo.playCount = shortNum(returnInfo.playCount)
      returnInfo.diggCount = shortNum(returnInfo.diggCount)
      returnInfo.shareCount = shortNum(returnInfo.shareCount)
      returnInfo.commentCount = shortNum(returnInfo.commentCount)

      return download(returnInfo.videoUrl, { headers }, returnInfo.videoPath)
    }).then(() => {
      const videoSize = fs.statSync(returnInfo.videoPath).size

      // Update the video document
      downloadDoc.video.size = videoSize
      downloadDoc.video.compressed = videoSize > DISCORD_MAX_SIZE

      // If the video is too big to upload to discord
      if (videoSize > DISCORD_MAX_SIZE) {
        // If the servers does not have compression enabled...
        if (!hasCompression(guildID)) {
          // Update status message
          statusChange(STATUS.NOT_PERMITTED)
          // Throw an error
          reject(new Error('Video file too large and compression is not enabled on this server.'))
        }

        // Update the status message
        statusChange(STATUS.COMPRESSING)

        // Calculate stuff for the video
        const oldPath = returnInfo.videoPath
        const newVideoPath = path.join(basePath, `${videoID}c.mp4`)
        const videoLength = returnInfo.videoMeta.duration
        const wantedSize = DISCORD_MAX_SIZE * 0.8 // Sometimes the compression is more than expected so this is done to mitigate that.
        const videoBitRate = ((wantedSize / 128) / videoLength) - AUDIO_BITRATE // Calculate the bitrate

        // Open video in ffmpeg
        ffmpeg(returnInfo.videoPath)
          .videoBitrate(videoBitRate) // Set the bitrate to the calculated bitrate
          .audioBitrate(AUDIO_BITRATE) // Set the audio bitrate. (this probably isn't made)
          .save(newVideoPath) // Save to the compressed video path
          .on('error', e => { // If an error occurs...
            log.error(`❌ - FAILED TO COMPRESS VIDEO\n${e}`, { serverID: guildID })
            reject(new Error('Failed to compress the video.')) // Throw a error which will be handled later
          })
          .on('end', () => { // Once compression is complete
            // Update the status message
            statusChange(STATUS.COMPLETE)

            // Define the videos purge function
            returnInfo.purge = () => {
              fs.unlinkSync(oldPath)
              fs.unlinkSync(newVideoPath)
            }
            returnInfo.videoPath = newVideoPath
            returnInfo.videoName = `${videoID}c.mp4`

            // Store the post compression size
            downloadDoc.video.postCompressSize = fs.statSync(newVideoPath).size

            // Return all the data once everything is complete
            resolve(returnInfo)
          })
      } else { // Otherwise...
        // Update the status message to say compression isn't required
        statusChange(STATUS.SKIPPED)

        // Set variables in the returnInfo
        returnInfo.videoName = `${videoID}.mp4`
        returnInfo.purge = () => {
          fs.unlinkSync(returnInfo.videoPath)
        }

        // Resolve the promise with the information
        resolve(returnInfo)
      }
    }).catch(err => {
      // Reject with the error that was encountered
      reject(err)
    })
  })
}

// Some download function I found on stack overflow that lets me use request headers
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

// Function to check if a server has compression or not
function hasCompression (guildID) {
  // If restrict is not enabled then return true
  if (!compression.restrict) return true
  // If serverID is in list of allowed servers, return true
  if (compression.servers.indexOf(guildID) !== -1) return true
  // Otherwise return false
  return false
}

// Function to shorten numbers
function shortNum (num) {
  if (num >= 1000000) {
    return num / 1000000 + 'M'
  } else if (num >= 1000) {
    return num / 1000 + 'K'
  } else return num
}

module.exports = processTikTok
