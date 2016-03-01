require('babel-polyfill');

import * as path from 'path';
import { readFileSync as read } from 'fs';
import * as net from 'net';
import { EventEmitter } from 'events';

import { extend } from 'lodash';
import Connection from 'ssh2';
import * as vow from 'vow';

const defer = Symbol();
const inDefer = Symbol();
const outDefer = Symbol();
const retryTimes = Symbol();

export default class Adit {

  /**
   * @private
   * @type {Net}
   */
  static net = net;

  /**
   * @static
   * @type {Connection}
   */
  static Connection = Connection;

  /**
   * @static
   * @type {Function}
   */
  static read = read;

  /**
   * Return default port or passed port or get port within the range
   * @static
   * @param {Number | Array} port
   * @return {Number}
   */
  static getPort(port) {
    if (Array.isArray(port)) {
      return Adit.getRandom(port[0], port[1]);
    }

    return port;
  }

  /**
   * Get random number
   * @static
   * @param {Number} min
   * @param {Number} max
   * @return {Number}
   */
  static getRandom(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
  }

  /**
   * Simplify port set
   * @static
   * @param {Object} from
   * @param {Object} to
   * @return {Object}
   */
  static getAddresses(from, to) {
    from = extend({
      port: Adit.getPort(from.port)
    }, from);
    to = extend({
      port: Adit.getPort(to.port)
    }, to);

    return { from, to };
  }

  /**
   * @constructor
   * @param {String} settings.username
   * @param {Number | Array} [port] - number or range
   * @param {String} [settings.password]
   * @param {String} [settings.agent]
   * @param {String} [settings.key]
   * @param {String} settings.hostname
   * @return {Adit}
   */
  constructor(settings) {
    if (typeof settings === 'string') {
      settings = { host: settings };
    }

    /**
     * Deferred object which we will resolve when connect to the remote host
     * @private
     * @type {Object}
     */
    this[defer] = vow.defer();

    /**
     * Deferred object which we will resolve when forwarding to *remote* host is established
     * @private
     * @type {Object}
     */
    this[inDefer] = vow.defer();

    /**
     * Deferred object which we will resolve when forwarding to *local* host is established
     * @private
     * @type {Object}
     */
    this[outDefer] = vow.defer();

    /**
     * Host name/address
     * @type {String}
     */
    this.host = settings.host;

    /**
     * Original port range, needed if we infact received port range,
     * so we could extract new port for new connection
     * @type {Number | Array}
     */
    this.portRange = settings.port || 22;

    /**
     * Currently used port
     * @type {Number}
     */
    this.port = Adit.getPort(this.portRange);

    /**
     * Store all streams, so we could clean up event loop queue
     * @type {Array}
     */
    this.streams = [];

    /**
     * Username of the remote host
     * @type {String}
     */
    this.username = settings.username || process.env.USER || '';

    /**
     * User password
     * @type {String | null}
     */
    this.password = settings.password || null;

    /**
     * Path to ssh-agent socket
     * @type {String | null}
     */
    this.agent = settings.agent || process.env.SSH_AUTH_SOCK || null;

    /**
     * Authorization key
     * @type {Buffer | null}
     */
    this.key = null;

    // Authentification strategy
    // If password is defined - use it
    // If agent or key is defined explicitly - use one of them, prioritize the agent
    // If agent or key is not passed - use environment varible if deinfed, prioritize the agent
    // Note: if key is used, assume it is added without passphrase, otherwise you should use agent
    if (this.password) {
      this.key = this.agent = null;

    } else if (!settings.agent && !settings.password && settings.key) {
      this.key = Adit.read(settings.key);
      this.agent = null;

    } else if (!this.agent && !this.password && process.env.HOME) {
      this.key = Adit.read(path.join(process.env.HOME, '.ssh', 'id_rsa'));
    }

    if (!this.password && !this.agent && !this.key) {
      throw new Error(
        'SSH-agent is not enabled, private key doesn\'t exist \n' +
        'and password is not provided we need at least one of those things'
      );
    }

    /**
     * How many times should we try to reconnect?
     * @private
     * @type {Number}
     */
    this[retryTimes] = 0;

    /**
     * Promise object which will be resolved when connect to the remote host
     * @type {Object}
     */
    this.promise = this[defer].promise();

    /**
     * Our ssh connection
     * @type {Connection}
     */
    this.connection = new Adit.Connection();

    /**
     * Event emitter
     * @type {EventEmitter}
     */
    this.events = new EventEmitter();

    /**
     * "From" connection data
     * @type {Object}
     */
    this.from = {};

    /**
     * "To" connection data
     * @type {Object}
     */
    this.to = {};

    /**
     * Event listener
     * @type {Function}
     */
    this.on = this.events.on.bind(this.events);
  }

