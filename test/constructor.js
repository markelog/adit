import { expect } from 'chai';
import rewire from 'rewire';

import Connection from 'ssh2';

let Adit = rewire('..');

describe('Adit#constructor', () => {
  let oldSock = process.env.SSH_AUTH_SOCK;
  let oldHome = process.env.HOME;
  let from;
  let to;

  beforeEach(() => {
    from = {
      hostname: 'a',
      port: 1
    };

    to = {
      hostname: 'b',
      port: 2
    };
  });

  afterEach(() => {
    process.env.SSH_AUTH_SOCK = oldSock;
    process.env.HOME = oldHome;
  });

  it('should define all needed properties', () => {
    process.env.SSH_AUTH_SOCK = 'tmp';

    let adit = new Adit(from, to);

    expect(adit.from).to.deep.equal(from);
    expect(adit.to).to.deep.equal(to);

    expect(adit.portRange).to.equal(to.port);
    expect(adit.to.port).to.equal(to.port);

    expect(adit.username).to.equal(process.env.USER);
    expect(adit.password).to.be.empty;
    expect(adit.agent).to.equal('tmp');
    expect(adit.key).to.equal(null);
    expect(adit.password).to.equal(null);

    expect(adit.defer).to.equal(undefined);

    expect(adit.promise).to.have.property('then');
    expect(adit.promise).to.not.have.property('resolve');

    expect(adit.logger).to.not.have.property('info', 'error');
    expect(adit.connection).to.be.an.instanceof(Connection);

    expect(adit.retryTimes).to.be.equal(0);
  });

  it('should set password to key or agent', () => {
    delete process.env.SSH_AUTH_SOCK;

    to.password = 'c';

    let adit = new Adit(from, to);

    expect(adit.password).to.equal('c');
    expect(adit.agent).to.equal(null);
    expect(adit.key).to.equal(null);
  });

  it('should define correct logger', () => {
    let logger = {};

    let adit = new Adit(from, to, logger);

    expect(adit.logger).to.equal(logger);
  });

  it('should define port with port range', () => {
    to.port = [1, 5];

    let adit = new Adit(from, to);

    expect(adit.to.port).to.be.within(1, 5);
    expect(adit.portRange).to.equal(to.port);
    expect(to.port).to.not.equal(adit.port);
  });

  it('should custom username and password', () => {
    let from = {
      hostname: 'a',
      port: 1
    };

    let to = {
      hostname: 'b',
      port: [1, 5],
      username: 'me',
      password: 'c'
    };

    let adit = new Adit(from, to);

    expect(adit.to.username).to.equal('me');
    expect(adit.to.password).to.equal('c');
  });

  it('should throw if there is not authorization strategy', () => {
    delete process.env.SSH_AUTH_SOCK;
    delete process.env.HOME;
    let constructor = () => new Adit(from, to);

    expect(constructor).to.throw(/SSH-agent is not enabled/);
  });
});
