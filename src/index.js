const { sorter, select, getLimit, AdapterBase } = require('@feathersjs/adapter-commons');
const { _ } = require('@feathersjs/commons');
const errors = require('@feathersjs/errors');
const LocalForage = require('localforage');
const sift = require('sift').default;
const stringsToDates = require('./strings-to-dates');

const debug = require('debug')('@feathersjs-offline:feathers-localforage');

const usedKeys = [];

const _select = (data, params, ...args) => {
  const base = select(params, ...args);

  return base(JSON.parse(JSON.stringify(data)));
};

const validDrivers = {
  'INDEXEDDB': LocalForage.INDEXEDDB,
  'WEBSQL': LocalForage.WEBSQL,
  'LOCALSTORAGE': LocalForage.LOCALSTORAGE
};


// Create the adapter
class Adapter extends AdapterBase {
  constructor(options = {}) {
    super(_.extend({
      id: 'id',
      matcher: sift,
      sorter
    }, options));

    this.store = options.store || {};
    this._dates = options.dates || false;

    this.sanitizeParameters(options);

    debug(`Constructor started:
\t_storageType = ${JSON.stringify(this._storageType)}
\t_version = ${JSON.stringify(this._version)}
\t_name = ${JSON.stringify(this._name)}
\t_storageKey = ${JSON.stringify(this._storageKey)}
\t_storageSize = ${JSON.stringify(this._storageSize)}
\t_reuseKeys = ${JSON.stringify(this._reuseKeys)}\n`);

    this._storage = LocalForage.createInstance({
      driver: this._storageType,
      name: this._name,
      size: this._storageSize,
      version: this._version,
      storeName: this._storageKey,
      description: 'Created by @feathersjs-offline/localforage'
    });

    this.checkStoreName();

    // Make a handy suffix primarily for debugging owndata/ownnet
    const self = this;
    this._debugSuffix = self._name.includes('_local') ? '  LOCAL' :
      (self._name.includes('_queue') ? '  QUEUE' : '');

    this.ready();
  }

  sanitizeParameters(options) {
    this._name = options.name || 'feathersjs-offline'
    this._storageKey = options.storeName || options.name || 'feathers';

    let storage = this.options.storage || 'LOCALSTORAGE';
    storage = Array.isArray(storage) ? storage : [storage];
    const ok = storage.reduce((value, s) => value && (s.toUpperCase() in validDrivers), true);
    if (!ok)
      throw new errors.NotAcceptable(`Unknown storage type specified '${this.options.storage}\nPlease use one (or more) of 'websql', 'indexeddb', or 'localstorage'.`);

    this._storageType = storage.map(s => validDrivers[s.toUpperCase()]);

    this._version = options.version || 1.0;

    // Default DB size is _JUST UNDER_ 5MB, as it's the highest size we can use without a prompt.
    this._storageSize = options.storageSize || 4980736;
    this._reuseKeys = options.reuseKeys || false;

    this._id = options.startId || 0;
  }

  checkStoreName() {
    if (usedKeys.indexOf(this._storageKey) === -1) {
      usedKeys.push(this._storageKey);
    } else {
      if (!this._reuseKeys) { // Allow reuse if options.reuseKeys set to true
        throw new errors.Forbidden(`The storage name '${this._storageKey}' is already in use by another instance.`);
      }
    }
  }

  async ready() {
    const self = this;
    // Now pre-load data (if any)
    let keys = Object.keys(this.store);
    await Promise.all([
      keys.forEach(key => {
        let id = self.store[key][self.id];
        id = self.setMax(id);
        return self.getModel().setItem(String(id), self.store[key])
      }
      )]);
  }

  getModel() {
    return this._storage;
  }

  async getEntries(params = {}) {
    debug(`getEntries(${JSON.stringify(params)})` + this._debugSuffix);
    
    return this._find({
      ...params,
      paginate: false
    })
      .then(select(params, this.id))
      .then(stringsToDates(this._dates));
  }

