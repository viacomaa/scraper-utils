const _ = require('lodash');
const toJSON = require( 'utils-error-to-json' );

module.exports = function(meta) {
  return _.mapValues(meta, (v) => {
    if (v instanceof Error) {
      return toJSON(v);
    } else {
      return v;
    }
  })
}
