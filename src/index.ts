import { ASEntryScraper } from './autoscout/autoscout.entryscraper';
import { ASSpecScraper } from './autoscout/autoscout.specscraper';
import { Database } from './database/database';
import { AmazonSESMailer } from './notifications/amazon-ses-mailer';
import { NotificationManager } from './notifications/notification-manager';

const ScoutEntryScraper = new ASEntryScraper();
const ScoutSpecScraper = new ASSpecScraper();
const Mailer = new AmazonSESMailer();
const Notifications = new NotificationManager(Database.getInstance(), [Mailer]);

ScoutEntryScraper.runScraper();
ScoutSpecScraper.runScraper();
Notifications.processNotifications();