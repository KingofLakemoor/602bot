module.exports = {
  apps: [{
    name: '602bot',
    script: 'index.js',
    watch: false, // Set to true if you want it to auto-restart on file changes during dev
    max_memory_restart: '200M', // Keeps the Pi memory footprint small
    env: {
      NODE_ENV: 'development'
    },
    env_production: {
      NODE_ENV: 'production',
    }
  }]
};