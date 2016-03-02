# MobStore

## Links

* [Source Code on Github](https://github.com/trelora/mobstore)
* [NPM Package](https://www.npmjs.com/package/mobstore)

## Description

MobStore is a data-store layer for reactive javascript applications.

MobStore is a thin layer on top of the brilliant Transparent Functional Reactive Programming library MobX. See [MobX (formerly mobservable)](http://mobxjs.github.io/mobx/) for more information.

MobStore takes hierarchical JSON data and turns it back into a graph.

MobStore automatically hooks up bidirectional, potentially circular references based on the associations you define, and makes the entire graph reactive, so you can change any part of your data and see the results in your UI immediately.


## Hello MobStore

```javascript
import {MobStore} from 'mobstore';

const itemStore = new MobStore({
  collectionName: 'items',
  type: 'item'
});

itemStore.inject({id: 1, name: "item one"})

itemStore.find(1)
// => {id: 1, name: "item one"}
```
