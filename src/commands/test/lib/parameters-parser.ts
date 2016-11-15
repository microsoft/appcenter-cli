export function parseTestParameters(testParameters: string[]) {
  let result: any = {};
  
  if (testParameters) {
    testParameters.forEach(p => {
      let parsedParameter = parseTestParameter(p);
      result[parsedParameter.key] = parsedParameter.value;
    });
  }
  
  return result;
}

function parseTestParameter(testParameter: string) {
  let separatorIndex = testParameter.indexOf("=");
  if (separatorIndex !== -1) {
    return {
      key: testParameter.substr(0, separatorIndex),
      value: testParameter.substr(separatorIndex + 1, testParameter.length - separatorIndex - 1)
    }
  }
  else {
    return {
      key: testParameter,
      value: null
    }
  }
}