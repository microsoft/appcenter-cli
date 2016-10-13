/*
 * Code generated by Microsoft (R) AutoRest Code Generator 0.17.0.0
 * Changes may cause incorrect behavior and will be lost if the code is
 * regenerated.
 */

'use strict';

/**
 * @class
 * Initializes a new instance of the CrashGroupChange class.
 * @constructor
 * @member {string} [status] Possible values include: 'Open', 'Closed',
 * 'Ignored'
 * 
 */
function CrashGroupChange() {
}

/**
 * Defines the metadata of CrashGroupChange
 *
 * @returns {object} metadata of CrashGroupChange
 *
 */
CrashGroupChange.prototype.mapper = function () {
  return {
    required: false,
    serializedName: 'CrashGroupChange',
    type: {
      name: 'Composite',
      className: 'CrashGroupChange',
      modelProperties: {
        status: {
          required: false,
          serializedName: 'status',
          type: {
            name: 'String'
          }
        }
      }
    }
  };
};

module.exports = CrashGroupChange;
