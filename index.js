require('babel-polyfill');

import * as path from 'path';
import {readFileSync as read} from 'fs';
import * as net from 'net';

import Connection from 'ssh2';
import { extend } from 'lodash';
import * as vow from 'vow';

const defer = Symbol();

export default class Adit {

  /**
   * Define all needed properties
   * @param {Object} from
   * @param {String} from.hostname
   * @param {Number} from.port
   * @param {String} [from.password]
   * @param {String} [from.agent]
   * @param {String} [from.key]
   * @param {Object} to
   * @param {String} to.hostname
   * @param {Number | Array} [to.port = 8000] - number or range
   * @param {String} to.username
   * @return {Adit}
   */
  constructor(from, to, logger) {
    /**
     * Deferred object which we will resolve when connect to the remote host
     * @private
     * @type {Object}
     */
    this[defer] = vow.defer();

    /**
     * What hostname/port should we forward from?
     * @protected
     * @type {Object}
     */
    this._from = extend({}, from);

    /**
     * What hostname/port should we forward to?
     * @protected
     * @type {Object}
     */
    this._to = extend({}, to);

    /**
     * Original port range, needed if we infact received port range,
     * so we could extract new port for new connection
     * @protected
     * @type {Number | Array}
     */
    this._portRange = to.port;
    this._to.port = Adit.getPort(this._portRange);

    /**
     * Username of the remote host
     * @type {String}
     */
    this._username = to.username || process.env.USER || '';

    /**
     * User password
     * @protected
     * @type {String | null}
     */
    this._password = to.password || null;

    /**
     * Path to ssh-agent socket
     * @protected
     * @type {String | null}
     */
    this._agent = from.agent || process.env.SSH_AUTH_SOCK || null;

    /**
     * Authorization key
     * @protected
     * @type {Buffer | null}
     */
    this._key = null;

    // Authentification strategy
    // If password is defined - use it
    // If agent or key is defined explicitly - use one of them, prioritize the agent
    // If agent or key is not passed - use environment varible if deinfed, prioritize the agent
    // Note: if key is used, assume it is added without passphrase, otherwise you should use agent
    if (this._password) {
      this._key = this._agent = null;

    } else if (!from.agent && !from.password && from.key) {
      this._key = read(from.key);
      this._agent = null;

    } else if (!this._agent && !this._password && process.env.HOME) {
      this._key = read(path.join(process.env.HOME, '.ssh', 'id_rsa'));
    }

    if (!this._password && !this._agent && !this._key) {
      throw new Error(
        'SSH-agent is not enabled, private key doesn\'t exist \n' +
        'and password is not provided we need at least one of those things'
      );
    }

    /**
     * How many times should we try to reconnect?
     * @protected
     * @type {Number}
     */
    this._retryTimes = 0;

    /**
     * Promise object which will be resolved when connect to the remote host
     * @type {Object}
     */
    this.promise = this[defer].promise();

    /**
     * Logger that we will use for output info
     * @type {Object}
     */
    this.logger = Adit.getLogger(logger);

    /**
     * Our ssh connection
     * @type {Object}
     */
    this.connection = new Connection();
  }

  /**
   * Do the Adit#addEvents and Adit#connect
   * @see Adit#connect
   */
  open(retryTimes = 0) {
    this.addEvents();
    this.connect(retryTimes);
  }

  /**
   * Connect to the remote server
   * @param {Number} [retryTimes = 0] - how many times can we try to connect
   */
  connect(retryTimes = 0) {
    this._retryTimes = retryTimes;

    let settings = {
      host: this._to.hostname,
      port: 22,
      username: this._username
    };

    if (this._password) {
      settings.password = this._password;

    } else if (this._agent) {
      settings.agent = this._agent;

    } else {
      settings.privateKey = this._key;
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
  _reTry() {
    // Close current connection
    this.close();

    // Try new port
    this._to.port = Adit.getPort(this._portRange);

    // Recreate the connection
    this.connection = new Connection();

    // Shot decrement
    this.open(this._retryTimes - 1);
  }

  /**
   * Try to reconnect to the remote host (has side effect)
   * @param {*} error - error that will be thrown if we don't want to try anymore
   */
  reTry(error) {
    if (this._retryTimes !== 0) {
      this.logger.info('Retrying to connect, %s tries left', this._retryTimes);
      this._reTry();

    } else {
      this[defer].reject(error);
    }
  }

  /**
   * Attach events and deal with them
   */
  addEvents() {
    let streams = [];

    this.connection.on('tcp connection', (info, accept) => {
      let socket;
      let stream = accept();

      stream.pause();

      // Connect to the socket and output the stream
      socket = net.connect(this._from.port, this._from.hostname, () => {
        stream.pipe(socket);
        socket.pipe(stream);

        stream.resume();
      });

      // Store all streams, so we can clean it up afterwards
      streams.push(socket, stream);
    });

    // Wait for remote connection
    this.connection.on('ready', () => {
      this.logger.info('Connection to %s:%s is established', this._to.hostname, this._to.port);

      // Forward all connections to remote address from local hostname and port
      this.connection.forwardIn(this._to.hostname, this._to.port, (error) => {
        if (error) {
          this.logger.error('Forwarding issue %s', error.message);

        } else {
          this[defer].resolve();
        }
      });
    });

    this.connection.on('error', (error) => {
      this.logger.error('Connection error %s', error.message);
      this.reTry();
    });

    this.connection.on('close', (error) => {
      // End all streams, to clean up event loop queue
      streams.forEach((stream) => stream.end());

      if (error) {
        this.logger.error('Connection error %s', error.message);

      } else {
        this.logger.info('Connection closed');
      }
    });
  }

  /**
   * Return logger or return default one is there is none
   * @static
   * @param {Object} [logger]
   * @return {Object}
   */
  static getLogger(logger) {
    if (logger) {
      return logger;
    }

    return {
      info: console.log.bind(console),
      error: console.error.bind(console)
    };
  }

  /**
   * Return default port or passed port or get port within the range
   * @static
   * @param {Number | Array} [port = 8000]
   * @return {Number}
   */
  static getPort(port = 8000) {
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
}
