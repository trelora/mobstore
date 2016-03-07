import {MobStore} from '../src/index.js';
import {isObservable, autorun, observable} from 'mobx';
import test from 'tape';


test("MobStore collection", t => {
  MobStore.clearStores();

  const store = new MobStore({
    collectionName: "items",
    type: "item"
  });

  t.true(store.items,
         "has an observable named collection");

  t.true(isObservable(store.collection),
         "can access the collection generically too");

  t.looseEqual(store.items.slice(), [],
               "the collection starts empty");

  t.end();
});


test("MobStore inject", t => {
  MobStore.clearStores();

  const store = new MobStore({
    collectionName: "items",
    type: "item"
  });

  let testObserver;

  autorun(() => {
    if (store.items.length)
      testObserver = store.items[0];
  });

  t.deepEqual(testObserver, undefined,
              "as a sanity check, the testObserver starts out undefined");

  store.inject({
    id: 42,
    name: "Foo Item"
  });

  t.equal(store.items.length, 1,
          "injecting an item saves it in the store");

  t.deepEqual(store.items[0], {id: 42, name: "Foo Item", type: 'item'},
              "saves the item's properites in the store");

  t.deepEqual(testObserver, {id: 42, name: "Foo Item", type: 'item'},
              "an observer gets updated when an item is injected");

  store.inject({
    id: 42,
    name: "Bar Item"
  });


  t.equal(store.items.length, 1,
          "injecting the same item again doesn't add a new item");

  t.deepEqual(store.items[0], {id: 42, name: "Bar Item", type: 'item'},
              "injecting the same item again updates the original item");

  t.deepEqual(testObserver, {id: 42, name: "Bar Item", type: 'item'},
              "an observer gets updated when an item is updated");

  t.end();

});


test("MobStore find", t => {
  MobStore.clearStores();

  const store = new MobStore({
    collectionName: "items",
    type: "item"
  });

  store.items = [
    {
      id: 42,
      name: "Foo Item"
    }
  ];

  const foo = store.find(42);

  t.deepEqual(foo, {id: 42, name: "Foo Item"},
              "finds an item in the store by id");

  const bar = store.find(99);

  t.false(bar,
          "returns undefined when the item does not exist in the store");

  t.end();
});

test("MobStore findIndex", t => {
  MobStore.clearStores();

  const store = new MobStore({
    collectionName: "items",
    type: "item"
  });

  store.items = [
    {
      id: 42,
      name: "Foo Item"
    },
    {
      id: 43,
      name: "Foo Item 2"
    },
    {
      id: 57,
      name: "Foo Item 3"
    },
  ];

  t.equal(store.findIndex(43), 1,
          "finds an item's index in the store by id");

  t.false(store.find(99),
          "returns undefined when the item does not exist in the store");

  t.end();
});


test("MobStore.wrap", t => {

  t.deepEqual(MobStore.wrap([{}, {}]), [{}, {}],
              "leaves an array of objects alone");

  t.deepEqual(MobStore.wrap({}), [{}],
              "wraps a bare object in an array");

  t.end();
});




test("MobStore inject with associations", t => {
  MobStore.clearStores();

  const itemStore = new MobStore({
    collectionName: "items",
    type: "item"
  });

  const listStore = new MobStore({
    collectionName: "lists",
    type: "list",
    associations: [
      {
        key: "listEntries",
        type: "item",
        plural: true
      }
    ]
  });

  listStore.inject({
    id: 42,
    name: "first list",
    listEntries: [
      {
        id: 12,
        name: "Foo Item"
      }
    ]
  });

  t.equal(listStore.lists[0].name, "first list",
          "injects the parent object");

  t.equal(itemStore.items[0].name, "Foo Item",
          "injects the associated object");

  itemStore.inject({
    id: 12,
    name: "Bar Item"
  });


  t.equal(itemStore.items[0].name, "Bar Item",
          "inject to the child store updates the child object");

  t.equal(listStore.lists[0].listEntries[0].name, "Bar Item",
          "the child object is the same as the parent's property");



  // Now do it all again, but this time add the child object FIRST, and still
  // expect the parent's association to be updated

  itemStore.inject({
    id: 1,
    name: "genesis item"
  });

  t.equal(itemStore.find(1).name, "genesis item",
          "sanity check that the item is saved in the store correctly");


  listStore.inject([
    {
      id: 42,
      name: "first list updated",
      listEntries: [
        {
          id: 1,
          name: "deuteronomy item"
        }
      ]
    },
    {
      id: 43,
      name: "second list",
      listEntries: [
        {
          id: 1,
          name: "deuteronomy item"
        }
      ]
    }
  ]);


  t.equal(listStore.find(43).name, "second list",
          "injects the parent object");

  t.equal(itemStore.find(1).name, "deuteronomy item",
          "updates the child object");

  itemStore.inject({
    id: 1,
    name: "ezekiel item"
  });

  t.equal(listStore.find(43).listEntries[0].name, "ezekiel item",
          "the child object is still the same as the parent's associated object");

  t.end();
});


test("MobStore inject, updating association list", t => {
  MobStore.clearStores();

  const itemStore = new MobStore({
    collectionName: "items",
    type: "item"
  });

  const listStore = new MobStore({
    collectionName: "lists",
    type: "list",
    associations: [
      {
        key: "listEntries",
        type: "item",
        plural: true
      }
    ]
  });

  listStore.inject({
    id: 42,
    name: "first list",
    listEntries: [
      {
        id: 12,
        name: "Foo Item"
      }
    ]
  });

  listStore.inject({
    id: 42,
    name: "first list updated",
    listEntries: [
      {
        id: 13,
        name: "Bar Item"
      }
    ]
  });

  t.equal(listStore.find(42).name, "first list updated",
          "the parent object's properties are updated");

  t.equal(listStore.find(42).listEntries[0].id, 13,
          "the parent object's association list is updated");

  t.end();
});