  getQuery(params) {
    const options = this.getOptions(params);
    const { $skip, $sort, $limit, $select, ...query } = params.query || {};
    
    return {
      query,
      filters: { $skip, $sort, $limit: getLimit($limit, options.paginate), $select }
    };
  }

  setMax(id) {
    let res = id;
    if (Number.isInteger(id)) {
      this._id = Math.max(Number.parseInt(id), this._id);
    }
    return id;
  }


  async _find(params = {}) {
    debug(`_find(${JSON.stringify(params)})` + this._debugSuffix);
    const self = this;
    const { paginate } = this.getOptions(params)
    const { query, filters } = self.getQuery(params);
    let keys = await self.getModel().keys();

    // An async equivalent of Array.filter()
    const asyncFilter = async (arr, predicate) => {
      const results = await Promise.all(arr.map(predicate));

      return arr.filter((_v, index) => results[index]);
    };

    // Determine relevant keys
    keys = await asyncFilter(keys, async key => {
      const item = await self.getModel().getItem(key);
      const match = self.options.matcher(query)(item);
      return match;
    });

    // Now retrieve all values
    let values = await Promise.all(keys.map(key => self.getModel().getItem(key)));
    const total = values.length;
    
    // Now we sort (if requested)
    if (filters.$sort !== undefined) {
      values.sort(this.options.sorter(filters.$sort));
    }

    // Skip requested items
    if (filters.$skip !== undefined) {
      values = values.slice(filters.$skip);
    }

    // Limit result to specified (or default) length
    if (filters.$limit !== undefined) {
      values = values.slice(0, filters.$limit);
    }

    // If wanted we convert all ISO string dates to Date objects
    values = stringsToDates(this._dates)(values);

    const result = {
      total,
      limit: filters.$limit,
      skip: filters.$skip || 0,
      data: values.map(value => _select(value, params, this.id))
    };

    if (!(paginate && paginate.default)) {
      debug(`_find res = ${JSON.stringify(result.data)}`);
      return result.data;
    }

    debug(`_find res = ${JSON.stringify(result)}`);
    return result;
  }

  async _get(id, params = {}) {
    debug(`_get(${id}, ${JSON.stringify(params)})` + this._debugSuffix);
    const self = this;
    const { query } = this.getQuery(params);

    return this.getModel().getItem(String(id), null)
      .catch(err => { throw new errors.NotFound(`No record found for ${this.id} '${id}', err=${err.name} ${err.message}` + this._debugSuffix); })
      .then(item => {
        if (item === null) throw new errors.NotFound(`No match for ${this.id} = '${id}',  query=${JSON.stringify(query)}` + this._debugSuffix);

        const match = self.options.matcher(query)(item);
        if (match) {
          return item;
        } else {
          throw new errors.NotFound(`No match for item = ${JSON.stringify(item)}, query=${JSON.stringify(query)}` + this._debugSuffix);
        }
      })
      .then(select(params, this.id))
      .then(stringsToDates(this._dates));
  }

  async _findOrGet(id, params = {}) {
    debug(`_findOrGet(${id}, ${JSON.stringify(params)})` + this._debugSuffix);
    if (id === null) {
      return this._find(_.extend({}, params, {
        paginate: false
      }));
    }

    return this._get(id, params)
  }

