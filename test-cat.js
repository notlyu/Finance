const http = require('http');

const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6NiwiaWF0IjoxNzc1ODQ1OTkyLCJleHAiOjE3NzY0NTA3OTJ9.dNloBD0oVPiYQcVEYEbuin1MLfWyuzCh3mJefRQBBIk';

(async () => {
  // Try different approach - check if old server might be cached
  const res = await fetch('http://localhost:5000/api/categories', {
    headers: { 'Authorization': 'Bearer ' + token }
  });
  const data = await res.json();
  console.log('Fetch result:', data.length);
  console.log('Categories:', data.map(c => c.name + ' f:' + c.family_id).join(', '));
})();