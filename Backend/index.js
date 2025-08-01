const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ProgressBar = require('progress');
const { getIO } = require("./Initialized Package/socket");

let info;

const downloadsDir = path.join(__dirname, 'downloads');

async function downloadYouTubeVideo(url,itag) {
  const io = getIO();
  const title = info.videoDetails.title
  .toLowerCase()
  .replace(/[\/\\?%*:|"<># ]+/g, '-')
  .replace(/^-+|-+$/g, '');
  const uniqueTitle = title + '-' + Date.now();
  const videoFile = path.resolve(__dirname, 'temp_video.mp4');
  const audioFile = path.resolve(__dirname, 'temp_audio.mp4');
  const outputFile = path.resolve(downloadsDir,`${uniqueTitle}.mp4`);

  console.log(`📺 Title: ${title}`);

  // Choose best MP4-compatible formats
  const videoFormat = ytdl.chooseFormat(info.formats, {
    quality: itag,
    filter: (format) =>
      format.container === 'mp4' &&
      format.codecs &&
      format.codecs.includes('avc1')
  });

  const audioFormat = ytdl.chooseFormat(info.formats, {
    quality: 'highestaudio',
    filter: (format) =>
      format.container === 'mp4' || format.mimeType.includes('audio/mp4')
  });

  if (!videoFormat || !audioFormat) {
    throw new Error('Suitable video/audio format not found');
  }

  const video = ytdl.downloadFromInfo(info, { format: videoFormat });
  const audio = ytdl.downloadFromInfo(info, { format: audioFormat });

  // Show progress bar for video download
  let downloadVideo = 0;
  video.on('response', (res) => {
    const totalSize = parseInt(res.headers['content-length'], 10);
    const bar = new ProgressBar('-> Downloading video [:bar] :percent :etas', {
      width: 40,
      complete: '=',
      incomplete: ' ',
      total: totalSize,
    });
    // Calculating Percentage and sending to Frontend(Run-time)
    res.on('data', (chunk) => {
      downloadVideo += chunk.length;
      let percent = Math.floor((downloadVideo / totalSize) * 40);
      io.emit('progress', {text:'Processing your video',percent});
      bar.tick(chunk.length)}
    );
  });

  // Download video
  console.log('📥 Downloading video...');
  await new Promise((resolve, reject) => {
    video.pipe(fs.createWriteStream(videoFile))
      .on('finish', () => {
        io.emit('progress', {text:'Video Downloaded Successfully',percent:40});
        resolve();
      })
      .on('error', reject);
  });

  // Download audio
  console.log('🔊 Downloading audio...');
  let downloadedAudio = 0;
  let totalAudioSize = 0;
  audio.on('response', (res) => {
    totalAudioSize = parseInt(res.headers['content-length'], 10);
    res.on('data', (chunk) => {
      downloadedAudio += chunk.length;
      let percent = 40 + Math.floor((downloadedAudio / totalAudioSize) * 40);
      io.emit('progress', {text:'Audio Started to Download',percent});
    });
  });

  await new Promise((resolve, reject) => {
    audio.pipe(fs.createWriteStream(audioFile))
      .on('finish', () => {
        io.emit('progress',{text:'Audio Downloaded Successfully',percent:80});
        resolve();
      })
      .on('error', reject);
  });

  io.emit('progress',{text:'Merging Started',percent:85});

  // Merge using FFmpeg
  console.log('🎬 Merging video and audio...');
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoFile)
      .input(audioFile)
      .outputOptions(['-c:v copy', '-c:a aac']) // Fast merge
      .on('end', () => {
        io.emit('progress',{text:'Video is ready to download',percent:100});
        resolve();
      })
      .on('error', reject)
      .save(outputFile);
  });

  console.log(`✅ Done: ${outputFile}`);

  // Clean up
  fs.unlinkSync(videoFile);
  fs.unlinkSync(audioFile);
  
  return { completed: true, videoURL: uniqueTitle, title: title };
}


async function getVideoInfo(url) {
  try {
    info = await ytdl.getInfo(url);
    const title = info.videoDetails.title;

    const filteredFormats = info.formats.filter(format =>
      format.container === 'mp4' &&
      format.hasVideo &&
      format.contentLength &&
      format.qualityLabel
    );

    const uniqueFormatsMap = {};

    for (const video of filteredFormats) {
      const key = video.qualityLabel;

      if (!uniqueFormatsMap[key]) {
        uniqueFormatsMap[key] = {
          itag: video.itag,
          qualityLabel: video.qualityLabel,
          fps: video.fps || null,
          bitrate: video.bitrate || null,
          contentLength: video.contentLength,
        };
      }
    }

    const uniqueFormats = Object.values(uniqueFormatsMap);

    return { title, formats: uniqueFormats };

  } catch (err) {
    throw new Error(`Failed to fetch video info: ${err.message}`);
  }
}


module.exports = { downloadYouTubeVideo, getVideoInfo };