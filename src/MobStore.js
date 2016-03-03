import {observable, extendObservable, isObservable, transaction} from 'mobx';
import Type from './Type';

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

    /// TODO reject/throw if type by this name already exists.
    this.type = new Type({
      associations,
      afterAdd,
      afterUpdate,
      afterInject,
      instanceMethods,
      name: type
    });

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
  inject(jsondata) {
    const objs = MobStore.wrap(jsondata);

    return transaction(() => {
      const instances = objs.map((obj) => {
        const instance = this.pushOrMerge(obj);
        const associatedObjects = this.type.associatedObjectsFor(obj);

        associatedObjects.forEach(({typeName, association, objects}) => {
          const assocStore = MobStore.storeForType(typeName);
          let aInstances;
          if (objects) {
            aInstances = assocStore.inject(objects);
          }

          association.assign(instance, aInstances);
        });

        return instance;
      });
      return instances;
    });

  }

  pushOrMerge(object) {
    let instance;
    let existing = this.find(object.id);
    if (existing) {
      instance = existing;
      extendObservable(instance, object);
    } else {
      instance = new this.type.instanceConstructor(object);
      this[this.collectionName].push(instance);
    }
    return instance;
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

  static storeForType(typeName) {
    return stores.find(s => s.type.name == typeName);
  }

  static clearStores() {
    stores = [];
  }

}
