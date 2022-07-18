import { Component, OnChanges, Input, SimpleChanges, HostBinding, ViewContainerRef, OnDestroy, OnInit } from "@angular/core";
import { Router } from "@angular/router";
import { FilterService } from "../../service/filter.service";
import { StackService } from "../../service/stack.service";
import { LinkService } from "../../service/link.service";
import { PaginationService } from "../../service/pagination.service";
import { NotificationService } from "../../service/notification.service";
import { StacksActionsService, StackAction } from "../../service/stacks-actions.service";
import { WordTranslateService } from "../../service/word-translate.service";
import { AppEventService } from "../../service/app-event.service";
import { Subscription } from "rxjs";
import { Stack } from "src/app/models/stack";
import { EntityChanged, TypedMessage } from "src/app/models/messaging";
import { HttpResponse } from "@angular/common/http";
import { $ExceptionlessClient } from "src/app/exceptionless-client";

@Component({
    selector: "app-stacks",
    templateUrl: "./stacks.component.html"
})
export class StacksComponent implements OnChanges, OnInit, OnDestroy {
    @HostBinding("class.app-component") appComponent = true;

    @Input() public settings: any;
    @Input() public eventType: string; // TODO: I'm not sure why the eventType, filterType, project filter are being used for stacks and events components.
    @Input() public filterTime: string;
    @Input() public projectFilter: string;

    public next: any;
    public previous: any;
    public stacks: Stack[];
    public actions: StackAction[];
    public selectedIds: string[];
    public pageSummary: string;
    public currentOptions: any;
    public loading: boolean = true;
    public showType: boolean;
    private subscriptions: Subscription[];

    constructor(
        private router: Router,
        private filterService: FilterService,
        private stackService: StackService,
        private linkService: LinkService,
        private paginationService: PaginationService,
        private notificationService: NotificationService,
        private stacksActionsService: StacksActionsService,
        private wordTranslateService: WordTranslateService,
        private viewRef: ViewContainerRef,
        private appEvent: AppEventService
    ) {}

    public async ngOnChanges(changes: SimpleChanges) {
        this.actions = this.stacksActionsService.getActions();
        this.showType = this.settings.summary ? this.settings.showType : !this.filterService.getEventType();
        await this.get();
    }

    public ngOnInit() {
        this.subscriptions = [];
        this.subscriptions.push(this.appEvent.subscribe({
            next: async (event: TypedMessage) => {
                if (event.type === "ProjectFilterChanged" || event.type === "TimeFilterChanged") {
                    await this.get();
                }
            }
        }));
    }

    public ngOnDestroy() {
        for (const subscription of this.subscriptions) {
            subscription.unsubscribe();
        }
    }

    public canRefresh(message: EntityChanged) { // TODO: This needs to be hooked up to the can refresh.
        if (!!message && message.type === "Stack") {
            return this.filterService.includedInProjectOrOrganizationFilter({ organizationId: message.organization_id, projectId: message.project_id });
        }

        if (!!message && message.type === "Organization" || message.type === "Project") {
            return this.filterService.includedInProjectOrOrganizationFilter({organizationId: message.id, projectId: message.id});
        }

        return !message;
    }

    private async get(options?, isRefresh?) {
        if (isRefresh && !this.canRefresh(isRefresh)) {
            return;
        }

        this.loading = true;
        this.currentOptions = options || this.settings.options;

        try {
            const response = await this.settings.get(this.currentOptions);
            this.stacks = response.body;

            if (this.selectedIds) {
                this.selectedIds = this.selectedIds.filter((id) => {
                    return this.stacks.filter(s => s.id === id).length > 0;
                });
            }

            // TODO: Figure out how to get clean results and header values from repos..
            const links = this.linkService.getLinksQueryParameters(response.headers.get("link"));
            this.previous = links.previous;
            this.next = links.next;

            this.pageSummary = this.paginationService.getCurrentPageSummary(this.stacks, this.currentOptions.page, this.currentOptions.limit);
            if (this.stacks.length === 0 && this.currentOptions.page && this.currentOptions.page > 1) {
              await this.get();
              return;
            }
        } catch (ex) {
          $ExceptionlessClient.submitException(ex);
          this.notificationService.error("", "Error Occurred!");
        } finally {
            this.loading = false;
        }
    }

    public async nextPage() { // TODO: All paging needs to be tested
        await this.get(this.next);
    }

    public async previousPage() {
        await this.get(this.previous);
    }

    public updateSelection() {
        if (this.stacks && this.stacks.length === 0) {
            return;
        }

        if (this.selectedIds.length > 0) {
            this.selectedIds = [];
        } else {
            this.selectedIds = this.stacks.map((stack) => {
                return stack.id;
            });
        }
    }

    public async save(action: StackAction) {
        const onSuccess = () => {
            this.selectedIds = [];
        };

        if (this.selectedIds.length === 0) {
            this.notificationService.info("", await this.wordTranslateService.translate("Please select one or more stacks"));
        } else {
            action.run(this.selectedIds, this.viewRef, onSuccess);
        }
    }

    public open(id: string, event: MouseEvent) {
        const openInNewTab = (event.ctrlKey || event.metaKey);
        if (openInNewTab) {
            window.open(`/stack/${id}`, "_blank");
        } else {
            this.router.navigate([`/stack/${id}`]);
        }

        event.preventDefault();
    }
}
