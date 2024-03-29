/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

import { CodePushDeploymentRelease } from "../operationsInterfaces";
import * as coreClient from "@azure/core-client";
import * as Mappers from "../models/mappers";
import * as Parameters from "../models/parameters";
import { AppCenterClient } from "../appCenterClient";
import {
  CodePushDeploymentReleaseRollbackOptionalParams,
  CodePushDeploymentReleaseRollbackResponse
} from "../models";

/** Class containing CodePushDeploymentRelease operations. */
export class CodePushDeploymentReleaseImpl
  implements CodePushDeploymentRelease {
  private readonly client: AppCenterClient;

  /**
   * Initialize a new instance of the class CodePushDeploymentRelease class.
   * @param client Reference to the service client
   */
  constructor(client: AppCenterClient) {
    this.client = client;
  }

  /**
   * Rollback the latest or a specific release for an app deployment
   * @param deploymentName deployment name
   * @param ownerName The name of the owner
   * @param appName The name of the application
   * @param options The options parameters.
   */
  rollback(
    deploymentName: string,
    ownerName: string,
    appName: string,
    options?: CodePushDeploymentReleaseRollbackOptionalParams
  ): Promise<CodePushDeploymentReleaseRollbackResponse> {
    return this.client.sendOperationRequest(
      { deploymentName, ownerName, appName, options },
      rollbackOperationSpec
    );
  }
}
// Operation Specifications
const serializer = coreClient.createSerializer(Mappers, /* isXml */ false);

const rollbackOperationSpec: coreClient.OperationSpec = {
  path:
    "/v0.1/apps/{owner_name}/{app_name}/deployments/{deployment_name}/rollback_release",
  httpMethod: "POST",
  responses: {
    201: {
      bodyMapper:
        Mappers.PathsCv4Vu0V01AppsOwnerNameAppNameDeploymentsDeploymentNameRollbackReleasePostResponses201ContentApplicationJsonSchema
    },
    default: {
      bodyMapper:
        Mappers.PathsC97F7PV01AppsOwnerNameAppNameDeploymentsDeploymentNameRollbackReleasePostResponsesDefaultContentApplicationJsonSchema
    }
  },
  requestBody: {
    parameterPath: { label: ["options", "label"] },
    mapper:
      Mappers.Paths1G1PzhgV01AppsOwnerNameAppNameDeploymentsDeploymentNameRollbackReleasePostRequestbodyContentApplicationJsonSchema
  },
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
