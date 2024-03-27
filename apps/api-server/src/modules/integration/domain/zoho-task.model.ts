export class ZohoTask {
  actual_cost?: number;

  added_via: string;

  balance?: number;

  billingtype: string;

  is_comment_added: boolean;

  forecasted_hours: number;

  last_updated_time_long: number;

  is_forum_associated: boolean;

  details: {
    owners: { name: string; work: string; id: string }[];
  };

  id: number;

  created_time: string;

  work: string;

  custom_fields: [];

  isparent: boolean;

  work_type: string;

  completed: boolean;

  task_followers: {
    FOLUSERS: string;
    FOLLOWERSIZE: number;
    FOLLOWERS: [];
  };

  priority: string;

  created_by: string;

  last_updated_time: string;

  name: string;

  is_docs_assocoated: boolean;

  tasklist: {
    name: string;
    id_string: string;
    id: string;
  };

  last_updated_time_format: string;

  order_sequence: number;

  status: {
    name: string;
    id: string;
    type: string;
    color_code: string;
  };

  milestone_id: string;

  link: {
    timesheet: {
      url: string;
    };
    web: {
      url: string;
    };
    self: {
      url: string;
    };
    subtask: {
      url: string;
    };
  };

  description: string;

  created_by_zpuid: string;

  work_form: string;

  duration: string;

  created_by_email: string;

  key: string;

  created_person: string;

  created_time_long: number;

  is_reminder_set: boolean;

  is_recurrence_set: boolean;

  created_time_format: string;

  created_by_full_name: string;

  subtasks: boolean;

  forecasted_cost: number;

  duration_type: string;

  percent_complete: string;

  GROUP_NAME: {
    ASSOCIATED_TEAMS: {
      AnyTeam: string;
    };
    ASSOCIATED_TEAMS_COUNT: number;
    IS_TEAM_UNASSIGNED: boolean;
  };

  id_string: string;

  log_hours: {
    non_billable_hours: string;
    billable_hours: string;
  };

  planned_cost: number;
}
