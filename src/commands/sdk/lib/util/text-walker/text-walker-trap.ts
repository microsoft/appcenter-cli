export class TextWalkerTrap<TBag> {
  constructor(
    public condition: (bag: TBag) => boolean,
    public handler: (bag: TBag) => void) {
  }
}