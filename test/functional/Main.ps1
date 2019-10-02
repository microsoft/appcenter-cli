#!/usr/bin/env pwsh

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

Invoke-Pester $workingDir -OutputFile $workingDir/Test-Pester.XML -OutputFormat NUnitXML
