/*
 * Copyright (c) Microsoft Corporation.
 * Licensed under the MIT License.
 *
 * Code generated by Microsoft (R) AutoRest Code Generator.
 * Changes may cause incorrect behavior and will be lost if the code is regenerated.
 */

import {
  OrgInvitationsRejectOptionalParams,
  OrgInvitationsAcceptOptionalParams,
  OrgInvitationsRevokeOptionalParams,
  OrgInvitationsSendNewInvitationOptionalParams,
  OrgInvitationsUpdateOptionalParams,
  OrgInvitationsCreateOptionalParams,
  OrgInvitationsDeleteOptionalParams,
  OrgInvitationsListPendingOptionalParams,
  OrgInvitationsListPendingResponse
} from "../models";

/** Interface representing a OrgInvitations. */
export interface OrgInvitations {
  /**
   * Rejects a pending organization invitation
   * @param invitationToken The app invitation token that was sent to the user
   * @param options The options parameters.
   */
  reject(
    invitationToken: string,
    options?: OrgInvitationsRejectOptionalParams
  ): Promise<void>;
  /**
   * Accepts a pending organization invitation for the specified user
   * @param invitationToken The app invitation token that was sent to the user
   * @param options The options parameters.
   */
  accept(
    invitationToken: string,
    options?: OrgInvitationsAcceptOptionalParams
  ): Promise<void>;
  /**
   * Removes a user's invitation to an organization
   * @param orgName The organization's name
   * @param email The email address of the user to send the password reset mail to.
   * @param options The options parameters.
   */
  revoke(
    orgName: string,
    email: string,
    options?: OrgInvitationsRevokeOptionalParams
  ): Promise<void>;
  /**
   * Cancels an existing organization invitation for the user and sends a new one
   * @param orgName The organization's name
   * @param email The email address of the user to send the password reset mail to.
   * @param options The options parameters.
   */
  sendNewInvitation(
    orgName: string,
    email: string,
    options?: OrgInvitationsSendNewInvitationOptionalParams
  ): Promise<void>;
  /**
   * Allows the role of an invited user to be changed
   * @param orgName The organization's name
   * @param email The email address of the user to send the password reset mail to.
   * @param options The options parameters.
   */
  update(
    orgName: string,
    email: string,
    options?: OrgInvitationsUpdateOptionalParams
  ): Promise<void>;
  /**
   * Invites a new or existing user to an organization
   * @param orgName The organization's name
   * @param userEmail The user's email address
   * @param options The options parameters.
   */
  create(
    orgName: string,
    userEmail: string,
    options?: OrgInvitationsCreateOptionalParams
  ): Promise<void>;
  /**
   * Removes a user's invitation to an organization
   * @param orgName The organization's name
   * @param userEmail The user's email address
   * @param options The options parameters.
   */
  delete(
    orgName: string,
    userEmail: string,
    options?: OrgInvitationsDeleteOptionalParams
  ): Promise<void>;
  /**
   * Gets the pending invitations for the organization
   * @param orgName The organization's name
   * @param options The options parameters.
   */
  listPending(
    orgName: string,
    options?: OrgInvitationsListPendingOptionalParams
  ): Promise<OrgInvitationsListPendingResponse>;
}
