[![Build Status](https://travis-ci.org/markelog/adit.svg?branch=master)](https://travis-ci.org/markelog/adit)

Adit
========================

Forward all your stuff through ssh tunnel

## Usage

```js
import Adit from 'adit';

let adit = new Adit({

  // From
  hostname: `example.com`,
  port: 80
}, {

  // To
  hostname: `example.biz`,

  // Or port range - [80, 85], 
  // in case we would want to try another port if first one fails
  port: 80

}, log /* Custom logger, if not provided, `console` will be used */);

adit.open(3 /* How many times we want to try to connect, before bailing out */);

adit.promise // Resolved when connected 

// Then, after awhile, you would want to close it
adit.close();
```

After this, all your request will be forwarded to remote server and back again.

## Why?
In some cases, your might be developing locally with 3-rd party interaction, like if you starting karma launcher through webdriver or if your service should receive requests from third party which doesn't have access to your local server, but do have access to your remote one.

In such case, you could forward your requests through that server.

## Authentification strategy
* If `password` is defined - use it
* If `agent` or `key` is defined explicitly - use one of them, prioritize the `agent`
* If `agent` or `key` is not passed - use environment varibles (`SSH_AUTH_SOCK` for `agent`) if deinfed, prioritize the `agent`
Note: if `key` is used, assume it is added without passphrase, otherwise you should use `agent`

## Examples
* [karma](https://github.com/markelog/karma-webdriver-over-ssh-launcher)
