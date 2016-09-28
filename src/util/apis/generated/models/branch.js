/*
 * Code generated by Microsoft (R) AutoRest Code Generator 0.16.0.0
 * Changes may cause incorrect behavior and will be lost if the code is
 * regenerated.
 */

'use strict';

var models = require('./index');

/**
 * @class
 * Initializes a new instance of the Branch class.
 * @constructor
 * @member {string} name The branch name
 * 
 * @member {object} commit
 * 
 * @member {string} [commit.sha] The commit SHA
 * 
 * @member {string} [commit.url] The URL to the commit
 * 
 */
function Branch() {
}

/**
 * Defines the metadata of Branch
 *
 * @returns {object} metadata of Branch
 *
 */
Branch.prototype.mapper = function () {
  return {
    required: false,
    serializedName: 'Branch',
    type: {
      name: 'Composite',
      className: 'Branch',
      modelProperties: {
        name: {
          required: true,
          serializedName: 'name',
          type: {
            name: 'String'
          }
        },
        commit: {
          required: true,
          serializedName: 'commit',
          type: {
            name: 'Composite',
            className: 'Commit'
          }
        }
      }
    }
  };
};

module.exports = Branch;
