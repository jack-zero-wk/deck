import { module } from 'angular';
import { Observable } from 'rxjs';

import { API } from 'core/api/ApiService';

export interface IPagerDutyService {
  id: string;
  integration_key: string;
  lastIncidentTimestamp: string;
  name: string;
  policy: string;
  status: string;
}

export interface IOnCall {
  escalation_policy: {
    id: string;
  };
  escalation_level: number;
  user: {
    summary: string;
    html_url: string;
  };
}

export class PagerDutyReader {
  public listServices(): Observable<IPagerDutyService[]> {
    return Observable.fromPromise(API.one('pagerDuty/services').getList());
  }

  public listOnCalls(): Observable<{ [id: string]: IOnCall[] }> {
    return Observable.fromPromise(API.one('pagerDuty/oncalls').getList());
  }
}

export const PAGER_DUTY_READ_SERVICE = 'spinnaker.core.pagerDuty.read.service';
module(PAGER_DUTY_READ_SERVICE, []).service('pagerDutyReader', PagerDutyReader);
