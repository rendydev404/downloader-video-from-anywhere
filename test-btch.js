const btch = require('btch-downloader');

async function test() {
  try {
    const res = await btch.youtube('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log(res);
  } catch (e) {
    console.error("Error calling youtube:", e);
  }
}
test();
