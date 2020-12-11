import Axios, { AxiosResponse } from 'axios';
import { Database } from '../database/database';
import { IVehicleEntry, IVehicleSpec, IVehicleType } from '../interfaces/interfaces';
import { Logger } from '../logger/logger';
import { Utils } from '../utils/utils';

export abstract class SpecScraper {
  abstract processData(data: string, id: number): Promise<{vehicleSpec: IVehicleSpec, vehicleType: IVehicleType}>;
  abstract sleepTime: number;
  abstract platform: string;
  private maxErrorCount = 0;

  constructor(
    private dbService = Database.getInstance()
  ) {}

  async runScraper() {
    try {
      console.log(this.platform);
      const entry = await this.findEntryToScrape();
      if (!entry) return;
      const raw = await this.scrapeEntry(entry);
      if (!raw) return;
      const processed = await this.processData(raw.data, entry.id);
      if (!processed) return;
      const typeId = await this.getTypeId(processed.vehicleType);
      await this.saveProcessed(processed.vehicleSpec, typeId);
      await this.updateAvgMedianPrices(typeId);
      await this.updateQueue(processed.vehicleSpec);
      await Utils.sleep(this.sleepTime * 60 * 1000);
      this.maxErrorCount = 0;
      this.runScraper();
    } catch (e) {
      Logger.log('speclofasz', 'error', e.stack);
      this.maxErrorCount++;
      if (this.maxErrorCount <= 3) {
        Utils.sleep(20000);
        this.runScraper;
      } else {
        Logger.log('speclofasz', 'error', `Error count reached the limit of ${this.maxErrorCount}, sleeping for 10 minutes before retry.`)
        Utils.sleep(600000);
        this.runScraper;
      }
    }
  }

  private async scrapeEntry(entry: IVehicleEntry) {
    let raw: AxiosResponse<string>;
    try {
      raw = await Axios.get(`${entry.platform}${entry.url}`);
    } catch (e) {
      if (e.response.status === 410 || e.response.status === 404) {
        await this.removeEntry(entry.id);
      }
    }
    return raw;
  }

  private async findEntryToScrape() {
    return await this.dbService
      .knex('carlist')
      .where('crawled', false)
      .andWhere('platform', this.platform)
      .first();
  }

  private async removeEntry(id: number) {
    return this.dbService.knex('carlist').where('id', id).del();
  }

  private async getTypeId(entry: IVehicleType): Promise<number> {
    let id = (await this.dbService
      .knex('cartype')
      .select('id')
      .first()
      .where({ make: entry.make, model: entry.model, age: entry.age }))?.id;
    if (!id)
      [id] = await this.dbService
        .knex('cartype')
        .insert({ make: entry.make, model: entry.model, age: entry.age })
        .returning('id');
    return id;
  }

  private async saveProcessed(entry: IVehicleSpec, typeId: number) {
    await this.dbService.knex('carspec').insert({ ...entry, cartype: typeId });
    await this.dbService
      .knex('carlist')
      .where('id', entry.id)
      .update('crawled', true);
    return;
  }

  private async updateQueue(entry: IVehicleSpec) {
    return await this.dbService.knex('working_queue').insert({ id: entry.id });
  }

  private async updateAvgMedianPrices(typeId: number) {
    const prices = await this.getAllPricesForType(typeId);
    if (!prices) return;
    const avg = Utils.calculateAverage(prices);
    const median = Utils.calculateMedian(prices);
    return await this.dbService
      .knex('average_prices')
      .insert({ id: typeId, avg, median })
      .onConflict('id')
      .merge();
  }

  private async getAllPricesForType(typeId: number): Promise<number[]> {
    const type = await this.dbService
      .knex('cartype')
      .where('id', typeId)
      .first();
    if (!type) return;
    const older = await this.dbService
      .knex('cartype')
      .where({ make: type.make, model: type.model, age: type.age - 1 })
      .first() ?? null;
    const newer = await this.dbService
      .knex('cartype')
      .where({ make: type.make, model: type.model, age: type.age + 1 })
      .first() ?? null;
    const all = await this.dbService
      .knex('carspec')
      .where('cartype', typeId)
      .orWhere('cartype', older?.id ?? null)
      .orWhere('cartype', newer?.id ?? null);
    if (all.length >= 5) {
      return all.map((e) => e.price);
    }
  }
}
