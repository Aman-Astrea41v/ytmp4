const fs = require('fs');
const path = require('path');
const ytdl = require('ytdl-core');
const ffmpeg = require('fluent-ffmpeg');
const ProgressBar = require('progress');
const { getIO } = require("./Initialized Package/socket");
const { HttpsProxyAgent } = require('https-proxy-agent');
const https = require('https');

const downloadsDir = path.join(__dirname, 'downloads');

// 🔌 Fetch a random proxy and return an agent
const getProxyAgent = async () => {
  return new Promise((resolve) => {
    https.get(process.env.PROXY_API, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          let proxies = [];

          // Try to parse JSON response
          try {
            const parsed = JSON.parse(data);

            if (Array.isArray(parsed)) {
              // Case: ["ip:port", "ip:port"]
              proxies = parsed;
            } else if (Array.isArray(parsed.proxies)) {
              // Case: { proxies: [ { ip: "...", port: "..." } ] }
              proxies = parsed.proxies.map(p => `${p.ip}:${p.port}`);
            }
          } catch {
            // Not JSON? Try to parse plain text: ip:port\nip:port
            proxies = data.split('\n').map(p => p.trim()).filter(Boolean);
          }

          if (!proxies.length) {
            console.warn('⚠️ No valid proxies found.');
            return resolve(null);
          }

          const randomProxy = proxies[Math.floor(Math.random() * proxies.length)];
          console.log('🔀 Using proxy:', randomProxy);

          resolve(new HttpsProxyAgent(`http://${randomProxy}`)); // Change to https:// if needed
        } catch (err) {
          console.error("❌ Error parsing proxy list:", err);
          resolve(null); // fallback to no proxy
        }
      });
    }).on('error', (err) => {
      console.error("❌ Proxy fetch error:", err);
      resolve(null); // fallback to no proxy
    });
  });
};


let info;

async function downloadYouTubeVideo(url, itag) {
  const agent = await getProxyAgent(); // Fetch proxy agent first
  const io = getIO();

  const title = info.videoDetails.title
    .toLowerCase()
    .replace(/[\/\\?%*:|"<># ]+/g, '-')
    .replace(/^-+|-+$/g, '');

  const uniqueTitle = title + '-' + Date.now();
  const videoFile = path.resolve(__dirname, 'temp_video.mp4');
  const audioFile = path.resolve(__dirname, 'temp_audio.mp4');
  const outputFile = path.resolve(downloadsDir, `${uniqueTitle}.mp4`);

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

  const videoOptions = {
    format: videoFormat,
    ...(agent ? { requestOptions: { client: agent } } : {})
  };

  const video = ytdl.downloadFromInfo(info, videoOptions);


  const audioOptions = {
    format: audioFormat,
    ...(agent ? { requestOptions: { client: agent } } : {})
  };

  const audio = ytdl.downloadFromInfo(info,audioOptions);

  // Video download progress
  let downloadVideo = 0;
  video.on('response', (res) => {
    const totalSize = parseInt(res.headers['content-length'], 10);
    const bar = new ProgressBar('-> Downloading video [:bar] :percent :etas', {
      width: 40,
      complete: '=',
      incomplete: ' ',
      total: totalSize,
    });
    res.on('data', (chunk) => {
      downloadVideo += chunk.length;
      let percent = Math.floor((downloadVideo / totalSize) * 40);
      io.emit('progress', { text: 'Processing your video', percent });
      bar.tick(chunk.length);
    });
  });

  // Download video
  console.log('📥 Downloading video...');
  await new Promise((resolve, reject) => {
    video.pipe(fs.createWriteStream(videoFile))
      .on('finish', () => {
        io.emit('progress', { text: 'Video Downloaded Successfully', percent: 40 });
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
      io.emit('progress', { text: 'Audio Started to Download', percent });
    });
  });

  await new Promise((resolve, reject) => {
    audio.pipe(fs.createWriteStream(audioFile))
      .on('finish', () => {
        io.emit('progress', { text: 'Audio Downloaded Successfully', percent: 80 });
        resolve();
      })
      .on('error', reject);
  });

  io.emit('progress', { text: 'Merging Started', percent: 85 });

  // Merge using FFmpeg
  console.log('🎬 Merging video and audio...');
  await new Promise((resolve, reject) => {
    ffmpeg()
      .input(videoFile)
      .input(audioFile)
      .outputOptions(['-c:v copy', '-c:a aac'])
      .on('end', () => {
        io.emit('progress', { text: 'Video is ready to download', percent: 100 });
        resolve();
      })
      .on('error', reject)
      .save(outputFile);
  });

  console.log(`✅ Done: ${outputFile}`);

  // Clean up
  fs.unlinkSync(videoFile);
  fs.unlinkSync(audioFile);

  return { completed: true, videoURL: uniqueTitle, title };
}

async function getVideoInfo(url) {
  try {
    const agent = await getProxyAgent();

    info = await ytdl.getInfo(url,
      agent ? { requestOptions: { client: agent } } : {}
    );

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
    console.log(err);
    throw new Error(`Failed to fetch video info: ${err.message}`);
  }
}

module.exports = { downloadYouTubeVideo, getVideoInfo };