const btch = require('btch-downloader');

async function test() {
  console.log('--- IG btch ---');
  try {
    const ig1 = await btch.igdl('https://www.instagram.com/reel/DZhiR1ITGHU/');
    console.log(JSON.stringify(ig1, null, 2).substring(0, 500));
  } catch(e) { console.error('IG btch error', e.message); }

  console.log('--- YT btch ---');
  try {
    const yt1 = await btch.youtube('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    console.log(JSON.stringify(yt1, null, 2).substring(0, 500));
  } catch(e) { console.error('YT btch error', e.message); }

  console.log('--- TT btch ---');
  try {
    const tt = await btch.ttdl('https://www.tiktok.com/@tiktok/video/7106594312292453675');
    console.log(JSON.stringify(tt, null, 2).substring(0, 500));
  } catch(e) { console.error('TT btch error', e.message); }
}

test();
