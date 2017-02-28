import {observable, extendObservable, isObservable, transaction} from 'mobx';
import Type from './Type';

let $stores = {};
let $inject = Symbol('inject');
let $pushOrMerge = Symbol('pushOrMerge');

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
    if (undefined !== $stores[type]) { throw new Error('It is not allowed to create duplicate MobStore instances. Only create one per `type`'); }

    this.collectionName = collectionName;

    /// TODO reject/throw if type by this name already exists.
    this.type = new Type({
      associations,
      instanceMethods,
      name: type
    });

    this.afterAdd = afterAdd;
    this.afterUpdate = afterUpdate;
    this.afterInject = afterInject;

    let coolObj = {};
    coolObj[collectionName] = [];

    extendObservable(this, coolObj);

    this.injectCallbackCache = [];

    $stores[type] = this;
  }

  get collection() {
    return this[this.collectionName];
  }

  /**
   * Inject JSON data into this store.
   * @param {Object|Object[]} jsondata - A single instance or an array of instances to inject into this store.
   */
  inject(jsondata) {
    return this[$inject](jsondata);
  }

  [$inject](jsondata, level = 0, callbackFns = []) {
    const objs = MobStore.wrap(jsondata);

    return transaction(() => {
      const instances = objs.map((obj) => {
        const {instance, callbacks} = this[$pushOrMerge](obj);
        MobStore.merge(callbackFns,callbacks);
        const associatedObjects = this.type.associatedObjectsFor(obj);

        associatedObjects.forEach(({typeName, association, value}) => {
          const assocStore = MobStore.storeForType(typeName);
          if (assocStore) {
            let aInstances;
            if (value) {
              let result = assocStore[$inject](value, level + 1, callbackFns);
              aInstances = result.instances;
              callbackFns = result.callbackFns;
            }
            association.assign(instance, aInstances);
          }
        });

        return instance;
      });


      if (level == 0) {
        this.injectCallbackCache.length = 0; // clears the array
        callbackFns.forEach((fn) => {
          fn();
        });
        return instances;
      } else {
        return {
          instances,
          callbackFns,
          level
        };
      }
    });
  }


  [$pushOrMerge](object) {
    let callbacks = [];
    let instance = this.find(object.id);
    if (instance && Object.keys(instance).length > 0) {
      const diff = MobStore.diff(instance, object);
      for (let key in diff) {
        if (instance.hasOwnProperty[key]) {
          instance[key] = diff[key].newValue;
        } else {
          let tmp = {};
          tmp[key] = diff[key].newValue;
          extendObservable(instance, tmp);
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

    if (typeof this.afterInject == 'function' && !this.injectCallbackCache.includes(`${this.type}:${instance.id}`)) {
      callbacks.push(this.afterInject.bind(this, instance));
      // keep a list of which ones we've already added, because it's possible to pass over the same
      // object twice in the same injection
      this.injectCallbackCache.push(`${this.type}:${instance.id}`);
    }

    return {instance, callbacks};
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

  /**
   * Eject(remove) object/objects from store.
   * @param {id|id[]} - A single id or an array of ids to eject from this store.
   */
  eject(id) {
    const ids = id instanceof Array ? id : [id];
    ids.forEach(i => this.collection.splice(this.findIndex(i), 1));
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
      if (newOne.hasOwnProperty(key) && newOne[key] != oldOne[key]) {
        changes[key] = {
          oldValue: oldOne[key],
          newValue: newOne[key]
        };
      }
    }
    return changes;
  }

  static storeForType(typeName) {
    return $stores[typeName];
  }

  static clearStores() {
    $stores = {};
  }

  // fast way to merge two arrays, per https://jsperf.com/array-prototype-push-apply-vs-concat/5
  static merge(a,b) {
    let c = b.length;
    let i = 0;
    for (; i < c; ++i) {
      a.push(b[i]);
    }
  }

}
