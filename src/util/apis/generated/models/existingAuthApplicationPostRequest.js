/*
 * Copyright (c) Microsoft Corporation. All rights reserved.
 * Licensed under the MIT License. See License.txt in the project root for
 * license information.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is
 * regenerated.
 */

'use strict';

/**
 * Class representing a ExistingAuthApplicationPostRequest.
 */
class ExistingAuthApplicationPostRequest {
  /**
   * Create a ExistingAuthApplicationPostRequest.
   * @property {uuid} [tenantId]
   * @property {string} [tenantName]
   * @property {string} [provider] Possible values include: 'AADB2C', 'Auth0',
   * 'Firebase', 'AAD'
   * @property {string} id
   * @property {string} [policyId]
   * @property {uuid} [scopeId]
   * @property {string} [scopeUrl]
   * @property {string} [signInAudience]
   */
  constructor() {
  }

  /**
   * Defines the metadata of ExistingAuthApplicationPostRequest
   *
   * @returns {object} metadata of ExistingAuthApplicationPostRequest
   *
   */
  mapper() {
    return {
      required: false,
      serializedName: 'ExistingAuthApplicationPostRequest',
      type: {
        name: 'Composite',
        className: 'ExistingAuthApplicationPostRequest',
        modelProperties: {
          tenantId: {
            required: false,
            serializedName: 'tenantId',
            type: {
              name: 'String'
            }
          },
          tenantName: {
            required: false,
            serializedName: 'tenantName',
            type: {
              name: 'String'
            }
          },
          provider: {
            required: false,
            serializedName: 'provider',
            type: {
              name: 'String'
            }
          },
          id: {
            required: true,
            serializedName: 'id',
            type: {
              name: 'String'
            }
          },
          policyId: {
            required: false,
            serializedName: 'policyId',
            type: {
              name: 'String'
            }
          },
          scopeId: {
            required: false,
            serializedName: 'scopeId',
            type: {
              name: 'String'
            }
          },
          scopeUrl: {
            required: false,
            serializedName: 'scopeUrl',
            type: {
              name: 'String'
            }
          },
          signInAudience: {
            required: false,
            serializedName: 'signInAudience',
            type: {
              name: 'String'
            }
          }
        }
      }
    };
  }
}

module.exports = ExistingAuthApplicationPostRequest;
