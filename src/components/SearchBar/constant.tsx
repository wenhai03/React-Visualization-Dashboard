import { SuggestionsAbstraction } from './types';
export const suggestionsAbstraction: SuggestionsAbstraction = {
  type: 'rules',
  fields: {
    'alert.tags': {
      field: 'alert.tags',
      fieldToQuery: 'alert.attributes.tags',
      displayField: 'tags',
    },
    'alert.name.keyword': {
      field: 'alert.name.keyword',
      fieldToQuery: 'alert.attributes.name.keyword',
      displayField: 'name',
    },
    'alert.actions.actionTypeId': {
      field: 'alert.actions.actionTypeId',
      nestedPath: 'alert.actions',
      nestedField: 'actionTypeId',
      nestedDisplayField: 'id',
      fieldToQuery: 'alert.attributes.actions',
      displayField: 'actions',
    },
    'alert.alertTypeId': {
      field: 'alert.alertTypeId',
      fieldToQuery: 'alert.attributes.alertTypeId',
      displayField: 'type',
    },
    'alert.lastRun.outcome': {
      field: 'alert.lastRun.outcome',
      fieldToQuery: 'alert.attributes.lastRun.outcome',
      displayField: 'lastResponse',
    },
    'alert.enabled': {
      field: 'alert.enabled',
      fieldToQuery: 'alert.attributes.enabled',
      displayField: 'enabled',
    },
    'alert.muteAll': {
      field: 'alert.muteAll',
      fieldToQuery: 'alert.attributes.muteAll',
      displayField: 'muted',
    },
    'alert.params.threat.tactic.name': {
      field: 'alert.params.threat.tactic.name',
      fieldToQuery: 'alert.attributes.params.threat.tactic.name',
      displayField: 'threat.tactic.name',
    },
    'alert.params.threat.technique.name': {
      field: 'alert.params.threat.technique.name',
      fieldToQuery: 'alert.attributes.params.threat.technique.name',
      displayField: 'threat.technique.name',
    },
  },
};
