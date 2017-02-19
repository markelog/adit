import { EventEmitter } from 'events';

import { expect } from 'chai';

import Connection from 'ssh2';

import Adit from '../index';

describe('Adit#constructor', () => {
  let oldSock = process.env.SSH_AUTH_SOCK;
  let oldHome = process.env.HOME;
  let to;

  beforeEach(() => {
    to = {
      host: 'to-host',
      port: 2
    };
  });

  afterEach(() => {
    process.env.SSH_AUTH_SOCK = oldSock;
    process.env.HOME = oldHome;
  });

  it('should define all needed properties with "settings" object', () => {
    process.env.SSH_AUTH_SOCK = 'tmp';

    let adit = new Adit(to);

    expect(adit.portRange).to.equal(to.port);
    expect(adit.port).to.equal(to.port);

    expect(adit.username).to.equal(process.env.USER);
    expect(adit.password).to.equal(null);
    expect(adit.agent).to.equal('tmp');
    expect(adit.key).to.equal(null);
    expect(adit.password).to.equal(null);

    expect(adit.defer).to.equal(undefined);

    expect(adit.promise).to.have.property('then');
    expect(adit.promise).to.not.have.property('resolve');

    expect(adit.connection).to.be.an.instanceof(Connection);
    expect(adit.events).to.be.an.instanceof(EventEmitter);
  });

  it('should define all needed properties with string argument', () => {
    process.env.SSH_AUTH_SOCK = 'tmp';

    let adit = new Adit('9999:localhost:3306 8.8.8.8');

    expect(adit.portRange).to.equal(22);
    expect(adit.port).to.equal(22);

    expect(adit.username).to.equal(process.env.USER);
    expect(adit.password).to.equal(null);
    expect(adit.agent).to.equal('tmp');
    expect(adit.key).to.equal(null);
    expect(adit.password).to.equal(null);

    expect(adit.defer).to.equal(undefined);

    expect(adit.promise).to.have.property('then');
    expect(adit.promise).to.not.have.property('resolve');

    expect(adit.connection).to.be.an.instanceof(Connection);
    expect(adit.events).to.be.an.instanceof(EventEmitter);
  });

  it('should set password to key or agent', () => {
    delete process.env.SSH_AUTH_SOCK;

    to.password = 'pass';

    let adit = new Adit(to);

    expect(adit.password).to.equal('pass');
    expect(adit.agent).to.equal(null);
    expect(adit.key).to.equal(null);
  });

  it('should define port with port range', () => {
    to.port = [1, 5];

    let adit = new Adit(to);

    expect(adit.port).to.be.within(1, 5);
    expect(adit.portRange).to.equal(to.port);
    expect(to.port).to.not.equal(adit.port);
  });

  it('should custom username and password', () => {
    to.username = 'me';
    to.password = 'pass';

    let adit = new Adit(to);

    expect(adit.username).to.equal('me');
    expect(adit.password).to.equal('pass');
  });

  it('should throw if there is not authorization strategy', () => {
    delete process.env.SSH_AUTH_SOCK;
    delete process.env.HOME;

    let constructor = () => new Adit(to);

    expect(constructor).to.throw(/SSH-agent is not enabled/);
  });
});
