import { ASEntryScraper } from './autoscout/autoscout.entryscraper';
import { ASSpecScraper } from './autoscout/autoscout.specscraper';

const ScoutEntryScraper = new ASEntryScraper();
const ScoutSpecScraper = new ASSpecScraper();

ScoutEntryScraper.runScraper();
// ScoutSpecScraper.runScraper();