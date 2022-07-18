import { Injectable } from "@angular/core";
import { HttpClient, HttpResponse } from "@angular/common/http";
import { FilterService } from "./filter.service";
import { OrganizationService } from "./organization.service";
import * as moment from "moment";
import { CountResult, WorkInProgressResult } from "../models/network";
import { Organization } from "../models/organization";
import { PersistentEvent } from "../models/event";
import { Observable } from "rxjs";


export type EventParametersCallback = (parameters: { [param: string]: string | string[]; }) => { [param: string]: string | string[]; };
export interface GetEventParameters {
    filter?: string;
    sort?: string;
    time?: string;
    offset?: string;
    mode?: string;
    page?: number;
    limit?: number;
    after?: string;
}

@Injectable({ providedIn: "root" })
export class EventService {
    constructor(
        private http: HttpClient,
        private filterService: FilterService,
        private organizationService: OrganizationService,
    ) {}

    public calculateAveragePerHour(total: number, organizations: Organization[]): number {
        const range = this.filterService.getTimeRange();
        range.start = moment.max([range.start, moment(this.filterService.getOldestPossibleEventDate()), moment(this.organizationService.getOldestPossibleEventDate(organizations))].filter(d => !!d));
        range.end = range.end || moment();

        const result: number = total / range.end.diff(range.start, "hours", true);
        return !isNaN(result) && isFinite(result) ? result : 0.0;
    }

    public count(aggregations: string, optionsCallback?: EventParametersCallback, includeHiddenAndFixedFilter?: boolean) {
        let options = this.filterService.apply((aggregations && aggregations.length > 0) ? { aggregations } : {}, includeHiddenAndFixedFilter);
        options = typeof optionsCallback === "function" ? optionsCallback(options) : options;

        const organization = this.filterService.getOrganizationId();
        if (typeof organization === "string" && organization) {
            return this.http.get<CountResult>(`organizations/${organization}/events/count`, { params: options }).toPromise();
        }

        const project = this.filterService.getProjectTypeId();
        if (typeof project === "string" && project) {
            return this.http.get<CountResult>(`projects/${project}/events/count`, { params: options }).toPromise();
        }

        return this.http.get<CountResult>("events/count", { params: options }).toPromise();
    }

    public getAll(options: GetEventParameters, optionsCallback?: EventParametersCallback, includeHiddenAndFixedFilter?: boolean): Promise<HttpResponse<PersistentEvent[]>> {
        optionsCallback = typeof optionsCallback === "function" ? optionsCallback : o => o;
        const mergedOptions = optionsCallback(this.filterService.apply(options, includeHiddenAndFixedFilter));

        const organization = this.filterService.getOrganizationId();
        if (organization) {
            return this.http.get<PersistentEvent[]>(`organizations/${organization}/events`, { params: mergedOptions, observe: "response" }).toPromise();
        }

        const project = this.filterService.getProjectId();
        if (project) {
            return this.http.get<PersistentEvent[]>(`projects/${project}/events`, { params: mergedOptions, observe: "response" }).toPromise();
        }

        // TODO: We need to be looking into if there is a good way to wrap this, so we can get status code (426 if needed, headers for paging (next, previous) and total)
        /*
        // perhaps a model like this?
        export interface ListResults<T> {
            results: T[];
            headers: { [key: string]: string | string[] }
            total: number;
        }
        */
        return this.http.get<PersistentEvent[]>("events", { params: mergedOptions, observe: "response" }).toPromise();
    }

    public getAllSessions(options: GetEventParameters, optionsCallback?: EventParametersCallback): Promise<HttpResponse<PersistentEvent[]>> {
        optionsCallback = typeof optionsCallback === "function" ? optionsCallback : o => o;
        const mergedOptions = optionsCallback(this.filterService.apply(options, false));

        const organization = this.filterService.getOrganizationId();
        if (typeof organization === "string" && organization) {
            return this.http.get<PersistentEvent[]>(`organizations/${organization}/events/sessions`, { params: mergedOptions, observe: "response" }).toPromise();
        }

        const project = this.filterService.getProjectTypeId();
        const projectType = this.filterService.getProjectType();
        if (typeof project === "string" && project && projectType === "project") {
            return this.http.get<PersistentEvent[]>(`projects/${project}/events/sessions`, { params: mergedOptions, observe: "response" }).toPromise();
        }

        return this.http.get<PersistentEvent[]>(`events/sessions`, { params: mergedOptions, observe: "response" }).toPromise();
    }

    public getById(id: string, options: GetEventParameters, optionsCallback?: EventParametersCallback): Promise<HttpResponse<PersistentEvent>> {
        optionsCallback = typeof optionsCallback === "function" ? optionsCallback : o => o;
        const params = optionsCallback(this.filterService.apply(options));

        // TODO: We need to be looking into if there is a good way to wrap this, so we can get status code (426 if needed, headers for paging (next, previous, parent))
        return this.http.get<PersistentEvent>(`events/${id}`, { params, observe: "response" }).toPromise();
    }

    public getByReferenceId(id: string, options: GetEventParameters) {
        const params = this.filterService.apply(options, false);
        return this.http.get<PersistentEvent[]>(`events/by-ref/${id}`, { params }).toPromise();
    }

    public getBySessionId(projectId: string, id: string, options: GetEventParameters) {
        const params = this.filterService.apply(options, false);
        return this.http.get<PersistentEvent[]>(`projects/${projectId}/events/sessions/${id}`, { params }).toPromise();
    }

    public getByStackId(id: string, options: GetEventParameters) {
        const params = this.filterService.apply(options, false);
        return this.http.get<PersistentEvent[]>(`stacks/${id}/events`, { params }).toPromise();
    }

    public remove(id: string) {
        return this.http.delete<WorkInProgressResult>(`events/${id}`).toPromise();
    }
}
