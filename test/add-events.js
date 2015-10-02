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
  let stubs = {};

  beforeEach(() => {
    from = {
      hostname: 'a',
      port: 1,
      key: __filename
    };

    to = {
      username: 'me',
      hostname: 'b',
      port: 2
    };

    logger = { info: () => {}, error: () => {} };

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
  });

  afterEach(() => {
    for (let stub in stubs) {
      stubs[stub].restore();
    }

    Adit.__set__('net', oldNet);
  });

  it('should deal with "tcp connection"', () => {
    let stream = {
      pipe: sinon.stub(),
      pause: sinon.stub(),
      resume: sinon.stub()
    };

    let socket = {
      pipe: sinon.stub()
    };

    let net = {
      connect: sinon.stub().returns(socket)
    };

    adit.addEvents();

    Adit.__set__('net', net);

    adit.connection.emit('tcp connection', 1, () => {
      return stream;
    }, 2);

    expect(stream.pause.calledOnce).to.equal(true);
    expect(net.connect.calledOnce).to.equal(true);

    let args = net.connect.getCall(0).args;

    expect(args[0]).to.equal(1);
    expect(args[1]).to.equal('a');

    expect(stream.resume.callCount).to.equal(0);

    args[2].call();

    expect(stream.pipe.getCall(0).args[0]).to.equal(socket);
    expect(socket.pipe.getCall(0).args[0]).to.equal(stream);
    expect(stream.resume.callCount).to.equal(1);
  });

  it('should close all streams', () => {
    let stream1 = {
      pipe: sinon.stub(),
      pause: sinon.stub(),
      resume: sinon.stub(),
      end: sinon.stub()
    };

    let stream2 = {
      pipe: sinon.stub(),
      pause: sinon.stub(),
      resume: sinon.stub(),
      end: sinon.stub()
    };

    let socket = {
      pipe: sinon.stub(),
      end: sinon.stub()
    };

    let net = {
      connect: sinon.stub().returns(socket)
    };

    adit.addEvents();

    Adit.__set__('net', net);

    adit.connection.emit('tcp connection', 1, () => {
      return stream1;
    }, 2);

    adit.connection.emit('tcp connection', 1, () => {
      return stream2;
    }, 2);

    adit.connection.emit('close');

    expect(stream1.end.callCount).to.equal(1);
    expect(stream2.end.callCount).to.equal(1);
    expect(socket.end.callCount).to.equal(2);
  });

  it('should deal with "ready" event', () => {
    stubs = {
      info: sinon.stub(logger, 'info')
    };

    adit.addEvents();
    adit.connection.emit('ready');

    let args = logger.info.getCall(0).args;
    expect(args[0]).to.equal('Connection to %s:%s is established');
    expect(args[1]).to.equal('b');
    expect(args[2]).to.equal(2);

    args = adit.connection.forwardIn.getCall(0).args;
    expect(args).to.contain('b', 2);

    expect(args[2]).to.be.a('function');
  });

  it('should correctly deal with error of "connection#forwardIn" method', () => {
    stubs = {
      error: sinon.stub(logger, 'error')
    };

    adit.addEvents();
    adit.connection.emit('ready');

    let args = adit.connection.forwardIn.getCall(0).args;
    expect(args[2]).to.be.a('function');

    args[2].call(this, {
      message: 'test'
    });

    expect(stubs.error.getCall(0).args[0]).to.equal('Forwarding issue %s');
    expect(stubs.error.getCall(0).args[1]).to.equal('test');
  });

  it('should correctly execute "connection#forwardIn" method', () => {
    stubs = {
      error: sinon.stub(logger, 'error')
    };

    adit.addEvents();
    expect(adit.promise.isResolved()).to.equal(false);
    adit.connection.emit('ready');

    let args = adit.connection.forwardIn.getCall(0).args;
    expect(args[2]).to.be.a('function');

    args[2].call(this);

    expect(stubs.error.callCount).to.equal(0);
    expect(adit.promise.isResolved()).to.equal(true);
  });

  it('should deal with "error" event', () => {
    stubs = {
      error: sinon.stub(logger, 'error'),
      reTry: sinon.stub(adit, 'reTry')
    };

    adit.addEvents();

    adit.connection.emit('error', {
      message: 'test'
    });

    expect(stubs.error.getCall(0).args[0]).to.equal('Connection error %s');
    expect(stubs.error.getCall(0).args[1]).to.equal('test');
    expect(stubs.reTry.calledOnce).to.equal(true);
  });

  it('should deal with "close" event without error', () => {
    stubs = {
      error: sinon.stub(logger, 'error'),
      info: sinon.stub(logger, 'info'),
      reTry: sinon.stub(adit, 'reTry')
    };

    adit.addEvents();

    adit.connection.emit('close');

    expect(stubs.error.callCount).to.equal(0);
    expect(stubs.info.calledOnce).to.equal(true);
    expect(stubs.info.getCall(0).args[0]).to.equal('Connection closed');
  });

  it('should deal with "close" event with error', () => {
    stubs = {
      error: sinon.stub(logger, 'error'),
      info: sinon.stub(logger, 'info'),
      reTry: sinon.stub(adit, 'reTry')
    };

    adit.addEvents();

    adit.connection.emit('close', {
      message: 'test'
    });

    expect(stubs.info.callCount).to.equal(0);
    expect(stubs.error.calledOnce).to.equal(true);

    expect(stubs.error.getCall(0).args[0]).to.equal('Connection error %s');
    expect(stubs.error.getCall(0).args[1]).to.equal('test');
  });
});
