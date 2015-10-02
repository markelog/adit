import { expect } from 'chai';

import Adit from '..';

describe('static methods', () => {
  describe('Adit.getLogger', () => {
    it('should return same argument if it is an object', () => {
      let logger = {};
      expect(Adit.getLogger(logger)).to.equal(logger);
    });

    it('should return default logger if there is no argument', () => {
      let logger = Adit.getLogger();

      expect(logger.info).to.be.an('function');
      expect(logger.error).to.be.an('function');
    });

    it('should return default logger if argument is undefined', () => {
      let logger = Adit.getLogger(undefined);

      expect(logger.info).to.be.an('function');
      expect(logger.error).to.be.an('function');
    });
  });

  describe('Adit.getPort', () => {
    it('should return default port if there is no argument', () => {
      expect(Adit.getPort()).to.equal(8000);
    });

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
