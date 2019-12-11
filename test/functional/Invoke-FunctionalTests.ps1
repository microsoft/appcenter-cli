#!/usr/bin/env pwsh

param
(
  # The API token used to connect to the App Center integration environment to run the integration tests
  [string]$Token
)

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

appcenter login --env int --token $Token

Invoke-Pester $workingDir -OutputFile $workingDir/testresult.xml -OutputFormat NUnitXML
