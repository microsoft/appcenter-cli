/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

import {
  OrganizationsGetOptionalParams,
  OrganizationsGetResponse,
  OrganizationsUpdateOptionalParams,
  OrganizationsUpdateResponse,
  OrganizationsDeleteOptionalParams,
  OrganizationsCreateOrUpdateOptionalParams,
  OrganizationsCreateOrUpdateResponse,
  OrganizationsListOptionalParams,
  OrganizationsListResponse,
  OrganizationsListAdministeredOptionalParams,
  OrganizationsListAdministeredResponse
} from "../models";

/** Interface representing a Organizations. */
export interface Organizations {
  /**
   * Returns the details of a single organization
   * @param orgName The organization's name
   * @param options The options parameters.
   */
  get(
    orgName: string,
    options?: OrganizationsGetOptionalParams
  ): Promise<OrganizationsGetResponse>;
  /**
   * Returns a list of organizations the requesting user has access to
   * @param orgName The organization's name
   * @param options The options parameters.
   */
  update(
    orgName: string,
    options?: OrganizationsUpdateOptionalParams
  ): Promise<OrganizationsUpdateResponse>;
  /**
   * Deletes a single organization
   * @param orgName The organization's name
   * @param options The options parameters.
   */
  delete(
    orgName: string,
    options?: OrganizationsDeleteOptionalParams
  ): Promise<void>;
  /**
   * Creates a new organization and returns it to the caller
   * @param options The options parameters.
   */
  createOrUpdate(
    options?: OrganizationsCreateOrUpdateOptionalParams
  ): Promise<OrganizationsCreateOrUpdateResponse>;
  /**
   * Returns a list of organizations the requesting user has access to
   * @param options The options parameters.
   */
  list(
    options?: OrganizationsListOptionalParams
  ): Promise<OrganizationsListResponse>;
  /**
   * Returns a list organizations in which the requesting user is an admin
   * @param options The options parameters.
   */
  listAdministered(
    options?: OrganizationsListAdministeredOptionalParams
  ): Promise<OrganizationsListAdministeredResponse>;
}