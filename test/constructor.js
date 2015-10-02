import sinon from 'sinon';
import { expect } from 'chai';
import rewire from 'rewire';

import Connection from 'ssh2';

let Adit = rewire('..');

describe('Adit#constructor', () => {
  let path = Adit.__get__('path');
  let oldSock = process.env.SSH_AUTH_SOCK;

  beforeEach(() => {
    sinon.stub(path, 'join', () => __filename);
  });

  afterEach(() => {
    process.env.SSH_AUTH_SOCK = oldSock;
    path.join.restore();
  });

  it('should define all needed properties', () => {
    process.env.SSH_AUTH_SOCK = 'tmp';

    let from = {
      hostname: 'a',
      port: 1
    };

    let to = {
      hostname: 'b',
      port: 2
    };

    let adit = new Adit(from, to);

    expect(adit.from).to.deep.equal(from);
    expect(adit.to).to.deep.equal(to);

    expect(adit.portRange).to.equal(to.port);
    expect(adit.to.port).to.equal(to.port);

    expect(adit.username).to.equal(process.env.USER);
    expect(adit.agent).to.equal('tmp');
    expect(adit.key).to.equal(undefined);

    expect(adit.defer).to.equal(undefined);

    expect(adit.promise).to.have.property('then');
    expect(adit.promise).to.not.have.property('resolve');

    expect(adit.logger).to.not.have.property('info', 'error');
    expect(adit.connection).to.be.an.instanceof(Connection);

    expect(adit.retryTimes).to.be.equal(0);
  });

  it('should define all needed properties with private key', () => {
    delete process.env.SSH_AUTH_SOCK;

    let from = {
      hostname: 'a',
      port: 1
    };

    let to = {
      hostname: 'b',
      port: 2
    };

    let adit = new Adit(from, to);

    expect(adit.from).to.deep.equal(from);
    expect(adit.to).to.deep.equal(to);

    expect(adit.portRange).to.equal(to.port);
    expect(adit.to.port).to.equal(to.port);

    expect(adit.username).to.equal(process.env.USER);
    expect(adit.agent).to.equal(undefined);
    expect(adit.key).to.be.instanceof(Buffer);

    expect(adit.defer).to.equal(undefined);

    expect(adit.promise).to.have.property('then');
    expect(adit.promise).to.not.have.property('resolve');

    expect(adit.logger).to.not.have.property('info', 'error');
    expect(adit.connection).to.be.an.instanceof(Connection);

    expect(adit.retryTimes).to.be.equal(0);
  });

  it('should define correct logger', () => {
    let from = {
      hostname: 'a',
      port: 1
    };

    let to = {
      hostname: 'b',
      port: 2
    };

    let logger = {};

    let adit = new Adit(from, to, logger);

    expect(adit.logger).to.equal(logger);
  });

  it('should define port with port range', () => {
    let from = {
      hostname: 'a',
      port: 1
    };

    let to = {
      hostname: 'b',
      port: [1, 5]
    };

    let adit = new Adit(from, to);

    expect(adit.to.port).to.be.within(1, 5);
    expect(adit.portRange).to.equal(to.port);
    expect(to.port).to.not.equal(adit.port);
  });

  it('should custom username and key', () => {
    let from = {
      hostname: 'a',
      port: 1,
      key: __filename
    };

    let to = {
      hostname: 'b',
      port: [1, 5],
      username: 'me'
    };

    let adit = new Adit(from, to);

    expect(adit.to.username).to.equal('me');
    expect(adit.from.key).to.be.an('string');
  });
});
