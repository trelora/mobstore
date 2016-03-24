import {MobStore} from '../src/index.js';
import test from 'tape';

test.skip("Injecting an inconsistent circular reference throws an error", t => {

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
    associations: [
      {
        key: "post",
        type: 'post'
      }
    ]
  });


  // TODO - this is kinda hard but would be VERY nice if the library catches this kind of mistake for you.
  t.throws(() => {
    postStore.inject({
      id: 1,
      title: "Post 1 title",
      comments: [
        {
          id: 7,
          text: "Comment 7 text",
          post: {
            id: 2 // this is "wrong" -- it came from post 1, but the inverse is setting it to post 2. only one can be right.
          }
        }
      ]
    });


  }, /inconsistent/,
           "should error if the data is inconsistent");

  t.end();
});



test("don't allow multiple stores of the same type", t => {
  const one = new MobStore({
    collectionName: 'foos',
    type: 'foo'
  });

  t.throws(() => {
    const two = new MobStore({
      collectionName: 'otherFoos',
      type: 'foo'
    });
  }, /duplicate/,
           "should error if there is a duplicate store detected");
  t.end();
});
