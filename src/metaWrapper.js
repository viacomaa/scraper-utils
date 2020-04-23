const _ = require('lodash');

const errorToJson = require('./errorToJson');

module.exports = function(meta) {
  return _.mapValues(meta, (v) => {
    if (v instanceof Error) {
      let out;

      try {
        out = errorToJson(v);
      } catch (e) {
        out = v
      }

      return out;
    } else {
      return v;
    }
  })
}
