module.exports = {
  apps: [
    {
      name: 'ovoky-app',
      script: 'server.js',
      cwd: '/var/www/vhosts/ovoky.io/httpdocs',
      instances: 1,
      exec_mode: 'cluster',
      env: {
        NODE_ENV: 'production',
        PORT: 3020,
      },
      env_production: {
        NODE_ENV: 'production',
        PORT: 3020,
      },
      error_file: './logs/err.log',
      out_file: './logs/out.log',
      log_file: './logs/combined.log',
      time: true,
      max_memory_restart: '1G',
      node_args: '--max-old-space-size=1024',
      restart_delay: 4000,
      max_restarts: 10,
      min_uptime: '10s',
      watch: false,
      ignore_watch: [
        'node_modules',
        '.next',
        'logs',
        '.git'
      ],
      merge_logs: true,
      autorestart: true,
      kill_timeout: 5000,
    }
  ]
}; 