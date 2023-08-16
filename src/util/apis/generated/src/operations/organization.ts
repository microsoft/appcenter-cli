/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

import { Organization } from "../operationsInterfaces";
import * as coreClient from "@azure/core-client";
import * as Mappers from "../models/mappers";
import * as Parameters from "../models/parameters";
import { AppCenterClient } from "../appCenterClient";
import {
  OrganizationUpdateAvatarOptionalParams,
  OrganizationUpdateAvatarResponse,
  OrganizationDeleteAvatarOptionalParams,
  OrganizationDeleteAvatarResponse
} from "../models";

/** Class containing Organization operations. */
export class OrganizationImpl implements Organization {
  private readonly client: AppCenterClient;

  /**
   * Initialize a new instance of the class Organization class.
   * @param client Reference to the service client
   */
  constructor(client: AppCenterClient) {
    this.client = client;
  }

  /**
   * Sets the organization avatar
   * @param orgName The organization's name
   * @param options The options parameters.
   */
  updateAvatar(
    orgName: string,
    options?: OrganizationUpdateAvatarOptionalParams
  ): Promise<OrganizationUpdateAvatarResponse> {
    return this.client.sendOperationRequest(
      { orgName, options },
      updateAvatarOperationSpec
    );
  }

  /**
   * Deletes the uploaded organization avatar
   * @param orgName The organization's name
   * @param options The options parameters.
   */
  deleteAvatar(
    orgName: string,
    options?: OrganizationDeleteAvatarOptionalParams
  ): Promise<OrganizationDeleteAvatarResponse> {
    return this.client.sendOperationRequest(
      { orgName, options },
      deleteAvatarOperationSpec
    );
  }
}
// Operation Specifications
const serializer = coreClient.createSerializer(Mappers, /* isXml */ false);

const updateAvatarOperationSpec: coreClient.OperationSpec = {
  path: "/v0.1/orgs/{org_name}/avatar",
  httpMethod: "POST",
  responses: {
    200: {
      bodyMapper:
        Mappers.Paths7Mbu6OV01OrgsOrgNameAvatarPostResponses200ContentApplicationJsonSchema
    },
    default: {
      bodyMapper:
        Mappers.Paths2Bw88TV01OrgsOrgNameAvatarPostResponsesDefaultContentApplicationJsonSchema
    }
  },
  formDataParameters: [Parameters.avatar],
  urlParameters: [Parameters.$host, Parameters.orgName],
  headerParameters: [Parameters.contentType1, Parameters.accept1],
  serializer
};
const deleteAvatarOperationSpec: coreClient.OperationSpec = {
  path: "/v0.1/orgs/{org_name}/avatar",
  httpMethod: "DELETE",
  responses: {
    200: {
      bodyMapper:
        Mappers.PathsQe14CxV01OrgsOrgNameAvatarDeleteResponses200ContentApplicationJsonSchema
    },
    default: {
      bodyMapper:
        Mappers.Paths1Ytl347V01OrgsOrgNameAvatarDeleteResponsesDefaultContentApplicationJsonSchema
    }
  },
  urlParameters: [Parameters.$host, Parameters.orgName],
  headerParameters: [Parameters.accept],
  serializer
};
