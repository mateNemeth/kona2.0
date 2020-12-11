import * as Knex from 'knex';
const config = require('../../knexfile');

export class Database {
  private static instance: Database;
  knex: Knex;

  private constructor() {
    this.knex = Knex({
      ...config,
      pool: {
        min: 0,
        max: 10,
        idleTimeoutMillis: 10000,
      },
      acquireConnectionTimeout: 2000,
    });
  }

  static getInstance() {
    if (!Database.instance) Database.instance = new Database();
    return Database.instance;
  }
}