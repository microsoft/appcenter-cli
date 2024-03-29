/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

import { Sharedconnection } from "../operationsInterfaces";
import * as coreClient from "@azure/core-client";
import * as Mappers from "../models/mappers";
import * as Parameters from "../models/parameters";
import { AppCenterClient } from "../appCenterClient";
import {
  SharedconnectionConnectionsOptionalParams,
  SharedconnectionConnectionsResponse
} from "../models";

/** Class containing Sharedconnection operations. */
export class SharedconnectionImpl implements Sharedconnection {
  private readonly client: AppCenterClient;

  /**
   * Initialize a new instance of the class Sharedconnection class.
   * @param client Reference to the service client
   */
  constructor(client: AppCenterClient) {
    this.client = client;
  }

  /**
   * Gets all service connections of the service type for GDPR export.
   * @param options The options parameters.
   */
  connections(
    options?: SharedconnectionConnectionsOptionalParams
  ): Promise<SharedconnectionConnectionsResponse> {
    return this.client.sendOperationRequest(
      { options },
      connectionsOperationSpec
    );
  }
}
// Operation Specifications
const serializer = coreClient.createSerializer(Mappers, /* isXml */ false);

const connectionsOperationSpec: coreClient.OperationSpec = {
  path: "/v0.1/user/export/serviceConnections",
  httpMethod: "GET",
  responses: {
    200: {
      bodyMapper: {
        type: {
          name: "Sequence",
          element: {
            type: {
              name: "Composite",
              className: "Get200ApplicationJsonItemsItem"
            }
          }
        }
      }
    },
    default: {
      bodyMapper:
        Mappers.PathsIs7Fv3V01UserExportServiceconnectionsGetResponsesDefaultContentApplicationJsonSchema
    }
  },
  urlParameters: [Parameters.$host],
  headerParameters: [Parameters.accept],
  serializer
};
