import TextWalker from "../util/text-walker"

export class TextWalkerC<TBag extends TextWalkerCBag> extends TextWalker<TBag> {

    constructor(text: string, bag: TBag) {
        super(text, bag);

        //block levels
        this.addTrap(
            bag =>
                bag.significant &&
                this.currentChar === '{',
            bag =>
                bag.blockLevel++
        );
        this.addTrap(
            bag =>
                bag.significant &&
                this.currentChar === '}',
            bag =>
                bag.blockLevel--
        );

        //single-line comments
        this.addTrap(
            bag =>
                !bag.mlComment &&
                !bag.quotes &&
                this.currentChar === '/' &&
                this.nextChar === '/',
            bag =>
                bag.slComment = true
        );
        this.addTrap(
            bag =>
                bag.slComment &&
                this.prevChar === '\n',
            bag =>
                bag.slComment = false
        );

        //multi-line comments
        this.addTrap(
            bag =>
                !bag.slComment &&
                !bag.quotes &&
                this.currentChar === '/' &&
                this.nextChar === '*',
            bag =>
                bag.mlComment = true
        );
        this.addTrap(
            bag =>
                bag.mlComment &&
                this.currentChar === '*' &&
                this.nextChar === '/',
            bag =>
                bag.mlComment = false
        );

        //quotes
        this.addTrap(
            bag =>
                bag.significant &&
                (this.currentChar === '\"'),
            bag => {
                bag.quotes = this.currentChar
                bag.quotesPosition = this.position;
            }
        );
        this.addTrap(
            bag =>
                this.currentChar === bag.quotes &&
                bag.quotesPosition !== this.position,
            bag =>
                bag.quotes = null
        );
    }
}

export class TextWalkerCBag {
    blockLevel: number = 0;
    slComment: boolean = false;
    mlComment: boolean = false;
    quotes: string = null;
    quotesPosition: number;

    get significant(): boolean {
        return !this.slComment && !this.mlComment && !this.quotes;
    }
}