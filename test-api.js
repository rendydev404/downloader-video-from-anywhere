const axios = require('axios');

async function test() {
  try {
    const res = await axios.post('http://localhost:3000/api/download', {
      url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ'
    });
    console.log(res.data);
  } catch (e) {
    console.error(e.response ? e.response.data : e.message);
  }
}

test();
