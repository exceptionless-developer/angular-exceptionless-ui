import {Injectable} from "@angular/core";

@Injectable({ providedIn: "root" })
export class ModalParameterService {
    modalParameter = {};
    constructor() {}

    public setModalParameter(key, value) {
        this.modalParameter = {};
        this.modalParameter[key] = value;
    }

    public getModalParameter(key) {
        return this.modalParameter[key];
    }
}
