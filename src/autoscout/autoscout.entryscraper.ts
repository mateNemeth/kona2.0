import * as cheerio from 'cheerio';
import { EntryScraper } from '../models/entry-scraper.model';
import { IVehicleEntry } from '../interfaces/interfaces';
export class ASEntryScraper extends EntryScraper {
  readonly uuidRegex = new RegExp(
    /[0-9a-fA-F]{8}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{4}\-[0-9a-fA-F]{12}/
  );
  serviceName = 'AS EntryScraper';
  platformUrl = 'https://www.autoscout24.hu';
  queryUrl =
    '/lst/?sort=age&desc=1&offer=J%2CU%2CO%2CD&ustate=N%2CU&size=20&page=1&cy=A&atype=C&ac=0&';
  sleepTime = 2.5;

  async processData(data: string) {
    const $ = cheerio.load(data);
    const response: Omit<IVehicleEntry, 'id'>[] = [];
    $('[data-item-name="listing-summary-container"]').each((i, element) => {
      const link = $(element).find('a').attr('href');
      if (link) {
        const platformMatch = link.match(this.uuidRegex);
        if (platformMatch === null)
          throw new Error("Error, RegExp didn't find uuid in link: " + link);

        const vehicle = {
          platform: this.platformUrl,
          platformId: platformMatch[0],
          link,
        };

        response.unshift(vehicle);
      }
    });

    return response;
  }
}
