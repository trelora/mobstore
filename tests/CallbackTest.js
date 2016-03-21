import {MobStore} from '../src/index.js';
import test from 'tape';


test("MobStore afterUpdate callback receives diff object", t => {
  MobStore.clearStores();
  t.plan(6);

  const store = new MobStore({
    collectionName: "items",
    type: "item",

    // afterInject gets called twice
    afterInject(item) {
      t.equal(item.getWord(), "bird"); // the instanceMethods are already hooked up by now
    },

    // afterAdd only gets called once
    afterAdd(item) {
      t.deepEqual(item, {id: 1, type: 'item', name: "foo"});
      t.equal(item.getWord(), "bird"); // the instanceMethods are already hooked up by now
    },

    // afterUpdate only gets called once
    afterUpdate(item, diff) {
      t.deepEqual(item, {id: 1, type: 'item', name: "bar"});
      t.deepEqual(diff, {name: {oldValue: "foo", newValue: "bar"}});
    },
    instanceMethods: {
      getWord() {
        return "bird";
      }
    }
  });

  // add it
  store.inject({
    id: 1,
    name: "foo"
  });

  // update it
  store.inject({
    id: 1,
    name: "bar"
  });


});


test("MobStore object injected by proxy gets callbacks too", t => {
  t.plan(10);

  const postStore = new MobStore({
    collectionName: "posts",
    type: "post",
    associations: [
      {
        key: "comments",
        type: "comment",
        plural: true
      }
    ]
  });

  const commentStore = new MobStore({
    collectionName: "comments",
    type: "comment",
    afterAdd(c) {
      t.true(typeof this.inject == 'function'); // proving that `this` is this store
      t.true(this.collectionName == 'comments');// proving that `this` is this store
      t.deepEqual(c, {id: 1, text: "comment 1", type: "comment"});
    },
    afterInject(c) {
      t.true(typeof this.inject == 'function'); // proving that `this` is this store
      t.true(this.collectionName == 'comments');// proving that `this` is this store
      t.deepEqual(c, {id: 1, text: "comment 1", type: "comment"});
    },
    afterUpdate(c, diff) {
      t.true(typeof this.inject == 'function'); // proving that `this` is this store
      t.true(this.collectionName == 'comments');// proving that `this` is this store
      t.deepEqual(c, {id: 1, text: "comment 1 updated", type: "comment"});
      t.deepEqual(diff, {text: {oldValue: "comment 1", newValue: "comment 1 updated"}});
    }
  });


  // inserting posts to the post store, but asserting callbacks are called on the comments
  postStore.inject({
    id: 42,
    title: "Post 1",
    text: "Post 1 text",
    comments: {
      id: 1,
      text: "comment 1"
    }
  });

  postStore.inject({
    id: 42,
    comments: {
      id: 1,
      text: "comment 1 updated"
    }
  });


});


test("Injecting a circular reference only calls callback once per object", t => {
  MobStore.clearStores();

  let addCount = 0,
      injectCount = 0,
      updateCount = 0;

  const postStore = new MobStore({
    collectionName: "posts",
    type: "post",
    associations: [
      {
        key: "comments",
        type: "comment",
        plural: true
      }
    ],
    afterAdd(c) {
      addCount += 1;
    },
    afterInject(c) {
      injectCount += 1;
    },
    afterUpdate(c, diff) {
      updateCount += 1;
    }
  });

  const commentStore = new MobStore({
    collectionName: "comments",
    type: "comment",
    associations: [
      {
        key: "post",
        type: 'post'
      }
    ]
  });

  postStore.inject({
    id: 1,
    title: "Post 1 title",
    comments: [
      {
        id: 7,
        text: "Comment 7 text",
        post: {
          id: 1
        }
      },
      {
        id: 8,
        text: "Comment 8 text",
        post: {
          id: 1
        }
      }
    ]
  });

  t.equal(1, addCount,
          "afterAdd only gets called once");

  t.equal(1, injectCount,
          "afterInject only gets called once");

  t.end();
});
