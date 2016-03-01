# MobStore

MobStore is a data-store layer for reactive javascript applications.

MobStore is a thin layer on top of the brilliant Transparent Functional Reactive Programming library MobX. See [MobX (formerly mobservable)](http://mobxjs.github.io/mobx/) for more information.

MobStore takes hierarchical JSON data and turns it back into a graph.

MobStore automatically hooks up bidirectional, potentially circular references based on the associations you define, and makes the entire graph reactive, so you can change any part of your data and see the results in your UI immediately.

Example usage is below.


## Example

### Setup:

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


### Usage:

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



# Development

Run the tests:

    $ npm run test
