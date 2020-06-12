Describe "distribute release" {
  $appDisplayName = "TestDistributeRelease$((Get-Date).ToString("yyyy-MM-dd_HH.mm.ffffff"))"
  $appOs = "Custom"
  $appPlatform = "Custom"
  $app = appcenter apps create --platform $appPlatform --os $appOs --display-name $appDisplayName --output json | ConvertFrom-Json
  $appFullName = $app.owner.name + "/" + $app.name
  appcenter apps set-current $appFullName

  It "creates a release when mandatory flag is set to true" {
    # Arrange
    $fileName = "./test/functional/dummyapk.apk"

    # Act
    $r1 = appcenter distribute release -g Collaborators -f $fileName --build-version 1 --mandatory --output json | ConvertFrom-Json

    # Assert
    $group = appcenter distribute groups show -g Collaborators --output json | ConvertFrom-Json
    $r2 = $group[1].tables | Where-Object {$_.id -eq $r1.id}
    $r2.mandatoryUpdate | Should -Be "True"

    Remove-Item $fileName
  }

  # Cleanup
  appcenter apps delete --app $appFullName --quiet
}