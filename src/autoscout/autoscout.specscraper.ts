import * as cheerio from 'cheerio';
import { SpecScraper } from '../models/spec-scraper.model';
import { IVehicleSpec, IVehicleTypePreview } from '../interfaces/interfaces';

export enum Keywords {
  YEAR = 'Első forgalomba helyezés',
  FUEL = 'Üzemanyag',
  TRANSMISSION = 'A sebességváltó típusa',
  CCM = 'Hengerűrtartalom',
  KW = 'Teljesítmény',
  KM = 'Kilométeróra állása',
}

const diesel = ['Dízel (Particulate Filter)', 'Dízel', 'Dízel (Részecskeszűrő)'];
const petrol = [
  'Benzin',
  'Benzin (Particulate Filter)',
  'Super 95 (Particulate Filter)',
  'Super 95',
  '91-es normálbenzin',
  'Super E10 Plus 95-ös',
  'Super Plus 98-as',
  'E10-es 91-es normálbenzin',
  'Super Plus E10 98-as',
  '91-es normálbenzin (Részecskeszűrő)',
];

export class ASSpecScraper extends SpecScraper {
  serviceName = 'AS SpecScraper';
  platform = 'https://www.autoscout24.hu';
  sleepTime = 0.2;
  maxErrorCount = 5;

  async processData(
    data: string,
    id: number
  ): Promise<{ vehicleSpec: IVehicleSpec; vehicleType: IVehicleTypePreview }> {
    const numberPattern = /\d+/g;
    const $ = cheerio.load(data);
    const lookFor = (
      element: cheerio.Cheerio,
      keyword: string
    ): cheerio.Cheerio => {
      return $(element).filter(function (i, el) {
        return $(el).text().trim() === keyword ?? $(el).text().trim().includes(keyword);
      });
    };

    const make = $('h1').children('div').first().children('span').first().text().trim();
    const model = $('h1').children('div').first().children('span').last().text().trim();

    const age = Number(lookFor($('div'), Keywords.YEAR)?.next().next().text().split('/')?.[1] || 0);

    if (!age || !model || !make) {
      await this.removeEntry(id);
      return this.runScraper();
    }

    const km = Number(lookFor($('div'), Keywords.KM)?.next().next().next().text()?.split(' ')?.[0]?.split('.')?.join('') ?? 0);

    const kw = () => {
      const field = lookFor($('dt'), Keywords.KW);
      if (field) {
        const match = field.next().text().trim().split(' ')?.[0];
        return Number(match ?? 0);
      }
      return 0;
    };

    const fuel = () => {
      if (lookFor($('dt'), Keywords.FUEL).length > 0) {
        const fuelType = lookFor($('dt'), Keywords.FUEL)
          .next()
          .text()
          .trim()
          .split('/');
        if (fuelType.some((item) => diesel.includes(item.trim()))) {
          return 'Dízel';
        } else if (fuelType.some((item) => petrol.includes(item.trim()))) {
          return 'Benzin';
        } else {
          return lookFor($('dt'), Keywords.FUEL).next().text().trim();
        }
      } else {
        return;
      }
    };

    const transmission = () => {
      if (lookFor($('dt'), Keywords.TRANSMISSION).length > 0) {
        if (
          lookFor($('dt'), Keywords.TRANSMISSION).next().text().trim() ===
          'Sebességváltó'
        ) {
          return 'Manuális';
        } else {
          return lookFor($('dt'), Keywords.TRANSMISSION).next().text().trim();
        }
      } else {
        return;
      }
    };

    const ccm = () => {
      if (lookFor($('dt'), Keywords.CCM).length > 0) {
        return Number(
          lookFor($('dt'), Keywords.CCM)
            .next()
            .text()
            .match(numberPattern)!
            .join('')
        );
      } else {
        return;
      }
    };

    const price = Number($('span').filter(function (i, el) {
      return $(el).text().trim().includes('€');
    }).text().split(',')?.[0].split(' ')?.[1]?.split('.').join('') || 0);

    const address = $('a').filter(function (i, el) {
      return $(el).text().trim().match(/(.*)([0-9]{4})(\s)(.*)(,\s[A-Z]{2})/) !== null
    }).text().match(/(.*)([0-9]{4})(\s)(.*)(,\s[A-Z]{2})/);

    const zipcode = Number(address?.[2] || 0);
    const city = address?.[4] || '';

    if (!zipcode || !city) {
      console.log('found one')
    }

    return {
      vehicleSpec: {
        id,
        km,
        kw: kw(),
        fuel: fuel(),
        transmission: transmission(),
        ccm: ccm(),
        price,
        city,
        zipcode,
      },
      vehicleType: {
        make,
        model,
        age,
      },
    };
  }
}
