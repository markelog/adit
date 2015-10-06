import sinon from 'sinon';
import { expect } from 'chai';
import rewire from 'rewire';

let Adit = rewire('../dist/index.js');

describe('Adit methods', () => {
  let stubs;
  let from;
  let to;
  let oldSock = process.env.SSH_AUTH_SOCK;

  // babel side effect :-(
  let fs = Adit.__get__('_fs');
  let path = Adit.__get__('path');
  let Connection = Adit.__get__('_ssh22');

  beforeEach(() => {
    stubs = {};

    from = {
      hostname: 'a',
      port: 1
    };

    to = {
      username: 'me',
      hostname: 'b',
      port: 2
    };

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
    it('should use password', () => {
      to.password = 'c';

      let tunnel = new Adit(from, to);
      tunnel.connect(2);

      let call = tunnel.connection.connect.getCall(0).args[0];

      expect(call.password).to.equal('c');
      expect(call).to.not.have.property('agent');
      expect(call).to.not.have.property('privateKey');
    });

    it('should use defined agent', () => {
      process.env.SSH_AUTH_SOCK = 'tmp1';

      from.agent = 'tmp2';
      let tunnel = new Adit(from, to);
      tunnel.connect();

      let call = tunnel.connection.connect.getCall(0).args[0];

      expect(call.agent).to.equal('tmp2');
      expect(call).to.not.have.property('password');
      expect(call).to.not.have.property('privateKey');
    });

    it('should use environment agent', () => {
      process.env.SSH_AUTH_SOCK = 'tmp1';

      let tunnel = new Adit(from, to);
      tunnel.connect();

      let call = tunnel.connection.connect.getCall(0).args[0];

      expect(call.agent).to.equal('tmp1');
      expect(call).to.not.have.property('password');
      expect(call).to.not.have.property('privateKey');
    });

    it('should use environment key', () => {
      let buffer = new Buffer(1);
      delete process.env.SSH_AUTH_SOCK;
      stubs.read = sinon.stub(fs, 'readFileSync').returns(buffer);
      stubs.join = sinon.stub(path, 'join').returns('');

      let tunnel = new Adit(from, to);
      tunnel.connect();

      let call = tunnel.connection.connect.getCall(0).args[0];
      expect(call.privateKey).to.equal(buffer);
      expect(call).to.not.have.property('agent');
      expect(call).to.not.have.property('password');

      expect(stubs.join.getCall(0).args).to.contain(process.env.HOME, '.ssh', 'id_rsa');
    });

    it('should use defined key', () => {
      let buffer = new Buffer(1);
      stubs.read = sinon.stub(fs, 'readFileSync').returns(buffer);
      from.key = 'tmp';

      let tunnel = new Adit(from, to);
      tunnel.connect(2);

      let call = tunnel.connection.connect.getCall(0).args[0];
      expect(call.privateKey).to.equal(buffer);
      expect(call).to.not.have.property('agent');
      expect(call).to.not.have.property('password');
    });

    it('should invoke ssh "connect" method', () => {
      delete process.env.SSH_AUTH_SOCK;

      to.password = 'c';

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
      from.agent = 'tmp';

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
      let tunnel = new Adit(from, to);
      tunnel.connect();

      expect(tunnel.retryTimes).to.equal(0);
    });
  });

  describe('Adit#close', () => {
    it('should close connection', () => {
      let tunnel = new Adit(from, to);
      tunnel.connect();
      tunnel.close();

      expect(tunnel.connection.end.calledOnce).to.equal(true);
    });
  });

  describe('Adit#reTry', () => {
    it('should try to reconnect when there is no more attemps', () => {
      to.port = [1, 5];

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

    it('should try to reconnect when there is one more attempt', () => {
      to.port = [1, 5];

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
