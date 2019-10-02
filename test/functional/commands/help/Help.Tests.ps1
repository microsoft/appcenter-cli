Describe "help" {
  It "is shown when no command is provided" {
      $helpOutput = appcenter help
      $noCommandOutput = appcenter
      $helpOutput | Should -Be $noCommandOutput
  }

  It "lists usage for all commands" {
    $commands = "analytics", "apps", "orgs"
    $commands | ForEach-Object { $help = appcenter help $_; $help -match "Usage" | Should -BeTrue -Because "Usage for $_ should be explained" }
  }
}