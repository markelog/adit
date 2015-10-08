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
      hostname: 'from-host',
      port: 1
    };

    to = {
      hostname: 'to-host',
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

    expect(adit._from).to.deep.equal(from);
    expect(adit._to).to.deep.equal(to);

    expect(adit._portRange).to.equal(to.port);
    expect(adit._to.port).to.equal(to.port);

    expect(adit._username).to.equal(process.env.USER);
    expect(adit._password).to.be.empty;
    expect(adit._agent).to.equal('tmp');
    expect(adit._key).to.equal(null);
    expect(adit._password).to.equal(null);

    expect(adit.defer).to.equal(undefined);

    expect(adit.promise).to.have.property('then');
    expect(adit.promise).to.not.have.property('resolve');

    expect(adit.logger).to.not.have.property('info', 'error');
    expect(adit.connection).to.be.an.instanceof(Connection);

    expect(adit._retryTimes).to.be.equal(0);
  });

  it('should set password to key or agent', () => {
    delete process.env.SSH_AUTH_SOCK;

    to.password = 'pass';

    let adit = new Adit(from, to);

    expect(adit._password).to.equal('pass');
    expect(adit._agent).to.equal(null);
    expect(adit._key).to.equal(null);
  });

  it('should define correct logger', () => {
    let logger = {};

    let adit = new Adit(from, to, logger);

    expect(adit.logger).to.equal(logger);
  });

  it('should define port with port range', () => {
    to.port = [1, 5];

    let adit = new Adit(from, to);

    expect(adit._to.port).to.be.within(1, 5);
    expect(adit._portRange).to.equal(to.port);
    expect(to.port).to.not.equal(adit.port);
  });

  it('should custom username and password', () => {
    to.username = 'me';
    to.password = 'pass';

    let adit = new Adit(from, to);

    expect(adit._to.username).to.equal('me');
    expect(adit._to.password).to.equal('pass');
  });

  it('should throw if there is not authorization strategy', () => {
    delete process.env.SSH_AUTH_SOCK;
    delete process.env.HOME;

    let constructor = () => new Adit(from, to);

    expect(constructor).to.throw(/SSH-agent is not enabled/);
  });
});
