const TikTokScraper = require('tiktok-scraper')
const ffmpeg = require('fluent-ffmpeg')
const ffmpegPath = require('ffmpeg-static')

ffmpeg.setFfmpegPath(ffmpegPath)

const STATUS = {
  DOWNLOADED: 0,
  SKIPPED: 1,
  COMPRESSING: 2,
  COMPLETE: 3,
  NOT_PERMITTED: 4
}

const https = require('https')
const http = require('http')
const fs = require('fs')
const path = require('path')

const { compression, relativeDownloadPath, proxies } = require('../other/settings.json')
const log = require('./log')

// Set constants
const basePath = path.join(__dirname, '..', relativeDownloadPath)
const DISCORD_MAX_SIZE = compression.max_size
const AUDIO_BITRATE = compression.audio_bitrate
const SETTINGS = {
  proxy: proxies === undefined || proxies.length === 0 ? '' : proxies
}

console.log(SETTINGS)

module.exports = (videoURL, status, guildID) => {
  // Create random videoID
  const videoID = Math.random().toString(36).substr(7)
  let returnInfo

  // Return a promise
  return new Promise((resolve, reject) => {
    // Get video metaData then...
    TikTokScraper.getVideoMeta(videoURL, SETTINGS).then((videoMeta) => {
      // Log status
      log.info('Got TikTok metadata')

      // Store the headers for downloading the video
      const headers = videoMeta.headers

      // Store data about the video
      returnInfo = videoMeta.collector[0]
      returnInfo.videoPath = path.join(basePath, `${videoID}.mp4`)

      // Shorten the numbers
      returnInfo.playCount = shortNum(returnInfo.playCount)
      returnInfo.diggCount = shortNum(returnInfo.diggCount)
      returnInfo.shareCount = shortNum(returnInfo.shareCount)
      returnInfo.commentCount = shortNum(returnInfo.commentCount)

      log.info('Downloading...')
      return download(returnInfo.videoUrl, { headers }, returnInfo.videoPath)
    }).then(() => {
      log.info('Download Complete')

      const videoSize = fs.statSync(returnInfo.videoPath).size

      // If the video is too big to upload to discord
      if (videoSize > DISCORD_MAX_SIZE) {
        // If the servers does not have compression enabled...
        if (!hasCompression(guildID)) {
          log.info('Compression failed because server is not permitted.')
          // Update status message
          updateStatus(status, STATUS.NOT_PERMITTED)
          // Throw an error
          reject(new Error('Video file too large and compression is not enabled on this server.'))
        }

        // Update the status message
        updateStatus(status, STATUS.COMPRESSING)
        // Store the start time
        const start = new Date().getTime()

        log.info(`Video size is ${videoSize}. Compression required.`)

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
            log.error(`Failed to compress the video.\n ${e}`)
            reject(new Error('Failed to compress the video.')) // Throw a error which will be handled later
          })
          .on('end', () => { // Once compression is complete
            log.info(`Finished compressing the video. Time taken: ${new Date().getTime() - start}ms`)

            // Update the status message
            updateStatus(status, STATUS.COMPLETE)

            // Define the videos purge function
            returnInfo.purge = () => {
              log.info('Deleting videos')
              fs.unlinkSync(oldPath)
              fs.unlinkSync(newVideoPath)
            }
            returnInfo.videoPath = newVideoPath
            returnInfo.videoName = `${videoID}c.mp4`

            // Return all the data once everything is complete
            resolve(returnInfo)
          })
      } else { // Otherwise...
        // Update the status message to say compression isn't required
        updateStatus(status, STATUS.SKIPPED)

        // Set variables in the returnInfo
        returnInfo.videoName = `${videoID}.mp4`
        returnInfo.purge = () => {
          log.info('Deleting video')
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

// Status updater function
function updateStatus (status, state) {
  // If there is no status message then don't do anything
  if (status === undefined || !status.statusMessage || !status.videoStatus) return

  // Update the status message accordingly
  switch (state) {
    case STATUS.DOWNLOADED:
      status.videoStatus.fields = [
        { name: ':white_check_mark: Downloaded', value: 'Complete!', inline: true },
        { name: ':x: Compressed', value: 'Waiting...', inline: true }
      ]
      break
    case STATUS.SKIPPED:
      status.videoStatus.fields = [
        { name: ':white_check_mark: Downloaded', value: 'Complete!', inline: true },
        { name: ':fast_forward: Compressed', value: 'Skipped!', inline: true }
      ]
      break
    case STATUS.COMPRESSING:
      status.videoStatus.fields = [
        { name: ':white_check_mark: Downloaded', value: 'Complete!', inline: true },
        { name: ':thought_balloon: Compressing', value: 'Thinking...', inline: true }
      ]
      break
    case STATUS.COMPLETE:
      status.videoStatus.fields = [
        { name: ':white_check_mark: Downloaded', value: 'Complete!', inline: true },
        { name: ':white_check_mark: Compressed', value: 'Complete!', inline: true }
      ]
      break
    case STATUS.NOT_PERMITTED:
      status.videoStatus.fields = [
        { name: ':white_check_mark: Downloaded', value: 'Complete!', inline: true },
        { name: ':white_check_mark: Compressed', value: ':x: Not Permitted :x:', inline: true }
      ]
  }

  // TODO check if this if is not needed
  if (status) {
    // Edit the message
    status.statusMessage.edit({ embed: status.videoStatus })
  }
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
