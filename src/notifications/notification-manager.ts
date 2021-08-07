import { Database } from '../database/database';
import { IVehicleFullData } from '../interfaces/interfaces';
import { Logger } from '../logger/logger';
import { Utils } from '../utils/utils';

export interface Notifier {
  sendNotification(data: IVehicleFullData): unknown;
}

export class NotificationManager {
  serviceName = 'NotificationManager';
  sleepTime = 2;

  constructor(
    private dbService = Database.getInstance(),
    private notifiers: Notifier[]
  ) {}

  async processNotifications() {
    try {
      const carSpec = await this.findWork();
      if (!carSpec) {
        this.sleepTime = 2 * 60 * 1000;
        Logger.log(
          this.serviceName,
          'info',
          `No work found, sleeping for 2 mins.`
        );
      } else {
        this.removeFromQueue(carSpec.id);
        this.notifiers.forEach((n) => n.sendNotification(carSpec));
      }

      await Utils.sleep(this.sleepTime);
      this.processNotifications();
    } catch (e) {
      Logger.log(this.serviceName, 'error', JSON.stringify(e));
    }
  }

  private async removeFromQueue(id: number) {
    Logger.log(
      this.serviceName,
      'info',
      `Deleting finished work (id: ${id}) from table.`
    );
    return await this.dbService.knex('working_queue').where('id', id).del();
  }

  private async findWork(): Promise<IVehicleFullData | undefined> {
    const work = await this.dbService
      .knex('working_queue')
      .where('working', false)
      .first();
    if (work) {
      Logger.log(
        this.serviceName,
        'info',
        `Found work: ${JSON.stringify(work)}`
      );
      const rows: number[] = await this.dbService
        .knex('working_queue')
        .where('id', work.id)
        .returning('id')
        .first()
        .update('working', true);
      Logger.log(this.serviceName, 'info', `Updated ${rows[0]} on work table`);

      return this.dbService
        .knex<IVehicleFullData[]>('carspec')
        .join('cartype', { 'carspec.cartype': 'cartype.id' })
        .where('carspec.id', rows[0])
        .select(
          'carspec.id',
          'cartype',
          'ccm',
          'fuel',
          'transmission',
          'price',
          'kw',
          'km',
          'zipcode',
          'make',
          'model',
          'age'
        )
        .then((resp) => resp[0]);
    } else {
      return;
    }
  }
}
