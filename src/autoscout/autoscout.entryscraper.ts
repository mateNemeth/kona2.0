import Axios from 'axios';
import * as cheerio from 'cheerio';
import { EntryScraper } from '../models/entry-scraper.model';
import { IVehicleEntry } from '../interfaces/IVehicleEntry';
import { Utils } from '../utils/utils';

export class ASEntryScraper extends EntryScraper {
  platformUrl = 'https://www.autoscout24.hu';
  queryUrl =
    '/lst/?sort=age&desc=1&offer=J%2CU%2CO%2CD&ustate=N%2CU&size=20&page=1&cy=A&atype=C&ac=0&';
  baseSleepTime = 2.5;

  async scrapeUrl() {
    const response = await Axios.get<string>(
      `${this.platformUrl}${this.queryUrl}`
    );
    return response.data;
  }

  processData(data: string) {
    const $ = cheerio.load(data);
    const response: IVehicleEntry[] = [];
    $('.cldt-summary-full-item').each((index, element) => {
      const entryId = $(element).attr('id').split('-');
      const platformId = entryId.slice(1, entryId.length).join('-');
      const link = `/ajanlat/${
        $(element).find($('a')).attr('href').split('/')[2]
      }`;

      const vehicle = {
        platform: this.platformUrl,
        platformId,
        link,
      };

      response.unshift(vehicle);
    });

    return response;
  }

  async saveData(data: IVehicleEntry[]) {
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

  async runScraper() {
    try {
      const data = await this.scrapeUrl();
      const processed = this.processData(data);
      await this.saveData(processed);
      await Utils.sleep(this.baseSleepTime * 60 * 1000);
      this.runScraper();
    } catch (err) {
      console.error(err);
    }
  }

  private speedUp() {
    if (this.baseSleepTime >= 0.5) {
      this.baseSleepTime -= 0.1;
    }
  }

  private slowDown() {
    if (this.baseSleepTime < 25) {
      this.baseSleepTime += 0.1;
    }
  }
}
