const _ = require('lodash');
const Bluebird = require('bluebird');
const redis = require('redis');
const RedisSMQ = require('rsmq');

const intervals = [
  100,
  200,
  500,
  1000,
  2000,
  5000
];

module.exports = class {

  constructor({ queueName, namespace, logger, host = '127.0.0.1', port = 6379 } = {}) {

    if (!(queueName)) {
      throw new Error('queueName is a required constructor parameter key')
    }

    if (!(namespace)) {
      throw new Error('namespace is a required constructor parameter key')
    }

    if (!(logger)) {
      throw new Error('logger is a required constructor parameter key')
    }

    this.ready = false;
    this.queueName = queueName;
    this.logger = logger;

    const redisClient = redis.createClient(port, host, {
      retry_strategy(options) {
        this.logger.error('Redis Connection Failed - Retrying', { options });

        if (options.total_retry_time > 1000 * 60 * 3) { //max of 3 minutes
          // End reconnecting after a specific timeout and flush all commands with a individual error
          this.logger.error('Redis Retry time exhausted - exiting process');
          process.kill(process.pid, 'SIGTERM');
        }
        // reconnect after
        return Math.max(Math.pow(2, options.attempt), 1000); //eslint-disable-line no-restricted-properties
      }
    });

    // hookup redis client event handlers
    redisClient.on('error', error => this.logger.info('Redis error', { error }));
    redisClient.on('connect', () => this.logger.info('Connected to redis', { host, queueName: this.queueName }));
    redisClient.on('reconnecting', () => {
      this.logger.info('Lost connection to redis - attempting to reconnect', { host, queueName: this.queueName });
      this.ready = false;
    });
    redisClient.on('ready', () => {
      this.logger.info('Redis client is ready - initialising queues', { queueName: this.queueName });

      this.rsmq
        .listQueuesAsync()
        .then((qs) => {
          if (!(_.includes(qs, this.queueName))) {
            this.logger.info('Not found delayed queue on redis - creating', { queueName: this.queueName });
            return this.rsmq.createQueueAsync({
              qname: this.queueName
            });
          } else {
            this.logger.info('found delayed queue on redis', { queueName: this.queueName });
          }
        })
        .then(() => (this.ready = true))
        .catch(error => this.logger.error('Error listing Queues', { error }));
    });

    this.rsmq = Bluebird.promisifyAll(new RedisSMQ({
      client: redisClient,
      ns: namespace
    }));

  }

  getMessage() {
    let intervalIdx = 0;

    return new Bluebird((resolve, reject) => {
      this.logger.info('Waiting for Queue Message', { queueName: this.queueName });

      setTimeout(internalGetMessage.bind(this), intervals[0]);

      function internalGetMessage() {
        if (this.ready) {
          this.rsmq
            .popMessageAsync({
              qname: this.queueName
            })
            .then((msg) => {
              if (_.isEmpty(msg)) {
                if (intervalIdx < (intervals.length - 1)) {
                  intervalIdx += 1;
                }

                this.logger.debug('getMessage tick',{  queueName: this.queueName, intervalIdx} );
                setTimeout(internalGetMessage.bind(this), intervals[intervalIdx]);
              } else {
                intervalIdx = 0;
                this.logger.info('Received message', { queueName: this.queueName, queueMessage: msg });

                try {
                  const message = JSON.parse(msg.message);
                  const { id: queueId } = msg;

                  resolve({ message, queueId });
                } catch (error) {
                  this.logger.error('Could not parse the message payload - not processing', {
                    error,
                    queueMessage: msg
                  });
                }
              }
            })
            .catch(reject);
        } else {
          // give it a second to init rsmq
          setTimeout(internalGetMessage.bind(this), 1000);
        }
      }
    });
  }

  addMessage(message, delay=0) {
    return new Bluebird((resolve, reject) => {
      if (this.ready) {
        addMessage.call(this);
      } else {
        const interval = setInterval(() => {
          if (this.ready) {
            clearInterval(interval);
            addMessage.call(this);
          }
        }, 500);
      }
      //
      function addMessage() {
        return this.rsmq
          .sendMessageAsync({
            qname: this.queueName,
            message: JSON.stringify(message),
            delay
          })
          .then(resolve)
          .catch(reject);
      }
    });
  }

};
