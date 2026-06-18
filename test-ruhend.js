const { ytdown } = require('ruhend-scraper');

async function test() {
  try {
    const res = await ytdown('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log(res);
  } catch (e) {
    console.error("Error calling ytdown:", e);
  }
}
test();
