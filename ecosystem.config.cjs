/**
 * PM2 keeps the Node process running after SSH disconnects
 * (like a shop manager who stays after the delivery driver leaves).
 */
module.exports = {
  apps: [
    {
      name: 'stockagence',
      script: 'scripts/local-api.mjs',
      interpreter: 'node',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
    },
  ],
};
