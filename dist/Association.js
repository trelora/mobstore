'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.default = undefined;

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

var _mobx = require('mobx');

function _defineProperty(obj, key, value) { if (key in obj) { Object.defineProperty(obj, key, { value: value, enumerable: true, configurable: true, writable: true }); } else { obj[key] = value; } return obj; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

var Association = function () {
  function Association(_ref) {
    var key = _ref.key,
        type = _ref.type,
        plural = _ref.plural,
        inverse = _ref.inverse;

    _classCallCheck(this, Association);

    this.key = key;
    this.typeName = type;
    this.plural = plural || false;
    this.inverse = inverse || null;
  }

  // TODO clean this up even more? PluralAssociation vs SingularAssociation ?
  // assocValues ALWAYS comes in as an array (or null), even for singular associations.


  _createClass(Association, [{
    key: 'assign',
    value: function assign(object, assocValues) {
      var _this = this;

      if (undefined == assocValues) {
        if (this.plural) {
          // TODO console.warn
          object[this.key] = [];
        } else {
          object[this.key] = null;
        }
      } else {
        if (this.plural) {
          // TODO console.warn unless assocvalues instanceof Array
          object[this.key] = assocValues;
        } else {
          // TODO throw unless length == 1
          object[this.key] = assocValues[0];
        }
      }

      if (null == this.inverse) return;

      assocValues.forEach(function (aObject) {
        if (_this.inverse.plural) {
          if (undefined == aObject[_this.inverse.key]) {
            (0, _mobx.extendObservable)(aObject, _defineProperty({}, _this.inverse.key, []));
          }
          var existing = aObject[_this.inverse.key].find(function (o) {
            return o.id == object.id;
          });
          if (existing) {
            // no-op. it's already there, and has already been injected/updated.
          } else {
            aObject[_this.inverse.key].push(object);
          }
        } else {
          aObject[_this.inverse.key] = object;
        }
      });
    }
  }]);

  return Association;
}();

exports.default = Association;