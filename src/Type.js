import {observable, extendObservable, transaction} from 'mobx';
import MobStore from './MobStore';
import Association from './Association';

export default class Type {

  constructor({name, associations, afterAdd, afterUpdate, afterInject, instanceMethods }) {
    this.name = name;
    this.afterAdd = afterAdd;
    this.afterUpdate = afterUpdate;
    this.afterInject = afterInject;
    this.associations = (associations || []).map((a) => {
      return new Association(a);
    });


    // make a constructor for instances so we can have instance methods
    this.instanceConstructor = renameFunction(name, function (obj) {
      extendObservable(this, obj);
      this.type = name; // using the closure - this is the type passed to the store's constructor
    });

    this.instanceConstructor.prototype = (instanceMethods || {});
  }


  associatedObjectsFor(obj) {
    let returnData = [];
    this.associations.forEach((association) => {
      if (obj.hasOwnProperty(association.key)) {
        returnData.push({
          association,
          typeName: association.typeName,
          objects: obj[association.key]
        });
      }
    });
    return returnData;
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
