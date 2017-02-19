import sinon from 'sinon';
import { expect } from 'chai';

import Adit from '../index';

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

  describe('Adit#(forward | reverse)', () => {
    let adit;

    beforeEach(() => {
      adit = new Adit(
        '9999:localhost:3306 user@8.8.8.8',
        'password'
      );

      sinon.stub(Adit.prototype, 'open').returns(new Promise(resolve => resolve()));
      sinon.stub(Adit.prototype, 'in');
      sinon.stub(Adit.prototype, 'out');
    });

    afterEach(() => {
      Adit.prototype.open.restore();
      Adit.prototype.in.restore();
      Adit.prototype.out.restore();
    });

    describe('Adit#forward', () => {
      beforeEach(() => adit.forward());

      it('should call Adit#open method', () => {
        expect(adit.open).to.be.called;
      });

      it('should call Adit#out method', () => {
        expect(adit.out).to.be.called;
      });

      it('should pass args to Adit#out method', () => {
        let args = adit.out.firstCall.args;
        expect(args[0]).to.be.an('object');
        expect(args[1]).to.be.an('object');
      });

      it('should pass args in correct order to Adit#out method', () => {
        let args = adit.out.firstCall.args;
        expect(args[0].port).to.equal('9999');
        expect(args[1].port).to.equal('3306');
      });
    });

    describe('Adit#reverse', () => {
      beforeEach(() => adit.reverse());

      it('should call Adit#open method', () => {
        expect(adit.open).to.be.called;
      });

      it('should call Adit#in method', () => {
        expect(adit.in).to.be.called;
      });

      it('should pass args to Adit#in method', () => {
        let args = adit.in.firstCall.args;
        expect(args[0]).to.be.an('object');
        expect(args[1]).to.be.an('object');
      });

      it('should pass args in correct order to Adit#in method', () => {
        let args = adit.in.firstCall.args;
        expect(args[0].port).to.equal('3306');
        expect(args[1].port).to.equal('9999');
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
