import sinon from 'sinon';
import { expect } from 'chai';

import Adit from '../index';

describe('Adit#connect', () => {
  let stubs;
  let to;
  let buffer;
  const oldSock = process.env.SSH_AUTH_SOCK;

  const connectAndGetArgs = () => {
    const adit = new Adit(to);
    adit.connect(2);

    const args = adit.connection.connect.firstCall.args[0];
    args.adit = adit;

    return args;
  };

  beforeEach(() => {
    buffer = new Buffer(1);
    stubs = {};

    to = {
      username: 'me',
      host: 'to-host',
      port: 2
    };

    sinon.stub(Adit, 'Connection', () => {
      return {
        connect: sinon.stub(),
        on: sinon.stub(),
        end: sinon.stub()
      };
    });
  });

  afterEach(() => {
    Adit.Connection.restore();
    process.env.SSH_AUTH_SOCK = oldSock;

    for (const stub in stubs) {
      stubs[stub].restore();
    }
  });

  it('should use password', () => {
    to.password = 'pass';

    const call = connectAndGetArgs();

    expect(call.password).to.equal('pass');
    expect(call).to.not.have.property('agent');
    expect(call).to.not.have.property('privateKey');
  });

  it('should use defined agent', () => {
    process.env.SSH_AUTH_SOCK = 'tmp1';
    process.env.HOME = __filename;
    to.agent = 'custom-agent';

    const call = connectAndGetArgs();

    expect(call.agent).to.equal('custom-agent');
    expect(call).to.not.have.property('password');
    expect(call).to.not.have.property('privateKey');
  });

  it('should use environment agent', () => {
    process.env.SSH_AUTH_SOCK = 'env-sock';

    const call = connectAndGetArgs();

    expect(call.agent).to.equal('env-sock');
    expect(call).to.not.have.property('password');
    expect(call).to.not.have.property('privateKey');
  });

  it('should use environment key', () => {
    delete process.env.SSH_AUTH_SOCK;
    stubs.read = sinon.stub(Adit, 'read').returns(buffer);

    const call = connectAndGetArgs();

    expect(call.privateKey).to.equal(buffer);
    expect(call).to.not.have.property('agent');
    expect(call).to.not.have.property('password');
  });

  it('should use defined key', () => {
    stubs.read = sinon.stub(Adit, 'read').returns(buffer);
    to.key = 'private-key';

    const call = connectAndGetArgs();

    expect(call.privateKey).to.equal(buffer);
    expect(call).to.not.have.property('agent');
    expect(call).to.not.have.property('password');
  });

  it('should invoke ssh "connect" method', () => {
    delete process.env.SSH_AUTH_SOCK;
    to.password = 'pass';

    const call = connectAndGetArgs();

    expect(call.host).to.equal('to-host');
    expect(call.port).to.equal(2);
    expect(call.username).to.equal('me');
  });

  it('should invoke ssh "connect" method with ssh-agent', () => {
    process.env.SSH_AUTH_SOCK = 'env-sock';

    const call = connectAndGetArgs();

    expect(call.agent).to.equal('env-sock');
    expect(call).to.not.have.property('privateKey');
    expect(call).to.not.have.property('password');
  });

  it('should invoke ssh "connect" method with ssh-agent as argument', () => {
    to.agent = 'custom-agent';

    const call = connectAndGetArgs();

    expect(call.agent).to.equal('custom-agent');
    expect(call).to.not.have.property('privateKey');
    expect(call).to.not.have.property('password');
  });
});