test('MobStore associations inverse', t => {
  MobStore.clearStores();

  const itemStore = new MobStore({
    collectionName: "items",
    type: "item",
    associations: [
      {
        key: "list",
        type: "list"
      }
    ]
  });

  const listStore = new MobStore({
    collectionName: "lists",
    type: "list",
    associations: [
      {
        key: "listEntries",
        type: "item",
        plural: true,
        inverse: {
          key: 'list'
        }
      }
    ]
  });

  const aListData = {
    id: 3,
    name: 'The A List',
    listEntries: [{
      id: 1,
      name: "The Item"
    }]
  };

  listStore.inject(aListData);

  const theItem = itemStore.find(1);
  const theList = listStore.find(3);


  t.equal(theItem.list, theList,
          'the item is automatically populated with the "inverse" relationship to the list');

  t.end();
});

test("MobStore callbacks", t => {
  MobStore.clearStores();

  let calledMethods = {};
  let order = 1;

  const itemStore = new MobStore({
    collectionName: "items",
    type: "item",
    afterInject(i) {
      calledMethods["afterInject"] = order;
      order++;
    },
    afterUpdate(i) {
      calledMethods["afterUpdate"] = order;
      order++;
    },
    afterAdd(i) {
      calledMethods["afterAdd"] = order;
      order++;
    }
  });

  itemStore.inject({
    id: 1,
    name: "Foo"
  });


  t.deepEqual(calledMethods, {
    afterAdd: 1,
    afterInject: 2
  },
              'the inject/add callbacks were called in the right order');

  // reset test counters
  calledMethods = {};
  order = 1;

  itemStore.inject({
    id: 1,
    name: "Foo"
  });


  t.deepEqual(calledMethods, {
    afterInject: 1
  },
              'the inject callback was called, but no add/update because nothing changed');

  // reset test counters
  calledMethods = {};
  order = 1;

  itemStore.inject({
    id: 1,
    name: "Bar"
  });


  t.deepEqual(calledMethods, {
    afterUpdate: 1,
    afterInject: 2
  },
              'the update/inject callbacks were called');



  t.end();
});



test("MobStore instanceMethods", t => {
  MobStore.clearStores();

  const itemStore = new MobStore({
    collectionName: "items",
    type: "item",
    instanceMethods: {
      sayHello() {
        return `Hello ${this.name}!`;
      }
    }
  });


  itemStore.inject({
    id: 42,
    name: "J to the Eff"
  });

  const item = itemStore.find(42);

  t.ok(item.sayHello,
       "an instance has the instance method");

  t.equal(item.sayHello(), "Hello J to the Eff!",
          "the instance method is bound properly to `this`");

  t.end();

});


test("MobStore inject with singualar association", t => {
  MobStore.clearStores();

  const postStore = new MobStore({
    collectionName: 'posts',
    type: 'post',
    associations: [
      {
        key: "author",
        type: "person",
        plural: false
      }
    ]
  });

  const peopleStore = new MobStore({
    collectionName: "people",
    type: 'person'
  });

  postStore.inject({
    id: 2,
    name: "A name for a post",
    author: {
      id: 4,
      name: "Jeff"
    }
  });

  t.equal(postStore.posts[0].author.name, "Jeff",
          "hooks up the association");


  t.end();
});


test("MobStore an inverse plural key gets initialized with an array by default", t => {
  MobStore.clearStores();

  const itemStore = new MobStore({
    collectionName: "items",
    type: "item",
    associations: [
      {
        key: "list",
        type: "list",
        inverse: {
          key: "items",
          plural: true
        }
      }
    ]
  });

  const listStore = new MobStore({
    collectionName: "lists",
    type: "list",
    associations: [
      {
        key: "items",
        type: "item"
      }
    ]
  });

  itemStore.inject({
    id: 1,
    name: "item name 1",
    list: {id: 42}
  });

  t.equal(listStore.lists[0].items[0].name, "item name 1",
          "populates the inverse plural association as an array");

  t.end();
});


test("MobStore overwriting a singular association with null", t => {
  MobStore.clearStores();

  const postStore = new MobStore({
    collectionName: 'posts',
    type: 'post',
    associations: [
      {
        key: "author",
        type: "person",
        plural: false
      }
    ]
  });

  const peopleStore = new MobStore({
    collectionName: "people",
    type: 'person'
  });


  postStore.inject({
    id: 2,
    name: "A name for a post",
    author: {
      id: 4,
      name: "Jeff"
    }
  });

  t.equal(postStore.posts[0].author.name, "Jeff",
          "hooks up the association");

  postStore.inject({
    id: 2,
    name: "A name for a post",
    author: null
  });

  t.equal(postStore.posts[0].author, null,
          "replaces the association with null");

  t.end();

});


test("MobStore overwriting a plural association with null", t => {
  MobStore.clearStores();

  const postStore = new MobStore({
    collectionName: 'posts',
    type: 'post',
    associations: [
      {
        key: "authors",
        type: "person",
        plural: true
      }
    ]
  });

  const peopleStore = new MobStore({
    collectionName: "people",
    type: 'person'
  });


  postStore.inject({
    id: 2,
    name: "A name for a post",
    authors: [
      {
        id: 4,
        name: "Jeff"
      }
    ]
  });

  t.equal(postStore.posts[0].authors[0].name, "Jeff",
          "hooks up the association");

  postStore.inject({
    id: 2,
    name: "A name for a post",
    authors: null
  });

  t.equal(postStore.posts[0].authors.length, 0,
          "replaces the association with []");

  t.end();

});

