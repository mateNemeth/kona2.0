import { IVehicleEntry } from '../interfaces/IVehicleEntry';
import database from '../db/database';
import * as Knex from 'knex';
import Axios from 'axios';
import { Utils } from '../utils/utils';

export abstract class EntryScraper {
  protected dbService: Knex;
  abstract platformUrl: string;
  abstract queryUrl: string;
  abstract sleepTime: number;

  abstract processData(data: string): IVehicleEntry[];

  constructor() {
    this.initDbConnection();
  }

  protected async runScraper() {
    try {
      const data = await this.scrapeUrl();
      const processed = this.processData(data);
      await this.saveData(processed);
      await Utils.sleep(this.sleepTime * 60 * 1000);
      this.runScraper();
    } catch (err) {
      console.error(err);
    }
  }

  protected async scrapeUrl() {
    const response = await Axios.get<string>(
      `${this.platformUrl}${this.queryUrl}`
    );
    return response.data;
  }

  protected async saveData(data: IVehicleEntry[]) {
    data.forEach(async (item) => {
      const rows = await this.dbService('carlist').where(
        'platform_id',
        item.platformId
      );
      if (rows.length === 0) {
        this.speedUp();
        return this.dbService('carlist').insert({
          platform: item.platform,
          platform_id: item.platformId,
          link: item.link,
          crawled: false,
        });
      } else {
        this.slowDown();
      }
    });
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
