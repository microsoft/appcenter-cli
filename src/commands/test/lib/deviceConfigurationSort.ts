// From appcenter testCloud utils

import { DeviceConfiguration } from "../../../util/apis/generated/models";
import { CompareVersionNumbers } from "./compareVersionNumbers";

/**
 * Sort Device Configurations in the order: phone, tablet, os (desc), model (desc).
 *
 * @export
 * @class DeviceConfigurationSort
 */

export namespace DeviceConfigurationSort {
  export function compare(d1: DeviceConfiguration, d2: DeviceConfiguration): number {
    if (d1.model.formFactor !== d2.model.formFactor) {
      // Phones appear first.
      if (d1.model.formFactor === "phone") {
        return -1;
      } else if (d2.model.formFactor === "phone") {
        return 1;
      }
    } else if (d1.os !== d2.os) {
      return CompareVersionNumbers.compareDesc(d1.os, d2.os);
    } else if (d1.model.model !== d2.model.model) {
      // Sorts model descending
      if (d1.model.model < d2.model.model) {
        return 1;
      } else if (d1.model.model > d2.model.model) {
        return -1;
      }
    }
    return 0;
  }
}
