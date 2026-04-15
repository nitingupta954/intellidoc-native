const axios = require('axios');
async function test() {
  const res = await axios.get('http://127.0.0.1:3000/api/auth/csrf');
  const csrfToken = res.data.csrfToken;
  const cookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
  
  try {
    const postRes = await axios.post('http://127.0.0.1:3000/api/auth/callback/credentials', 
      new URLSearchParams({
        csrfToken: csrfToken,
        email: 'test@example.com',
        password: 'password123',
        json: 'true'
      }).toString(),
      {
        headers: {
          'Cookie': cookie,
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        maxRedirects: 0,
        validateStatus: s => s < 500
      }
    );
    console.log('Status:', postRes.status);
    console.log('Headers:', postRes.headers);
  } catch (err) {
    console.log('Error:', err.message);
  }
}
test();
