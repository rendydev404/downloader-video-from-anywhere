const axios = require('axios');

async function searchNpm() {
  try {
     const res = await axios.get("https://registry.npmjs.org/-/v1/search?text=tiktok+instagram+youtube+downloader&size=10");
     console.log(res.data.objects.map(o => o.package.name + " - " + o.package.version));
  } catch(e) { console.log(e.message); }
}
searchNpm();
