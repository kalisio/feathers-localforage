const adapterTests = require('@feathersjs/adapter-tests');
const errors = require('@feathersjs/errors');
const feathers = require('@feathersjs/feathers');
const LocalStorage = require('./utilities/local-storage');
global.localStorage = new LocalStorage();

const assert = require('assert');

const service = require('../src');

const testSuite = adapterTests([
  '.options',
  '.events',
  '._get',
  '._find',
  '._create',
  '._update',
  '._patch',
  '._remove',
  '.get',
  '.get + $select',
  '.get + id + query',
  '.get + NotFound',
  '.find',
  '.remove',
  '.remove + $select',
  '.remove + id + query',
  '.remove + multi',
  '.update',
  '.update + $select',
  '.update + id + query',
  '.update + NotFound',
  '.update + query + NotFound',
  '.patch',
  '.patch + $select',
  '.patch + id + query',
  '.patch multiple',
  '.patch + NotFound',
  '.patch multi query same',
  '.patch multi query changed',
  '.patch + query + NotFound',
  '.create',
  '.create + $select',
  '.create multi',
  'internal .find',
  'internal .get',
  'internal .create',
  'internal .update',
  'internal .patch',
  'internal .remove',
  '.find + equal',
  '.find + equal multiple',
  '.find + $sort',
  '.find + $sort + string',
  '.find + $limit',
  '.find + $limit 0',
  '.find + $skip',
  '.find + $select',
  '.find + $or',
  '.find + $in',
  '.find + $nin',
  '.find + $lt',
  '.find + $lte',
  '.find + $gt',
  '.find + $gte',
  '.find + $ne',
  '.find + $gt + $lt + $sort',
  '.find + $or nested + $sort',
  '.find + paginate',
  '.find + paginate + $limit + $skip',
  '.find + paginate + $limit 0',
  '.find + paginate + params',
  '.get + id + query id',
  '.remove + id + query id',
  '.update + id + query id',
  '.patch + id + query id'
]);

