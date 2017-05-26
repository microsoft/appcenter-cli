import * as Pfs from "../../../util/misc/promisfied-fs";

import * as JsZip from "jszip";
import * as JsZipHelper from "../../../util/misc/jszip-helper";
export async function createTempFileFromZip(zip: JsZip): Promise<string> {
  const tempZipPath = (await Pfs.openTempFile({prefix: "tempSymbolsZip", suffix: ".zip"})).path;
  await JsZipHelper.writeZipToPath(tempZipPath, zip, "DEFLATE");
  return tempZipPath;
}
