import { expect } from 'chai';
import rewire from 'rewire';

import Connection from 'ssh2';

let Adit = rewire('..');

describe('Adit#constructor', () => {
  let oldSock = process.env.SSH_AUTH_SOCK;

  afterEach(() => {
    process.env.SSH_AUTH_SOCK = oldSock;
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
    expect(adit.password).to.be.empty;
    expect(adit.agent).to.equal('tmp');

    expect(adit.defer).to.equal(undefined);

    expect(adit.promise).to.have.property('then');
    expect(adit.promise).to.not.have.property('resolve');

    expect(adit.logger).to.not.have.property('info', 'error');
    expect(adit.connection).to.be.an.instanceof(Connection);

    expect(adit.retryTimes).to.be.equal(0);
  });

  it('should define all needed properties with password', () => {
    delete process.env.SSH_AUTH_SOCK;

    let from = {
      hostname: 'a',
      port: 1
    };

    let to = {
      hostname: 'b',
      password: 'c',
      port: 2
    };

    let adit = new Adit(from, to);

    expect(adit.from).to.deep.equal(from);
    expect(adit.to).to.deep.equal(to);

    expect(adit.portRange).to.equal(to.port);
    expect(adit.to.port).to.equal(to.port);

    expect(adit.username).to.equal(process.env.USER);
    expect(adit.password).to.equal('c');
    expect(adit.agent).to.equal(null);

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
});
