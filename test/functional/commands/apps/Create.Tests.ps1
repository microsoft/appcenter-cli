Describe "apps create" {
  It "creates a new app when all required parameters are provided with valid values" {
    # Arrange
    $previousNumberOfApps = (appcenter apps list --output json | ConvertFrom-Json).Count
    $appDisplayName = "TestAppsCreate$((Get-Date).ToString("yyyy-MM-dd_HH.mm.ffffff"))"
    $appOs = "Android"
    $appPlatform = "Java"

    # Act
    $app = appcenter apps create --platform $appPlatform --os $appOs --display-name $appDisplayName --output json | ConvertFrom-Json

    # Assert
    $app.displayName | Should -Be $appDisplayName
    $app.os | Should -Be
    $app.platform | Should -Be $appPlatform

    $newNumberOfApps = (appcenter apps list --output json | ConvertFrom-Json).Count
    $newNumberOfApps | Should -Be ($previousNumberOfApps + 1)

    # Aftermath
    $appFullName = $app.owner.name + "/" + $app.name
    appcenter apps delete --app $appFullName --quiet
  }
}