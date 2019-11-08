const _ = require('lodash');
const winston = require('winston');
const Elasticsearch = require('winston-elasticsearch');

const customLevels = {
  levels: {
    error: 0,
    info: 1,
    message: 2,
    sql: 3,
    debug: 10
  },
  colors: {
    error: 'red',
    info: 'yellow',
    message: 'cyan',
    sql: 'magenta',
    debug: 'green'
  }
};

module.exports = function({ enabled, level, colorize, timestamp, elasticLog, elasticUrl, elasticName }) {
  const transports = [];

  enabled && transports.push(
    new winston.transports.Console({
      level,
      format: optionsToFormatter({
        colorize,
        timestamp,
        prettyPrint: true,
        handleExceptions: true
      })
    })
  );

  enabled && elasticLog && elasticUrl && elasticName && transports.push(
    new Elasticsearch({
      indexPrefix: `match-stream-${elasticName}`,
      level,
      format: optionsToFormatter({
        handleExceptions: true
      }),
      clientOpts: {
        node: elasticUrl,
        buffering: true
      }
    })
  );

  winston.addColors(customLevels.colors);

  return winston.createLogger({
    transports,
    levels: customLevels.levels
  });

};


// winston3.x changes how transports are formatting (to the worse, imho)
// use this function to translate winston 2,x options into a combined formatter
function optionsToFormatter(options) {
  const formatters = {
    timestamp: winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ssZ' }),
    handleExceptions: winston.format.errors({ stack: true }),
    colorize: winston.format.colorize(),
    prettyPrint: winston.format.printf(({ timestamp, level, label, message, stack, ...rest }) => {
      const namespace = label ? `(${label})` : '';
      const errStack = stack ? `\n${stack}` : '';
      const meta = rest && Object.keys(rest).length ? `${JSON.stringify(rest, undefined, 2)}` : '';

      return `${timestamp} ${level}: ${namespace} ${message} ${meta} ${errStack}`;
    })
  };

  const optionsFormatters = _.chain(options)
    .map((value, key) => (value && formatters[key]))
    .compact()
    .value();

  return winston.format.combine(...optionsFormatters);
}
