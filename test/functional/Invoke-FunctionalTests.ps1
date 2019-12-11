#!/usr/bin/env pwsh

param
(
  # The API token used to connect to the App Center integration environment to run the integration tests
  [string]$Token
)

## DO NOT CHECK THIS IN
Write-Host "Token: $Token"

function Get-ScriptDirectory {
  Split-Path -parent $PSCommandPath
}

function Get-Root {
  Resolve-Path "$(Get-ScriptDirectory)/../.."
}

if (!(Get-Module -ListAvailable -Name Pester)) {
  Write-Host "Installing Pester"
  Install-Module -Name Pester -Force -SkipPublisherCheck
}

Import-Module Pester

$workingDir = Get-ScriptDirectory

$env:PATH = "$(Get-ScriptDirectory)/bin:" + $env:PATH
$env:CLI_ROOT = Get-Root

Write-Host "Signing in to App Center"
$loginResult = appcenter login --env int --token $Token

if($null -ne $loginResult) {
  throw "Login failed: $loginResult"
}

Invoke-Pester $workingDir -OutputFile $workingDir/testresult.xml -OutputFormat NUnitXML
