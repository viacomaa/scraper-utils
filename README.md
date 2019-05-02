# Common Utilities

This repo contains a number of utility functions used by [Match Scrapper apps](https://github.com/WhoSay/dataslinger/tree/master/stream) 

Common low level utilities used in various WHOSAY microservices. 

## Logger

A [winston](https://github.com/winstonjs/winston/tree/2.x) based logger with common configurations.

## Queue Manager

An [RSMQ](https://github.com/smrchy/rsmq) based queue manager that manages interprocess communications 
between the scrapper apps.


## Promise Looper

A [Bluebird](http://bluebirdjs.com/docs/getting-started.html) based promise looper that
manages task concurrency but also detects and reports on hung tasks.
