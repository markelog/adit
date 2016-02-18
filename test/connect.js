import sinon from 'sinon';
import { expect } from 'chai';
import rewire from 'rewire';

let Adit = rewire('../dist/index.js');

describe('Adit#connect', () => {
  let stubs;
  let from;
  let to;
  let buffer;
  let oldSock = process.env.SSH_AUTH_SOCK;

  // babel side effect :-(
  let fs = Adit.__get__('_fs');
  let path = Adit.__get__('path');
  let Connection = Adit.__get__('_ssh2');

  let connectAndGetArgs = () => {
    let adit = new Adit(from, to);
    adit.connect(2);

    let args = adit.connection.connect.firstCall.args[0];
    args.adit = adit;

    return args;
  };

  beforeEach(() => {
    buffer = new Buffer(1);
    stubs = {};

    from = {
      hostname: 'from-host',
      port: 1
    };

    to = {
      username: 'me',
      hostname: 'to-host',
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

  it('should use password', () => {
    to.password = 'pass';

    let call = connectAndGetArgs();

    expect(call.password).to.equal('pass');
    expect(call).to.not.have.property('agent');
    expect(call).to.not.have.property('privateKey');
  });

  it('should use defined agent', () => {
    process.env.SSH_AUTH_SOCK = 'tmp1';
    process.env.HOME = __filename;
    from.agent = 'custom-agent';

    let call = connectAndGetArgs();

    expect(call.agent).to.equal('custom-agent');
    expect(call).to.not.have.property('password');
    expect(call).to.not.have.property('privateKey');
  });

  it('should use environment agent', () => {
    process.env.SSH_AUTH_SOCK = 'env-sock';

    let call = connectAndGetArgs();

    expect(call.agent).to.equal('env-sock');
    expect(call).to.not.have.property('password');
    expect(call).to.not.have.property('privateKey');
  });

  it('should use environment key', () => {
    delete process.env.SSH_AUTH_SOCK;
    stubs.read = sinon.stub(fs, 'readFileSync').returns(buffer);
    stubs.join = sinon.stub(path, 'join').returns('');

    let call = connectAndGetArgs();

    expect(call.privateKey).to.equal(buffer);
    expect(call).to.not.have.property('agent');
    expect(call).to.not.have.property('password');

    expect(stubs.join.firstCall.args).to.contain(process.env.HOME, '.ssh', 'id_rsa');
  });

  it('should use defined key', () => {
    stubs.read = sinon.stub(fs, 'readFileSync').returns(buffer);
    from.key = 'private-key';

    let call = connectAndGetArgs();

    expect(call.privateKey).to.equal(buffer);
    expect(call).to.not.have.property('agent');
    expect(call).to.not.have.property('password');
  });

  it('should invoke ssh "connect" method', () => {
    delete process.env.SSH_AUTH_SOCK;
    to.password = 'pass';

    let call = connectAndGetArgs();

    expect(call.host).to.equal('to-host');
    expect(call.port).to.equal(22);
    expect(call.username).to.equal('me');
    expect(call.adit._retryTimes).to.equal(2);
  });

  it('should invoke ssh "connect" method with ssh-agent', () => {
    process.env.SSH_AUTH_SOCK = 'env-sock';

    let call = connectAndGetArgs();

    expect(call.agent).to.equal('env-sock');
    expect(call).to.not.have.property('privateKey');
    expect(call).to.not.have.property('password');
  });

  it('should invoke ssh "connect" method with ssh-agent as argument', () => {
    from.agent = 'custom-agent';

    let call = connectAndGetArgs();

    expect(call.agent).to.equal('custom-agent');
    expect(call).to.not.have.property('privateKey');
    expect(call).to.not.have.property('password');
  });

  it('should invoke ssh "connect" method without arguments', () => {
    let adit = new Adit(from, to);
    adit.connect();

    expect(adit._retryTimes).to.equal(0);
  });
});