  /**
   * Do the Adit#addEvents and Adit#connect
   * @see Adit#connect
   */
  open(retries = 0) {
    this.addEvents();
    this.connect(retries);
    return this.promise;
  }

  /**
   * Connect to the remote server
   * @param {Number} [retries = 0] - how many times can we try to connect
   */
  connect(retries = 0) {
    this[retryTimes] = retries;

    let settings = {
      host: this.host,
      port: this.port,
      username: this.username
    };

    if (this.password) {
      settings.password = this.password;

    } else if (this.agent) {
      settings.agent = this.agent;

    } else {
      settings.privateKey = this.key;
    }

    this.connection.connect(settings);
  }

  /**
   * Close connection to the remote server
   */
  close() {
    this.connection.end();
  }

   /**
   * Helper for the Adit#reTry
   * @private
   */
  _try() {
    // Close current connection
    this.close();

    // Try new port
    this.port = Adit.getPort(this.portRange);

    // Recreate the connection
    this.connection = new Adit.Connection();

    // Shot decrement
    this.open(this[retryTimes] - 1);
  }

  /**
   * Try to reconnect to the remote host (has side effect)
   * @param {*} error - error that will be thrown if we don't want to try anymore
   */
  reTry(error) {
    if (this[retryTimes] !== 0) {
      this._try();
    } else {
      this[defer].reject(error);
    }
  }

  /**
   * Define `from` addresses, sugar method
   * @param {String} address - server:port
   * @return {Instance}
   */
  from(address) {
    let [host, port] = address.split(':');

    this.from = { host, port };

    return this;
  }

  /**
   * Define `to` addresses and call relevant method, sugar method
   * @param {String} address - server:port
   * @return {Promise}
   */
  to(address) {
    let [host, port] = address.split(':');

    this.to = { host, port };

    // Decide if that is should be proxy or reverse proxy
    // TODO: there should be a better way
    if (this.host === this.from.host) {
      return this.in(this.from, this.to);
    }

    return this.out(this.from, this.to);
  }

  /**
   * Forward requests from remote server to your local one
   * @param {Object} from
   * @param {Object} to
   * @return {Promise}
   */
  in(from, to) {
    ({ from, to } = Adit.getAddresses(from, to));

    this.connection.on('tcp connection', (info, accept) => {
      let socket;
      let stream = accept();

      // Connect to the socket and output the stream
      socket = Adit.net.connect(to.port, to.host, () => {
        stream.pipe(socket);
        socket.pipe(stream);
      });

      // Store all streams, so we can clean it up afterwards
      this.streams.push(socket, stream);
    });

    this.connection.forwardIn(from.host, from.port, error => {
      if (error) {
        this.events.emit('error', error);
        this[inDefer].reject(error);
      } else {
        this[inDefer].resolve();
      }
    });

    return this[inDefer].promise();
  }

  /**
   * Forward requests from local server to remote one
   * @param {Object} from
   * @param {Object} to
   * @return {Promise}
   */
  out(from, to) {
    ({ from, to } = Adit.getAddresses(from, to));

    // Since for `forwardOut` creates only one connection, we would have to create a
    // server to pipe all requests
    Adit.net.createServer(socket => {
      this.connection.forwardOut(to.host, to.port, from.host, from.port, (error, stream) => {

        // If error reject out promise connection and propogate the error
        if (error) {
          this.events.emit('error', error);
          this[outDefer].reject(error);
          return;
        }

        // Pipe requests
        socket.pipe(stream);
        stream.pipe(socket);

        // Store all streams, so we can clean it up afterwards
        this.streams.push(socket, stream);

        // Resolve the connection
        this[outDefer].resolve(this.connection);
      });
    }).listen(from.port, from.host);

    return this[outDefer].promise();
  }

  /**
   * Attach common events and deal with them
   */
  addEvents() {
    // Wait for remote connection
    this.connection.on('ready', () => {
      this[defer].resolve(this.connection);
    });

    this.connection.on('error', error => {
      this.events.emit('error', error);
      this.reTry();
    });

    this.connection.on('close', error => {
      // End all streams, to clean up event loop queue
      this.streams.forEach(stream => stream.end());
      this.events.emit('close', error);
    });
  }
}
