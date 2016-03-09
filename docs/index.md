## Links

* [Source Code on Github](https://github.com/trelora/mobstore)
* [NPM Package](https://www.npmjs.com/package/mobstore)

## Description

MobStore is a data-store layer for reactive javascript applications.

MobStore is a thin layer on top of the brilliant Transparent Functional Reactive Programming library MobX. See [MobX (formerly mobservable)](http://mobxjs.github.io/mobx/) for more information.

MobStore takes hierarchical JSON data and turns it back into a graph.

MobStore automatically hooks up bidirectional, potentially circular references based on the associations you define, and makes the entire graph reactive, so you can change any part of your data and see the results in your UI immediately.

MobStore is an alternative to Flux/Redux. The unidirectional data-flow is still there, but instead of having a Rube Goldberg machine of action creators and reducers in order to change your data, you can just call a method. And there's no need to flatten your data or deal with a global state tree. You can have a proper graph of data on the client.

### Current status

This is being used in production at Trelora, inc. It works great for our needs. However, we have only added the features we need as we need them, so there is probably still missing functionality.

### Missing features

* There is currently no way to remove data from a store. TODO: `myStore.eject(id_or_ids)`, `myStore.clear()`
* There is no automatic way to inject data formatted in HAL, JSONAPI, etc. Would be nice to add a parser/adapter layer to be able to easily inject different data formats.
* MobStore does not do any server communication. Not sure whether it ever will, but currently getting the actual data is up to you.
* What else? File an issue.


## Hello MobStore

```javascript
import {MobStore} from 'mobstore';

const itemStore = new MobStore({
  collectionName: 'items',
  type: 'item'
});

itemStore.inject({id: 1, name: "item one"})

itemStore.items
// => [{id: 1, name: "item one"}]

itemStore.find(1)
// => {id: 1, name: "item one"}
```
