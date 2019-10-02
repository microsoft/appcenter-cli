Describe "help" {
  It "is shown when no command is provided" {
      $helpOutput = appcenter help
      $noCommandOutput = appcenter
      $helpOutput | Should -Be $noCommandOutput
  }

  It "lists usage for commands" {
    $commands = "analytics", "apps", "orgs"
    $commands | ForEach-Object { $help = appcenter help $_; $help -match "Usage" | Should -BeTrue -Because "Usage for $_ should be explained" }
  }

  It "fails" {
    3 | Should -Be 4
  }

  It "has the right version" {
    $packageJsonPath = $env:CLI_ROOT + "/package.json"
    $version = (Get-Content $packageJsonPath | ConvertFrom-Json).version
    $output = appcenter
    ($output -match "Version")[0] | Should -Be "Version $version"
  }
}
