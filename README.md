# Common Utilities

Common low level utilities used in various WHOSAY microservices. 

This repo contains a number of utility functions used by [Match Scrapper apps](https://github.com/WhoSay/dataslinger/tree/master/stream) 
and this repo acts like an [NPM package](https://github.com/WhoSay/dataslinger/tree/master/stream/collectors/package.json#L29). 

## Logger

A [winston](https://github.com/winstonjs/winston/tree/2.x) based logger with common configurations.

## Queue Manager

An [RSMQ](https://github.com/smrchy/rsmq) based queue manager that manages interprocess communications 
between the scrapper apps.


## Promise Looper

A [Bluebird](http://bluebirdjs.com/docs/getting-started.html) based promise looper that
manages task concurrency but also detects and reports on hung tasks.
