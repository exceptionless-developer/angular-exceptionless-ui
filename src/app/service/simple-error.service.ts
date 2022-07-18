import {Injectable} from "@angular/core";

@Injectable({ providedIn: "root" })
export class SimpleErrorService {
    constructor() {}

    public getExceptions(exception) {
        const exceptions = [];
        let currentException = exception;
        while (currentException) {
            exceptions.push(currentException);
            currentException = currentException.inner;
        }

        return exceptions;
    }
}
