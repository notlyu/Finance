const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwiaWF0IjoxNzc1ODQ1OTkyLCJleHAiOjE3NzY0NTA3OTJ9.dNloBD0oVPiYQcVEYEbuin1MLfWyuzCh3mJefRQBBIk';

const req = http.request({
  hostname: 'localhost',
  port: 5000,
  path: '/api/dashboard',
  method: 'GET',
  headers: { 'Authorization': 'Bearer ' + token }
}, res => {
  console.log('Status:', res.statusCode);
  console.log('Headers:', JSON.stringify(res.headers));
  let b = '';
  res.on('data', c => b += c);
  res.on('end', () => console.log(b.substring(0, 2000)));
});

req.on('error', e => console.log('E:', e.message));
req.end();