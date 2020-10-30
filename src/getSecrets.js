const _ = require('lodash');
const AWS = require('aws-sdk');
const Bluebird = require('bluebird');
const fs = Bluebird.promisifyAll(require('fs'));

AWS.config.setPromisesDependency(Bluebird);

const ssm = new AWS.SSM({
  region: process.env.AWS_DEFAULT_REGION
});

module.exports = function(appName = 'stream') {
  return new Bluebird(async (resolve, reject) => {
    const secrets = [];
    let nextToken;

    while (true) { //eslint-disable-line no-constant-condition
      try {
        const out = await getParams(nextToken, appName); //eslint-disable-line no-await-in-loop

        secrets.push(out.Parameters);
        nextToken = out.NextToken;

        if (_.isEmpty(nextToken)) {
          resolve(_.flatten(secrets));
          break;
        }
      } catch (e) {
        reject(e);
      }
    }
  })
    .map(secret => `export ${_(secret.Name).split('/').last()}='${secret.Value}'`)
    .then(secrets => fs.appendFileAsync('./secrets', secrets.join('\n')));
}


/////////

function getParams(nextToken, appName) {
  const params = {
    Path: `/${process.env.NODE_ENV}/${appName}`,
    MaxResults: 10,
    Recursive: true,
    WithDecryption: true,
    NextToken: nextToken
  };

  return ssm.getParametersByPath(params).promise();
}
