// A simple substitution for browsers localStorage - just for test purposes
import makeDebug from 'debug';
const debug = makeDebug('utils:localstorage');

export class LocalStorage {
  constructor () {
    this.storage = {};
  }

  keys () {
    let keys = Object.keys(this.storage);
    debug(`LocalStorage.keys() = ${JSON.stringify(keys)}`);
    return keys;
  }

  key (n) {
    const key = (this.keys())[n];
    debug(`LocalStorage.key(${n})) = ${key}`);
    return key;
  }

  get length () {
    const len = (this.keys()).length;
    debug(`LocalStorage.length() = ${len}`);
    return len;
  }

  getItem (keyName) {
    let item = this.storage[keyName] || null;
    debug(`LocalStorage.getItem(${keyName})) = ${item}`);
    return item;
  }

  setItem (keyName, value) {
    const oldValue = this.getItem(keyName) || null;
    debug(`LocalStorage.setItem(${keyName}, ${value}), oldValue = ${oldValue}`);
    this.storage[keyName] = value;
    return oldValue;
  }

  removeItem (keyName) {
    const oldValue = this.getItem(keyName);
    debug(`LocalStorage.removeItem(${keyName}), oldValue = ${oldValue}`);
    const { [keyName]: _, ...newStorage } = this.storage;
    this.storage = newStorage;

    return oldValue;
  }

  clear () {
    const oldValue = Object.assign({}, this.storage);
    debug(`LocalStorage.clear(), oldValue = ${oldValue}`);
    this.storage = {};
    return oldValue;
  }
}
