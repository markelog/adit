import { expect } from 'chai';

import Adit from '../index.js';

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

  describe('Adit.getAddresses', () => {
    let {from, to} = Adit.getAddresses({
      port: 1
    }, {
      host: '1',
      port: [2,3]
    });

    it('should set port', () => {
      expect(to.port).to.be.an('number');
    });

    it('should resolve port range', () => {
      expect(to.port).to.be.within(2,3);
    });

    it('should set default host if there is none', () => {
      expect(from.host).to.equal('localhost');
    });
  });
});
