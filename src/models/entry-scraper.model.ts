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
      const data = await this.scrapeUrl();
      const processed = await this.processData(data);
      await this.saveData(processed);
      this.tweakSpeed();
      await Utils.sleep(this.sleepTime * 60 * 1000);
      this.runScraper();
    } catch (err) {
      console.error(err);
      await Utils.sleep(3 * 60 * 1000);
      this.runScraper();
    }
  }

  private async scrapeUrl() {
    Logger.log(this.serviceName, 'info', `Looking for new entries on ${this.platformUrl}.`)

    const response = await Axios.get<string>(
      `${this.platformUrl}${this.queryUrl}`
    );
    return response.data;
  }

  private async saveData(data: Omit<IVehicleEntry, 'id'>[]) {
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
          link: item.link,
        });
      }
    };

    Logger.log(this.serviceName, 'info', `Saved ${this.count} entries into DB.`)
  }
  
  private tweakSpeed() {
    if (this.count <= 5) this.sleepTime = Utils.slowDown(this.sleepTime, 15);
    else this.sleepTime = Utils.speedUp(this.sleepTime, 0.5);
    this.count = 0;
    Logger.log(this.serviceName, 'info', `Sleeping for ${this.sleepTime} minutes.`);
  }
}
