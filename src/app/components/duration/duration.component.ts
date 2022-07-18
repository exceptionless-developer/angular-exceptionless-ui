import { Component, OnInit, OnChanges, Input, SimpleChanges, HostBinding } from "@angular/core";
import * as moment from "moment";

@Component({
    selector: "app-duration",
    templateUrl: "./duration.component.html"
})
export class DurationComponent implements OnInit, OnChanges {
    @HostBinding("class.app-component") public appComponent: boolean = true;
    @Input() public value?: number | object | string;
    @Input() public period: string;
    public text: string;

    constructor() {
    }

    public ngOnInit() {
        this.setDurationText();
    }

    public ngOnChanges(changes: SimpleChanges) {
        this.setDurationText();
    }

    public setDurationText() {
        if (typeof this.value === "number") {
            const duration = moment.duration(this.value, (this.period || "seconds") as moment.unitOfTime.DurationConstructor);
            this.text = duration.humanize();
        } else {
            this.text = "never";
        }
    }
}
