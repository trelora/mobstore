'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mobx = require('mobx');

var _Type = require('./Type');

var _Type2 = _interopRequireDefault(_Type);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var $stores = {};
var $inject = Symbol('inject');
var $pushOrMerge = Symbol('pushOrMerge');

/**
 * Base class for making observable datastores.
 * - does not do any network requests or anything. subclasses are responsible for that.
 *   when you want to add/update data just send it to `this.inject(data)` from the subclass.
 *   It will intelligently add or update the (observable) cache, as well as any associated
 *   stores.
 *
 * TODO:
 *  - helpful error messages
 *  - more methods like #eject, #clear, etc.
 *  - performance optimizations
 *    - don't .find so many times inside inject -- keep an index of the objects/instances
 *    - only update the "changes" after computing the changes, so we trigger less mobx updates?
 *  - some kind of adapter layer for pre-parsing the incoming data from a flattened (or whatever) format
 *  - some kind of adapter layer for auto-fetching missing data? based on supplying a GET url for each association definition?
 */

var MobStore = function () {
  /**
   * Create a new MobStore
   * @param {Object} options - Initialization options
   * @param {string} options.collectionName - The plural name of the collection. This will be the get/set accessor method in the subclass
   * @param {string} options.type - The singular name of the type. This is the key that will bind it to other stores via associations.
   * @param {Object[]} options.associations - Array of associations to connect this type to another store.
   */

  function MobStore(_ref) {
    var collectionName = _ref.collectionName;
    var type = _ref.type;
    var associations = _ref.associations;
    var instanceMethods = _ref.instanceMethods;
    var afterInject = _ref.afterInject;
    var afterAdd = _ref.afterAdd;
    var afterUpdate = _ref.afterUpdate;

    _classCallCheck(this, MobStore);

    if (undefined !== $stores[type]) {
      throw new Error('It is not allowed to create duplicate MobStore instances. Only create one per `type`');
    }

    this.collectionName = collectionName;

    /// TODO reject/throw if type by this name already exists.
    this.type = new _Type2.default({
      associations: associations,
      instanceMethods: instanceMethods,
      name: type
    });

    this.afterAdd = afterAdd;
    this.afterUpdate = afterUpdate;
    this.afterInject = afterInject;

    var coolObj = {};
    coolObj[collectionName] = [];

    (0, _mobx.extendObservable)(this, coolObj);

    this.injectCallbackCache = [];

    $stores[type] = this;
  }

  _createClass(MobStore, [{
    key: 'inject',


    /**
     * Inject JSON data into this store.
     * @param {Object|Object[]} jsondata - A single instance or an array of instances to inject into this store.
     */
    value: function inject(jsondata) {
      return this[$inject](jsondata);
    }
  }, {
    key: $inject,
    value: function value(jsondata) {
      var _this = this;

      var level = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
      var callbackFns = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

      var objs = MobStore.wrap(jsondata);

      return (0, _mobx.transaction)(function () {
        var instances = objs.map(function (obj) {
          var _$pushOrMerge = _this[$pushOrMerge](obj);

          var instance = _$pushOrMerge.instance;
          var callbacks = _$pushOrMerge.callbacks;

          MobStore.merge(callbackFns, callbacks);
          var associatedObjects = _this.type.associatedObjectsFor(obj);

          associatedObjects.forEach(function (_ref2) {
            var typeName = _ref2.typeName;
            var association = _ref2.association;
            var value = _ref2.value;

            var assocStore = MobStore.storeForType(typeName);
            if (assocStore) {
              var aInstances = undefined;
              if (value) {
                var result = assocStore[$inject](value, level + 1, callbackFns);
                aInstances = result.instances;
                callbackFns = result.callbackFns;
              }
              association.assign(instance, aInstances);
            }
          });

          return instance;
        });

        if (level == 0) {
          _this.injectCallbackCache.length = 0; // clears the array
          callbackFns.forEach(function (fn) {
            fn();
          });
          return instances;
        } else {
          return {
            instances: instances,
            callbackFns: callbackFns,
            level: level
          };
        }
      });
    }
  }, {
    key: $pushOrMerge,
    value: function value(object) {
      var callbacks = [];
      var instance = this.find(object.id);
      if (instance && Object.keys(instance).length > 0) {
        var diff = MobStore.diff(instance, object);
        for (var key in diff) {
          if (instance.hasOwnProperty[key]) {
            instance[key] = diff[key].newValue;
          } else {
            var tmp = {};
            tmp[key] = diff[key].newValue;
            (0, _mobx.extendObservable)(instance, tmp);
          }
        }
        if (Object.keys(diff).length && typeof this.afterUpdate == 'function') {
          callbacks.push(this.afterUpdate.bind(this, instance, diff));
        }
      } else {
        instance = new this.type.instanceConstructor(object);
        this[this.collectionName].push(instance);
        if (typeof this.afterAdd == 'function') {
          callbacks.push(this.afterAdd.bind(this, instance));
        }
      }

      if (typeof this.afterInject == 'function' && !this.injectCallbackCache.includes(this.type + ':' + instance.id)) {
        callbacks.push(this.afterInject.bind(this, instance));
        // keep a list of which ones we've already added, because it's possible to pass over the same
        // object twice in the same injection
        this.injectCallbackCache.push(this.type + ':' + instance.id);
      }

      return { instance: instance, callbacks: callbacks };
    }

    /**
     * Select one item from the collection, if it is in the collection.
     * @param {number} id - The id of the item to find.
     */

  }, {
    key: 'find',
    value: function find(id) {
      return this.collection.find(function (obj) {
        return obj.id == id;
      });
    }

    /**
     * Return the index of the object with the given id, if it is in the collection. Otherwise return undefined
     * Like array.prototype.findIndex
     * @param {number} id - The id of the item to find.
     */

  }, {
    key: 'findIndex',
    value: function findIndex(id) {
      return this.collection.findIndex(function (obj) {
        return obj.id == id;
      });
    }
  }, {
    key: 'collection',
    get: function get() {
      return this[this.collectionName];
    }
  }], [{
    key: 'wrap',
    value: function wrap(jsondata) {
      var objs = undefined;
      // make it easier to work with.
      if (jsondata instanceof Array) {
        objs = jsondata;
      } else {
        objs = [jsondata];
      }
      return objs;
    }

    // only goes one level deep on purpose.

  }, {
    key: 'diff',
    value: function diff(oldOne, newOne) {
      var changes = {};
      for (var key in newOne) {
        if (newOne.hasOwnProperty(key) && newOne[key] != oldOne[key]) {
          changes[key] = {
            oldValue: oldOne[key],
            newValue: newOne[key]
          };
        }
      }
      return changes;
    }
  }, {
    key: 'storeForType',
    value: function storeForType(typeName) {
      return $stores[typeName];
    }
  }, {
    key: 'clearStores',
    value: function clearStores() {
      $stores = {};
    }

    // fast way to merge two arrays, per https://jsperf.com/array-prototype-push-apply-vs-concat/5

  }, {
    key: 'merge',
    value: function merge(a, b) {
      var c = b.length;
      var i = 0;
      for (; i < c; ++i) {
        a.push(b[i]);
      }
    }
  }]);

  return MobStore;
}();

exports.default = MobStore;