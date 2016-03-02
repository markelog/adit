import sinon from 'sinon';
import { expect } from 'chai';

import Adit from '../index.js';

describe('Adit simple methods', () => {
  let to;
  let adit;
  let oldSock = process.env.SSH_AUTH_SOCK;

  beforeEach(() => {
    to = {
      username: 'me',
      password: 'pass',
      host: 'to-host',
      port: [1, 5]
    };

    sinon.stub(Adit.prototype, 'connect');
    sinon.stub(Adit.prototype, 'addEvents');

    sinon.stub(Adit, 'Connection', () => {
      return {
        connect: sinon.stub(),
        on: sinon.stub(),
        end: sinon.stub()
      };
    });

    adit = new Adit(to);
  });

  afterEach(() => {
    if (Adit.prototype.connect.restore) {
      Adit.prototype.connect.restore();
    }

    if (Adit.prototype.addEvents.restore) {
      Adit.prototype.addEvents.restore();
    }

    Adit.Connection.restore();
    process.env.SSH_AUTH_SOCK = oldSock;
  });

  describe('Adit#close', () => {
    beforeEach(() => {
      adit.connect();
      adit.close();
    });

    it('should close connection', () => {
      expect(adit.connection.end.calledOnce).to.equal(true);
    });

    it('should clean-up all streams', () => {
      expect(adit.streams).to.be.empty;
    });
  });

  describe('Adit#(from | to)', () => {
    beforeEach(() => {
      sinon.stub(Adit.prototype, 'in').returns('in');
      sinon.stub(Adit.prototype, 'out').returns('out');
    });

    afterEach(() => {
      Adit.prototype.in.restore();
      Adit.prototype.out.restore();
    });

    describe('Adit#from', () => {

      it('should return instance', () => {
        expect(adit.from('test:123')).to.equal(adit);
      });

      it('should set auth data', () => {
        adit.from('test:123');
        expect(adit.auth.from.host).to.equal('test');
        expect(adit.auth.from.port).to.equal('123');
      });
    });

    describe('Adit#to', () => {
      it('should set auth data', () => {
        adit.to('test:123');
        expect(adit.auth.to.host).to.equal('test');
        expect(adit.auth.to.port).to.equal('123');
      });

      it('should call Adit#in if host is not defined', () => {
        expect(adit.to(':123')).to.equal('in');
      });

      it('should call Adit#in with correct params', () => {
        adit.to(':123');
        expect(Adit.prototype.in).calledWith(adit.auth.from, adit.auth.to);
      });

      it('should call Adit#in if host is localhost', () => {
        expect(adit.to('localhost:123')).to.equal('in');
      });

      it('should call Adit#out if host is defined and not localhost', () => {
        adit.auth.from = { host: 'test', port: '1' };
        expect(adit.to('test:123')).to.equal('out');
      });

      it('should call Adit#out with correct params', () => {
        adit.auth.from = { host: 'test', port: '1' };
        adit.to(':123');
        expect(Adit.prototype.out).calledWith(adit.auth.from, adit.auth.to);
      });
    });
  });
  describe('Adit#reTry', () => {
    it('should not try to reconnect when there is no more attemps', () => {
      adit.connect();
      adit.reTry('test');

      return adit.promise.fail((error) => {
        expect(error).to.equal('test');
        expect(adit.addEvents.callCount).to.equal(0);
        expect(adit.connection.end.callCount).to.equal(0);
      });
    });

    it('should not try to reconnect when there is one more attempt', () => {
      Adit.prototype.connect.restore();
      adit.connect(1);
      adit.reTry('test');
      adit.reTry('test');

      return adit.promise.fail((error) => {
        expect(error).to.equal('test');
        expect(adit.addEvents.callCount).to.equal(1);
        expect(adit.connection.connect.callCount).to.equal(1);
        expect(adit.connection.end.callCount).to.equal(0);
      });
    });
  });
});
