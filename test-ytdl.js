const ytdl = require('@distube/ytdl-core');

async function test() {
  try {
    const info = await ytdl.getInfo('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    const format = ytdl.chooseFormat(info.formats, { quality: 'highest' });
    console.log({
        title: info.videoDetails.title,
        url: format.url
    });
  } catch (e) {
    console.error("Error calling ytdl-core:", e);
  }
}
test();
