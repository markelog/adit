[![Build Status](https://travis-ci.org/adit/karma-webdriver-over-ssh-launcher.svg?branch=master)](https://travis-ci.org/adit/karma-webdriver-over-ssh-launcher)

Adit
========================

Forward all your stuff through ssh tunnel

## Usage

```js
import Adit from 'adit';

let adit = new Tunnel({

  // From
  hostname: `example.com`,
  port: 80
}, {

  // To
  hostname: example.biz,

  // Or port range - [80, 85], needed in case we would want to try another port if first one fails
  port: 80

}, log /* Custom logger, if not provided, `console` will be used */);

adit.open(3 /* How many times we want to reconnect if we can't */);

// Then after awhile you would want to close the tunnel
adit.close();
```

After this, all your request will be forwarded to remote server and back again.

## Why?
In some cases, your might developing locally with 3-rd party interaction, like if you starting karma launcher through webdriver or if your service should receive requests from third party, that do not have access to your local server, but do have access your remote one.

In such case, you could forward your requests through that server.

## Examples
* [karma](https://github.com/markelog/karma-webdriver-over-ssh-launcher)
* [gemini](https://github.com/gemini-testing/gemini-tunnel)
