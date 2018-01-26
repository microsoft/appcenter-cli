const _ = require('lodash');
const fs = require('fs');
const path = require('path');

//
// Fix up the swagger file so that we have consistent operationIds and remove the
// bad empty paths.
//

function fixupRawSwagger(rawSwaggerPath, fixedSwaggerPath) {
  let swagger = JSON.parse(fs.readFileSync(rawSwaggerPath, 'utf8'));
  let urlPaths = Object.keys(swagger.paths);
  urlPaths.forEach(urlPath => {
    if (_.isEmpty(swagger.paths[urlPath])) {
      delete swagger.paths[urlPath];
    } else if(urlPath.match(/^\/v0.1\/public/)) {
      // These paths are only for consumption by the device SDKs
      delete swagger.paths[urlPath];
    } else {
      let operations = _.toPairs(swagger.paths[urlPath]);
      operations.forEach(([method, operationObj]) => {
        // Fix up malformed/missing operation Ids
        if (!operationIdIsValid(operationObj)) {
          if (operationObj.operationId) {
            operationObj.operationId = `${getArea(operationObj)}_${operationObj.operationId}`;
          } else {
            operationObj.operationId = `${getArea(operationObj)}_${method}${urlPathToOperation(urlPath)}`;
          }
        }

        // If operation isn't json, set response to blob/file and remove the produces, that crashes autorest
        if (operationIsNotJson(operationObj)) {
          setOperationToFile(operationObj);
        }
      });
    }
  });

  fs.writeFileSync(fixedSwaggerPath, JSON.stringify(swagger, null, 2), 'utf8');
}

// Is the operationId present and of the form "area_id"
function operationIdIsValid(operationObj) {
  return operationObj.operationId && operationIdHasArea(operationObj);
}

function operationIdHasArea(operationObj) {
  return operationObj.operationId.includes('_');
}

function getArea(operationObj) {
  if (operationObj.tags && operationObj.tags.length > 0) {
    return operationObj.tags[0];
  }
  return 'misc';
}

// Case conversion for path parts used in generating operation Ids
function snakeToPascalCase(s) {
  return s.split('_')
    .filter(_.negate(_.isEmpty))
    .map(part => part[0].toUpperCase() + part.slice(1))
    .join('');
}

function removeIllegalCharacters(s) {
  return s.replace(/\./g, '');
}

function convertParameter(part) {
  if (part[0] === '{') {
    return `by_${part.slice(1, -1)}`;
  }
  return part;
}

function urlPathToOperation(urlPath) {
  return urlPath.split('/')
    .filter(_.negate(_.isEmpty))
    .map(convertParameter)
    .map(removeIllegalCharacters)
    .map(snakeToPascalCase)
    .join('');
}

function fixupGetCommits(operations) {
  let getCommits = operations['get'];
  if (!getCommits) {
    console.error('Could not find getCommits operation!');
    return;
  }

  let parameters = getCommits.parameters;
  if(!parameters) {
    console.error('Could not find parameters for get operation!');
    return;
  }

  let shaCollection = parameters.filter(p => p.name && p.name === 'sha_collection');
  if (shaCollection.length !== 1) {
    return;
  }

  let shaCollectionParam = shaCollection[0];
  if (!shaCollectionParam['x-ms-skip-url-encoding']) {
    shaCollectionParam['x-ms-skip-url-encoding'] = true;
  }
}

function operationIsNotJson(operation) {
  return operation.produces && operation.produces[0] !== 'application/json';
}

function setOperationToFile(operation) {
  delete operation.produces;

  let response200 = operation.responses["200"];
  if (response200) {
    if (response200.schema) {
      delete response200.schema;
    }
    response200.schema = { type: "file" };
  }
}

module.exports = {
  fixupRawSwagger,
  rawSwaggerPath: path.join(__dirname, '..', 'swagger', 'bifrost.swagger.before.json'),
  fixedSwaggerPath: path.join(__dirname, '..', 'swagger', 'bifrost.swagger.json')
};
