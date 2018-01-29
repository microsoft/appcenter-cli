/*
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is
 * regenerated.
 */

'use strict';

const models = require('./index');

/**
 * Class representing a ErrorGroupOperatingSystems.
 */
class ErrorGroupOperatingSystems {
  /**
   * Create a ErrorGroupOperatingSystems.
   * @member {number} [errorCount]
   * @member {array} [operatingSystems]
   */
  constructor() {
  }

  /**
   * Defines the metadata of ErrorGroupOperatingSystems
   *
   * @returns {object} metadata of ErrorGroupOperatingSystems
   *
   */
  mapper() {
    return {
      required: false,
      serializedName: 'ErrorGroupOperatingSystems',
      type: {
        name: 'Composite',
        className: 'ErrorGroupOperatingSystems',
        modelProperties: {
          errorCount: {
            required: false,
            serializedName: 'error_count',
            type: {
              name: 'Number'
            }
          },
          operatingSystems: {
            required: false,
            serializedName: 'operating_systems',
            type: {
              name: 'Sequence',
              element: {
                  required: false,
                  serializedName: 'ErrorGroupOperatingSystemElementType',
                  type: {
                    name: 'Composite',
                    className: 'ErrorGroupOperatingSystem'
                  }
              }
            }
          }
        }
      }
    };
  }
}

module.exports = ErrorGroupOperatingSystems;
