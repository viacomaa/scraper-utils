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

module.exports = function({
  enabledConsole,
  consoleLevel,
  enabledElastic,
  elasticLevel,
  elasticUrl,
  elasticName,
  elasticIndexPrefix,
  elasticTransform,
  elasticMappingTemplate,
  colorize,
  timestamp
}) {
  const transports = [];

  enabledConsole && transports.push(
    new winston.transports.Console({
      level: consoleLevel,
      format: optionsToFormatter({
        colorize,
        timestamp,
        prettyPrint: true,
        handleExceptions: true
      })
    })
  );

  if (enabledElastic) {
    if (!elasticUrl || !elasticIndexPrefix || !elasticLevel || !elasticMappingTemplate || !elasticTransform) {
      throw new Error('Missing Elastic logger options')
    }
  }

  enabledElastic && transports.push(
    new Elasticsearch({
      indexPrefix: elasticIndexPrefix,
      level: elasticLevel,
      format: optionsToFormatter({
        handleExceptions: true
      }),
      clientOpts: {
        node: elasticUrl,
        buffering: true
      },
      mappingTemplate: elasticMappingTemplate,
      transformer: elasticTransform
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
    timestamp: winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:SSSZ' }),
    handleExceptions: winston.format.errors({ stack: true }),
    colorize: winston.format.colorize(),
    prettyPrint: winston.format.printf(({ timestamp, level, label, message, stack, ...rest }) => {
      const namespace = label ? `(${label})` : '';
      const errStack = stack ? `\n${stack}` : '';
      const meta = rest && Object.keys(rest).length ? `${JSON.stringify(rest, null, 2)}` : '';

      return `${timestamp} ${level}: ${namespace} ${message} ${meta} ${errStack}`;
    })
  };

  const optionsFormatters = _.chain(options)
    .map((value, key) => (value && formatters[key]))
    .compact()
    .value();

  return winston.format.combine(...optionsFormatters);
}
