import { expect } from 'chai';

import Adit from '../index';

describe('static methods', () => {
  describe('Adit.getPort', () => {
    it('should return same number that was passed', () => {
      expect(Adit.getPort(1)).to.equal(1);
    });

    it('should return port within the range', () => {
      expect(Adit.getPort([1, 5])).to.be.within(1, 5);
    });
  });

  describe('Adit.getRandom', () => {
    it('should return number within the range', () => {
      expect(Adit.getPort([1, 5])).to.be.within(1, 5);
    });
  });

  describe('Adit.parse', () => {
    it('should correctly parse it', () => {
      expect(
        Adit.parse(
          '9999:localhost:3306 user@8.8.8.8', '1234'
        )
      ).to.deep.equal({
        host: '8.8.8.8',
        port: 22,
        username: 'user',
        password: '1234',

        from: {
          host: 'localhost',
          port: '9999'
        },

        to: {
          host: 'localhost',
          port: '3306'
        }
      });
    });

    it('should set password to null if not passed', () => {
      expect(
        Adit.parse(
          '9999:localhost:3306 user@8.8.8.8'
        ).password
      ).to.equal(null);
    });

    it('should set username to null if not passed', () => {
      expect(
        Adit.parse(
          '9999:localhost:3306 8.8.8.8'
        ).username
      ).to.equal(null);
    });

    it('should correctly parsed from limited amount of args', () => {
      expect(
        Adit.parse(
          '9999:localhost:3306 8.8.8.8'
        )
      ).to.deep.equal({
        host: '8.8.8.8',
        port: 22,
        username: null,
        password: null,

        from: {
          host: 'localhost',
          port: '9999'
        },

        to: {
          host: 'localhost',
          port: '3306'
        }
      });
    });
  });

  describe('Adit.getAddresses', () => {
    const { from, to } = Adit.getAddresses({
      port: 1
    }, {
      host: '1',
      port: [2, 3]
    });

    it('should set port', () => {
      expect(to.port).to.be.an('number');
    });

    it('should resolve port range', () => {
      expect(to.port).to.be.within(2, 3);
    });

    it('should set default host if there is none', () => {
      expect(from.host).to.equal('localhost');
    });
  });
});
