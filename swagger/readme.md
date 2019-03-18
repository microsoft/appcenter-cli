# Autorest configuration file for AppCenter cli
> see https://aka.ms/autorest

```yaml
input-file: bifrost.swagger.json
output-folder: ../src/util/apis/generated
license-header: MICROSOFT_MIT_NO_VERSION
payload-flattening-threshold: 3
add-credentials: true
clear-output-folder: true
nodejs:
  override-client-name: AppCenterClient
  output-folder: ../src/util/apis/generated
  source-code-folder-path: ""
  generate-package-json: false
```
