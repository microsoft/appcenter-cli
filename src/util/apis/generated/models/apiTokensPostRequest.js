/*
 * Code generated by Microsoft (R) AutoRest Code Generator 0.16.0.0
 * Changes may cause incorrect behavior and will be lost if the code is
 * regenerated.
 */

'use strict';

/**
 * @class
 * Initializes a new instance of the ApiTokensPostRequest class.
 * @constructor
 * @member {string} [description] The description of the token
 * 
 */
function ApiTokensPostRequest() {
}

/**
 * Defines the metadata of ApiTokensPostRequest
 *
 * @returns {object} metadata of ApiTokensPostRequest
 *
 */
ApiTokensPostRequest.prototype.mapper = function () {
  return {
    required: false,
    serializedName: 'ApiTokensPostRequest',
    type: {
      name: 'Composite',
      className: 'ApiTokensPostRequest',
      modelProperties: {
        description: {
          required: false,
          serializedName: 'description',
          type: {
            name: 'String'
          }
        }
      }
    }
  };
};

module.exports = ApiTokensPostRequest;
