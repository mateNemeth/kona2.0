import Axios, { AxiosResponse } from 'axios';
import { Database } from '../database/database';
import {
  IVehicleEntry,
  IVehicleSpec,
  IVehicleType,
  IVehicleTypePreview,
} from '../interfaces/interfaces';
import { Logger } from '../logger/logger';
import { Utils } from '../utils/utils';

export abstract class SpecScraper {
  abstract processData(
    data: string,
    id: number
  ): Promise<{ vehicleSpec: IVehicleSpec; vehicleType: IVehicleTypePreview }>;
  abstract serviceName: string;
  abstract sleepTime: number;
  abstract platform: string;
  abstract maxErrorCount: number;
  private errorCount = 0;

  constructor(private dbService = Database.getInstance()) {}

  async runScraper(): Promise<any> {
    try {
      const entry = await this.findEntryToScrape();
      if (!entry) {
        this.slowDown();
        Logger.log(
          this.serviceName,
          'info',
          `No entry found to scrape, sleeping for ${this.sleepTime} minutes.`
        );
        await Utils.sleep(this.sleepTime * 60 * 1000);
        return this.runScraper();
      }

      const raw = await this.scrapeEntry(entry);
      const processed = await this.processData(raw.data, entry.id);
      const typeId = await this.getTypeId(processed.vehicleType);

      await this.saveProcessed(processed.vehicleSpec, typeId);
      await this.updateAvgMedianPrices(typeId);
      await this.updateQueue(processed.vehicleSpec);
      this.speedUp();

      Logger.log(
        this.serviceName,
        'info',
        `Processing done, sleeping for ${this.sleepTime} minutes.`
      );
      await Utils.sleep(this.sleepTime * 60 * 1000);
      return this.runScraper();
    } catch (e) {
      const errorMsg =
        e instanceof Error
          ? e.stack ?? 'Something went wrong'
          : 'Something went wrong';
      Logger.log(this.serviceName, 'error', errorMsg);
      this.errorCount++;
      if (this.errorCount < this.maxErrorCount) {
        await Utils.sleep(20000);
        return this.runScraper();
      } else {
        const faultyEntry = await this.findEntryToScrape();
        if (faultyEntry) {
          Logger.log(
            this.serviceName,
            'error',
            `Error count reached the limit of ${
              this.maxErrorCount
            }, removing entry ${JSON.stringify(faultyEntry)} and sleeping for ${
              this.sleepTime
            } minutes before retry.`
          );
          await this.removeEntry(faultyEntry.id);
        }
        this.resetErrorCount();
        await Utils.sleep(this.sleepTime);
        return this.runScraper();
      }
    }
  }

  private async scrapeEntry(entry: IVehicleEntry) {
    Logger.log(
      this.serviceName,
      'info',
      `Found new entry: ${JSON.stringify(entry)}.`
    );
    Logger.log(
      this.serviceName,
      'info',
      `Scraping url: ${entry.platform}${entry.link}.`
    );
    let raw: AxiosResponse<string> | undefined;
    try {
      raw = await Axios.get(`${entry.platform}${entry.link}`);
    } catch (e) {
      if (Axios.isAxiosError(e)) {
        if (e.response?.status === 410 || e.response?.status === 404) {
          await this.removeEntry(entry.id);
          Logger.log(this.serviceName, 'warn', `Entry doesn't exist anymore.`);
          return this.runScraper();
        }
      }

      this.slowDown();
      Logger.log(
        this.serviceName,
        'warn',
        `Something went wrong, retry in ${this.sleepTime} minutes.`
      );
      Logger.log(this.serviceName, 'error', JSON.stringify(e));
      await Utils.sleep(this.sleepTime * 60 * 1000);
      return this.runScraper();
    }
    return raw;
  }

  private async findEntryToScrape() {
    Logger.log(this.serviceName, 'info', 'Querying un-crawled entries.');
    return await this.dbService
      .knex<IVehicleEntry>('carlist')
      .where('crawled', false)
      .andWhere('platform', this.platform)
      .orderBy('id')
      .first();
  }

