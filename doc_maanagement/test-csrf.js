const axios = require('axios');
async function test() {
  const res = await axios.get('http://127.0.0.1:3000/api/auth/csrf');
  console.log('CSRF Token:', res.data);
  console.log('Headers:', res.headers);
}
test();
