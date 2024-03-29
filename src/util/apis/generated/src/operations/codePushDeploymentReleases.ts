/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

import { CodePushDeploymentReleases } from "../operationsInterfaces";
import * as coreClient from "@azure/core-client";
import * as Mappers from "../models/mappers";
import * as Parameters from "../models/parameters";
import { AppCenterClient } from "../appCenterClient";
import {
  CodePushDeploymentReleasesDeleteOptionalParams,
  CodePushDeploymentReleasesGetOptionalParams,
  CodePushDeploymentReleasesGetResponse,
  Paths1Q5DgwjV01AppsOwnerNameAppNameDeploymentsDeploymentNameReleasesPostRequestbodyContentApplicationJsonSchema,
  CodePushDeploymentReleasesCreateOptionalParams,
  CodePushDeploymentReleasesCreateResponse
} from "../models";

/** Class containing CodePushDeploymentReleases operations. */
export class CodePushDeploymentReleasesImpl
  implements CodePushDeploymentReleases {
  private readonly client: AppCenterClient;

  /**
   * Initialize a new instance of the class CodePushDeploymentReleases class.
   * @param client Reference to the service client
   */
  constructor(client: AppCenterClient) {
    this.client = client;
  }

  /**
   * Clears a Deployment of releases
   * @param deploymentName deployment name
   * @param ownerName The name of the owner
   * @param appName The name of the application
   * @param options The options parameters.
   */
  delete(
    deploymentName: string,
    ownerName: string,
    appName: string,
    options?: CodePushDeploymentReleasesDeleteOptionalParams
  ): Promise<void> {
    return this.client.sendOperationRequest(
      { deploymentName, ownerName, appName, options },
      deleteOperationSpec
    );
  }

  /**
   * Gets the history of releases on a Deployment
   * @param deploymentName deployment name
   * @param ownerName The name of the owner
   * @param appName The name of the application
   * @param options The options parameters.
   */
  get(
    deploymentName: string,
    ownerName: string,
    appName: string,
    options?: CodePushDeploymentReleasesGetOptionalParams
  ): Promise<CodePushDeploymentReleasesGetResponse> {
    return this.client.sendOperationRequest(
      { deploymentName, ownerName, appName, options },
      getOperationSpec
    );
  }

  /**
   * Create a new CodePush release for the specified deployment
   * @param deploymentName deployment name
   * @param ownerName The name of the owner
   * @param appName The name of the application
   * @param uploadedRelease The necessary information required to download the bundle and being the
   *                        release process.
   * @param options The options parameters.
   */
  create(
    deploymentName: string,
    ownerName: string,
    appName: string,
    uploadedRelease: Paths1Q5DgwjV01AppsOwnerNameAppNameDeploymentsDeploymentNameReleasesPostRequestbodyContentApplicationJsonSchema,
    options?: CodePushDeploymentReleasesCreateOptionalParams
  ): Promise<CodePushDeploymentReleasesCreateResponse> {
    return this.client.sendOperationRequest(
      { deploymentName, ownerName, appName, uploadedRelease, options },
      createOperationSpec
    );
  }
}
// Operation Specifications
const serializer = coreClient.createSerializer(Mappers, /* isXml */ false);

const deleteOperationSpec: coreClient.OperationSpec = {
  path:
    "/v0.1/apps/{owner_name}/{app_name}/deployments/{deployment_name}/releases",
  httpMethod: "DELETE",
  responses: {
    204: {},
    default: {
      bodyMapper:
        Mappers.Paths2Uoo4MV01AppsOwnerNameAppNameDeploymentsDeploymentNameReleasesDeleteResponsesDefaultContentApplicationJsonSchema
    }
  },
  urlParameters: [
    Parameters.$host,
    Parameters.ownerName,
    Parameters.appName,
    Parameters.deploymentName
  ],
  headerParameters: [Parameters.accept],
  serializer
};
const getOperationSpec: coreClient.OperationSpec = {
  path:
    "/v0.1/apps/{owner_name}/{app_name}/deployments/{deployment_name}/releases",
  httpMethod: "GET",
  responses: {
    200: {
      bodyMapper: {
        type: {
          name: "Sequence",
          element: {
            type: {
              name: "Composite",
              className:
                "PathsJ4L197V01AppsOwnerNameAppNameDeploymentsDeploymentNameReleasesGetResponses200ContentApplicationJsonSchemaItems"
            }
          }
        }
      }
    },
    default: {
      bodyMapper:
        Mappers.PathsSxykieV01AppsOwnerNameAppNameDeploymentsDeploymentNameReleasesGetResponsesDefaultContentApplicationJsonSchema
    }
  },
  urlParameters: [
    Parameters.$host,
    Parameters.ownerName,
    Parameters.appName,
    Parameters.deploymentName
  ],
  headerParameters: [Parameters.accept],
  serializer
};
const createOperationSpec: coreClient.OperationSpec = {
  path:
    "/v0.1/apps/{owner_name}/{app_name}/deployments/{deployment_name}/releases",
  httpMethod: "POST",
  responses: {
    201: {
      bodyMapper:
        Mappers.Paths1N68We7V01AppsOwnerNameAppNameDeploymentsDeploymentNameReleasesPostResponses201ContentApplicationJsonSchema
    },
    default: {
      bodyMapper:
        Mappers.PathsWqgstxV01AppsOwnerNameAppNameDeploymentsDeploymentNameReleasesPostResponsesDefaultContentApplicationJsonSchema
    }
  },
  requestBody: Parameters.uploadedRelease,
  urlParameters: [
    Parameters.$host,
    Parameters.ownerName,
    Parameters.appName,
    Parameters.deploymentName
  ],
  headerParameters: [Parameters.contentType, Parameters.accept],
  mediaType: "json",
  serializer
};
