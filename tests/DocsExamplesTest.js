import {MobStore} from '../src/index.js';
import {isObservable, autorun, observable} from 'mobx';
import test from 'tape';

function setup() {
  MobStore.clearStores();

  const postStore = new MobStore({
    collectionName: "posts",  // the accessor, i.e. `postStore.posts`
    type: "post",             // this store holds items of the `post` type.
    associations: [
      {
        key: "comments",      // a post has a `myPost.comments` key
        type: "comment",      // this association holds items of the `comment` type.
        plural: true,         // it's an array of them, not a single one.
        inverse: {
          key: "post",        // a comment will have a `myComment.post` key
          plural: false       // optional, false is the default
        }
      },
      {
        key: "author",
        type: "person",
        plural: false,
        inverse: {
          key: "posts",
          plural: true
        }
      }
    ]
  });

  const commentStore = new MobStore({
    collectionName: "comments",
    type: "comment",
    associations: [
      {
        key: "post",
        type: "post",
        inverse: {
          key: "comments",
          plural: true
        }
      },
      {
        key: "commenter",
        type: "person",
        inverse: {
          key: "comments",
          plural: true
        }
      }
    ]
  });

  const peopleStore = new MobStore({
    collectionName: "people",
    type: "person",
    associations: [
      {
        key: "posts",
        type: "post",
        plural: true,
        inverse: {
          key: "author"
        }
      },
      {
        key: "comments",
        type: "comment",
        plural: true,
        inverse: {
          key: "commenter"
        }
      }
    ]
  });
  return {
    peopleStore,
    commentStore,
    postStore
  };
}

const dataFromServer = {
  id: 42,
  title: "How to make an app",
  author: {
    id: 12,
    name: "Mark Twain"
  },
  comments: [
    {
      id: 3,
      text: "This article is great.",
      commenter: {
        id: 13,
        name: "Aldous Huxley"
      }
    },
    {
      id: 4,
      text: "This article sucks.",
      commenter: {
        id: 14,
        name: "Jared Diamond"
      }
    }
  ]
};

test("retrieving example", t => {

  const {
    postStore,
    commentStore,
    peopleStore
  } = setup();

  postStore.inject(dataFromServer);

  t.equal(
    postStore.posts.length,
    1,
    "The post is inserted"
  );

  t.equal(
    peopleStore.people.length,
    3,
    "The people are inserted"
  );

  t.equal(
    commentStore.comments.length,
    2,
    "The comments are inserted"
  );

  console.log(peopleStore.find(12));
  console.log(peopleStore.find(12).posts);

  t.equal(
    peopleStore.find(12).posts[0].comments[0].commenter.name,
    "Aldous Huxley"
  );


  t.end();

});


test("update example", t => {
  const {
    postStore,
    commentStore,
    peopleStore
  } = setup();

  postStore.inject(dataFromServer);

  commentStore.inject({
    id: 5,
    text: "Spam",
    post: { id: 42},
    author: { id: 12 }
  });

  t.equal(
    postStore.find(42).comments.length,
    3,
    "adds another comment"
  );

  t.equal(
    commentStore.find(5).post.author.name,
    "Mark Twain",
    "updates the association"
  );

  const mark = peopleStore.find(12);
  mark.name = "Twark Main";


  t.equal(
    postStore.posts[0].author.name,
    "Twark Main",
    "updates the data"
  );

  t.equal(
    commentStore.find(5).post.author.name,
    "Twark Main",
    "updates the data"
  );

  t.end();

});
