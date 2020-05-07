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
 * The source repository
 *
 */
class ListOKResponseItemModelModelModelModel {
  /**
   * Create a ListOKResponseItemModelModelModelModel.
   * @property {string} [name] The repository name
   * @property {string} [cloneUrl] URL used to clone the repository
   */
  constructor() {
  }

  /**
   * Defines the metadata of ListOKResponseItemModelModelModelModel
   *
   * @returns {object} metadata of ListOKResponseItemModelModelModelModel
   *
   */
  mapper() {
    return {
      required: false,
      serializedName: 'ListOKResponseItem',
      type: {
        name: 'Composite',
        className: 'ListOKResponseItemModelModelModelModel',
        modelProperties: {
          name: {
            required: false,
            serializedName: 'name',
            type: {
              name: 'String'
            }
          },
          cloneUrl: {
            required: false,
            serializedName: 'clone_url',
            type: {
              name: 'String'
            }
          }
        }
      }
    };
  }
}

module.exports = ListOKResponseItemModelModelModelModel;