import { IVehicleEntry } from '../interfaces/IVehicleEntry';
import database from '../db/database';
import * as Knex from 'knex';
import Axios from 'axios';

export abstract class EntryScraper {
  protected dbService: Knex;
  abstract platformUrl: string;
  abstract queryUrl: string;
  abstract sleepTime: number;

  abstract runScraper(): void;
  abstract processData(data: string): IVehicleEntry[];
  abstract saveData(data: IVehicleEntry[]): void;

  constructor() {
    this.initDbConnection();
  }

  protected async scrapeUrl() {
    const response = await Axios.get<string>(
      `${this.platformUrl}${this.queryUrl}`
    );
    return response.data;
  }

  protected async initDbConnection() {
    this.dbService = await database.create();
  }

  protected speedUp() {
    if (this.sleepTime >= 0.5) {
      this.sleepTime -= 0.1;
    }
  }

  protected slowDown() {
    if (this.sleepTime < 25) {
      this.sleepTime += 0.1;
    }
  }
}
