import * as _ from "lodash"

export default class TextCutter {

  private _text: string;
  get text(): string {
    return this._text;
  }

  get result(): string {
    return this._fragments.map(x => x.text).join("");
  }

  private _fragments: Fragment[];
  private _position: number = 0;

  constructor(text: string) {
    this._text = text;
    this._fragments = [new Fragment(text, 0)];
  }

  goto(position: number): TextCutter {
    this._position = position;
    return this;
  }

  cut(length: number): TextCutter {
    let outer = _.find(this._fragments, f => f.start < this._position && this._position + length - 1 < f.end);
    if (outer) {
      let left = new Fragment(outer.text.substr(0, this._position - outer.start), outer.start);
      let right = new Fragment(outer.text.substr(this._position - outer.start + length), this._position + length);
      this._fragments.splice(this._fragments.indexOf(outer), 1, left, right);
    }

    _.remove(this._fragments, f => f.start >= this._position && this._position + length - 1 >= f.end)

    let rightAligned = _.find(this._fragments, f => f.end >= this._position && this._position + length - 1 >= f.end);
    if (rightAligned)
      rightAligned.text = rightAligned.text.substr(0, rightAligned.length - rightAligned.end + this._position - 1);

    let leftAligned = _.find(this._fragments, f => f.start >= this._position && this._position + length - 1 >= f.start);
    if (leftAligned) {
      let shift = this._position + length - leftAligned.start;
      leftAligned.text = leftAligned.text.substr(shift);
      leftAligned.start += shift;
    }

    return this;
  }

  cutLine(): TextCutter {
    return this.cutLineIf(() => true);
  }

  cutEmptyLine(): TextCutter {
    return this.cutLineIf(l => !l.trim());
  }

  cutLineIf(predicate: (line: string) => any): TextCutter {
    let start = this.seekPrev("\n") + 1;
    let end = this.seekNext("\n") || this._text.length - 1;
    let length = end - start + 1;
    let line = this.read(start, end - 1);

    return predicate(line) ?
      this.goto(start).cut(length) :
      this;
  }

  private read(start: number, end: number): string {
    let result: string;
    let fragments = this._fragments.filter(x => x.end >= start && x.start <= end);
    if (fragments.length === 1) {
      let maxStart = Math.max(start, fragments[0].start) - fragments[0].start;
      let minEnd = Math.min(end, fragments[0].end) - fragments[0].start + 1;
      result = fragments[0].text.substring(maxStart, minEnd);
    } else if (fragments.length > 1) {
      result = fragments[0].text.substr(start - fragments[0].start);
      for (let i = 1; i < fragments.length - 2; i++)
        result += fragments[i];
      result += fragments[fragments.length - 1].text.substr(0, end - fragments[fragments.length - 1].start + 1);
    } else
      result = "";
    return result;
  }

  private seekPrev(sample: string): number {
    for (var i = this._fragments.length - 1; i >= 0; i--) {
      if (this._fragments[i].start > this._position)
        continue;
      var last = this._fragments[i].text.lastIndexOf(sample, this._position - this._fragments[i].start);
      if (~last)
        break;
    }

    return this._fragments[i].start + last;
  }

  private seekNext(sample: string): number {
    for (var i = 0; i < this._fragments.length; i++) {
      if (this._fragments[i].end < this._position)
        continue;
      var first = this._fragments[i].text.indexOf(sample, this._position - this._fragments[i].start);
      if (~first)
        break;
    }

    return first === undefined || first < 0 ? null : first + this._fragments[i].start;
  }
}

class Fragment {
  get end(): number {
    return this.start + this.length - 1;
  }
  get length(): number {
    return this.text.length;
  }

  constructor(
    public text: string,
    public start: number) { }
}