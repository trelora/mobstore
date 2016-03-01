import {observable, extendObservable, isObservable, transaction} from 'mobx';

let stores = [];

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
export default class MobStore {
  /**
   * Create a new MobStore
   * @param {Object} options - Initialization options
   * @param {string} options.collectionName - The plural name of the collection. This will be the get/set accessor method in the subclass
   * @param {string} options.type - The singular name of the type. This is the key that will bind it to other stores via associations.
   * @param {Object[]} options.associations - Array of associations to connect this type to another store.
   */
  constructor({collectionName, type, associations, instanceMethods, afterInject, afterAdd, afterUpdate}) {
    this.collectionName = collectionName;
    this.type = type;
    this.associations = associations || [];
    this.afterAdd = afterAdd;
    this.afterUpdate = afterUpdate;
    this.afterInject = afterInject;

    // make a constructor for instances so we can have instance methods
    MobStore[this.type] = renameFunction(this.type, function (obj) {
      extendObservable(this, obj);
      this.type = type; // using the closure - this is the type passed to the store's constructor
    });

    MobStore[this.type].prototype = (instanceMethods || {});

    this.instanceConstructor = MobStore[this.type]; // in case you need it externally

    extendObservable(this, {
      [collectionName]: []
    });

    stores.push(this);
  }

  get collection() {
    return this[this.collectionName];
  }

  /**
   * Inject JSON data into this store.
   * @param {Object|Object[]} jsondata - A single instance or an array of instances to inject into this store.
   * @param {number} level - internal use only
   * @param {function[]} callbackFns - internal use only
   */
  inject(jsondata, level = 0, callbackFns = []) {
    return transaction(() => {
      const objs = MobStore.wrap(jsondata);

      // partition out the ones we need to add vs update
      const instances = objs.map((obj) => {
        let existing = this.find(obj.id);
        let instance;
        let changes = {};
        if (existing) {
          changes = MobStore.diff(existing, obj);

          // update the properties, making sure they are all observable
          extendObservable(existing, obj);
          instance = existing;

          // update ONLY callback
          if (Object.keys(changes).length && typeof this.afterUpdate === 'function') {
            let that = this;
            callbackFns.push(() => { that.afterUpdate(instance, changes); });
          }
        } else {
          // instantiate and add a new instance to the store
          instance = new MobStore[this.type](obj);
          this[this.collectionName].push(instance);

          // add ONLY callback
          if (typeof this.afterAdd === 'function') {
            let that = this;
            callbackFns.push(() => { that.afterAdd(instance, changes); });
          }
        }

        // add OR update callback
        if (typeof this.afterInject === 'function') {
          let that = this;
          callbackFns.push(() => { that.afterInject(instance, changes); });
        }

        return instance;
      });




      // inject associations into their stores too.
      if (this.associations && this.associations.length) {
        this.associations.forEach((assoc) => {

          const assocStores = stores.filter(s => s.type == assoc.type);

          assocStores.forEach((assocStore) => {
            objs.forEach((obj) => {
              if (obj[assoc.key]) {

                // inject the associated objects into their store
                //console.log(`about to inject associated objects: ${this.type}:${obj.id} -> key: ${assoc.key}, type: ${assoc.type}`, obj[assoc.key]);
                const returnvals = assocStore.inject(obj[assoc.key], level + 1, callbackFns);
                const results = returnvals.instances;
                callbackFns.concat(returnvals.callbackFns);

                if (assoc.plural) {
                  //console.log(`in ${this.type}:${obj.id}, setting ${assoc.key}`, results);
                  this.find(obj.id)[assoc.key] = results;
                } else {
                  //console.log(`in ${this.type}:${obj.id}, setting ${assoc.key}`, results[0]);
                  this.find(obj.id)[assoc.key] = results[0];
                }

                // set up the reciprocal relationship too, if defined.
                if (assoc.inverse) {
                  //console.log("inverse", assoc);
                  results.forEach((aobj) => {
                    if (assoc.inverse.plural) {
                      aobj[assoc.inverse.key] || (aobj[assoc.inverse.key] = []);

                      // merge or add to assoc
                      if (aobj[assoc.inverse.key].some(t=>t.id == obj.id)) {
                        // it already has it, should be automatically up to date
                        // console.log(`skipping plural, ${this.type}:${obj.id} -> ${assocStore.type}:${aobj.id}`);
                        // console.log("skipping because already exists:", aobj[assoc.inverse.key].find(o => o.id == obj.id));
                        // console.log("store has:", assocStore.find(aobj.id));
                      } else {
                        //console.log("pushing", this.find(obj.id));
                        aobj[assoc.inverse.key].push(this.find(obj.id));
                      }

                    } else {
                      //console.log('singular', aobj, assoc, this.find(obj.id));
                      if (aobj[assoc.inverse.key]) {
                        // already there, do nothing.
                        //console.log(`skipping singular, ${this.type}:${obj.id} -> ${assocStore.type}:${aobj.id}`);
                      } else {
                        //console.log(`setting inverse, ${this.type}:${obj.id} -> ${assocStore.type}:${aobj.id}`);
                        //console.log("set to:", this.find(obj.id));
                        aobj[assoc.inverse.key] = this.find(obj.id);
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
        callbackFns.forEach((fn) => {
          fn();
        });
      }

      // return the newly added instances. TODO do we really need to loop
      // through again? arent they literally the same instances?
      const ids = objs.map(obj => obj.id);
      const ret_instances = this.collection.filter((item) => {
        return ids.includes(item.id);
      });
      return {
        callbackFns,
        instances: ret_instances
      };
    });

  }

  /**
   * Select one item from the collection, if it is in the collection.
   * @param {number} id - The id of the item to find.
   */
  find(id) {
    return this.collection.find(obj => obj.id == id);
  }

  /**
   * Return the index of the object with the given id, if it is in the collection. Otherwise return undefined
   * Like array.prototype.findIndex
   * @param {number} id - The id of the item to find.
   */
  findIndex(id) {
    return this.collection.findIndex(obj => obj.id == id);
  }

  static wrap(jsondata) {
    let objs;
    // make it easier to work with.
    if (jsondata instanceof Array) {
      objs = jsondata;
    } else {
      objs = [jsondata];
    }
    return objs;
  }

  // only goes one level deep on purpose.
  static diff(oldOne, newOne) {
    let changes = {};
    for(let key in newOne) {
      if (newOne.hasOwnProperty(key) && newOne[key] !== oldOne[key]) {
        changes[key] = {
          oldValue: oldOne[key],
          newValue: newOne[key]
        };
      }
    }
    return changes;
  }

}


/**
 * JavaScript Rename Function
 * @author Nate Ferrero
 * @license Public Domain
 * @date Apr 5th, 2014
 */
// Todo: can avoid this evil hack when browsers catch up with the spec:
// http://stackoverflow.com/questions/9479046/is-there-any-non-eval-way-to-create-a-function-with-a-runtime-determined-name
var renameFunction = function (name, fn) {
    return (new Function("return function (call) { return function " + name +
        " () { return call(this, arguments) }; };")())(Function.apply.bind(fn));
};
