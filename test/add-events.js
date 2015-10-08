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

  describe('tcp connection', () => {
    let connectArgs;

    beforeEach(() => {
      adit.connection.emit('tcp connection', 1, () => {
        return stream;
      }, 2);

      connectArgs = net.connect.firstCall.args;
      connectArgs[2].call();
    });

    it('should connect to `from` host/port', () => {

      // port
      expect(connectArgs[0]).to.equal(1);
      expect(connectArgs[1]).to.equal('from-host');
    });

    it('should perform actions: stream.pause -> net.connect -> stream.resume', () => {
      sinon.assert.callOrder(stream.pause, net.connect, stream.resume);
    });

    it('should pass socket to stream', () => {
      expect(stream.pipe.firstCall.args[0]).to.equal(socket);
      expect(socket.pipe.firstCall.args[0]).to.equal(stream);
    });

    it('should pass stream to socket', () => {
      expect(stream.pipe.firstCall.args[0]).to.equal(socket);
    });

    it('should resume the stream', () => {
      expect(stream.resume.callCount).to.equal(1);
    });
  });

  it('should close all streams at tunnel close', () => {
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

  describe('"ready" event', () => {
    beforeEach(() => {
      adit.connection.emit('ready');
    });

    it('should output info to the console', () => {
      let args = logger.info.firstCall.args;
      expect(args[0]).to.equal('Connection to %s:%s is established');
      expect(args[1]).to.equal('to-host');
      expect(args[2]).to.equal(2);
    });

    it('should forward everything to target host', () => {
      let args = adit.connection.forwardIn.firstCall.args;

      expect(args).to.contain('to-host', 2);
      expect(args[2]).to.be.a('function');
    });

    it('should handle error passed to "connection#forwardIn" method', () => {
      let args = adit.connection.forwardIn.firstCall.args;

      // Pass the error
      args[2].call(this, {
        message: 'test'
      });

      expect(logger.error.firstCall.args[0]).to.equal('Forwarding issue %s');
      expect(logger.error.firstCall.args[1]).to.equal('test');
    });

    it('should not be ready', () => {
      expect(adit.promise.isResolved()).to.equal(false);
    });

    describe('"connection#forwardIn" method', () => {
      let forwardInArgs;

      beforeEach(() => {
        forwardInArgs = adit.connection.forwardIn.firstCall.args;

        // Third argument is a funarg which deals with the event
        forwardInArgs[2].call(this);
      });

      it('should pass funarg as second argument', () => {
        expect(forwardInArgs[2]).to.be.a('function');
      });

      it('should not output error in the console', () => {
        expect(logger.error.callCount).to.equal(0);
      });

      it('should resolve adit promise', () => {
        expect(adit.promise.isResolved()).to.equal(true);
      });
    });
  });

  describe('"error" event', () => {
    beforeEach(() => {
      adit.connection.emit('error', {
        message: 'test'
      });
    });

    it('should output error log to the console', () => {
      expect(logger.error.firstCall.args[0]).to.equal('Connection error %s');
      expect(logger.error.firstCall.args[1]).to.equal('test');
    });

    it('should try to reconnect', () => {
      expect(adit.reTry.calledOnce).to.equal(true);
    });
  });

  describe('"close" event', () => {
    it('should output logs when event is emitted without message', () => {
      adit.connection.emit('close');

      expect(logger.error.callCount).to.equal(0);
      expect(logger.info.calledOnce).to.equal(true);
      expect(logger.info.firstCall.args[0]).to.equal('Connection closed');
    });

    it('should output logs when event is emitted with message', () => {
      adit.connection.emit('close', {
        message: 'test'
      });

      expect(logger.info.callCount).to.equal(0);
      expect(logger.error.calledOnce).to.equal(true);

      expect(logger.error.firstCall.args[0]).to.equal('Connection error %s');
      expect(logger.error.firstCall.args[1]).to.equal('test');
    });
  });
});
