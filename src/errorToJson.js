const _ = require('lodash');

module.exports = function(error) {
  if (!(_.isEmpty(error))) {
    return {
      error: _.get(error, 'error'),
      name: _.get(error, 'name'),
      type: _.get(error, 'type'),
      message: _.get(error, 'message'),
      stack: _.get(error, 'stack'),
      statusCode: _.get(error, 'statusCode'),
      code: _.get(error, 'code'),
    }
  }
}
