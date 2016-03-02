[![Build Status](https://travis-ci.org/trelora/mobstore.svg?branch=master)](https://travis-ci.org/trelora/mobstore)
[![Coverage Status](https://coveralls.io/repos/github/trelora/mobstore/badge.svg?branch=master)](https://coveralls.io/github/trelora/mobstore?branch=master)

# MobStore

MobStore is a data-store layer for reactive javascript applications.

MobStore is a thin layer on top of the brilliant Transparent Functional Reactive Programming library MobX. See [MobX (formerly mobservable)](http://mobxjs.github.io/mobx/) for more information.

MobStore takes hierarchical JSON data and turns it back into a graph.

MobStore automatically hooks up bidirectional, potentially circular references based on the associations you define, and makes the entire graph reactive, so you can change any part of your data and see the results in your UI immediately.


### Current status

This is being used in production at Trelora, inc. It works great for our needs. However, we have only added the features we need as we need them, so there is definitely still missing functionality.

### Missing features

* There is currently no way to remove data from a store.
* There is no easy way to inject data formatted in HAL, JSONAPI, etc. Would be nice to add a parser/adapter layer to be able to easily inject different data formats.
* MobStore does not do any server communication. Not sure whether it ever will, but currently getting the actual data is up to you.
* What else? File an issue.

### Docs

Documentation and examples (works in progress!) are available at http://trelora.github.io/mobstore/.


### Contributing

Pull requests welcome.


# Development

Build:

    $ npm run build

Publish:

    $ npm run build_and_publish

Run the tests:

    $ npm run test

Preview the docs:

    $ mkdocs serve

Deploy the docs:

    $ mkdocs gh-deploy --clean