  protected async removeEntry(id: number) {
    return this.dbService
      .knex('carlist')
      .where('id', id)
      .update('crawled', true);
  }

  private async getTypeId(entry: IVehicleTypePreview): Promise<number> {
    let type = await this.dbService
      .knex<IVehicleType>('cartype')
      .where({ make: entry.make, model: entry.model, age: entry.age })
      .first();
    if (!type) {
      Logger.log(
        this.serviceName,
        'info',
        `Saving type into db: ${JSON.stringify({
          make: entry.make,
          model: entry.model,
          age: entry.age,
        })}`
      );
      type = (
        await this.dbService
          .knex<IVehicleType>('cartype')
          .insert({ make: entry.make, model: entry.model, age: entry.age })
          .returning('*')
      )[0];
    } else {
      Logger.log(
        this.serviceName,
        'info',
        `Type already exist, returning it: ${JSON.stringify(type)}`
      );
    }
    if (!type) {
      Logger.log(this.serviceName, 'error', 'Something went wrong...');
      throw new Error(
        "Something went wrong, type not found and/or couldn't be inserted"
      );
    }
    return type.id;
  }

  private async saveProcessed(entry: IVehicleSpec, typeId: number) {
    Logger.log(
      this.serviceName,
      'info',
      `Saving spec into db: ${JSON.stringify({ ...entry, cartype: typeId })}`
    );
    await this.dbService.knex('carspec').insert({ ...entry, cartype: typeId });
    await this.dbService
      .knex('carlist')
      .where('id', entry.id)
      .update('crawled', true);
    return;
  }

  private async updateQueue(entry: IVehicleSpec) {
    Logger.log(
      this.serviceName,
      'info',
      `Saving ${entry.id} into working queue table.`
    );
    return await this.dbService.knex('working_queue').insert({ id: entry.id });
  }

  private async updateAvgMedianPrices(typeId: number) {
    Logger.log(
      this.serviceName,
      'info',
      `Updating average prices for cartype: ${typeId}`
    );
    const prices = await this.getAllPricesForType(typeId);
    if (!prices) return;
    const avg = Utils.calculateAverage(prices);
    Logger.log(
      this.serviceName,
      'info',
      `New average for ${typeId}: ${this.formatPrice(avg)}`
    );
    const median = Utils.calculateMedian(prices);
    Logger.log(
      this.serviceName,
      'info',
      `New median for  ${typeId}: ${this.formatPrice(median)}`
    );
    return await this.dbService
      .knex('average_prices')
      .insert({ id: typeId, avg, median })
      .onConflict('id')
      .merge();
  }

  private async getAllPricesForType(
    typeId: number
  ): Promise<number[] | undefined> {
    const type = await this.dbService
      .knex('cartype')
      .where('id', typeId)
      .first();
    if (!type) return;
    const olderType = await this.dbService
      .knex<IVehicleType>('cartype')
      .select('id')
      .where({ make: type.make, model: type.model, age: type.age - 1 })
      .first();
    const newerType = await this.dbService
      .knex<IVehicleType>('cartype')
      .select('id')
      .where({ make: type.make, model: type.model, age: type.age + 1 })
      .first();
    const all = await this.dbService
      .knex<IVehicleSpec>('carspec')
      .where('cartype', typeId)
      .orWhere('cartype', olderType?.id ?? null)
      .orWhere('cartype', newerType?.id ?? null);
    if (all.length >= 5) {
      return all.map((e) => e.price ?? 0);
    }
  }

  private formatPrice(price: number): string {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'EUR',
    }).format(price);
  }

  private slowDown() {
    this.sleepTime = Utils.slowDown(this.sleepTime, 2.5);
  }

  private speedUp() {
    this.sleepTime = Utils.speedUp(this.sleepTime, 0.2, 0.25);
  }

  private resetErrorCount() {
    this.errorCount = 0;
  }
}
