const { spawn } = require('child_process');

const backend = spawn('npm', ['run', 'dev'], { 
  cwd: process.cwd(), 
  shell: true,
  stdio: 'inherit'
});

setTimeout(() => {
  const frontend = spawn('npm', ['start'], { 
    cwd: process.cwd() + '/client', 
    shell: true,
    stdio: 'inherit'
  });
  
  frontend.on('close', () => process.exit());
}, 3000);

backend.on('close', () => process.exit());