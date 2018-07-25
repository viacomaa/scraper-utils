const _ = require('lodash');
const Bluebird = require('bluebird');

module.exports = function(fn, {
  onTimeout,
  onFatal,
  processTimeout,
  restartOnHang,
  logger,
  maxErrors = 5,
  numProcesses = 1
}) {
  const processes = _.times(numProcesses, proc => proc);

  return new Bluebird(() => {
    let errors = 0;
    let running = true;

    function loop() {
      Bluebird
        .map(processes, (processNum) => {
          const start = Date.now();

          return Bluebird
            .try(() => fn())
            // each process has a max time to complete - it is stuck if it triggers the timeout
            .timeout(processTimeout)
            .tap(() => (errors = 0))
            .tap(() => logger.info(`process ${processNum} completed in ${Date.now() - start}ms`))
            .catch(Bluebird.TimeoutError, () => {
              if (restartOnHang) {
                running = false;
              }
              return onTimeout(processNum);
            });

        })
        .catch((e) => {
          errors += 1;
          logger.error(`Caught loop error ${errors}`, e, e.stack);

          if (errors > maxErrors) {
            // something pretty bad has happened - shutdown the app
            running = false;
            return onFatal();
          }
        })
        .finally(() => running && setTimeout(loop));
    }

    loop();
  });
};
