export function parseTestParameters(testParameters: string[]) {
  const result: any = {};

  if (testParameters) {
    testParameters.forEach((p) => {
      const parsedParameter = parseTestParameter(p);
      result[parsedParameter.key] = parsedParameter.value;
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
