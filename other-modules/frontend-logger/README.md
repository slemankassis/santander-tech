# logger

> A simple and fast logging module for Node.js applications.

## Installation

```
npm install frontend-logger
```

## Usage
```js
/**
 * Module dependencies
 */
const logger = require('frontend-logger');

/**
 * Create a new instance of logger
 */
const log = logger('myapp');

/**
 * Log some message.
 */
log.info('Log a custom message.');
// 2016-11-22T19:42:34.872Z - info: Log a custom message - [name:myapp] [level:INFO]

/**
 * Log some message with tags for Kibana.
 */
log.info('Log a custom message.', { site: 'MLA' });
// 2016-11-22T19:42:34.872Z - info: Log a custom message - [name:myapp] [site:MLA] [level:INFO]

/**
 * Log some error
 */
log.error(err, { site: 'MLA' });
// 2016-11-22T20:54:46.390Z - error: Error: Cannot find module 'foo' - [name:myapp] [site:MLA] [level:ERROR]
```

## API

### logger([name])
- `name`: String - You can specify a name for your logger instance when creating it.

### logger#info(message[, tags])
### logger#warn(message[, tags])
### logger#error(message[, tags])
### logger#verbose(message[, tags])
### logger#debug(message[, tags])
### logger#silly(message[, tags])

- `message`: String | Error - A message or error to be logged.
- `tags`: Object - An optional object of tags for Kibana.

## Using Logging Levels

The logger use the `info` level by default. But, you may define a maximum level of messages that the logger should log.

You should set the environment variable `LOG_LEVEL` with any of the following values:

- `error`
- `warn`
- `info`
- `verbose`
- `debug`
- `silly`

Like `npm` logging levels are prioritized from 0 to 5 (highest to lowest):

```
{
  error: 0,
  warn: 1,
  info: 2,
  verbose: 3,
  debug: 4,
  silly: 5
}
```

## License

Copyright © 2017.
