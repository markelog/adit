import sinon from 'sinon';
import { expect } from 'chai';
import rewire from 'rewire';

let Adit = rewire('../index.js');

describe('Adit methods', () => {
  let stubs;
  let oldSock = process.env.SSH_AUTH_SOCK;

  // babel side effect :-(
  let Connection = Adit.__get__('_ssh22');

  beforeEach(() => {
    stubs = {};

    sinon.stub(Connection, 'default', () => {
      return {
        connect: sinon.stub(),
        on: sinon.stub(),
        end: sinon.stub()
      };
    });
  });

  afterEach(() => {
    Connection.default.restore();
    process.env.SSH_AUTH_SOCK = oldSock;

    for (let stub in stubs) {
      stubs[stub].restore();
    }

  });

  describe('Adit#connect', () => {
    it('should invoke ssh "connect" method', () => {
      delete process.env.SSH_AUTH_SOCK;

      let from = {
        hostname: 'a',
        port: 1
      };

      let to = {
        username: 'me',
        hostname: 'b',
        password: 'c',
        port: 2
      };

      let tunnel = new Adit(from, to);
      tunnel.connect(2);

      let call = tunnel.connection.connect.getCall(0).args[0];
      expect(call.host).to.equal('b');
      expect(call.port).to.equal(22);
      expect(call.username).to.equal('me');
      expect(call.password).to.equal('c');

      expect(tunnel.retryTimes).to.equal(2);
    });

    it('should invoke ssh "connect" method with ssh-agent', () => {
      process.env.SSH_AUTH_SOCK = 'tmp';

      let from = {
        hostname: 'a',
        port: 1
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: 2
      };

      let tunnel = new Adit(from, to);
      tunnel.connect(2);

      let call = tunnel.connection.connect.getCall(0).args[0];
      expect(call.host).to.equal('b');
      expect(call.port).to.equal(22);
      expect(call.username).to.equal('me');
      expect(call.agent).to.equal('tmp');
      expect(call.privateKey).to.equal(undefined);

      expect(tunnel.retryTimes).to.equal(2);
    });

    it('should invoke ssh "connect" method with ssh-agent as argument', () => {
      let from = {
        hostname: 'a',
        port: 1,
        agent: 'tmp'
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: 2
      };

      let tunnel = new Adit(from, to);
      tunnel.connect(2);

      let call = tunnel.connection.connect.getCall(0).args[0];
      expect(call.host).to.equal('b');
      expect(call.port).to.equal(22);
      expect(call.username).to.equal('me');
      expect(call.agent).to.equal('tmp');
      expect(call.privateKey).to.equal(undefined);

      expect(tunnel.retryTimes).to.equal(2);
    });

    it('should invoke ssh "connect" method without arguments', () => {
      let from = {
        hostname: 'a',
        port: 1
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: 2
      };

      let tunnel = new Adit(from, to);
      tunnel.connect();

      expect(tunnel.retryTimes).to.equal(0);
    });
  });

  describe('Adit#close', () => {
    it('should close connection', () => {
      let from = {
        hostname: 'a',
        port: 1
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: 2
      };

      let tunnel = new Adit(from, to);
      tunnel.connect();
      tunnel.close();

      expect(tunnel.connection.end.calledOnce).to.equal(true);
    });
  });

  describe('Adit#reTry', () => {
    it('should try to reconnect when there is no more attemps', () => {
      let from = {
        hostname: 'a',
        port: 1
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: [1, 5]
      };

      let logger = { info: () => {}};

      let tunnel = new Adit(from, to, logger);
      stubs = {
        info: sinon.stub(logger, 'info'),
        addEvents: sinon.stub(tunnel, 'addEvents'),
        connect: sinon.stub(tunnel, 'connect')
      };

      let promise = tunnel.promise;

      tunnel.connect();
      tunnel.reTry('test');

      return promise.fail((error) => {
        expect(error).to.equal('test');

        expect(stubs.info.callCount).to.equal(0);
        expect(stubs.addEvents.callCount).to.equal(0);
        expect(stubs.connect.callCount).to.equal(1);
        expect(tunnel.connection.end.callCount).to.equal(0);
      });
    });

    it('should try to reconnect when there is one more attemp', () => {
      let from = {
        hostname: 'a',
        port: 1
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: [1, 5]
      };

      let logger = { info: () => {} };

      let tunnel = new Adit(from, to, logger);
      stubs = {
        info: sinon.stub(logger, 'info'),
        addEvents: sinon.stub(tunnel, 'addEvents')
      };

      let promise = tunnel.promise;

      tunnel.connect(1);
      tunnel.reTry('test');
      tunnel.reTry('test');

      return promise.fail((error) => {
        expect(error).to.equal('test');

        expect(stubs.info.callCount).to.equal(1);
        expect(stubs.addEvents.callCount).to.equal(1);
        expect(tunnel.connection.connect.callCount).to.equal(1);
        expect(tunnel.connection.end.callCount).to.equal(0);

        expect(stubs.info.getCall(0).args[0]).to.equal('Retrying to connect, %s tries left');
        expect(stubs.info.getCall(0).args[1]).to.equal(1);
      });
    });
  });

  describe('Adit#open', () => {
    it('should connect and attach events', () => {
      let from = {
        hostname: 'a',
        port: 1
      };

      let to = {
        username: 'me',
        hostname: 'b',
        port: 2
      };

      stubs = {
        connect: sinon.stub(Adit.prototype, 'connect'),
        addEvents: sinon.stub(Adit.prototype, 'addEvents')
      };

      new Adit(from, to).open(2);

      expect(stubs.connect.calledWith(2)).to.equal(true);
      expect(stubs.addEvents.called).to.equal(true);
    });
  });
});
