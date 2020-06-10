Describe "distribute release" {
  $appDisplayName = "TestDistributeRelease$((Get-Date).ToString("yyyy-MM-dd_HH.mm.ffffff"))"
  $appOs = "Custom"
  $appPlatform = "Custom"
  Write-Host "RUN: appcenter apps create --platform $appPlatform --os $appOs --display-name $appDisplayName --output json"
  $appRaw = appcenter apps create --platform $appPlatform --os $appOs --display-name $appDisplayName --output json
  Write-Host "appRaw: $appRaw"
  $app = $appRaw | ConvertFrom-Json
  $appFullName = $app.owner.name + "/" + $app.name
  appcenter apps set-current $appFullName

  It "creates a release when mandatory flag is set to true" {
    # Arrange
    $fileName = "Dummy.zip"
    "DummyData" | Out-File -FilePath $fileName

    # Act
    Write-Host "RUN: appcenter distribute release -g Collaborators -f $fileName --build-version 1 --mandatory --output json"
    $r1Raw = appcenter distribute release -g Collaborators -f $fileName --build-version 1 --mandatory --output json
    Write-Host "r1Raw: $r1Raw"
    $r1 = $r1Raw | ConvertFrom-Json

    # Assert
    Write-Host "RUN: appcenter distribute groups show -g Collaborators --output json"
    $groupRaw = appcenter distribute groups show -g Collaborators --output json
    Write-Host "groupRaw: $groupRaw"
    $group = $groupRaw | ConvertFrom-Json
    $r2 = $group[1].tables | Where-Object {$_.id -eq $r1.id}
    $r2.mandatoryUpdate | Should -Be "True"

    Remove-Item $fileName
  }

  # Cleanup
  appcenter apps delete --app $appFullName --quiet
}