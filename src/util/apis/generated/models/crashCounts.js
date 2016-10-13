/*
 * Code generated by Microsoft (R) AutoRest Code Generator 0.17.0.0
 * Changes may cause incorrect behavior and will be lost if the code is
 * regenerated.
 */

'use strict';

var models = require('./index');

var util = require('util');

/**
 * @class
 * Initializes a new instance of the CrashCounts class.
 * @constructor
 * @member {number} [totalCount]
 * 
 * @member {array} [crashes] the total crash count for day
 * 
 */
function CrashCounts() {
}

/**
 * Defines the metadata of CrashCounts
 *
 * @returns {object} metadata of CrashCounts
 *
 */
CrashCounts.prototype.mapper = function () {
  return {
    required: false,
    serializedName: 'CrashCounts',
    type: {
      name: 'Composite',
      className: 'CrashCounts',
      modelProperties: {
        totalCount: {
          required: false,
          serializedName: 'totalCount',
          type: {
            name: 'Number'
          }
        },
        crashes: {
          required: false,
          serializedName: 'crashes',
          type: {
            name: 'Sequence',
            element: {
                required: false,
                serializedName: 'DateTimeCountsElementType',
                type: {
                  name: 'Composite',
                  className: 'DateTimeCounts'
                }
            }
          }
        }
      }
    }
  };
};

module.exports = CrashCounts;
