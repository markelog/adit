import sinon from 'sinon';
import { expect } from 'chai';
import rewire from 'rewire';

let Adit = rewire('../dist/index.js');

describe('Adit methods', () => {
  let from;
  let to;
  let logger;
  let adit;
  let oldSock = process.env.SSH_AUTH_SOCK;

  // babel side effect :-(
  let Connection = Adit.__get__('_ssh22');

  beforeEach(() => {
    logger = {
      info: sinon.stub(),
      error: sinon.stub()
    };

    from = {
      hostname: 'from-host',
      port: 1
    };

    to = {
      username: 'me',
      password: 'pass',
      hostname: 'to-host',
      port: [1, 5]
    };

    sinon.stub(Adit.prototype, 'connect');
    sinon.stub(Adit.prototype, 'addEvents');

    sinon.stub(Connection, 'default', () => {
      return {
        connect: sinon.stub(),
        on: sinon.stub(),
        end: sinon.stub()
      };
    });

    adit = new Adit(from, to, logger);
  });

  afterEach(() => {
    if (Adit.prototype.connect.restore) {
      Adit.prototype.connect.restore();
    }

    Adit.prototype.addEvents.restore();

    Connection.default.restore();
    process.env.SSH_AUTH_SOCK = oldSock;
  });

  describe('Adit#close', () => {
    it('should close connection', () => {
      adit.connect();
      adit.close();

      expect(adit.connection.end.calledOnce).to.equal(true);
    });
  });

  describe('Adit#reTry', () => {
    it('should not try to reconnect when there is no more attemps', () => {
      adit.connect();
      adit.reTry('test');

      return adit.promise.fail((error) => {
        expect(error).to.equal('test');

        expect(logger.info.callCount).to.equal(0);
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

        expect(logger.info.callCount).to.equal(1);
        expect(adit.addEvents.callCount).to.equal(1);
        expect(adit.connection.connect.callCount).to.equal(1);
        expect(adit.connection.end.callCount).to.equal(0);

        expect(logger.info.firstCall.args[0]).to.equal('Retrying to connect, %s tries left');
        expect(logger.info.firstCall.args[1]).to.equal(1);
      });
    });
  });

  describe('Adit#open', () => {
    it('should connect and attach events', () => {
      adit.open(2);

      expect(adit.connect.calledWith(2)).to.equal(true);
      expect(adit.addEvents.called).to.equal(true);
    });
  });
});
