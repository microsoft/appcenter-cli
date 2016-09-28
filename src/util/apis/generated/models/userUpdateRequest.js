/*
 * Code generated by Microsoft (R) AutoRest Code Generator 0.16.0.0
 * Changes may cause incorrect behavior and will be lost if the code is
 * regenerated.
 */

'use strict';

/**
 * @class
 * Initializes a new instance of the UserUpdateRequest class.
 * @constructor
 * @member {string} [displayName] The full name of the user. Might for example
 * be first and last name
 * 
 */
function UserUpdateRequest() {
}

/**
 * Defines the metadata of UserUpdateRequest
 *
 * @returns {object} metadata of UserUpdateRequest
 *
 */
UserUpdateRequest.prototype.mapper = function () {
  return {
    required: false,
    serializedName: 'UserUpdateRequest',
    type: {
      name: 'Composite',
      className: 'UserUpdateRequest',
      modelProperties: {
        displayName: {
          required: false,
          serializedName: 'display_name',
          type: {
            name: 'String'
          }
        }
      }
    }
  };
};

module.exports = UserUpdateRequest;
