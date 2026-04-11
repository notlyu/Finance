// Simple smoke test to verify core API availability after migration
// Uses Node's http module to perform basic authenticated requests
const http = require('http')

const BASE_HOST = 'localhost'
const BASE_PORT = 5000

function login() {
  const data = JSON.stringify({ email: 'test@example.com', password: '123456' })
  const options = {
    hostname: BASE_HOST,
    port: BASE_PORT,
    path: '/api/auth/login',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(data)
    }
  }
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', chunk => (body += chunk))
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(body)
            resolve(parsed.token ? parsed : Promise.reject(new Error('No token in login response')))
          } catch (e) {
            reject(e)
          }
        } else {
          reject(new Error(`Login failed: ${res.statusCode} ${body}`))
        }
      })
    })
    req.on('error', reject)
    req.write(data)
    req.end()
  })
}

function get(path, token) {
  const options = {
    hostname: BASE_HOST,
    port: BASE_PORT,
    path,
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    }
  }
  return new Promise((resolve, reject) => {
    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', chunk => (body += chunk))
      res.on('end', () => {
        resolve({ status: res.statusCode, body })
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function main() {
  try {
    const loginRes = await login()
    const token = loginRes
    const endpoints = ['/api/dashboard', '/api/safety-pillow', '/api/goals', '/api/transactions']
    const results = await Promise.all(endpoints.map(p => get(p, token)))
    console.log('Smoke test results:', results.map(r => ({ path: r, status: r.status })))
    process.exit(0)
  } catch (err) {
    console.error('Smoke test failed:', err.message)
    process.exit(1)
  }
}

main()