  async _create(raw, params = {}) {
    if (Array.isArray(raw) && !this.allowsMulti('create', params)) {
      throw new errors.MethodNotAllowed('Can not create multiple entries')
    }
    debug(`_create(${JSON.stringify(raw)}, ${JSON.stringify(params)})` + this._debugSuffix);
    const self = this;

    const addId = item => {
      let thisId = item[this.id];

      item[this.id] = thisId !== undefined ? this.setMax(thisId) : ++this._id;
      
      return item;
    };
    const data = Array.isArray(raw) ? raw.map(addId) : addId(Object.assign({}, raw));
    // We default to automatically add ID to items without but this can be skipped
    const addItemId = (!params.hasOwnProperty('addId') || params.addId)
    const doOne = item => {
      return this.getModel().setItem(String(item[this.id]), addItemId ? item : _.omit(item, [this.id]), null)
        .then(() => addItemId ? item : _.omit(item, [this.id]))
        .then(select(params, this.id))
        .then(stringsToDates(this._dates))
        .then(item => {
          return item;
        })
        .catch(err => {
          throw new errors.GeneralError(`_create doOne: ERROR: err=${err.name}, ${err.message}`);
        });
    };

    return Array.isArray(data) ? Promise.all(data.map(doOne)) : doOne(data);
  }

  async _patch(id, data, params = {}) {
    if (id === null && !this.allowsMulti('patch', params)) {
      throw new errors.MethodNotAllowed('Can not patch multiple entries')
    }
    debug(`_patch(${id}, ${JSON.stringify(data)}, ${JSON.stringify(params)})` + this._debugSuffix);
    const self = this;
    const items = await this._findOrGet(id, params);

    if (params.upsert) {
      if (Array.isArray(items) && (items.length === 0)) {
        return self._create(data);
      } else if (!items) {
        return self._create(data);
      }
    }

    const patchEntry = async entry => {
      const currentId = entry[this.id];

      const item = _.extend(entry, _.omit(data, this.id));
      await self.getModel().setItem(String(currentId), item, null);

      return stringsToDates(this._dates)(_select(item, params, this.id));
    };

    if (Array.isArray(items)) {
      return Promise.all(items.map(patchEntry));
    } else {
      return patchEntry(items);
    }
  }

  async _update(id, data, params = {}) {
    if (id === null || Array.isArray(data)) {
      throw new errors.BadRequest("You can not replace multiple instances. Did you mean 'patch'?")
    }
    debug(`_update(${id}, ${JSON.stringify(data)}, ${JSON.stringify(params)})` + this._debugSuffix);
    const item = await this._findOrGet(id, params);

    if (params.upsert) {
      if (Array.isArray(item) && (item.length === 0)) {
        return self._create(data);
      } else if (!item) {
        return self._create(data);
      }
    }

    id = item[this.id];

    const entry = _.omit(data, this.id);
    entry[this.id] = id;

    return this.getModel().setItem(String(id), entry, null)
      .then(() => entry)
      .then(select(params, this.id))
      .then(stringsToDates(this._dates));
  }

  async __removeItem(item) {
    await this.getModel(null).removeItem(String(item[this.id]), null);

    return item;
  }

  async _remove(id, params = {}) {
    if (id === null && !this.allowsMulti('remove', params)) {
      throw new errors.MethodNotAllowed('Can not remove multiple entries')
    }
    debug(`_remove(${id}, ${JSON.stringify(params)})` + this._debugSuffix);
    const items = await this._findOrGet(id, params);
    const self = this;
    if (Array.isArray(items)) {
      return Promise.all(items.map(item => this.__removeItem(item), null))
        .then(select(params, this.id));
    } else {
      return this.__removeItem(items)
        .then(select(params, this.id));
    }
  }
}

// Create the service.
class Service extends Adapter {
  constructor(options = {}) {
    super(options);
  }

  // Perform requests to adapter
  async find (params) {
    return this._find(params)
  }

  async get (id, params) {
    return this._get(id, params)
  }

  async create (data, params) {
    return this._create(data, params)
  }

  async update (id, data, params) {
    return this._update(id, data, params)
  }

  async patch (id, data, params) {
    return this._patch(id, data, params)
  }

  async remove (id, params) {
    return this._remove(id, params)
  }
}
function init(options) {
  return new Service(options);
};

module.exports = init;
init.Service = Service;
init.LocalForage = LocalForage;
