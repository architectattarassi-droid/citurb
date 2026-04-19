export type ProjectState = string;
export type PublicErrorPayload = {
    error: string;
    incident_id: string;
    code?: string;
};
export type ProjectStateResponse = {
    project_id: string;
    state: ProjectState;
    allowed_actions: string[];
    ui_blocks: unknown[];
    freeze_info?: {
        reason: string;
        since: string;
        resolvedBy?: string;
    };
};
export type ActionResponse = {
    ok: true;
    state: ProjectStateResponse;
} | {
    ok: false;
    error: PublicErrorPayload;
};
