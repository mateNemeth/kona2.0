require('dotenv').config();

const connection = {
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_DB,
};

const knexConfig = {
  client: 'pg',
  connection,
  pool: {
    min: 2,
    max: 10,
  },
  migrations: {
    tableName: 'migrations',
    directory: './src/database/migrations',
  },
  seeds: {
    directory: './src/database/seeds',
  },
};

module.exports = knexConfig;