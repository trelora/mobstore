# Overview

## Setup

Here's an example where we set up three data stores, each with associations to the other two. Notice that we are very explicit about the associations we set up. Nothing is magic. Only the associations you define are populated.

```javascript
import {MobStore} from 'mobstore';

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
        key: "post"
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
        key: "author",
        plural: true
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
```


## Usage

Now, we can take some JSON data that we got from the server and inject it into our stores.

```javascript
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
}

postStore.inject(dataFromServer);
```


Notice that with the single call to `.inject` with the nested data, we have populated all three stores with their appropriate data, and each has the correct references to all of their associations.


```javascript
postStore.posts
// [ {id:42, title: "How to make an app", author: {id: 12...}, comments: [...]} ]

peopleStore.people
// [
//   {id:12, name: "Mark Twain", posts: [...], comments: [...]},
//   {id:13, name: "Aldous Huxley", posts: [...], comments: [...]},
//   {id:14, name: "Jared Diamond", posts: [...], comments: [...]},
// ]

commentStore.comments
// [
//   {id: 3, text: "This article is great.", post: {id: 42,...}, author: {id: 13...}}
//   {id: 4, text: "This article sucks.", post: {id: 42...}, author: {id: 14...}}
// ]
```

All of the references are hooked up like you would expect.

```javascript
peopleStore.people[0].posts[0].comments[0].author
// {id:13, name: "Aldous Huxley", posts: [...], comments: [...]}
```


## Use with React

If you use this data store together with [mobx-react](https://github.com/mobxjs/mobx-react), your React components will automatically re-render when you update your data by injecting more data into any of the stores, or by changing any of the scalar values of your objects.


```javascript
@observer
class PostsContainer extends React.Component {
  render() {
    return (
      <PostsList
        posts={postsStore.posts}
      />
    );
  }
}

//...


// add a new comment. by including the ids of the associations, they will get hooked up properly.
commentStore.inject({
  id: 5,
  text: "Spam",
  post: { id: 42},
  author: { id: 12 }
})

//...

// update the author's name. this will show immediately in the UI if the name field is used somewhere.
const mark = peopleStore.people[0]
mark.name = "Twark Main"

```
