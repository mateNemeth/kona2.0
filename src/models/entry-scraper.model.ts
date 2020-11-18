import { IVehicleEntry } from '../interfaces/IVehicleEntry';
import database from '../db/database';
import * as Knex from 'knex';

export abstract class EntryScraper {
  protected dbService: Knex;

  constructor() {
    this.initDbConnection();
  }

  async initDbConnection() {
    this.dbService = await database.create();
  }

  abstract platformUrl: string;
  abstract queryUrl: string;
  abstract baseSleepTime: number;

  abstract scrapeUrl(): Promise<string>;
  abstract processData(data: string): IVehicleEntry[];
  abstract saveData(data: IVehicleEntry[]): void;
  abstract runScraper(): void;
}
