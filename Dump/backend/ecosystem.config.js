module.exports = {
    apps: [{
        name: "sdp-backend",
        script: "npm",
        args: "start",
        env_production: {
            NODE_ENV: "production",
            PORT: 5000
        },
        instances: "max",
        exec_mode: "cluster",
        autorestart: true,
        watch: false,
        max_memory_restart: '1G',
        log_file: './logs/combined.log',
        out_file: './logs/out.log',
        error_file: './logs/error.log',
        time: true
    }]
}
