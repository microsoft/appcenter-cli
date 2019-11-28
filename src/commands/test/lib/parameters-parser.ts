export function parseTestParameters(testParameters: string[]) {
  const result: any = {};

  if (testParameters) {
    testParameters.forEach((p) => {
      const parsedParameter = parseTestParameter(p);
      if (result[parsedParameter.key] != null && (parsedParameter.key === "test_env" || parsedParameter.key === "app_env")) {
        const combinedValue = `${result[parsedParameter.key]}|${parsedParameter.value}`;
        result[parsedParameter.key] = combinedValue;
      } else if (result[parsedParameter.key] == null) {
        result[parsedParameter.key] = parsedParameter.value;
      } else {
        throw new Error(`duplicate --test-parameter: ${parsedParameter.key}`);
      }
    });
  }

  return result;
}

export function parseTestParameter(testParameter: string) {
  const separatorIndex = testParameter.indexOf("=");
  if (separatorIndex !== -1) {
    return {
      key: testParameter.substr(0, separatorIndex),
      value: testParameter.substr(separatorIndex + 1, testParameter.length - separatorIndex - 1)
    };
  } else {
    return {
      key: testParameter,
      value: null
    };
  }
}
