export class Logger {
  static log(name: string, type: string, message: string) {
    const eventTime = new Date();
    const date = eventTime.toISOString().slice(0, 10);
    const time = eventTime.toISOString().slice(11, 19);
  
    if (type === 'error') {
      console.error(`[${date} ${time}] | [${name}] | [${type.toUpperCase()}]: ${message}`);
  
      return;
    }
  
    type !== 'error' &&
      console.log(`[${date} ${time}] | [${name}] | [${type.toUpperCase()}]: ${message}`);
  }

}