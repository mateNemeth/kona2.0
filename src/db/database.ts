import * as Knex from 'knex';
import * as path from 'path';
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

export async function create() {
  const knex = Knex({
    client: 'pg',
    connection: {
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      host: process.env.DB_URL,
      port: +process.env.DB_PORT,
      database: process.env.DB_NAME,
    },
    pool: {
      min: 0,
      max: 10,
      idleTimeoutMillis: 10000,
    },
    acquireConnectionTimeout: 2000,
  });

  try {
    await knex.raw('SELECT now()');

    return knex;
  } catch (error) {
    console.log(error);
    throw new Error(
      'Unable to connect to Postgres via Knex. Ensure a valid connection.'
    );
  }
}

export default { create };
