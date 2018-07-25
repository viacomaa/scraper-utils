const _ = require('lodash');
const util = require('util');
const winston = require('winston');

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

module.exports = function({ enabled, level, depth, colorize, timestamp }) {
  const transports = [];

  enabled && transports.push(
    new (winston.transports.Console)({
      name: 'errorsConsole',
      level,
      colorize,
      timestamp,
      prettyPrint: inspect({ colorize, depth }),
      handleExceptions: true,
      humanReadableUnhandledException: true
    })
  );

  return new winston.Logger({
    transports,
    levels: customLevels.levels,
    colors: customLevels.colors
  });

};


/////


function inspect({ colorize, depth }) {
  return (obj) => {
    const inspectOpt = {
        depth,
        colors: colorize
      };

    if (_.isObject(obj)) {
      // do one more test to check for error objects
      if (obj.date && obj.process && obj.os && obj.stack) {
        return obj.stack.join('\n');
      }
      return util.inspect(obj, inspectOpt);
    }

    return obj;
  }
}
