# \@feathersjs-offline/localforage

[![Latest Release](https://img.shields.io/github/v/tag/kalisio/feathers-localforage?sort=semver&label=latest)](https://github.com/kalisio/feathers-localforage/releases)
[![CI](https://github.com/kalisio/feathers-localforage/actions/workflows/main.yaml/badge.svg)](https://github.com/kalisio/feathers-localforage/actions/workflows/main.yaml)
[![Code Climate](https://codeclimate.com/github/kalisio/feathers-localforage/badges/gpa.svg)](https://codeclimate.com/github/kalisio/feathers-localforage)
[![Test Coverage](https://codeclimate.com/github/kalisio/feathers-localforage/badges/coverage.svg)](https://codeclimate.com/github/kalisio/feathers-localforage/coverage)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

[@kalisio/localforage](https://github.com/kalisio/localforage/) is a database service adapter wrapping `localForage` that persists to either `IndexedDB`, `WebSQL`, or `LocalStorage` making it very useful for mobile and offline-first applications with the additional ability to seamlessly handle Blobs, TypedArrays, and other JS objects.

```bash
$ npm install --save @kalisio/localforage
```

> __Important:__ `@feathersjs-offline/localforage` implements the [Feathers Common database adapter API](https://docs.feathersjs.com/api/databases/common.html) and [querying syntax](https://docs.feathersjs.com/api/databases/querying.html).

The changelog of this fork is managed through GitHub [Milestones](https://github.com/kalisio/feathers-localforage/milestones) and related issues.

## API

### `service(options)`

Returns a new service instance initialized with the given options.

```js
const service = require('@feathersjs-offline/localforage');

app.use('/messages', service({
  storage: ['IndexedDB', 'localStorage']
}));
app.use('/messages', service({ storage, id, startId, name, store, paginate }));
```

__Options:__

- `storage` (*optional*, default: `'INDEXEDDB'`) - The storage backend. Must be one or more of `'INDEXEDDB'`, `'WEBSQL'`, or `'LOCALSTORAGE'`. The adapter will use the same sequence as fall-back if the desired storage type is not supported on the actual device. Alternatively, you can supply an array of storage backends determining the priority of your choice.
- `version` (*optional*, default: `1.0`) - `localforage` driver version to use. Currently only `1.0` exists.
- `size` (*optional*, default `4980736`) - The maximum database size required. Default DB size is _JUST UNDER_ 5MB, as it's the highest size we can use without a prompt in any browser.
- `id` (*optional*, default: `'id'`) - The name of the id field property.
- `name` (*optional*, default: `'feathersjs-offline'`) - The name of the underlying localforage database. With local storage, this is used as a key prefix.
- `storeName` (*optional*, default: `'feathers'`) - The name of the datastore. Depending on the storage backend it could be the name of the key/value table in the database (eg WebSQL) or the key (eg local storage). Must be alphanumeric, with underscores. 
- `store` (*optional*) - An object with id to item assignments to pre-initialize the data store.
- `dates` (*optional*, default `false`) - Convert ISO-formatted date strings to `Date` objects in result sets.
- `events` (*optional*) - A list of [custom service events](https://docs.feathersjs.com/api/events.html#custom-events) sent by this service.
- `paginate` (*optional*) - A [pagination object](https://docs.feathersjs.com/api/databases/common.html#pagination) containing a `default` and `max` page size.
- `whitelist` (*optional*) - A list of additional query parameters to allow.
- `multi` (*optional*) - Allow `create` with arrays and `update` and `remove` with `id` `null` to change multiple items. Can be `true` for all methods or an array of allowed methods (e.g. `[ 'remove', 'create' ]`).
- `reuseKeys` (*optional*, default: `false`) Allow duplicate keys (see `name`) i.e. last definition wins. Mostly useful for demonstration and testing purposes.

## Storing Blobs, TypedArrays, and other JS objects

As this is an implementation on top of `localForage` you can store any type in `@feathersjs-offline/localforage`; you aren't limited to strings like in `localStorage`. Even if `localStorage` is your storage backend, `@feathersjs-offline/localforage` automatically does JSON.parse() and JSON.stringify() when getting/setting values.

`feathers-localforage` supports storing all native JS objects that can be serialized to JSON, as well as ArrayBuffers, Blobs, and TypedArrays. Check the [localForage API docs](https://localforage.github.io/localForage/#data-api-setitem) for a full list of types supported. In addition, setting the option `dates` to `true` will make sure any ISO-formatted dates in your results will in fact be date objects and not text strings.

> All types are supported in every storage backend, though storage limits in `localStorage` make storing many large Blobs impossible.

We default to `indexedDB` if available and fall-back to `localStorage` as a last resort.


## Example

See the [clients](https://docs.feathersjs.com/api/client.html) chapter for more information about using Feathers in the browser and React Native.

### Browser

```html
<script type="text/javascript" src="//unpkg.com/@feathersjs/client@^4.5.11/dist/feathers.js"></script>
<script type="text/javascript" src="//unpkg.com/@feathersjs-offline/localforage@^1.0.0/dist/localforage.js"></script>
<script type="text/javascript">
  var service = feathersjsOfflineLocalforage.init({
    storage: ['indexeddb', 'websql', 'localStorage']
  });
  var app = feathers().use('/messages', service);

  var messages = app.service('messages');

  messages.on('created', function(message) {
    console.log('Someone created a message', message);
  });

  messages.create({
    text: 'Message created in browser'
  });
</script>
```

## License

Copyright (c) 2021 by Feathers

Licensed under the [MIT license](LICENSE).
