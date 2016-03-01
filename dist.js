'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mobx = require('mobx');

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var stores = [];

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

    this.collectionName = collectionName;
    this.type = type;
    this.associations = associations || [];
    this.afterAdd = afterAdd;
    this.afterUpdate = afterUpdate;
    this.afterInject = afterInject;

    // make a constructor for instances so we can have instance methods
    MobStore[this.type] = renameFunction(this.type, function (obj) {
      (0, _mobx.extendObservable)(this, obj);
      this.type = type; // using the closure - this is the type passed to the store's constructor
    });

    MobStore[this.type].prototype = instanceMethods || {};

    this.instanceConstructor = MobStore[this.type]; // in case you need it externally

    (0, _mobx.extendObservable)(this, _defineProperty({}, collectionName, []));

    stores.push(this);
  }

  _createClass(MobStore, [{
    key: 'inject',


    /**
     * Inject JSON data into this store.
     * @param {Object|Object[]} jsondata - A single instance or an array of instances to inject into this store.
     * @param {number} level - internal use only
     * @param {function[]} callbackFns - internal use only
     */
    value: function inject(jsondata) {
      var _this = this;

      var level = arguments.length <= 1 || arguments[1] === undefined ? 0 : arguments[1];
      var callbackFns = arguments.length <= 2 || arguments[2] === undefined ? [] : arguments[2];

      return (0, _mobx.transaction)(function () {
        var objs = MobStore.wrap(jsondata);

        // partition out the ones we need to add vs update
        var instances = objs.map(function (obj) {
          var existing = _this.find(obj.id);
          var instance = undefined;
          var changes = {};
          if (existing) {
            changes = MobStore.diff(existing, obj);

            // update the properties, making sure they are all observable
            (0, _mobx.extendObservable)(existing, obj);
            instance = existing;

            // update ONLY callback
            if (Object.keys(changes).length && typeof _this.afterUpdate === 'function') {
              (function () {
                var that = _this;
                callbackFns.push(function () {
                  that.afterUpdate(instance, changes);
                });
              })();
            }
          } else {
            // instantiate and add a new instance to the store
            instance = new MobStore[_this.type](obj);
            _this[_this.collectionName].push(instance);

            // add ONLY callback
            if (typeof _this.afterAdd === 'function') {
              (function () {
                var that = _this;
                callbackFns.push(function () {
                  that.afterAdd(instance, changes);
                });
              })();
            }
          }

          // add OR update callback
          if (typeof _this.afterInject === 'function') {
            (function () {
              var that = _this;
              callbackFns.push(function () {
                that.afterInject(instance, changes);
              });
            })();
          }

          return instance;
        });

        // inject associations into their stores too.
        if (_this.associations && _this.associations.length) {
          _this.associations.forEach(function (assoc) {

            var assocStores = stores.filter(function (s) {
              return s.type == assoc.type;
            });

            assocStores.forEach(function (assocStore) {
              objs.forEach(function (obj) {
                if (obj[assoc.key]) {

                  // inject the associated objects into their store
                  //console.log(`about to inject associated objects: ${this.type}:${obj.id} -> key: ${assoc.key}, type: ${assoc.type}`, obj[assoc.key]);
                  var returnvals = assocStore.inject(obj[assoc.key], level + 1, callbackFns);
                  var results = returnvals.instances;
                  callbackFns.concat(returnvals.callbackFns);

                  if (assoc.plural) {
                    //console.log(`in ${this.type}:${obj.id}, setting ${assoc.key}`, results);
                    _this.find(obj.id)[assoc.key] = results;
                  } else {
                    //console.log(`in ${this.type}:${obj.id}, setting ${assoc.key}`, results[0]);
                    _this.find(obj.id)[assoc.key] = results[0];
                  }

                  // set up the reciprocal relationship too, if defined.
                  if (assoc.inverse) {
                    //console.log("inverse", assoc);
                    results.forEach(function (aobj) {
                      if (assoc.inverse.plural) {
                        aobj[assoc.inverse.key] || (aobj[assoc.inverse.key] = []);

                        // merge or add to assoc
                        if (aobj[assoc.inverse.key].some(function (t) {
                          return t.id == obj.id;
                        })) {
                          // it already has it, should be automatically up to date
                          // console.log(`skipping plural, ${this.type}:${obj.id} -> ${assocStore.type}:${aobj.id}`);
                          // console.log("skipping because already exists:", aobj[assoc.inverse.key].find(o => o.id == obj.id));
                          // console.log("store has:", assocStore.find(aobj.id));
                        } else {
                            //console.log("pushing", this.find(obj.id));
                            aobj[assoc.inverse.key].push(_this.find(obj.id));
                          }
                      } else {
                        //console.log('singular', aobj, assoc, this.find(obj.id));
                        if (aobj[assoc.inverse.key]) {
                          // already there, do nothing.
                          //console.log(`skipping singular, ${this.type}:${obj.id} -> ${assocStore.type}:${aobj.id}`);
                        } else {
                            //console.log(`setting inverse, ${this.type}:${obj.id} -> ${assocStore.type}:${aobj.id}`);
                            //console.log("set to:", this.find(obj.id));
                            aobj[assoc.inverse.key] = _this.find(obj.id);
                          }
                      }
                    });
                  }
                }
              });
            });
          });
        }

        // now, if we're done with all recursive injecting, call the callbacks
        if (level == 0) {
          callbackFns.forEach(function (fn) {
            fn();
          });
        }

        // return the newly added instances. TODO do we really need to loop
        // through again? arent they literally the same instances?
        var ids = objs.map(function (obj) {
          return obj.id;
        });
        var ret_instances = _this.collection.filter(function (item) {
          return ids.includes(item.id);
        });
        return {
          callbackFns: callbackFns,
          instances: ret_instances
        };
      });
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
        if (newOne.hasOwnProperty(key) && newOne[key] !== oldOne[key]) {
          changes[key] = {
            oldValue: oldOne[key],
            newValue: newOne[key]
          };
        }
      }
      return changes;
    }
  }]);

  return MobStore;
}();

/**
 * JavaScript Rename Function
 * @author Nate Ferrero
 * @license Public Domain
 * @date Apr 5th, 2014
 */
// Todo: can avoid this evil hack when browsers catch up with the spec:
// http://stackoverflow.com/questions/9479046/is-there-any-non-eval-way-to-create-a-function-with-a-runtime-determined-name


exports.default = MobStore;
var renameFunction = function renameFunction(name, fn) {
  return new Function("return function (call) { return function " + name + " () { return call(this, arguments) }; };")()(Function.apply.bind(fn));
};
