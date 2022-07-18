import { Component, OnInit, OnChanges, Input, SimpleChanges, ViewEncapsulation } from "@angular/core";
import { ErrorService } from "../../service/error.service";
import { ClipboardService } from "ngx-clipboard";
import { NotificationService } from "../../service/notification.service";
import { WordTranslateService } from "../../service/word-translate.service";

@Component({
    selector: "app-stack-trace",
    templateUrl: "./stack-trace.component.html",
    styleUrls: ["./stack-trace.component.less"],
    encapsulation: ViewEncapsulation.None
})

export class StackTraceComponent implements OnChanges {
    @Input() public exception: any;
    @Input() public isOverview: boolean; // TODO: Why does this have overview and clipboard?
    @Input() public textStackTrace: string;
    public stackTrace: any;
    public clipboardSupported = this.clipboardService.isSupported;

    constructor(
        private errorService: ErrorService,
        private clipboardService: ClipboardService,
        private notificationService: NotificationService,
        private wordTranslateService: WordTranslateService
    ) {}

    public ngOnChanges(changes: SimpleChanges) {
        const errors = this.errorService.getExceptions(this.exception);
        this.stackTrace = this.buildStackTrace(errors, true);
        this.textStackTrace = this.buildStackTrace(errors, false);
    }

    public async copied() {
        this.notificationService.success("", await  this.wordTranslateService.translate("Copied!"));
    }

    private buildParameter(parameter: any): string {
        let result = "";

        const parts = [];
        if (parameter.type_namespace) {
            parts.push(parameter.type_namespace);
        }

        if (parameter.type) {
            parts.push(parameter.type);
        }

        result += parts.join(".").replace("+", ".");

        if (!!parameter.generic_arguments && parameter.generic_arguments.length > 0) {
            result += "[" + parameter.generic_arguments.join(",") + "]";
        }

        if (parameter.name) {
            result += " " + parameter.name;
        }

        return result;
    }

    private buildParameters(parameters: any[]): string {
        let result = "(";
        for (let index = 0; index < (parameters || []).length; index++) {
            if (index > 0) {
                result += ", ";
            }

            result += this.buildParameter(parameters[index]);
        }
        return result + ")";
    }

    private buildStackFrame(frame: any, includeHTML: boolean): string {
        if (!frame) {
            return "<null>\r\n";
        }

        const typeNameParts = [];
        if (!!frame.declaring_namespace) {
            typeNameParts.push(frame.declaring_namespace);
        }

        if (!!frame.declaring_type) {
            typeNameParts.push(frame.declaring_type);
        }

        typeNameParts.push(frame.name || "<anonymous>");

        let result = "at " + typeNameParts.join(".").replace("+", ".");

        if (!!frame.generic_arguments && frame.generic_arguments.length > 0) {
            result += "[" + frame.generic_arguments.join(",") + "]";
        }

        result += this.buildParameters(frame.parameters);
        if (!!frame.data && (frame.data.ILOffset > 0 || frame.data.NativeOffset > 0)) {
            result += " at offset " + frame.data.ILOffset || frame.data.NativeOffset;
        }

        if (frame.file_name) {
            result += " in " + frame.file_name;
            if (frame.line_number > 0) {
                result += ":line " + frame.line_number;
            }

            if (frame.column > 0) {
                result += ":col " + frame.column;
            }
        }

        if (includeHTML) {
            return this.escapeHTML(result + "\r\n");
        } else {
            return result + "\r\n";
        }
    }

    private buildStackFrames(exceptions: any[], includeHTML: boolean): string {
        let frames = "";
        for (let index = 0; index < exceptions.length; index++) {
            const stackTrace = exceptions[index].stack_trace;
            if (!!stackTrace) {
                if (includeHTML) {
                    frames += "<div class=\"stack-frame\">";
                }

                for (const frame of stackTrace) {
                    if (includeHTML) {
                        frames += this.escapeHTML(this.buildStackFrame(frame, includeHTML));
                    } else {
                        frames += this.buildStackFrame(frame, includeHTML);
                    }
                }

                if (index < (exceptions.length - 1)) {
                    if (includeHTML) {
                        frames += "<div>--- End of inner exception stack trace ---</div>";
                    } else {
                        frames += "--- End of inner exception stack trace ---";
                    }
                }

                if (includeHTML) {
                    frames += "</div>";
                }
            }
        }

        return frames;
    }

    private buildStackTrace(exceptions: any[], includeHTML: boolean): string {
        if (!exceptions) {
            return null;
        }

        return this.buildStackTraceHeader(exceptions, includeHTML) + this.buildStackFrames(exceptions.reverse(), includeHTML);
    }

    private buildStackTraceHeader(exceptions: any[], includeHTML: boolean): string {
        let header = "";
        for (let index = 0; index < exceptions.length; index++) {
            if (includeHTML) {
                header += "<span class=\"ex-header\">";
            }

            if (index > 0) {
                header += " ---> ";
            }

            const hasType = !!exceptions[index].type;
            if (hasType) {
                if (includeHTML) {
                    header += "<span class=\"ex-type\">" + this.escapeHTML(exceptions[index].type) + "</span>: ";
                } else {
                    header += exceptions[index].type + ": ";
                }
            }

            if (exceptions[index].message) {
                if (includeHTML) {
                    header += "<span class=\"ex-message\">" + this.escapeHTML(exceptions[index].message) + "</span>";
                } else {
                    header += exceptions[index].message;
                }
            }

            if (hasType) {
                if (includeHTML) {
                    header += "</span>";
                } else {
                    header += "\r\n";
                }
            }
        }

        return header;
    }

    private escapeHTML(input: string) {
        if (!input || !input.replace) {
            return input;
        }

        // TODO: Figure out a better way to sanitize this.
        return input.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#039;");
    }
}
