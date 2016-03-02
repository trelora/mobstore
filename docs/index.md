# MobStore

Source Code: https://github.com/trelora/mobstore
NPM: https://www.npmjs.com/package/mobstore

MobStore is a data-store layer for reactive javascript applications.

MobStore is a thin layer on top of the brilliant Transparent Functional Reactive Programming library MobX. See [MobX (formerly mobservable)](http://mobxjs.github.io/mobx/) for more information.

MobStore takes hierarchical JSON data and turns it back into a graph.

MobStore automatically hooks up bidirectional, potentially circular references based on the associations you define, and makes the entire graph reactive, so you can change any part of your data and see the results in your UI immediately.
