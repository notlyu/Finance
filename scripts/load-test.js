const http = require('http');

function loadTest(url, duration = 10000, concurrency = 10) {
  const results = { requests: 0, errors: 0, latency: [] };
  const startTime = Date.now();
  
  function makeRequest() {
    const reqStart = Date.now();
    http.get(url, (res) => {
      const latency = Date.now() - reqStart;
      results.requests++;
      results.latency.push(latency);
      
      if (res.statusCode >= 400) {
        results.errors++;
      }
      
      if (Date.now() - startTime < duration) {
        setTimeout(makeRequest, 0);
      } else {
        finish();
      }
    }).on('error', () => {
      results.errors++;
      if (Date.now() - startTime < duration) {
        setTimeout(makeRequest, 0);
      } else {
        finish();
      }
    });
  }
  
  function finish() {
    const totalTime = (Date.now() - startTime) / 1000;
    const avgLatency = results.latency.reduce((a, b) => a + b, 0) / results.latency.length;
    const p95 = results.latency.sort((a, b) => a - b)[Math.floor(results.latency.length * 0.95)] || 0;
    
    console.log('\n=== Load Test Results ===');
    console.log(`URL: ${url}`);
    console.log(`Duration: ${totalTime}s`);
    console.log(`Requests: ${results.requests}`);
    console.log(`Errors: ${results.errors}`);
    console.log(`RPS: ${(results.requests / totalTime).toFixed(2)}`);
    console.log(`Avg Latency: ${avgLatency.toFixed(2)}ms`);
    console.log(`P95 Latency: ${p95}ms`);
  }
  
  console.log(`Starting load test: ${concurrency} concurrent requests for ${duration/1000}s`);
  for (let i = 0; i < concurrency; i++) {
    makeRequest();
  }
}

const url = process.argv[2] || 'http://localhost:5000/health';
const duration = parseInt(process.argv[3]) || 10000;
const concurrency = parseInt(process.argv[4]) || 10;

loadTest(url, duration, concurrency);