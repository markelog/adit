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
});
