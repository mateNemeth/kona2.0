import Axios from 'axios';
import { IVehicleEntry } from '../interfaces/interfaces';
import { Utils } from '../utils/utils';
import { Database } from '../database/database';
import { Logger } from '../logger/logger';

export abstract class EntryScraper {
  abstract processData(data: string): Promise<Omit<IVehicleEntry, 'id'>[]>;
  abstract serviceName: string;
  abstract platformUrl: string;
  abstract queryUrl: string;
  abstract sleepTime: number;
  private count = 0;


  constructor(private dbService = Database.getInstance()) {}

  async runScraper() {
    try {
      this.count = 0;
      Logger.log(this.serviceName, 'info', 'Looking for new entries...')
      const data = await this.scrapeUrl();
      const processed = await this.processData(data);
      await this.saveData(processed);
      Logger.log(this.serviceName, 'info', `Processed ${this.count} new entrie(s).`)
      this.tweakSpeed();
      Logger.log(this.serviceName, 'info', `Sleeping for ${this.sleepTime} minutes.`);
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

  protected async saveData(data: Omit<IVehicleEntry, 'id'>[]) {
    for (const item of data) {
      const rows = await this.dbService
        .knex('carlist')
        .where('platform_id', item.platformId)
        .first();

      if(!rows) {
        this.count++;
        await this.dbService.knex('carlist').insert({
          platform: item.platform,
          platform_id: item.platformId,
          url: item.url,
        });
      }
    }
  }

  private tweakSpeed() {
    if (this.count <= 15) this.slowDown();
    else this.speedUp();
  }

  protected speedUp() {
    if (this.sleepTime >= 0.5) {
      this.sleepTime -= 0.1;
    }
  }

  protected slowDown() {
    if (this.sleepTime < 15) {
      this.sleepTime += 0.1;
    }
  }
}
