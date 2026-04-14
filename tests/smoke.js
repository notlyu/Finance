// Simple smoke test to verify core API availability
const http = require('http')

const BASE_HOST = 'localhost'
const BASE_PORT = 5000

let token = null

function login() {
  return new Promise((resolve, reject) => {
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
    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', chunk => (body += chunk))
      res.on('end', () => {
        if (res.statusCode === 200) {
          try {
            const parsed = JSON.parse(body)
            resolve(parsed.token)
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

function get(path) {
  return new Promise((resolve, reject) => {
    if (!token) return reject(new Error('No token'))
    const options = {
      hostname: BASE_HOST,
      port: BASE_PORT,
      path,
      method: 'GET',
      headers: {
        'Authorization': 'Bearer ' + token,
      }
    }
    const req = http.request(options, (res) => {
      let body = ''
      res.on('data', chunk => (body += chunk))
      res.on('end', () => {
        resolve({ path, status: res.statusCode })
      })
    })
    req.on('error', reject)
    req.end()
  })
}

async function main() {
  try {
    console.log('1. Logging in...')
    token = await login()
    console.log('Got token:', token ? token.substring(0, 20) + '...' : 'FAILED')
    
    console.log('2. Testing endpoints...')
    const endpoints = ['/api/dashboard', '/api/safety-pillow/settings', '/api/goals', '/api/transactions']
    const results = []
    for (const p of endpoints) {
      const r = await get(p)
      results.push(r)
      console.log(`  ${p}: ${r.status}`)
    }
    
    const allOk = results.every(r => r.status === 200)
    console.log('All tests passed:', allOk)
    process.exit(allOk ? 0 : 1)
  } catch (err) {
    console.error('Smoke test failed:', err.message)
    process.exit(1)
  }
}

main()