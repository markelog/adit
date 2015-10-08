import EventEmitter from 'events';

import sinon from 'sinon';
import { expect } from 'chai';
import rewire from 'rewire';
import * as oldNet from 'net';

let Adit = rewire('..');

describe('Adit#addEvents', () => {
  let to;
  let from;
  let logger;
  let adit;
  let stream;
  let stream2;
  let socket;
  let net;

  beforeEach(() => {
    stream = {
      pipe: sinon.stub(),
      pause: sinon.stub(),
      resume: sinon.stub(),
      end: sinon.stub()
    };

    stream2 = {
      pipe: sinon.stub(),
      pause: sinon.stub(),
      resume: sinon.stub(),
      end: sinon.stub()
    };

    socket = {
      pipe: sinon.stub(),
      end: sinon.stub()
    };

    net = {
      connect: sinon.stub().returns(socket)
    };

    from = {
      hostname: 'from-host',
      port: 1
    };

    to = {
      username: 'me',
      hostname: 'to-host',

      // So it wouldn't throw on machines without env varibles
      password: 'pass',
      port: 2
    };

    Adit.__set__('net', net);
    sinon.stub(Adit.prototype, 'reTry');

    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    };

    adit = new Adit(from, to, logger);

    let EE;

    // For Node .10
    if (typeof EventEmitter === 'object') {
      EE = EventEmitter.EventEmitter;
    } else {
      EE = EventEmitter;
    }

    adit.connection = new EE();
    adit.connection.forwardIn = sinon.stub();
    adit.addEvents();
  });

  afterEach(() => {
    Adit.__set__('net', oldNet);
    Adit.prototype.reTry.restore();
  });

  it('should deal with "tcp connection"', () => {

    adit.connection.emit('tcp connection', 1, () => {
      return stream;
    }, 2);

    expect(stream.pause.calledOnce).to.equal(true);
    expect(net.connect.calledOnce).to.equal(true);

    let args = net.connect.firstCall.args;

    expect(args[0]).to.equal(1);
    expect(args[1]).to.equal('from-host');

    expect(stream.resume.callCount).to.equal(0);

    args[2].call();

    expect(stream.pipe.firstCall.args[0]).to.equal(socket);
    expect(socket.pipe.firstCall.args[0]).to.equal(stream);
    expect(stream.resume.callCount).to.equal(1);
  });

  it('should close all streams', () => {

    adit.connection.emit('tcp connection', 1, () => {
      return stream;
    }, 2);

    adit.connection.emit('tcp connection', 1, () => {
      return stream2;
    }, 2);

    adit.connection.emit('close');

    expect(stream.end.callCount).to.equal(1);
    expect(stream2.end.callCount).to.equal(1);
    expect(socket.end.callCount).to.equal(2);
  });

  it('should deal with "ready" event', () => {
    adit.connection.emit('ready');

    let args = logger.info.firstCall.args;
    expect(args[0]).to.equal('Connection to %s:%s is established');
    expect(args[1]).to.equal('to-host');
    expect(args[2]).to.equal(2);

    args = adit.connection.forwardIn.firstCall.args;
    expect(args).to.contain('to-host', 2);

    expect(args[2]).to.be.a('function');
  });

  it('should correctly deal with error of "connection#forwardIn" method', () => {
    adit.connection.emit('ready');

    let args = adit.connection.forwardIn.firstCall.args;
    expect(args[2]).to.be.a('function');

    args[2].call(this, {
      message: 'test'
    });

    expect(logger.error.firstCall.args[0]).to.equal('Forwarding issue %s');
    expect(logger.error.firstCall.args[1]).to.equal('test');
  });

  it('should correctly execute "connection#forwardIn" method', () => {
    expect(adit.promise.isResolved()).to.equal(false);
    adit.connection.emit('ready');

    let args = adit.connection.forwardIn.firstCall.args;
    expect(args[2]).to.be.a('function');

    args[2].call(this);

    expect(logger.error.callCount).to.equal(0);
    expect(adit.promise.isResolved()).to.equal(true);
  });

  it('should deal with "error" event', () => {
    adit.connection.emit('error', {
      message: 'test'
    });

    expect(logger.error.firstCall.args[0]).to.equal('Connection error %s');
    expect(logger.error.firstCall.args[1]).to.equal('test');
    expect(adit.reTry.calledOnce).to.equal(true);
  });

  it('should deal with "close" event without error', () => {

    adit.connection.emit('close');

    expect(logger.error.callCount).to.equal(0);
    expect(logger.info.calledOnce).to.equal(true);
    expect(logger.info.firstCall.args[0]).to.equal('Connection closed');
  });

  it('should deal with "close" event with error', () => {

    adit.connection.emit('close', {
      message: 'test'
    });

    expect(logger.info.callCount).to.equal(0);
    expect(logger.error.calledOnce).to.equal(true);

    expect(logger.error.firstCall.args[0]).to.equal('Connection error %s');
    expect(logger.error.firstCall.args[1]).to.equal('test');
  });
});
