#!/usr/bin/env pwsh

<#
  .SYNOPSIS
  Installs and invokes Pester to run all CLI functional tests.

  .DESCRIPTION
  Runs the App Center CLI using Node on the current code in the repository. Signs in to the App Center
  integration testing environment using the provided token. Installs Pester and calls Pester on the
  directory the script is in.
#>
param
(
  # The API token used to connect to the App Center integration environment to run the integration tests
  [Parameter(Mandatory = $true)]
  [ValidatePattern("[0-9a-f]{40}")]
  [string]
  $Token,
  # The environment to run tests in. Defaults to 'int'. Use 'prod' to test against appcenter.ms.
  [ValidateSet('int', 'prod', 'local')]
  [string]
  $Environment
)

if (!$PSBoundParameters.ContainsKey('Environment')) {
  $Environment = 'int'
}

function Get-ScriptDirectory {
  Split-Path -parent $PSCommandPath
}

function Get-Root {
  Resolve-Path "$(Get-ScriptDirectory)/../.."
}

if (!(Get-Module -ListAvailable -Name Pester)) {
  Write-Host "Installing Pester"
  Install-Module -Name Pester -Force -SkipPublisherCheck -RequiredVersion 4.9.0
}

Import-Module Pester

$workingDir = Get-ScriptDirectory

$env:PATH = "$(Get-ScriptDirectory)/bin:" + $env:PATH
$env:CLI_ROOT = Get-Root

Write-Host "Signing in to App Center"
$loginResult = appcenter login --env $Environment --token $Token

if (!$loginResult.StartsWith("Logged in as")) {
  throw "Login failed: $loginResult"
}

Invoke-Pester $workingDir -OutputFile $workingDir/testresult.xml -OutputFormat NUnitXML
