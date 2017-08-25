import * as differenceInMinutes from 'date-fns/difference_in_minutes';
import * as format from 'date-fns/format';

export function formatDate(unixOffset: number): string {
    let formattedDateString: string;
    const date = new Date(unixOffset);
    if (differenceInMinutes(Date.now(), date) < 2) {
      formattedDateString = "Just now";
    } else {
      formattedDateString = format(date, "MMM DD, hh:mm A");
    }
    return formattedDateString;
}