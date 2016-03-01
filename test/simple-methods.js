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