describe('Feathers LocalForage Service', () => {
  const events = ['testing'];
  const app = feathers()
    .use('/people', service({ events, name: 'test-people-service', storeName: 'test-people-storage', date: false }))
    .use('/people-customid', service({
      id: 'customid', events, name: 'test-people-customid-service', storeName: 'test-people-customid-storage', date: false
    }));

  describe('Specific adapter tests', () => {

    describe('Basic tests', () => {

      after(() => {
        console.log('\n');
      });

      it('is CommonJS compatible', () => {
        assert.strictEqual(typeof require('../src'), 'function');
      });

      it('throws on name reuse', done => {
        const name = 'test-service-1';
        const storeName = 'test-storage-1';

        assert.throws(() => {
          app.use('service1', service({ name, storeName }));
          app.use('service2', service({ name, storeName }));
        });

        done();
      });

      it('accepts name reuse with reuseKeys option set', done => {
        const name = 'test-service-2';
        const storeName = 'test-storage-2';

        let flag = true;
        try {
          app.use('service2', service({ name, storeName }));
          app.use('service2-reused', service({ name, storeName, reuseKeys: true }));
        } catch (err) {
          flag = false;
        }
        assert.strictEqual(flag, true);

        done();
      });

      it('accepts name reuse with reuseKeys option set + contents', async () => {
        const name = 'test-service-3';
        const storeName = 'test-storage-3';

        let flag = null;
        app.use('service3', service({ name, storeName }));
        app.service('service3').create({ name: 'Bond', age: 58 })
          .then(() => app.use('service4', service({ name, storeName, reuseKeys: true })))
          .then(() => flag = true)
          .then(() => {
            assert.strictEqual(flag, true, `Reuse with flag + contents failed.`);
          })
          .catch(err => {
            assert.strictEqual(false, true, `Reuse with flag + contents failed. err=${err.name}, message=${err.message}`);
            flag = false;
          });
      });

      it('works with default options', () => {
        app.use('service4', service());
        const myService = app.service('service4');
        return myService.create({ id: 1, name: 'Bond' })
          .catch(err => {
            assert.strictEqual(true, false, `ERROR: ${err.name}, ${err.message}`);
          });
      });

      it('special debug (_local)', () => {
        app.use('service_local', service({ name: 'service_local' }));
        const myService = app.service('service_local');
        return myService.create({ id: 1, name: 'Bond' })
          .catch(err => {
            assert.strictEqual(true, false, `ERROR: ${err.name}, ${err.message}`);
          });
      });

      it('special debug (_queue)', () => {
        app.use('service_queue', service({ name: 'service_queue' }));
        const myService = app.service('service_queue');
        return myService.create({ id: 1, name: 'Bond' })
          .catch(err => {
            assert.strictEqual(true, false, `ERROR: ${err.name}, ${err.message}`);
          });
      });

      it('get unknown id throws', async () => {
        app.use('service5', service({ name: 'service5' }));
        const myService = app.service('service5');
        let flag = null;
        try {
          await myService.create({ id: 1, name: 'Bond' })
          await myService.get(99);
          flag = true;
        } catch (err) {
          flag = false;
        }
        assert.strictEqual(flag, false, 'Did not throw as expected');
      });

      it('create with id set', async () => {
        const name = 'test-storage-6';
        app.use('service6', service({ name }));
        const myService = app.service('service6');

        const data = { id: '123', name: 'David', age: 32 };
        let result = {};
        try {
          result = await myService.create(data, {});
        } catch (err) {
          assert.strictEqual(false, true, `Error creating item with id set. err=${err.name}, ${err.message}`);
        }

        assert.strictEqual(result.id, data.id, 'Strange difference on "id"');
        assert.strictEqual(result.name, data.name, 'Strange difference on "name"');
        assert.strictEqual(result.age, data.age, 'Strange difference on "age"');
        result = await myService.remove(data.id, {});
      });

      it('create by skipping id generation', async () => {
        const name = 'test-storage-7';
        app.use('service7', service({ name }));
        const myService = app.service('service7');

        let data = { name: 'David', age: 32 };
        let result = {};
        try {
          result = await myService.create(data, { addId: false });
        } catch (err) {
          assert.strictEqual(false, true, `Error creating item without id. err=${err.name}, ${err.message}`);
        }
        assert.strictEqual(result.id, data.id, 'Strange difference on "id"');
        assert.strictEqual(result.name, data.name, 'Strange difference on "name"');
        assert.strictEqual(result.age, data.age, 'Strange difference on "age"');
        result = await myService.get('1');
        assert.strictEqual(result.id, data.id, 'Strange difference on "id"');
        assert.strictEqual(result.name, data.name, 'Strange difference on "name"');
        assert.strictEqual(result.age, data.age, 'Strange difference on "age"');
        result = await myService.remove('1', {});

        data = { id: '123', name: 'David', age: 32 };
        result = {};
        try {
          result = await myService.create(data, { addId: false });
        } catch (err) {
          assert.strictEqual(false, true, `Error creating item with id set. err=${err.name}, ${err.message}`);
        }
        assert.strictEqual(result.id, data.id, 'Strange difference on "id"');
        assert.strictEqual(result.name, data.name, 'Strange difference on "name"');
        assert.strictEqual(result.age, data.age, 'Strange difference on "age"');
        result = await myService.get(data.id);
        assert.strictEqual(result.id, data.id, 'Strange difference on "id"');
        assert.strictEqual(result.name, data.name, 'Strange difference on "name"');
        assert.strictEqual(result.age, data.age, 'Strange difference on "age"');
        result = await myService.remove(data.id, {});
      });
    });

    describe('Check driver settings', () => {
      let ix = 0;

      after(() => {
        console.log('\n');
      });

      function checkValidDrivers(drivers) {
        return drivers.forEach(driver => checkValidDriver(driver));
      }

      function checkValidDriver(driver) {
        it(`valid driver ${JSON.stringify(driver)} works`, () => {
          let myService = null;
          let bWorked = null;
          try {
            app.use(`service4-${driver}${++ix}`, service({ name: `service4-${driver}${ix}`, storage: driver }));
            myService = app.service(`service4-${driver}${ix}`);
            myService.create({ id: 1, name: 'Bond' });
            bWorked = true;
          } catch (err) {
            bWorked = false;
            assert.strictEqual(true, false, `Valid driver ${JSON.stringify(driver)} failed with ERROR: ${err.name}, ${err.message}`);
          }
          assert.strictEqual(bWorked, true, `Valid driver ${JSON.stringify(driver)} unexpectedly did not work!`);
        });
      }

      checkValidDrivers([
        'IndexedDB',
        'WebSQL',
        'LocalStorage',
        ['IndexedDB'],
        ['IndexedDB', 'WebSQL'],
        ['IndexedDB', 'WebSQL', 'LocalStorage'],
        ['WebSQL'],
        ['WebSQL', 'LocalStorage'],
        ['WebSQL', 'LocalStorage', 'IndexedDB'],
        ['LocalStorage'],
        ['LocalStorage', 'IndexedDB'],
        ['LocalStorage', 'IndexedDB', 'WebSQL'],
      ]);

      function checkInvalidDriver(driver) {
        it(`invalid driver '${JSON.stringify(driver)}' aborts`, () => {
          let myService = null;
          let bWorked = null;
          try {
            app.use(`service4-${driver}${++ix}`, service({ name: `service4-${driver}${ix}`, storage: driver }));
            myService = app.service(`service4-${driver}${ix}`);
            myService.create({ id: 1, name: 'Bond' });
            bWorked = true;
          } catch (err) {
            bWorked = false;
            assert.strictEqual(err.name, 'NotAcceptable', `Invalid driver ${JSON.stringify(driver)} threw wrong error: ${err.name}, ${err.message}`);
          }
          assert.strictEqual(bWorked, false, `Invalid driver ${JSON.stringify(driver)} unexpectedly worked!`);
        });
      }

      [ 'xxS', [ 'XXS' ], [ 'XXS', 'IndexedDB'], [ 'IndexedDB', 'XXS'] ].forEach(d => checkInvalidDriver(d));

    });
    
    describe('getEntries', () => {
      let myService = null;
      const serviceName = 'service6';
      const name = 'test-storage-9';
      let doug = {};
      let idProp = 'unknown??';
      
      after(() => {
        console.log('\n');
      });
        
      beforeEach(async () => {
        app.use(serviceName, service({ name, reuseKeys: true }))
        myService = app.service(serviceName);
        idProp = myService.id;
        doug = await myService.create({
          name: 'Doug',
          age: 32
        });
      });
      
      afterEach(async () => {
        try {
          await myService.remove(doug[idProp]);
        } catch (err) {
          throw new Error(`Unexpectedly failed to remove 'doug'! err=${err.name}, ${err.message} id=${doug[idProp]}, idProp=${idProp}`);
      }
    });

    it('getEntries', async () => {
      let result = {};
      try {
        result = await myService.getEntries();
      } catch (err) {
        assert.strictEqual(false, true, 'Error getting all entries');
      }
      
      assert.strictEqual(result.length, 1, 'Length was expected to be 1');
      assert.strictEqual(result[0].name, doug.name, 'Expected "name" to be "Doug"');
      assert.strictEqual(result[0].age, doug.age, 'Strange difference on "age"');
    });

    it('getEntries + $select', async () => {
      let result = {};
      try {
        result = await myService.getEntries({ query: { $select: ['age'] } });
      } catch (err) {
        assert.strictEqual(false, true, 'Error getting all entries');
      }

      assert.strictEqual(result.length, 1, 'Length was expected to be 1');
      assert.strictEqual(result[0].name, undefined, 'Expected "name" to be undefined');
      assert.strictEqual(result[0].age, doug.age, 'Strange difference on "age"');
    });
  });
  
  describe('Types are preserved', () => {
    const serviceName = 'types';
    const bDate = new Date('2001-09-11T09:00:00.000Z');
    let sService = null;
    let doug;
    const idProp = 'id';
    class TestClass {
      dummy() {
      }
    }
    
    after(() => {
      console.log('\n');
    });

    beforeEach(async () => {
      doug = {};
    });
    
    afterEach(async () => {
      try {
        await sService.remove(doug[idProp]);
      } catch (err) {
        throw new Error(`Unexpectedly failed to remove 'doug'! err=${err.name}, ${err.message} id=${doug[idProp]}, idProp=${idProp}`);
      }
    });
    
    it('types ok (dates set to \'true\')', async () => {
      const app = feathers()
        .use(serviceName, service({ id: idProp, name: serviceName, reuseKeys: true, dates: true }));
        sService = app.service(serviceName);
      doug = await sService.create({
        [idProp]: 0,
        name: 'Doug',
        age: 32,
        birthdate: bDate,
        tc: new TestClass()
      });
      
      let result = {};
      try {
        result = await sService.getEntries();
      } catch (err) {
        assert.strictEqual(false, true, 'Error getting all entries');
      }
      
      assert.strictEqual(typeof result[0].name, 'string', '\'name\' was expected to be of type \'string\'');
      assert.strictEqual(result[0].name, 'Doug', '\'name\' was expected to equal \'Doug\'');
      assert.strictEqual(typeof result[0].age, 'number', '\'age\' was expected to be of type \'number\'');
      assert.strictEqual(result[0].age, 32, '\'age\' was expected to equal 32');
      assert.strictEqual(typeof result[0].birthdate, 'object', '\'birthdate\' was expected to be of type \'object\'');
      assert.strictEqual(result[0].birthdate.toISOString(), bDate.toISOString(), `'birthdate' was expected to equal '${bDate.toISOString()}'`);
      assert.strictEqual(result[0].birthdate - bDate, 0, '\'birthdate\' was expected to equal \'bDate\''); // eslint-disable-line eqeqeq
      assert.strictEqual(JSON.stringify(result[0].tc), JSON.stringify(doug.tc), '\'tc\' expected to be equal to \'TestClass\'');
    });
    
    it('types ok (dates set to \'false\' (default))', async () => {
      const app = feathers()
      .use(serviceName, service({ id: idProp, name: serviceName, reuseKeys: true }));
      sService = app.service(serviceName);
      const dDate = new Date(bDate.getTime() + 1);
      doug = await sService.create({
        [idProp]: 0,
        name: 'Doug',
        age: 32,
        birthdate: bDate,
        deceased: dDate.toISOString(),
        tc: new TestClass()
      });
      let result = {};
      try {
        result = await sService.getEntries();
      } catch (err) {
        assert.strictEqual(false, true, 'Error getting all entries');
      }
      
      assert.strictEqual(typeof result[0].name, 'string', '\'name\' was expected to be of type \'string\'');
      assert.strictEqual(result[0].name, 'Doug', '\'name\' was expected to equal \'Doug\'');
      assert.strictEqual(typeof result[0].age, 'number', '\'age\' was expected to be of type \'number\'');
      assert.strictEqual(result[0].age, 32, '\'age\' was expected to equal 32');
      assert.strictEqual(typeof result[0].birthdate, 'string', `'birthdate' was expected to be of type 'string'`);
      assert.strictEqual(result[0].birthdate, bDate.toISOString(), `'birthdate' was expected to equal '${bDate.toISOString()}'`);
      assert.strictEqual(new Date(result[0].birthdate) - bDate, 0, '\'birthdate\' was expected to equal \'bDate\''); // eslint-disable-line eqeqeq
      assert.strictEqual(typeof result[0].deceased, 'string', `'deceased' was expected to be of type 'string'`);
      assert.strictEqual(new Date(result[0].deceased).toISOString(), dDate.toISOString(), `'deceased' = '${result[0].deceased}' was expected to equal '${dDate.toISOString()}'`);
      assert.strictEqual(new Date(result[0].deceased).getTime() - bDate.getTime(), 1, '\'deceased\' was expected to equal \'bDate.getTime() + 1\''); // eslint-disable-line eqeqeq
      assert.strictEqual(JSON.stringify(result[0].tc), JSON.stringify(doug.tc), '\'tc\' expected to be equal to \'TestClass\'');
    });
  });

  describe('Pre-load data', () => {
    const samples = 5;
    let data = {};
    
    beforeEach(() => {
      data = {};
      
      for (let i = 0; i < samples; i++)
      data[i] = { id: i, age: 10 + i, born: 2011 - i };
    });
    
    after(() => {
      console.log(`\n`);
    });
    
    it('Pre-loading works', async () => {
      const preLoadService = 'preloadData';
      const app = feathers()
      .use(preLoadService, service({ name: preLoadService, store: data }));
      let myService = app.service(preLoadService);
      
      let result = {};
      try {
        result = await myService.getEntries();
      } catch (err) {
        assert.strictEqual(false, true, 'Error getting all entries');
      }
      
      assert.strictEqual(result.length, Object.keys(data).length, `length does not match (${result.length} /= ${Object.keys(data).length})`);
      
      result.forEach((item, ix) => {
        assert.strictEqual(item.id, data[ix].id, `'id' does not match (${item.id} != ${data[ix].id})`);
        assert.strictEqual(item.age, data[ix].age, `'age' does not match (${item.age} != ${data[ix].age})`);
        assert.strictEqual(item.born, data[ix].born, `'born' does not match (${item.born} != ${data[ix].born})`);
      });
      
      return myService.create({ age: 59, born: 1962 })
        .then(item => {
          // As we pre-loaded ids from 0-4 we pre-suppose (all numbers) the next in line ought to be 5...
          assert.strictEqual(item.id, 5, `'id' does not match (${item.id} != 5)`);
          assert.strictEqual(item.age, 59, `'age' does not match (${item.age} != 59)`);
          assert.strictEqual(item.born, 1962, `'born' does not match (${item.born} != 1962)`);
           })
           
    });

  });
});

  testSuite(app, errors, 'people');
  testSuite(app, errors, 'people-customid', 'customid');
});
