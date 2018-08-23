'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mobx = require('mobx');

var _MobStore = require('./MobStore');

var _MobStore2 = _interopRequireDefault(_MobStore);

var _Association = require('./Association');

var _Association2 = _interopRequireDefault(_Association);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Type = function () {
  function Type(_ref) {
    var name = _ref.name,
        associations = _ref.associations,
        instanceMethods = _ref.instanceMethods;

    _classCallCheck(this, Type);

    this.name = name;
    this.associations = (associations || []).map(function (a) {
      return new _Association2.default(a);
    });

    // make a constructor for instances so we can have instance methods
    this.instanceConstructor = renameFunction(name, function (obj) {
      (0, _mobx.extendObservable)(this, obj);
      this.type = name; // using the closure - this is the type passed to the store's constructor
    });

    this.instanceConstructor.prototype = instanceMethods || {};
  }

  _createClass(Type, [{
    key: 'associatedObjectsFor',
    value: function associatedObjectsFor(obj) {
      var returnData = [];
      this.associations.forEach(function (association) {
        if (obj.hasOwnProperty(association.key)) {
          returnData.push({
            association: association,
            typeName: association.typeName,
            value: obj[association.key]
          });
        }
      });
      return returnData;
    }
  }]);

  return Type;
}();

/**
 * JavaScript Rename Function
 * @author Nate Ferrero
 * @license Public Domain
 * @date Apr 5th, 2014
 */
// Todo: can avoid this evil hack when browsers catch up with the spec:
// http://stackoverflow.com/questions/9479046/is-there-any-non-eval-way-to-create-a-function-with-a-runtime-determined-name


exports.default = Type;
var renameFunction = function renameFunction(name, fn) {
  return new Function("return function (call) { return function " + name + " () { return call(this, arguments) }; };")()(Function.apply.bind(fn));
};