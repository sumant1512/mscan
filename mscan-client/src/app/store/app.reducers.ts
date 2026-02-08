import { ActionReducerMap } from "@ngrx/store";
import { AppState } from "./app.state";
import { verificationAppsReducer } from "./verification-apps";
import { tenantsReducer } from "./tenants";
import { creditRequestsReducer } from "./credit-requests";
import { authContextReducer } from "./auth-context";
import { dashboardReducer } from "./dashboard";
import { tagsReducer } from "./tags";

export const appReducers: ActionReducerMap<AppState> = {
    verificationApps: verificationAppsReducer,
    tenants: tenantsReducer,
    creditRequests: creditRequestsReducer,
    authContext: authContextReducer,
    dashboard: dashboardReducer,
    tags: tagsReducer,
};