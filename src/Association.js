import MobStore from './MobStore';
import {extendObservable} from 'mobx';

export default class Association {
  constructor({key, type, plural, inverse}) {
    this.key = key;
    this.typeName = type;
    this.plural = plural || false;
    this.inverse = inverse || null;
  }

  assign(object, assocValues) {

    if (undefined == assocValues) {
      if (this.plural) {
        // TODO console.warn
        object[this.key] = [];
      } else {
        object[this.key] = null;
      }
    } else {
      if (this.plural) {
        object[this.key] = assocValues;
      } else {
        // TODO throw unless length == 1
        object[this.key] = assocValues[0];
      }
    }

    if (undefined == this.inverse) return;

    assocValues.forEach((aObject) => {
      if (this.inverse.plural) {
        if (undefined == aObject[this.inverse.key]) {
          extendObservable(aObject, {
            [this.inverse.key]: []
          });
        }
        const existing = aObject[this.inverse.key].find(o => o.id == object.id);
        if (existing) {
          // no-op. it's already there, and has already been injected/updated.
        } else {
          aObject[this.inverse.key].push(object);
        }
      } else {
        aObject[this.inverse.key] = object;
      }
    });

  }
}
