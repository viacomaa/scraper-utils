const _ = require('lodash');
const winston = require('winston');
const { ElasticsearchTransport } = require('winston-elasticsearch');

const errorToJson = require('./errorToJson');

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
  elasticIndexPrefix,
  elasticTransform,
  elasticMappingTemplate,
  colorize,
  timestamp
}) {
  const transports = [];

  let elasticTransport;

  enabledConsole && transports.push(
    new winston.transports.Console({
      level: consoleLevel,
      format: optionsToFormatter({
        colorize,
        timestamp,
        prettyPrint: true
      })
    })
  );

  if (enabledElastic) {
    if (!elasticUrl || !elasticIndexPrefix || !elasticLevel || !elasticMappingTemplate || !elasticTransform) {
      throw new Error('Missing Elastic logger options')
    }
  }

  if (enabledElastic) {
    elasticTransport = new ElasticsearchTransport({
      indexPrefix: elasticIndexPrefix,
      level: elasticLevel,
      clientOpts: {
        node: elasticUrl,
        buffering: true
      },
      mappingTemplate: elasticMappingTemplate,
      transformer: elasticTransform
    });

    transports.push(elasticTransport);
  }

  winston.addColors(customLevels.colors);

  const logger = winston.createLogger({
    transports,
    levels: customLevels.levels,
    silent: transports.length === 0
  });

  logger.on('error', (error) => {
    // elasticTransport could generate an error if we try and push a field value type mismatch
    // winston removes a transport if it generates an error. The following code adds it back again
    if (elasticTransport && !logger.transports.includes(elasticTransport)) {
      logger.error('Transport error detected', { error });
      logger.add(elasticTransport);
    }
  });

  return logger;
};


function replaceErrors(key, value) {
  if (value instanceof Buffer) {
    return value.toString('base64');
  } else if (value instanceof Error) {
    return errorToJson(value);
  }

  return value;
}

// winston3.x changes how transports are formatting (to the worse, imho)
// use this function to translate winston 2,x options into a combined formatter
function optionsToFormatter(options) {
  const formatters = {
    timestamp: winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:SSSZ' }),
    handleExceptions: winston.format.errors({ stack: true }),
    colorize: winston.format.colorize(),
    json: winston.format.json({ replacer: replaceErrors }),
    prettyPrint: winston.format.printf(({ timestamp, level, label, message, error, ...rest }) => {
      const namespace = label ? `(${label})` : '';
      const errStack = (error) ? `\nError: ${_.get(error, 'message')}\nStack: ${_.get(error, 'stack')}` : '';
      const meta = rest && Object.keys(rest).length ? `${JSON.stringify(rest, null, 2)}` : '';

      return `${timestamp} ${level}: ${namespace} ${message} ${meta} ${errStack}` ;
    })
  };

  const optionsFormatters = _.chain(options)
    .map((value, key) => (value && formatters[key]))
    .compact()
    .value();

  return winston.format.combine(...optionsFormatters);
}
