module.exports = {
  apps: [{
    name: 'electisspace',
    script: './server/dist/server.js',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production',
      PORT: 4000,
      DATABASE_URL: 'postgresql://electis:CI8%2FJQgBuJrUV%2FB45bsUE9qpALOnWrxI@localhost:5432/electisspace_prod',
      REDIS_URL: 'redis://localhost:6379'
    },
    instances: 1,
    exec_mode: 'fork',
    max_memory_restart: '1G',
    error_file: './logs/error.log',
    out_file: './logs/out.log',
    log_file: './logs/combined.log',
    time: true
  }]
};
