
export class UserDoesNotExist extends Error {
    constructor(private msg: string) {
        super(msg)
    }
}