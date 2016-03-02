import { EventEmitter } from 'events';
import * as oldNet from 'net';

import sinon from 'sinon';
import chai from 'chai';

import Adit from '../index.js';

import sinonChai from 'sinon-chai';

chai.use(sinonChai);
let expect = chai.expect;

describe('net', () => {
  let to;
  let adit;
  let stream;
  let socket;

  beforeEach(() => {
    stream = {
      pipe: sinon.stub(),
      resume: sinon.stub(),
      end: sinon.stub(),
      on: sinon.stub()
    };

    socket = {
      pipe: sinon.stub(),
      end: sinon.stub(),
      on: sinon.stub()
    };

    to = {
      username: 'me',
      host: 'to-host',

      // So it wouldn't throw on machines without env varibles
      password: 'pass',
      port: 1
    };

    sinon.stub(Adit.prototype, 'reTry');

    adit = new Adit(to);

    let EE = EventEmitter;

    adit.connection = new EE();
    adit.connection = new EE();
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

      expect(adit.connect).to.be.calledWith(2);
      expect(adit.addEvents).to.be.called;
    });

    it('should resolve connect promise', done => {
      adit.open(2).then(connection => {
        expect(connection).to.equal(adit);

        done();
      });

      adit.connection.emit('tcp connection', 1, () => stream, 2);

      adit.connection.emit('ready', 1, () => {}, 2);
    });

    it('should try to re-connect twice', done => {
      adit.open(2).then(() => {
        expect(Adit.prototype.reTry).to.be.calledTrice;

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
      adit.connection.forwardIn = sinon.stub();
      Adit.net = {
        connect: sinon.stub().returns(socket)
      };

      sinon.stub(adit.events, 'emit');

      connect = adit.in(
        { host: 'test', port: 9999 },
        { host: 'tset', port: 8888 }
      );

      adit.connection.emit('tcp connection', 1, () => stream, 2);
    });

    afterEach(() => {
      adit.events.emit.restore();
    });

    it('should call forwardIn method', () => {
      expect(adit.connection.forwardIn).to.be.calledWith('test', 9999);
    });

    it('should bind stream events to adit events', () => {
      expect(stream.on).to.be.calledWith('data');
      expect(stream.on.firstCall.args[1]).to.be.a('function');
    });

    it('should attach to network', () => {
      expect(adit.connection.forwardIn).to.be.calledWith('test', 9999);
    });

    it('should return promise', () => {
      expect(connect.then).to.be.a('function');
    });

    it('should emit error', () => {
      let thirdArgument = adit.connection.forwardIn.firstCall.args[2];

      thirdArgument('test');

      expect(adit.events.emit).to.be.calledWith('error', 'test');
    });

    it('should store all streams', () => {
      expect(adit.streams.length).to.equal(2);
    });

    it('should reject "in" promise', () => {
      let thirdArgument = adit.connection.forwardIn.firstCall.args[2];

      thirdArgument('test');

      return connect.then(null, error => {
        expect(error).to.equal('test');
      });
    });

    it('should use port range for forwarding', () => {
      adit.in(
        { host: 'test', port: [9999, 10000] },
        { host: 'tset', port: 8888 }
      );

      let secondArgument = adit.connection.forwardIn.firstCall.args[1];

      expect(secondArgument).to.be.within(9999, 10000);
    });

    it('should use port range net attachment', () => {
      adit.in(
        { host: 'test', port: 9999 },
        { host: 'tset', port: [8888, 9999] }
      );

      let secondArgument = adit.connection.forwardIn.firstCall.args[1];

      expect(secondArgument).to.be.within(8888, 9999);
    });
  });

  describe('Adit#out', () => {
    let connect;
    let createServer;
    beforeEach(() => {
      createServer = {
        listen: sinon.stub()
      };

      Adit.net = {
        createServer: sinon.stub().returns(createServer)
      };

      connect = adit.out(
        { host: 'test', port: 9999 },
        { host: 'tset', port: 8888 }
      );

      adit.connection.forwardOut = sinon.stub();
    });

    it('should start a server on 9999 port', () => {
      expect(createServer.listen).to.be.calledWith(9999);
    });

    it('should return promise', () => {
      expect(connect).to.have.property('then');
    });

    it('should not return resolved promise', () => {
      expect(connect.isResolved()).to.equal(false);
    });

    describe('internals', () => {
      let fun;
      let funarg;
      beforeEach(() => {
        fun = Adit.net.createServer.firstCall.args[0];

        fun(socket);

        funarg = adit.connection.forwardOut.firstCall.args[4];
      });

      it('should call forwardOut with correct arguments', () => {
        expect(adit.connection.forwardOut).to.be.calledWith('test', 9999, 'tset', 8888);
      });

      describe('error', () => {
        beforeEach(() => {
          sinon.stub(adit.events, 'emit');

          connect = adit.out(
            { host: 'test', port: 9999 },
            { host: 'tset', port: 8888 }
          );

          fun = Adit.net.createServer.firstCall.args[0];

          funarg('error', socket);
        });

        it('should not pipe the stream', () => {
          expect(stream.pipe).to.not.be.called;
        });

        it('should not pipe the socket', () => {
          expect(socket.pipe).to.not.be.called;
        });

        it('should not populate streams object', () => {
          expect(adit.streams).to.be.empty;
        });

        it('should not resolve the promise', () => {
          expect(adit.events.emit).to.be.calledWith('error');
        });
      });

      describe('success', () => {
        beforeEach(() => {
          funarg(null, stream);

          // Execute the listen callback
          createServer.listen.firstCall.args[2]();
        });

        it('should execute', () => {
          expect(funarg.bind(null, null, stream)).to.not.throw();
        });

        it('should resolve "out" promise', () => connect);

        it('should populate streams object', () => {
          expect(adit.streams).to.have.length(2);
        });

        it('should pipe the stream', () => {
          expect(stream.pipe).to.be.called;
        });

        it('should pipe the socket', () => {
          expect(socket.pipe).to.be.called;
        });
      });
    });
  });

  describe('events', () => {
    beforeEach(() => {
      adit.connection.forwardIn = sinon.stub();

      Adit.net = {
        connect: sinon.stub().returns(socket)
      };

      adit.addEvents();
      adit.in(
        { host: 'test', port: 9999 },
        { host: 'tset', port: 8888 }
      );
    });

    describe('tcp connection', () => {
      let connectArgs;

      beforeEach(() => {
        adit.connection.emit('tcp connection', 1, () => {
          return stream;
        }, 2);

        connectArgs = Adit.net.connect.firstCall.args;
        connectArgs[2].call();
      });

      it('should connect to host/port', () => {

        expect(connectArgs[0]).to.equal(8888);
        expect(connectArgs[1]).to.equal('tset');
      });

      it('should pass socket to stream', () => {
        expect(stream.pipe.firstCall.args[0]).to.equal(socket);
        expect(socket.pipe.firstCall.args[0]).to.equal(stream);
      });

      it('should pass stream to socket', () => {
        expect(stream.pipe.firstCall.args[0]).to.equal(socket);
      });
    });

    it('should close all streams at tunnel close', () => {
      adit.connection.emit('tcp connection', 1, () => stream, 2);
      adit.connection.emit('close');

      expect(stream.end.callCount).to.equal(1);
      expect(socket.end.callCount).to.equal(1);
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
        expect(adit.reTry).to.be.called;
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
