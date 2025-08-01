import assert from 'assert';
import { LocalStorage } from './local-storage.js';

// We don't make `localStorage` global here, as we'r simply testing it locally
const localStorage = new LocalStorage();

export default () => {

  describe(`LocalStorage simulator`, () => {

    after(() => {
      console.log('\n');
    });

    describe('basic functionality', () => {

      it('attribute length works', () => {
        const value = localStorage.length;
        assert.equal(value, 0, 'Expected result to be 0');
      });

      it('getItem of non-existing item works', () => {
        const value = localStorage.getItem('MyNonExistingItemKey');
        assert.equal(value, null);
      });

      it('getItem of existing item works', () => {
        localStorage.setItem('TestItem1', 'MyExistingItem1');
        const value = localStorage.getItem('TestItem1');
        assert.equal(value, 'MyExistingItem1');
      });

      it('key works', () => {
        localStorage.setItem('TestItem2', 'MyExistingItem2');
        let value = localStorage.key(2);
        assert.equal(value, undefined);
        value = localStorage.key(1);
        assert.equal(value, 'TestItem2');
        value = localStorage.key(0);
        assert.equal(value, 'TestItem1');
      });

      it('setItem of non-existing item works', () => {
        const oldValue = localStorage.setItem('TestItem3', 'MyExistingItem3');
        const value = localStorage.getItem('TestItem3');
        assert.equal(value, 'MyExistingItem3');
        assert.equal(oldValue, null);
      });

      it('setItem of existing item works', () => {
        const oldValue = localStorage.setItem('TestItem2', 'MyExistingItem2 - with a star!');
        const value = localStorage.getItem('TestItem2');
        assert.equal(value, 'MyExistingItem2 - with a star!');
        assert.equal(oldValue, 'MyExistingItem2');
      });

      it('removeItem of existing item works', () => {
        const oldValue = localStorage.setItem('TestItem4', 'MyExistingItem4 - to be discarded!');
        const value = localStorage.getItem('TestItem4');
        assert.equal(value, 'MyExistingItem4 - to be discarded!');
        assert.equal(oldValue, null);
        const delValue = localStorage.removeItem('TestItem4');
        assert.equal(delValue, 'MyExistingItem4 - to be discarded!');
        const getDelValue = localStorage.getItem('TestItem4');
        assert.equal(getDelValue, null);
      });

      it('clear works', () => {
        const oldLength = localStorage.length;
        const storage = localStorage.clear();
        const newLength = localStorage.length;
        assert.equal(oldLength > 0, true, 'localStorage should not be empty!');
        assert.equal(newLength, 0);
        assert.equal(Object.keys(storage).length, oldLength);
      });

    });
  });

}