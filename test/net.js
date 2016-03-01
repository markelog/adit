import EventEmitter from 'events';
import * as oldNet from 'net';

import sinon from 'sinon';
import { expect } from 'chai';

import Adit from '../index.js';

describe('net', () => {
  let to;
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

    to = {
      username: 'me',
      host: 'to-host',

      // So it wouldn't throw on machines without env varibles
      password: 'pass',
      port: 1
    };

    Adit.net = net;
    sinon.stub(Adit.prototype, 'reTry');

    adit = new Adit(to);

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
    Adit.net = oldNet;

    if (Adit.prototype.reTry.restore) {
      Adit.prototype.reTry.restore();
    }
  });

  describe('Adit#open', () => {
    beforeEach(() => {
      sinon.spy(Adit.prototype, 'addEvents');
      sinon.stub(Adit.prototype, 'connect');

      // We need to this, in order for `events` module to no throw "Uncaught error"
      adit.on('error', () => {});
    });

    afterEach(() => {
      Adit.prototype.connect.restore();
      Adit.prototype.addEvents.restore();
    });

    it('should return promise', () => {
      expect(adit.open(2)).to.have.property('then');
    });

    it('should connect and attach events', () => {
      adit.open(2);

      expect(adit.connect.calledWith(2)).to.equal(true);
      expect(adit.addEvents.called).to.equal(true);
    });

    it('should resolve connect promise', done => {
      adit.open(2).then(connection => {
        expect(connection).to.equal(adit.connection);

        done();
      });

      adit.connection.emit('tcp connection', 1, () => {
        return stream;
      }, 2);

      adit.connection.emit('ready', 1, () => {}, 2);
    });

    it('should try to re-connect twice', done => {
      adit.open(2).then(() => {
        expect(Adit.prototype.reTry.calledTwice).to.equal(true);

        done();
      });

      adit.connection.emit('error', 1, () => {});
      adit.connection.emit('error', 1, () => {}, 2);
      adit.connection.emit('ready', 1, () => {}, 2);
    });

    it('should try to re-connect no more then twice', done => {
      Adit.prototype.reTry.restore();

      adit.open(2).then(null, () => {
        done();
      });

      adit.connection.emit('error', 1, () => {});
      adit.connection.emit('error', 1, () => {}, 2);
      adit.connection.emit('error', 1, () => {}, 2);
    });
  });

  describe('Adit#in', () => {
    let connect;
    beforeEach(() => {
      connect = adit.in('test', 22);
      sinon.stub(adit.events, 'emit');
    });

    afterEach(() => {
      adit.events.emit.restore();
    });

    it('should establish connections from remote server', () => {
      adit.connection.forwardIn.calledWith('test', 22);
    });

    it('should return promise', () => {
      expect(connect.then).to.be.a('function');
    });

    it('should emit error', () => {
      let thirdArgument = adit.connection.forwardIn.firstCall.args[2];

      thirdArgument('test');

      adit.events.emit.calledWith('test');
    });

    it('should reject "in" promise', () => {
      let thirdArgument = adit.connection.forwardIn.firstCall.args[2];

      thirdArgument('test');

      return connect.then(null, error => {
        expect(error).to.equal('test');
      });
    });

    it('should use port range', () => {
      adit.in('test', [20, 25]);

      let secondArgument = adit.connection.forwardIn.firstCall.args[1];

      expect(secondArgument).to.be.within(20, 25);
    });
  });

  describe('events', () => {
    beforeEach(() => {
      adit.addEvents();
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

      it('should connect to host/port', () => {

        // port
        expect(connectArgs[0]).to.equal(1);
        expect(connectArgs[1]).to.equal('to-host');
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

      it('should be ready', () => {
        expect(adit.promise.isResolved()).to.equal(true);
      });
    });

    describe('"error" event', () => {
      it('should try to reconnect', () => {
        adit.events.on('error', () => {});
        adit.connection.emit('error', { test: 1 });
        expect(adit.reTry.called).to.equal(true);
      });

      it('should catch correct error', done => {
        adit.events.on('error', check => {
          expect(check.test).to.equal(1);

          done();
        });

        adit.connection.emit('error', { test: 1 });
      });
    });

    describe('"close" event', () => {
      it('should catch correct error', done => {
        let test = { test: 1 };

        adit.events.on('close', check => {
          expect(check.test).to.equal(1);

          done();
        });

        adit.connection.emit('close', test);
      });
    });
  });
});
