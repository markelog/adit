# Adit [![Build Status](https://travis-ci.org/markelog/adit.svg?branch=master)](https://travis-ci.org/markelog/adit) [![Coverage Status](https://coveralls.io/repos/github/markelog/adit/badge.svg?branch=master&t=CdowK8)](https://coveralls.io/github/markelog/adit?branch=master)

Forward all your stuff through ssh tunnel.

There is a lot of examples out there how this could be useful, for example, check out "[SSH Tunnel - Local and Remote Port Forwarding Explained With Examples](http://blog.trackets.com/2014/05/17/ssh-tunnel-local-and-remote-port-forwarding-explained-with-examples.html)"

## Usage

### ssh and `Adit`
```sh
$ ssh -L 9000:imgur.com:80 example.com
```

```js
new Adit('9000:imgur.com:80 example.com'/*, password*/).forward().then(adit => {
  console.log('success');

  adit.close();
});
```

`$ ssh -R 9000:localhost:3000 example.com`

```js
new Adit('9000:localhost:3000 example.com'/*, password*/).reverse().then(adit => {
  console.log('success');

  adit.close();
});
```
### Listen for events
```js
let server = new Adit(...);
server.on('ready', ...);
server.on('tcp connection', ...)
server.on('error', ...);
server.on('data', ...);

server.forward(...).then(...);
```

### Thorough  

```js
import Adit from 'adit';

let adit = new Adit({
  
  host: `example.com`

  // Everything else is optional
  // username: 'tester' // By default, `USER` environment variable will be used

  // port: 22, // 22 By default
  // Or port range - 
  // port: [22, 23], the first available port of the three will be used

  // Also, see "Authentification strategy" below - 
  // "agent": "path",
  // "password": "pass",
  // "key": Buffer
});

// Or just
let adit = new Adit('example.com');

// `3` - is how many times we want to try to connect, before bailing out */
adit.open(3).then(connection => {
  // At this point we established connection with remote server

  // Forward all connections from **local** server to remote one
  connection.out({
    // from
    host: 'example.com'
    port: 80
  }, {
    // To
    host: 'localhost'
    port: 8080,
    // Or port range - 
    // port: [25, 28], the first available port of the three will be used
  }).then(() => {
    // Forwarding is enabled
  });

  // Forward all connections from **remote** server to local one
  connection.in({
    // from
    host: 'example.com'
    port: 80,
    // Or port range - 
    // port: [25, 28], the first available port of the three will be used
  }, {
    // To
    host: 'localhost'
    port: 8080
  }).then(() => {
    // Forwarding is enabled
  });
}, error => {
  console.error(error);
});

adit.on('error', () => {
  // Report error
});

// Then, after awhile you would want to close it
adit.close();
```

## Authentification strategy
* If `password` is defined - use it
* If `agent` or `key` is defined explicitly - use one of them, prioritize the `agent`
* If `agent` or `key` is not passed - use environment varibles (`SSH_AUTH_SOCK` for `agent`) 

Note: if `key` is used, assume it is added without passphrase, otherwise you should use `agent`

