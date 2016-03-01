[![Build Status](https://travis-ci.org/markelog/adit.svg?branch=master)](https://travis-ci.org/markelog/adit)

Adit
========================

Forward all your stuff through ssh tunnel

## Usage

```js
import Adit from 'adit';

let adit = new Adit({

  // From
  host: `example.com`,
  // username: 'tester' // By default, `USER` environment variable will be used

  // port: 22, // 22 By default
  // Or port range - 
  // port: [22, 23], the first available port, of the three, will be used

  // Also, see "Authentification strategy" below
});

// Or just
let adit = new Adit(`example.com`);

// `3` is how many times we want to try to connect, before bailing out */
adit.open(3).then(connection => {
  // At this point we established connection with remote server

  // Forward all connections from remote server to local one
  connection.in(`example.com`, 8000);

  // Or use port range
  // connection.in(`example.com`, [8000, 8010]);
}, error => {
  console.error(error);
});

// Then, after awhile, you would want to close it
adit.close();
```

After this, all your request will be forwarded to remote server and back again.

## Why?
### Karma webdriver example
You have access to remote server - `A`
Selenium grid **doesn't** have access to your local machine
Selenium grid **does** have access to remote server - `A`
Use this package to forward http requests from `example.com:80` to your `127.0.0.1:8000`, so
when browser from grid would go to `127.0.0.1:8000` instead of `example.com:80`, like this -
```js
new Adit('example.com').open().then(connection => {
  connection.in(`example`, 80).then(() => {
    // Forwarding is enabled
  });
});

### Examples
* [karma](https://github.com/markelog/karma-webdriver-over-ssh-launcher)

## Authentification strategy
* If `password` is defined - use it
* If `agent` or `key` is defined explicitly - use one of them, prioritize the `agent`
* If `agent` or `key` is not passed - use environment varibles (`SSH_AUTH_SOCK` for `agent`) if deinfed, prioritize the `agent`
Note: if `key` is used, assume it is added without passphrase, otherwise you should use `agent`

## Examples
* [karma](https://github.com/markelog/karma-webdriver-over-ssh-launcher)
