Describe "distribute release" {

  It "creates a release when mandatory flag is set to true" {
    $appDisplayName = "TestDistributeRelease$((Get-Date).ToString("yyyy-MM-dd_HH.mm.ffffff"))"
    $appOs = "Custom"
    $appPlatform = "Custom"
    $app = appcenter apps create --platform $appPlatform --os $appOs --display-name $appDisplayName --output json | ConvertFrom-Json
    $appFullName = $app.owner.name + "/" + $app.name
    appcenter apps set-current $appFullName

    # A 10 MB file should be enough to test uploader logic.
    $fileName = "Dummy.zip"
    [io.file]::Create($filename).SetLength(1024 * 1024 * 10).Close

    # Act
    $r1 = appcenter distribute release -g Collaborators -f $fileName --build-version 1 --mandatory --output json | ConvertFrom-Json

    # Assert
    $group = appcenter distribute groups show -g Collaborators --output json | ConvertFrom-Json
    $r2 = $group[1].tables | Where-Object {$_.id -eq $r1.id}
    $r2.mandatoryUpdate | Should -Be "True"

    Remove-Item $fileName

    # Cleanup
    # Note: don't put this command under the test: it ignores the async execution 
    # of the command and the test fails.
    appcenter apps delete --app $appFullName --quiet
  }
}