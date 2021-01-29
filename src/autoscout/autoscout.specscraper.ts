import * as cheerio from 'cheerio';
import { SpecScraper } from '../models/spec-scraper.model';
import { IVehicleSpec, IVehicleTypePreview } from '../interfaces/interfaces';

export class ASSpecScraper extends SpecScraper {
  serviceName = 'AS SpecScraper';
  platform = 'https://www.autoscout24.hu';
  sleepTime = 0.2;
  maxErrorCount = 5;

  async processData(data: string, id: number): Promise<{vehicleSpec: IVehicleSpec, vehicleType: IVehicleTypePreview}> {
    const numberPattern = /\d+/g;
    const $ = cheerio.load(data);
    const lookFor = (
      element: cheerio.Cheerio,
      keyword: string
    ): cheerio.Cheerio => {
      return $(element).filter( function (i, el) {
        return $(el).text().trim() === keyword;
      });
    };

    const make = $("dt:contains('Márka')").next().text().trim();
    const model = $("dt:contains('Modell')").next().text().trim();
    const age = Number(
      $('.sc-font-l.cldt-stage-primary-keyfact')
        .eq(4)
        .text()
        .match(numberPattern)![1] ?? 0
    );

    if (!age || !model || !make) {
      await this.removeEntry(id);
      return this.runScraper();
    }

    const km = () => {
      const result = $('.sc-font-l.cldt-stage-primary-keyfact')
        .eq(3)
        .text()
        .match(numberPattern);

      return result && result.length > 1 ? Number(result.join('')) : 0;
    };

    const kw = () => {
      const result = Number(
        $('.sc-font-l.cldt-stage-primary-keyfact')
          .eq(5)
          .text()
          .match(numberPattern)
      );
      return result ? result : 0;
    };

    const fuel = () => {
      if (lookFor($('dt'), 'Üzemanyag').length > 0) {
        const fuelType = lookFor($('dt'), 'Üzemanyag')
          .next()
          .text()
          .trim()
          .split('/');
        const diesel = ['Dízel (Particulate Filter)', 'Dízel'];
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
        ];
        if (fuelType.some((item) => diesel.includes(item.trim()))) {
          return 'Dízel';
        } else if (fuelType.some((item) => petrol.includes(item.trim()))) {
          return 'Benzin';
        } else {
          return lookFor($('dt'), 'Üzemanyag').next().text().trim();
        }
      } else {
        return;
      }
    };

    const transmission = () => {
      if (lookFor($('dt'), 'Váltó típusa').length > 0) {
        if (
          lookFor($('dt'), 'Váltó típusa').next().text().trim() ===
          'Sebességváltó'
        ) {
          return 'Manuális';
        } else {
          return lookFor($('dt'), 'Váltó típusa').next().text().trim();
        }
      } else {
        return;
      }
    };

    const ccm = () => {
      if (lookFor($('dt'), 'Hengerűrtartalom').length > 0) {
        return Number(
          lookFor($('dt'), 'Hengerűrtartalom')
            .next()
            .text()
            .match(numberPattern)!
            .join('')
        );
      } else {
        return;
      }
    };

    const price = Number(
      $('.cldt-price').eq(1).find('h2').text().match(numberPattern)?.join('')
    );

    const city = $('.cldt-stage-vendor-text.sc-font-s')
      .find('span.sc-font-bold')
      .eq(0)
      .text();

    const zipcode = Number(
      $("div[data-item-name='vendor-contact-city']").eq(0).text().split(' ')[0]
    );

    return {
      vehicleSpec: {
        id,
        km: km(),
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
      }
    };
  }
}
