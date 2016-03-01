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
let adit = new Adit('example.com', 8000);

// `3` is how many times we want to try to connect, before bailing out */
adit.open(3).then(connection => {
  // At this point we established connection with remote server

  // Forward all connections from remote server to local one
  connection.in(`example.com`, 8000);

  // Or use port range
  // connection.in(`example.com`, [8000, 8010]).then(() => {
    // Forward is enabled
  });
}, error => {
  console.error(error);
});

// Then, after awhile, you would want to close it
adit.close();
```

After this, all your request will be forwarded to remote server and back again.

## Analogs to ssh commands
Analog to 

```sh
$ ssh -L 9000:localhost:5432 example.com`
```

```js
new Adit('example.com').open().then(connection => {
  connection.from('example.com:9000').to('localhost:5432').then(() => {
    // Forwarding is enabled
  });
});
```

`$ ssh -R 9000:localhost:3000 example.com`

```js
new Adit('example.com').open().then(connection => {
  connection.from('localhost:3000').to('example.com:9000').then(() => {
    // Forwarding is enabled
  });
});
```

## Authentification strategy
* If `password` is defined - use it
* If `agent` or `key` is defined explicitly - use one of them, prioritize the `agent`
* If `agent` or `key` is not passed - use environment varibles (`SSH_AUTH_SOCK` for `agent`) if deinfed, prioritize the `agent`
Note: if `key` is used, assume it is added without passphrase, otherwise you should use `agent`

