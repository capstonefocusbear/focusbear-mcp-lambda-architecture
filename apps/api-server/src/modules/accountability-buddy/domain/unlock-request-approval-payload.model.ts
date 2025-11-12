export class UnlockRequestApprovalPayload {
  constructor(approvalPayload: UnlockRequestApprovalPayload) {
    Object.assign(this, { ...approvalPayload });
  }

  unlock_request_id: string;

  user_id: string;

  buddy_user_id: string;
}
