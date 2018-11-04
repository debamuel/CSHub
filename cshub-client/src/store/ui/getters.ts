import {uiStoreBuilder} from "./state";

export const drawerState = uiStoreBuilder.read((state) => state.navbar.open, "drawerState");

export const editDialogState = uiStoreBuilder.read((state) => state.editDialogState, "editDialogState");
