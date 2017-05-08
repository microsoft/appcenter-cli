import { out } from "../../../util/interaction";

export async function progressWithResult<T>(title: string, action: Promise<T>): Promise<T> {
  let prefix = `${title}... `;
  try {
    let result = await out.progress(prefix, action);
    out.text(`${prefix}done.`);
    return result;
  }
  catch (err) {
    out.text(`${prefix}failed.`);
    throw err;
  }
}